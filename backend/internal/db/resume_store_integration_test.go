//go:build integration

package db

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
	"github.com/CoreyPorter5/seek-sync/backend/internal/resumeupload"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	storage_go "github.com/supabase-community/storage-go"
)

func TestResumeStorageLifecycleIntegration(t *testing.T) {
	databaseURL := os.Getenv("DATABASE_URL")
	supabaseURL := os.Getenv("SUPABASE_URL")
	storageURL := os.Getenv("SUPABASE_STORAGE_URL")
	serviceKey := os.Getenv("SUPABASE_SECRET_API_KEY")
	masterBucket := os.Getenv("MASTER_RESUME_STORAGE_BUCKET_ID")
	generatedBucket := os.Getenv("GENERATED_RESUME_STORAGE_BUCKET_ID")
	if databaseURL == "" || supabaseURL == "" || storageURL == "" || serviceKey == "" || masterBucket == "" || generatedBucket == "" {
		t.Skip("Supabase resume integration-test configuration is incomplete")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("connect to database: %v", err)
	}
	Conn = pool
	realStorage := storage_go.NewClient(storageURL, serviceKey, nil)
	StorageClient = &lockedStorageClient{client: realStorage}

	userID := createIntegrationAuthUser(t, ctx, supabaseURL, serviceKey)
	paths := make(map[string][]string)
	var pathsMu sync.Mutex
	trackPath := func(bucket, path string) {
		pathsMu.Lock()
		defer pathsMu.Unlock()
		paths[bucket] = append(paths[bucket], path)
	}
	t.Cleanup(func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cleanupCancel()
		pathsMu.Lock()
		trackedPaths := paths
		pathsMu.Unlock()
		for bucket, bucketPaths := range trackedPaths {
			for _, objectPath := range bucketPaths {
				_, _ = realStorage.RemoveFile(bucket, []string{objectPath})
			}
		}
		deleteIntegrationAuthUser(t, cleanupCtx, supabaseURL, serviceKey, userID)
		pool.Close()
	})

	jobID := "phase0-step3-" + uuid.NewString()
	if _, err := pool.Exec(
		ctx,
		`INSERT INTO jobs (
		   user_id, seek_job_id, job_title, company_name, location, job_description,
		   status, resume_category, resume_category_source, resume_category_status,
		   resume_category_resolved_at
		 ) VALUES (
		   $1, $2, 'Software Engineer', 'Step 3 Integration', 'Sydney',
		   'Build reliable Go and React software.', 'Saved', 'technology_product_data',
		   'user', 'classified', now()
		 )`,
		userID,
		jobID,
	); err != nil {
		t.Fatalf("create integration job: %v", err)
	}

	initial := prepareIntegrationDOCX(t, "initial-master.docx", "Initial master resume")
	defer initial.Cleanup()
	initialPath, err := AddUserResume(ctx, userID, initial)
	if err != nil {
		t.Fatalf("save initial master resume: %v", err)
	}
	trackPath(masterBucket, initialPath)

	concurrentResumes := []*resumeupload.PreparedDOCX{
		prepareIntegrationDOCX(t, "concurrent-a.docx", "Concurrent master A"),
		prepareIntegrationDOCX(t, "concurrent-b.docx", "Concurrent master B"),
	}
	for _, prepared := range concurrentResumes {
		defer prepared.Cleanup()
	}
	resultPaths := make(chan string, len(concurrentResumes))
	errorsChannel := make(chan error, len(concurrentResumes))
	var waitGroup sync.WaitGroup
	for _, prepared := range concurrentResumes {
		prepared := prepared
		waitGroup.Add(1)
		go func() {
			defer waitGroup.Done()
			path, err := AddUserResume(ctx, userID, prepared)
			if err != nil {
				errorsChannel <- err
				return
			}
			trackPath(masterBucket, path)
			resultPaths <- path
		}()
	}
	waitGroup.Wait()
	close(errorsChannel)
	close(resultPaths)
	for err := range errorsChannel {
		t.Fatalf("concurrent master replacement: %v", err)
	}
	var concurrentPaths []string
	for path := range resultPaths {
		concurrentPaths = append(concurrentPaths, path)
	}
	if len(concurrentPaths) != len(concurrentResumes) {
		t.Fatalf("successful concurrent uploads = %d, want %d", len(concurrentPaths), len(concurrentResumes))
	}

	var currentMasterPath, currentMasterMIME, currentMasterName, currentMasterText string
	if err := pool.QueryRow(
		ctx,
		`SELECT storage_path, mime_type, original_filename, plaintext FROM user_master_resumes WHERE user_id = $1`,
		userID,
	).Scan(&currentMasterPath, &currentMasterMIME, &currentMasterName, &currentMasterText); err != nil {
		t.Fatalf("read committed master resume: %v", err)
	}
	if currentMasterMIME != resumeupload.DOCXMIMEType || currentMasterText == "" || currentMasterName == "" {
		t.Fatalf("invalid committed master metadata: MIME=%q name=%q text=%q", currentMasterMIME, currentMasterName, currentMasterText)
	}
	assertObjectExists(t, realStorage, masterBucket, currentMasterPath)
	for _, objectPath := range append([]string{initialPath}, concurrentPaths...) {
		if objectPath != currentMasterPath {
			assertObjectMissing(t, realStorage, masterBucket, objectPath)
		}
	}

	if _, err := pool.Exec(
		ctx,
		`INSERT INTO user_generated_resume_drafts (
		   user_id, seek_job_id, resume_json, resume_category,
		   profile_version, template_version, expires_at
		 ) VALUES ($1, $2, '{}'::jsonb, 'technology_product_data', 1, 'technology_product_data_v1', now() + interval '1 day')`,
		userID,
		jobID,
	); err != nil {
		t.Fatalf("create generated resume draft metadata: %v", err)
	}

	generatedOne := prepareIntegrationDOCX(t, "generated-one.docx", "Generated resume one")
	defer generatedOne.Cleanup()
	generatedPathOne, err := AddGeneratedUserResume(ctx, userID, jobID, models.TailoredResume{FullName: "Integration One"}, generatedOne)
	if err != nil {
		t.Fatalf("save first generated resume: %v", err)
	}
	trackPath(generatedBucket, generatedPathOne)

	generatedTwo := prepareIntegrationDOCX(t, "generated-two.docx", "Generated resume two")
	defer generatedTwo.Cleanup()
	generatedPathTwo, err := AddGeneratedUserResume(ctx, userID, jobID, models.TailoredResume{FullName: "Integration Two"}, generatedTwo)
	if err != nil {
		t.Fatalf("replace generated resume: %v", err)
	}
	trackPath(generatedBucket, generatedPathTwo)
	if generatedPathOne == generatedPathTwo {
		t.Fatal("generated resume replacement reused the same object path")
	}
	assertObjectMissing(t, realStorage, generatedBucket, generatedPathOne)
	assertObjectExists(t, realStorage, generatedBucket, generatedPathTwo)

	var currentGeneratedPath, currentGeneratedMIME, currentGeneratedName string
	if err := pool.QueryRow(
		ctx,
		`SELECT storage_path, mime_type, original_filename FROM user_generated_resumes WHERE user_id = $1 AND seek_job_id = $2`,
		userID,
		jobID,
	).Scan(&currentGeneratedPath, &currentGeneratedMIME, &currentGeneratedName); err != nil {
		t.Fatalf("read committed generated resume: %v", err)
	}
	if currentGeneratedPath != generatedPathTwo || currentGeneratedMIME != resumeupload.DOCXMIMEType || currentGeneratedName != "generated-two.docx" {
		t.Fatalf("invalid generated resume metadata: path=%q MIME=%q name=%q", currentGeneratedPath, currentGeneratedMIME, currentGeneratedName)
	}

	if _, err := AddGeneratedUserResume(ctx, userID, "not-owned", models.TailoredResume{}, generatedTwo); !errors.Is(err, ErrGenerationJobNotFound) {
		t.Fatalf("unowned generated resume error = %v, want %v", err, ErrGenerationJobNotFound)
	}

	assertBucketRejects(t, realStorage, masterBucket, userID+"/integration-invalid-"+uuid.NewString()+".pdf", []byte("%PDF-1.7"), "application/pdf")
	assertBucketRejects(
		t,
		realStorage,
		generatedBucket,
		userID+"/integration-oversized-"+uuid.NewString()+".docx",
		bytes.Repeat([]byte("x"), int(resumeupload.MaxDOCXBytes)+1),
		resumeupload.DOCXMIMEType,
	)

	deleted, err := DeleteGeneratedUserResume(ctx, userID, jobID)
	if err != nil || !deleted {
		t.Fatalf("delete generated resume: deleted=%v error=%v", deleted, err)
	}
	var remainingGenerated int
	if err := pool.QueryRow(
		ctx,
		`SELECT count(*) FROM user_generated_resumes WHERE user_id = $1 AND seek_job_id = $2`,
		userID,
		jobID,
	).Scan(&remainingGenerated); err != nil {
		t.Fatalf("count generated resumes after deletion: %v", err)
	}
	if remainingGenerated != 0 {
		t.Fatalf("generated resume row remained after deletion: %d", remainingGenerated)
	}
	assertObjectMissing(t, realStorage, generatedBucket, generatedPathTwo)
	deleted, err = DeleteGeneratedUserResume(ctx, userID, jobID)
	if err != nil || deleted {
		t.Fatalf("repeat generated resume deletion: deleted=%v error=%v", deleted, err)
	}
}

