package db

import (
	"fmt"
	"mime/multipart"
	"os"
	"path/filepath"

	storage_go "github.com/supabase-community/storage-go"
)

func AddUserResume(userID string, file multipart.File, fileHeader *multipart.FileHeader) (string, error) {
	contentType := fileHeader.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/pdf"
	}

	fileExt := filepath.Ext(fileHeader.Filename)

	objectPath := fmt.Sprintf("%s/master_resume%s", userID, fileExt)

	_, err := StorageClient.UploadOrUpdateFile(os.Getenv("STORAGE_BUCKET_ID"), objectPath, file, true, storage_go.FileOptions{
		ContentType: &contentType,
	})

	if err != nil {
		fmt.Printf("Database error uploading file %s: %v\n", fileHeader.Filename, err)
		return "", err
	}
	fmt.Printf("Successfully saved file %s for user %s\n", fileHeader.Filename, userID)
	return objectPath, nil
}
