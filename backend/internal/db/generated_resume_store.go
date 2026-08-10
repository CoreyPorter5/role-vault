package db

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"os"

	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
	"github.com/CoreyPorter5/seek-sync/backend/internal/resumeupload"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	storage_go "github.com/supabase-community/storage-go"
)

func AddGeneratedUserResume(ctx context.Context, userID string, jobID string, resumeJSON models.TailoredResume, resume *resumeupload.PreparedDOCX) (string, error) {
	if resume == nil {
		return "", errors.New("prepared resume is required")
	}

	var ownsJob bool
	if err := Conn.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM jobs WHERE user_id = $1 AND seek_job_id = $2)`, userID, jobID).Scan(&ownsJob); err != nil {
		return "", fmt.Errorf("verify generated resume job: %w", err)
	}
	if !ownsJob {
		return "", ErrGenerationJobNotFound
	}

	bucketID := os.Getenv("GENERATED_RESUME_STORAGE_BUCKET_ID")
	jobHash := sha256.Sum256([]byte(jobID))
	jobPath := hex.EncodeToString(jobHash[:16])
	objectPath := fmt.Sprintf("%s/generated-resumes/%s/%s.docx", userID, jobPath, uuid.NewString())
	contentType := resumeupload.DOCXMIMEType

	cleanupErr, err := replaceStoredObject(
		objectPath,
		func() error {
			uploadFile, err := os.Open(resume.TempPath)
			if err != nil {
				return fmt.Errorf("open prepared generated resume: %w", err)
			}
			defer uploadFile.Close()

			if _, err := StorageClient.UploadFile(bucketID, objectPath, uploadFile, storage_go.FileOptions{ContentType: &contentType}); err != nil {
				return fmt.Errorf("upload generated resume: %w", err)
			}
			return nil
		},
		func() (string, error) {
			return persistGeneratedResume(ctx, userID, jobID, objectPath, resumeJSON, resume.OriginalFilename)
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
		fmt.Printf("Warning: generated resume saved but old object cleanup failed for user %s and job %s: %v\n", userID, jobID, cleanupErr)
	}

	fmt.Printf("Successfully saved generated resume %s for user %s\n", resume.OriginalFilename, userID)
	return objectPath, nil
}

func persistGeneratedResume(ctx context.Context, userID, jobID, objectPath string, resumeJSON models.TailoredResume, originalFilename string) (string, error) {
	tx, err := Conn.Begin(ctx)
	if err != nil {
		return "", fmt.Errorf("begin generated resume transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	lockKey := "generated-resume:" + userID + ":" + jobID
	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, lockKey); err != nil {
		return "", fmt.Errorf("lock generated resume: %w", err)
	}

	var ownsJob bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM jobs WHERE user_id = $1 AND seek_job_id = $2)`, userID, jobID).Scan(&ownsJob); err != nil {
		return "", fmt.Errorf("verify generated resume job: %w", err)
	}
	if !ownsJob {
		return "", ErrGenerationJobNotFound
	}

	var resumeCategory models.ResumeCategory
	var profileVersion int
	var templateVersion string
	if err := tx.QueryRow(
		ctx,
		`SELECT resume_category, profile_version, template_version
		 FROM user_generated_resume_drafts
		 WHERE user_id = $1 AND seek_job_id = $2
		 FOR UPDATE`,
		userID,
		jobID,
	).Scan(&resumeCategory, &profileVersion, &templateVersion); errors.Is(err, pgx.ErrNoRows) {
		return "", ErrGenerationDraftNotFound
	} else if err != nil {
		return "", fmt.Errorf("read generated resume profile metadata: %w", err)
	}

	var previousPath string
	err = tx.QueryRow(
		ctx,
		`SELECT storage_path FROM user_generated_resumes WHERE user_id = $1 AND seek_job_id = $2 FOR UPDATE`,
		userID,
		jobID,
	).Scan(&previousPath)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return "", fmt.Errorf("read existing generated resume: %w", err)
	}
	if errors.Is(err, pgx.ErrNoRows) {
		previousPath = ""
	}

	_, err = tx.Exec(
		ctx,
		`INSERT INTO user_generated_resumes (
		   user_id, updated_at, storage_path, mime_type, original_filename,
		   resume_json, seek_job_id, resume_category, profile_version, template_version
		 ) VALUES ($1, now(), $2, $3, $4, $5, $6, $7, $8, $9)
		 ON CONFLICT (user_id, seek_job_id) DO UPDATE
		 SET updated_at = EXCLUDED.updated_at,
		     storage_path = EXCLUDED.storage_path,
		     mime_type = EXCLUDED.mime_type,
		     original_filename = EXCLUDED.original_filename,
		     resume_json = EXCLUDED.resume_json,
		     resume_category = EXCLUDED.resume_category,
		     profile_version = EXCLUDED.profile_version,
		     template_version = EXCLUDED.template_version`,
		userID,
		objectPath,
		resumeupload.DOCXMIMEType,
		originalFilename,
		resumeJSON,
		jobID,
		resumeCategory,
		profileVersion,
		templateVersion,
	)
	if err != nil {
		return "", fmt.Errorf("save generated resume metadata: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return "", fmt.Errorf("commit generated resume metadata: %w", err)
	}
	return previousPath, nil
}