func prepareIntegrationDOCX(t *testing.T, filename, text string) *resumeupload.PreparedDOCX {
	t.Helper()
	filePath := filepath.Join(t.TempDir(), filename)
	file, err := os.Create(filePath)
	if err != nil {
		t.Fatalf("create integration DOCX: %v", err)
	}
	archive := zip.NewWriter(file)
	entries := map[string]string{
		"[Content_Types].xml": `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
		"word/document.xml":   `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>` + text + `</w:t></w:r></w:p></w:body></w:document>`,
	}
	for name, content := range entries {
		entry, err := archive.Create(name)
		if err != nil {
			t.Fatalf("create DOCX entry: %v", err)
		}
		if _, err := io.WriteString(entry, content); err != nil {
			t.Fatalf("write DOCX entry: %v", err)
		}
	}
	if err := archive.Close(); err != nil {
		t.Fatalf("close DOCX archive: %v", err)
	}
	if err := file.Close(); err != nil {
		t.Fatalf("close integration DOCX: %v", err)
	}

	upload, err := os.Open(filePath)
	if err != nil {
		t.Fatalf("open integration DOCX: %v", err)
	}
	defer upload.Close()
	info, err := upload.Stat()
	if err != nil {
		t.Fatalf("stat integration DOCX: %v", err)
	}
	header := &multipart.FileHeader{Filename: filename, Header: make(textproto.MIMEHeader), Size: info.Size()}
	header.Header.Set("Content-Type", resumeupload.DOCXMIMEType)
	prepared, err := resumeupload.PrepareDOCX(upload, header, true)
	if err != nil {
		t.Fatalf("prepare integration DOCX: %v", err)
	}
	return prepared
}

func createIntegrationAuthUser(t *testing.T, ctx context.Context, baseURL, serviceKey string) string {
	t.Helper()
	body, err := json.Marshal(map[string]any{
		"email":         "phase0-step3-" + uuid.NewString() + "@example.test",
		"password":      "Step3!" + uuid.NewString(),
		"email_confirm": true,
	})
	if err != nil {
		t.Fatalf("encode integration user: %v", err)
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, baseURL+"/auth/v1/admin/users", bytes.NewReader(body))
	if err != nil {
		t.Fatalf("create integration user request: %v", err)
	}
	request.Header.Set("apikey", serviceKey)
	request.Header.Set("Authorization", "Bearer "+serviceKey)
	request.Header.Set("Content-Type", "application/json")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatalf("create integration user: %v", err)
	}
	defer response.Body.Close()
	responseBody, _ := io.ReadAll(response.Body)
	if response.StatusCode != http.StatusOK && response.StatusCode != http.StatusCreated {
		t.Fatalf("create integration user returned %d: %s", response.StatusCode, responseBody)
	}
	var user struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(responseBody, &user); err != nil || user.ID == "" {
		t.Fatalf("decode integration user: %v", err)
	}
	return user.ID
}

func deleteIntegrationAuthUser(t *testing.T, ctx context.Context, baseURL, serviceKey, userID string) {
	t.Helper()
	request, err := http.NewRequestWithContext(ctx, http.MethodDelete, baseURL+"/auth/v1/admin/users/"+userID, nil)
	if err != nil {
		t.Errorf("create integration cleanup request: %v", err)
		return
	}
	request.Header.Set("apikey", serviceKey)
	request.Header.Set("Authorization", "Bearer "+serviceKey)
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Errorf("delete integration user: %v", err)
		return
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK && response.StatusCode != http.StatusNoContent {
		body, _ := io.ReadAll(response.Body)
		t.Errorf("delete integration user returned %d: %s", response.StatusCode, body)
	}
}

func assertObjectExists(t *testing.T, client *storage_go.Client, bucket, objectPath string) {
	t.Helper()
	content, err := client.DownloadFile(bucket, objectPath)
	if err != nil {
		t.Fatalf("download current object %s/%s: %v", bucket, objectPath, err)
	}
	if len(content) == 0 {
		t.Fatalf("current object %s/%s was empty", bucket, objectPath)
	}
}

func assertObjectMissing(t *testing.T, client *storage_go.Client, bucket, objectPath string) {
	t.Helper()
	for attempt := 0; attempt < 10; attempt++ {
		// Use a different cache key from the existence check. Supabase can serve
		// a recently downloaded private object from its CDN briefly after delete.
		if _, err := client.DownloadFile(bucket, objectPath, storage_go.UrlOptions{Download: true}); err != nil {
			return
		}
		time.Sleep(200 * time.Millisecond)
	}
	t.Fatalf("superseded object still exists after bounded retry: %s/%s", bucket, objectPath)
}

func assertBucketRejects(t *testing.T, client *storage_go.Client, bucket, objectPath string, content []byte, contentType string) {
	t.Helper()
	if _, err := client.UploadFile(bucket, objectPath, bytes.NewReader(content), storage_go.FileOptions{ContentType: &contentType}); err == nil {
		_, _ = client.RemoveFile(bucket, []string{objectPath})
		t.Fatalf("bucket %s accepted forbidden upload %s (%s, %d bytes)", bucket, objectPath, contentType, len(content))
	}
}
