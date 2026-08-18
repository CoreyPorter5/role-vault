package db

import (
	"context"
	"errors"
	"fmt"
	"os"

	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
	"github.com/CoreyPorter5/seek-sync/backend/internal/observability"
	"github.com/CoreyPorter5/seek-sync/backend/internal/resumeupload"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	storage_go "github.com/supabase-community/storage-go"
)

func AddUserResume(ctx context.Context, userID string, resume *resumeupload.PreparedDOCX) (string, error) {
	if resume == nil {
		return "", errors.New("prepared resume is required")
	}

	bucketID := os.Getenv("MASTER_RESUME_STORAGE_BUCKET_ID")
	objectPath := fmt.Sprintf("%s/master-resumes/%s.docx", userID, uuid.NewString())
	contentType := resumeupload.DOCXMIMEType

	cleanupErr, err := replaceStoredObject(
		objectPath,
		func() error {
			uploadFile, err := os.Open(resume.TempPath)
			if err != nil {
				return fmt.Errorf("open prepared resume: %w", err)
			}
			defer uploadFile.Close()

			if _, err := StorageClient.UploadFile(bucketID, objectPath, uploadFile, storage_go.FileOptions{ContentType: &contentType}); err != nil {
				return fmt.Errorf("upload master resume: %w", err)
			}
			return nil
		},
		func() (string, error) {
			return persistMasterResume(ctx, userID, objectPath, resume)
		},
		func(path string) error {
			_, err := StorageClient.RemoveFile(bucketID, []string{path})
			return err
		},
	)
	if err != nil {
		return "", err
	}
	if cleanupErr != nil {
		observability.CaptureWarning(context.WithoutCancel(ctx), observability.CodeStorageCleanupFailed, cleanupErr, "storage", "replace_master_resume")
	}

	return objectPath, nil
}

func persistMasterResume(ctx context.Context, userID, objectPath string, resume *resumeupload.PreparedDOCX) (string, error) {
	tx, err := Conn.Begin(ctx)
	if err != nil {
		return "", fmt.Errorf("begin master resume transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, "master-resume:"+userID); err != nil {
		return "", fmt.Errorf("lock master resume: %w", err)
	}

	var previousPath string
	err = tx.QueryRow(ctx, `SELECT storage_path FROM user_master_resumes WHERE user_id = $1 FOR UPDATE`, userID).Scan(&previousPath)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return "", fmt.Errorf("read existing master resume: %w", err)
	}
	if errors.Is(err, pgx.ErrNoRows) {
		previousPath = ""
	}

	_, err = tx.Exec(
		ctx,
		`INSERT INTO user_master_resumes (user_id, updated_at, storage_path, mime_type, original_filename, plaintext)
		 VALUES ($1, now(), $2, $3, $4, $5)
		 ON CONFLICT (user_id) DO UPDATE
		 SET updated_at = EXCLUDED.updated_at,
		     storage_path = EXCLUDED.storage_path,
		     mime_type = EXCLUDED.mime_type,
		     original_filename = EXCLUDED.original_filename,
		     plaintext = EXCLUDED.plaintext`,
		userID,
		objectPath,
		resumeupload.DOCXMIMEType,
		resume.OriginalFilename,
		resume.Plaintext,
	)
	if err != nil {
		return "", fmt.Errorf("save master resume metadata: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return "", fmt.Errorf("commit master resume metadata: %w", err)
	}
	return previousPath, nil
}

func GetUserResume(ctx context.Context, userID string) (models.Resume, error) {
	var userResume models.Resume
	query := `SELECT created_at::text, updated_at::text, storage_path, mime_type, original_filename, plaintext FROM user_master_resumes WHERE user_id = $1`
	row := Conn.QueryRow(ctx, query, userID)
	err := row.Scan(
		&userResume.CreatedAt,
		&userResume.UpdatedAt,
		&userResume.StoragePath,
		&userResume.MimeType,
		&userResume.FileName,
		&userResume.Plaintext,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return userResume, pgx.ErrNoRows
		}
		return userResume, err
	}

	return userResume, nil
}

func UpdateUserResume(ctx context.Context, userID string, updatedPlaintext string) (bool, error) {
	query := `UPDATE user_master_resumes SET plaintext = $1, updated_at = now() WHERE user_id = $2`
	commandTag, err := Conn.Exec(ctx, query, updatedPlaintext, userID)
	if err != nil {
		return false, err
	}

	if commandTag.RowsAffected() == 0 {
		return false, nil
	}
	return true, nil
}
