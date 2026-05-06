package db

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"time"

	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
	storage_go "github.com/supabase-community/storage-go"
)

func AddGeneratedUserResume(userID string, jobID string, resumeJson models.TailoredResume, file multipart.File, fileHeader *multipart.FileHeader) (string, error) {
	defer file.Close()

	query := `INSERT INTO user_generated_resumes (user_id, updated_at, storage_path, mime_type, original_filename, resume_json, seek_job_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (user_id, seek_job_id) DO UPDATE SET updated_at = EXCLUDED.updated_at, storage_path = EXCLUDED.storage_path, mime_type = EXCLUDED.mime_type, original_filename = EXCLUDED.original_filename, resume_json = EXCLUDED.resume_json`

	mimeType := "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

	contentType := fileHeader.Header.Get("Content-Type")
	if contentType == "" {
		contentType = mimeType
	}

	fileExt := filepath.Ext(fileHeader.Filename)

	objectPath := fmt.Sprintf("%s/generated-resumes/%s/resume%s", userID, jobID, fileExt)

	tmp, err := os.CreateTemp("", "*.docx")
	if err != nil {
		return "", err
	}
	tmpPath := tmp.Name()
	defer os.Remove(tmpPath)

	if _, err := io.Copy(tmp, file); err != nil {
		tmp.Close()
		return "", err
	}
	if err := tmp.Close(); err != nil {
		return "", err
	}

	uploadFile, err := os.Open(tmpPath)
	if err != nil {
		return "", err
	}
	defer uploadFile.Close()

	_, storageErr := StorageClient.UploadOrUpdateFile(os.Getenv("GENERATED_RESUME_STORAGE_BUCKET_ID"), objectPath, uploadFile, true, storage_go.FileOptions{
		ContentType: &contentType,
	})

	if storageErr != nil {
		fmt.Printf("Database error uploading generated resume file %s: %v\n", fileHeader.Filename, storageErr)
		return "", storageErr
	}

	_, tableErr := Conn.Exec(context.Background(), query, userID, time.Now(), objectPath, mimeType, fileHeader.Filename, resumeJson, jobID)

	if tableErr != nil {
		fmt.Printf("Database error adding generated resume %s: %v\n", fileHeader.Filename, tableErr)
		return "", tableErr
	}

	fmt.Printf("Successfully saved generated resume %s for user %s\n", fileHeader.Filename, userID)
	return objectPath, nil
}
