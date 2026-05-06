package db

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
	storage_go "github.com/supabase-community/storage-go"
	"github.com/tenkoh/go-docc"
)

func AddUserResume(userID string, file multipart.File, fileHeader *multipart.FileHeader) (string, error) {
	defer file.Close()

	query := `INSERT INTO user_master_resumes (user_id, updated_at, storage_path, mime_type, original_filename, plaintext) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (user_id) DO UPDATE SET updated_at = EXCLUDED.updated_at, storage_path = EXCLUDED.storage_path, mime_type = EXCLUDED.mime_type, original_filename = EXCLUDED.original_filename, plaintext = EXCLUDED.plaintext`

	mimeType := "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

	contentType := fileHeader.Header.Get("Content-Type")
	if contentType == "" {
		contentType = mimeType
	}

	fileExt := filepath.Ext(fileHeader.Filename)
	objectPath := fmt.Sprintf("%s/master_resume%s", userID, fileExt)

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

	_, storageErr := StorageClient.UploadOrUpdateFile(os.Getenv("MASTER_RESUME_STORAGE_BUCKET_ID"), objectPath, uploadFile, true, storage_go.FileOptions{
		ContentType: &contentType,
	})

	if storageErr != nil {
		fmt.Printf("Database error uploading file %s: %v\n", fileHeader.Filename, storageErr)
		return "", storageErr
	}

	plaintext, readErr := extractPlaintextFromPath(tmpPath)
	if readErr != nil {
		fmt.Printf("Error parsing plaintext from file: %s\n", fileHeader.Filename)
		return "", readErr
	}

	_, tableErr := Conn.Exec(context.Background(), query, userID, time.Now(), objectPath, mimeType, fileHeader.Filename, plaintext)

	if tableErr != nil {
		fmt.Printf("Database error adding resume %s: %v\n", fileHeader.Filename, tableErr)
		return "", tableErr
	}

	fmt.Printf("Successfully saved resume %s for user %s\n", fileHeader.Filename, userID)
	return objectPath, nil
}

func extractPlaintextFromPath(filePath string) (string, error) {
	r, err := docc.NewReader(filePath)
	if err != nil {
		return "", err
	}
	defer r.Close()

	plaintext, readErr := r.ReadAll()
	if readErr != nil {
		return "", readErr
	}
	return strings.Join(plaintext, "\n"), nil
}

func GetUserResume(userID string) (models.Resume, error) {
	var userResume models.Resume
	query := `SELECT created_at::text, updated_at::text, storage_path, mime_type, original_filename, plaintext FROM user_master_resumes WHERE user_id = $1`
	row := Conn.QueryRow(context.Background(), query, userID)
	err := row.Scan(
		&userResume.CreatedAt,
		&userResume.UpdatedAt,
		&userResume.StoragePath,
		&userResume.MimeType,
		&userResume.FileName,
		&userResume.Plaintext,
	)

	if err != nil {
		fmt.Printf("Database error fetching resume for user %s: %v\n", userID, err)
		return userResume, err
	}

	fmt.Printf("Successfully fetched resume %v for user %s\n", userResume.FileName, userID)
	return userResume, nil

}

func UpdateUserResume() {

}

func DeleteUserResume() {

}

func GetResumeContext() {

}