func GetGeneratedUserResume(userID string, jobID string) (storage_go.SignedUrlResponse, error) {
	const expireIn = 60
	var storagePath string
	query := `SELECT storage_path FROM user_generated_resumes WHERE user_id = $1 AND seek_job_id = $2`

	err := Conn.QueryRow(context.Background(), query, userID, jobID).Scan(&storagePath)
	if err != nil {
		fmt.Printf("Database error fetching generated resume path for user %s and job %s: %v\n", userID, jobID, err)
		return storage_go.SignedUrlResponse{}, err
	}

	result, storageErr := StorageClient.CreateSignedUrl(os.Getenv("GENERATED_RESUME_STORAGE_BUCKET_ID"), storagePath, expireIn)
	if storageErr != nil {
		fmt.Printf("Storage error creating signed URL for generated resume: %v\n", storageErr)
		return result, storageErr
	}

	fmt.Printf("Successfully created signed download url for user: %s", userID)
	return result, nil
}

func DeleteGeneratedUserResume(ctx context.Context, userID string, jobID string) (bool, error) {
	tx, err := Conn.Begin(ctx)
	if err != nil {
		return false, fmt.Errorf("begin generated resume deletion: %w", err)
	}
	defer tx.Rollback(ctx)

	lockKey := "generated-resume:" + userID + ":" + jobID
	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, lockKey); err != nil {
		return false, fmt.Errorf("lock generated resume deletion: %w", err)
	}

	var storagePath string
	err = tx.QueryRow(
		ctx,
		`SELECT storage_path FROM user_generated_resumes WHERE user_id = $1 AND seek_job_id = $2 FOR UPDATE`,
		userID,
		jobID,
	).Scan(&storagePath)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("read generated resume for deletion: %w", err)
	}

	if _, err := tx.Exec(ctx, `DELETE FROM user_generated_resumes WHERE user_id = $1 AND seek_job_id = $2`, userID, jobID); err != nil {
		return false, fmt.Errorf("delete generated resume metadata: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return false, fmt.Errorf("commit generated resume deletion: %w", err)
	}

	if _, err := StorageClient.RemoveFile(os.Getenv("GENERATED_RESUME_STORAGE_BUCKET_ID"), []string{storagePath}); err != nil {
		fmt.Printf("Warning: generated resume metadata deleted but object cleanup failed for user %s and job %s: %v\n", userID, jobID, err)
	}
	fmt.Printf("Successfully deleted generated resume for job %s for user %s\n", jobID, userID)
	return true, nil
}
