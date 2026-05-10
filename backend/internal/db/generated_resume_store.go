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

func DeleteGeneratedUserResume(userID string, jobID string) (bool, error) {
	var storagePath string

	getStoragePathQuery := `SELECT storage_path FROM user_generated_resumes WHERE user_id = $1 AND seek_job_id = $2`

	err := Conn.QueryRow(context.Background(), getStoragePathQuery, userID, jobID).Scan(&storagePath)
	if err != nil {
		fmt.Printf("Database error fetching generated resume path for user %s and job %s: %v\n", userID, jobID, err)
		return false, err
	}

	_, storageErr := StorageClient.RemoveFile(os.Getenv("GENERATED_RESUME_STORAGE_BUCKET_ID"), []string{storagePath})
	if storageErr != nil {
		fmt.Printf("Storage error deleting generated resume file %s: %v\n", storagePath, storageErr)
		return false, storageErr
	}

	deleteRowQuery := `DELETE FROM user_generated_resumes WHERE user_id = $1 AND seek_job_id = $2`
	commandTag, err := Conn.Exec(context.Background(), deleteRowQuery, userID, jobID)

	if err != nil {
		fmt.Printf("Database error deleting generated resume for job %s: %v\n", jobID, err)
		return false, err
	}

	if commandTag.RowsAffected() == 0 {
		fmt.Printf("Resume %s does not exist for user %v in DB\n", jobID, userID)
		return false, nil
	}

	fmt.Printf("Successfully deleted generated resume for job %s for user %s\n", jobID, userID)
	return true, nil

}
