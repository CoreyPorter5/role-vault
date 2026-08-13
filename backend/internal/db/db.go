// Configures your PostgreSQL connection pool

package db

import (
	"context"
	"fmt"
	"io"
	"os"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	storage_go "github.com/supabase-community/storage-go"
)

var Conn *pgxpool.Pool

type storageClient interface {
	UploadFile(bucketID string, relativePath string, data io.Reader, fileOptions ...storage_go.FileOptions) (storage_go.FileUploadResponse, error)
	CreateSignedUrl(bucketID string, filePath string, expiresIn int) (storage_go.SignedUrlResponse, error)
	RemoveFile(bucketID string, paths []string) ([]storage_go.FileUploadResponse, error)
}

var StorageClient storageClient

// storage-go mutates shared request headers while uploading. Serialize access
// to the shared client so concurrent API requests cannot race on that state.
type lockedStorageClient struct {
	mu     sync.Mutex
	client *storage_go.Client
}

func (client *lockedStorageClient) UploadFile(bucketID string, relativePath string, data io.Reader, fileOptions ...storage_go.FileOptions) (storage_go.FileUploadResponse, error) {
	client.mu.Lock()
	defer client.mu.Unlock()
	return client.client.UploadFile(bucketID, relativePath, data, fileOptions...)
}

func (client *lockedStorageClient) CreateSignedUrl(bucketID string, filePath string, expiresIn int) (storage_go.SignedUrlResponse, error) {
	client.mu.Lock()
	defer client.mu.Unlock()
	return client.client.CreateSignedUrl(bucketID, filePath, expiresIn)
}

func (client *lockedStorageClient) RemoveFile(bucketID string, paths []string) ([]storage_go.FileUploadResponse, error) {
	client.mu.Lock()
	defer client.mu.Unlock()
	return client.client.RemoveFile(bucketID, paths)
}

func InitDB() error {
	var err error
	Conn, err = pgxpool.New(context.Background(), os.Getenv("DATABASE_URL"))
	if err != nil {
		return fmt.Errorf("create database pool: %w", err)
	}

	pingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := Conn.Ping(pingContext); err != nil {
		Conn.Close()
		Conn = nil
		return fmt.Errorf("ping database: %w", err)
	}

	StorageClient = &lockedStorageClient{
		client: storage_go.NewClient(os.Getenv("SUPABASE_STORAGE_URL"), os.Getenv("SUPABASE_SECRET_API_KEY"), nil),
	}

	return nil
}
