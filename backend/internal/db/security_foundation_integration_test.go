//go:build integration

package db

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"testing"
	"time"

	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
	"github.com/CoreyPorter5/seek-sync/backend/internal/resumeupload"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestAuthQuotaUploadAndJobOwnershipIntegration(t *testing.T) {
	databaseURL := os.Getenv("DATABASE_URL")
	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SECRET_API_KEY")
	if databaseURL == "" || supabaseURL == "" || serviceKey == "" {
		t.Skip("DATABASE_URL, SUPABASE_URL, and SUPABASE_SECRET_API_KEY are required")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("connect to integration database: %v", err)
	}
	previousConn := Conn
	Conn = pool
	t.Cleanup(func() {
		Conn = previousConn
		pool.Close()
	})

	firstUser := createSecurityTestUser(t, ctx, supabaseURL, serviceKey)
	secondUser := createSecurityTestUser(t, ctx, supabaseURL, serviceKey)
	t.Cleanup(func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cleanupCancel()
		deleteSecurityTestUser(t, cleanupCtx, supabaseURL, serviceKey, firstUser.ID)
		deleteSecurityTestUser(t, cleanupCtx, supabaseURL, serviceKey, secondUser.ID)
	})

	periodStart := time.Now().UTC().Truncate(time.Second)
	periodEnd := periodStart.Add(freeUsagePeriod)
	for _, user := range []securityTestUser{firstUser, secondUser} {
		if _, err := pool.Exec(
			ctx,
			`INSERT INTO profiles (
			   user_id, email, first_name, last_name, plan,
			   resume_generations_used, resume_generations_limit,
			   resume_usage_period_start, resume_usage_period_end
			 ) VALUES ($1, $2, 'Security', 'Test', 'free', 0, 1, $3, $4)`,
			user.ID,
			user.Email,
			periodStart,
			periodEnd,
		); err != nil {
			t.Fatalf("create profile for %s: %v", user.ID, err)
		}
	}

	firstJobID := "security-first-" + uuid.NewString()
	secondJobID := "security-second-" + uuid.NewString()
	if _, err := pool.Exec(
		ctx,
		`INSERT INTO jobs (
		   user_id, seek_job_id, job_title, company_name, location,
		   job_description, status
		 ) VALUES
		   ($1, $2, 'First private job', 'Example', 'Sydney', 'Private to first user', 'Saved'),
		   ($3, $4, 'Second private job', 'Example', 'Melbourne', 'Private to second user', 'Saved')`,
		firstUser.ID,
		firstJobID,
		secondUser.ID,
		secondJobID,
	); err != nil {
		t.Fatalf("create private jobs: %v", err)
	}

	t.Run("job reads and mutations are owner scoped", func(t *testing.T) {
		jobs, err := GetUserJobs(firstUser.ID)
		if err != nil {
			t.Fatalf("get first user's jobs: %v", err)
		}
		if len(jobs) != 1 || jobs[0].JobID != firstJobID {
			t.Fatalf("first user's jobs = %+v, want only %s", jobs, firstJobID)
		}

		if _, err := GetUserJob(secondUser.ID, firstJobID); !errors.Is(err, pgx.ErrNoRows) {
			t.Fatalf("cross-user job read error = %v, want pgx.ErrNoRows", err)
		}
		updated, err := UpdateJobStatus(secondUser.ID, firstJobID, models.Applied)
		if err != nil || updated {
			t.Fatalf("cross-user job update = (%v, %v), want (false, nil)", updated, err)
		}
		deleted, err := DeleteUserJob(secondUser.ID, firstJobID)
		if err != nil || deleted {
			t.Fatalf("cross-user job delete = (%v, %v), want (false, nil)", deleted, err)
		}

		owned, err := GetUserJob(firstUser.ID, firstJobID)
		if err != nil || owned.Status != string(models.Saved) {
			t.Fatalf("owner's job changed after cross-user mutations: job=%+v error=%v", owned, err)
		}
	})

	t.Run("quota reservation and refund are atomic and idempotent", func(t *testing.T) {
		generationID := uuid.NewString()
		reserved, err := ReserveResumeGeneration(ctx, firstUser.ID, generationID, firstJobID, "gpt-5-nano")
		if err != nil {
			t.Fatalf("reserve first credit: %v", err)
		}
		if !reserved.Created || reserved.Usage.Used != 1 || reserved.Usage.Remaining != 0 {
			t.Fatalf("first reservation = %+v, want newly created 1/1 usage", reserved)
		}

		duplicate, err := ReserveResumeGeneration(ctx, firstUser.ID, generationID, firstJobID, "gpt-5-nano")
		if err != nil || duplicate.Created || duplicate.Usage.Used != 1 {
			t.Fatalf("duplicate reservation = %+v, error=%v; want idempotent 1/1", duplicate, err)
		}
		if _, err := ReserveResumeGeneration(ctx, firstUser.ID, uuid.NewString(), firstJobID, "gpt-5-nano"); !errors.Is(err, ErrGenerationQuotaExceeded) {
			t.Fatalf("exhausted reservation error = %v, want %v", err, ErrGenerationQuotaExceeded)
		}
		if _, err := ReserveResumeGeneration(ctx, secondUser.ID, uuid.NewString(), firstJobID, "gpt-5-nano"); !errors.Is(err, ErrGenerationJobNotFound) {
			t.Fatalf("foreign-job reservation error = %v, want %v", err, ErrGenerationJobNotFound)
		}
		if _, err := CompleteResumeGeneration(ctx, secondUser.ID, generationID, models.TailoredResume{}, json.RawMessage(`{}`), 1, false); !errors.Is(err, ErrGenerationNotFound) {
			t.Fatalf("cross-user completion error = %v, want %v", err, ErrGenerationNotFound)
		}

		refunded, err := RefundResumeGeneration(ctx, firstUser.ID, generationID, "test_failure", "Injected test failure", json.RawMessage(`{}`), 1, false)
		if err != nil || refunded.Usage.Used != 0 || refunded.Status != "refunded" {
			t.Fatalf("refund = %+v, error=%v; want refunded 0/1", refunded, err)
		}
		duplicateRefund, err := RefundResumeGeneration(ctx, firstUser.ID, generationID, "test_failure", "Injected test failure", json.RawMessage(`{}`), 1, false)
		if err != nil || duplicateRefund.Usage.Used != 0 {
			t.Fatalf("duplicate refund = %+v, error=%v; want idempotent 0/1", duplicateRefund, err)
		}
	})

	t.Run("resume metadata and generated uploads cannot cross owners", func(t *testing.T) {
		if _, err := pool.Exec(
			ctx,
			`INSERT INTO user_master_resumes (
			   user_id, storage_path, mime_type, original_filename, plaintext
			 ) VALUES ($1, $2, $3, 'master.docx', 'Private resume text')`,
			firstUser.ID,
			firstUser.ID+"/master-resumes/test.docx",
			resumeupload.DOCXMIMEType,
		); err != nil {
			t.Fatalf("create first user's master resume metadata: %v", err)
		}

		if _, err := GetUserResume(secondUser.ID); !errors.Is(err, pgx.ErrNoRows) {
			t.Fatalf("cross-user resume read error = %v, want pgx.ErrNoRows", err)
		}
		updated, err := UpdateUserResume(secondUser.ID, "Attacker replacement")
		if err != nil || updated {
			t.Fatalf("cross-user resume update = (%v, %v), want (false, nil)", updated, err)
		}

		prepared := &resumeupload.PreparedDOCX{TempPath: "must-not-be-opened.docx", OriginalFilename: "generated.docx"}
		if _, err := AddGeneratedUserResume(ctx, secondUser.ID, firstJobID, models.TailoredResume{}, prepared); !errors.Is(err, ErrGenerationJobNotFound) {
			t.Fatalf("foreign-job generated upload error = %v, want %v", err, ErrGenerationJobNotFound)
		}
	})

	t.Run("owner deletion removes job-scoped records", func(t *testing.T) {
		if _, err := pool.Exec(
			ctx,
			`INSERT INTO user_generated_resume_drafts (
			   user_id, seek_job_id, resume_json, expires_at
			 ) VALUES ($1, $2, '{}'::jsonb, now() + interval '1 day')`,
			firstUser.ID,
			firstJobID,
		); err != nil {
			t.Fatalf("create draft deletion fixture: %v", err)
		}
		if _, err := pool.Exec(
			ctx,
			`INSERT INTO user_generated_resumes (
			   user_id, seek_job_id, resume_json, storage_path, mime_type, original_filename
			 ) VALUES ($1, $2, '{}'::jsonb, $3, $4, 'generated.docx')`,
			firstUser.ID,
			firstJobID,
			firstUser.ID+"/generated-resumes/test.docx",
			resumeupload.DOCXMIMEType,
		); err != nil {
			t.Fatalf("create generated-resume deletion fixture: %v", err)
		}

		deleted, err := DeleteUserJob(firstUser.ID, firstJobID)
		if err != nil || !deleted {
			t.Fatalf("owner job deletion = (%v, %v), want (true, nil)", deleted, err)
		}

		for _, table := range []string{
			"jobs",
			"resume_generation_attempts",
			"user_generated_resume_drafts",
			"user_generated_resumes",
		} {
			var count int
			query := fmt.Sprintf("SELECT count(*) FROM %s WHERE user_id = $1 AND seek_job_id = $2", table)
			if err := pool.QueryRow(ctx, query, firstUser.ID, firstJobID).Scan(&count); err != nil {
				t.Fatalf("count %s after job deletion: %v", table, err)
			}
			if count != 0 {
				t.Fatalf("%s rows after job deletion = %d, want 0", table, count)
			}
		}

		if _, err := GetUserJob(secondUser.ID, secondJobID); err != nil {
			t.Fatalf("deleting first user's job affected second user's job: %v", err)
		}
		if _, err := GetUserResume(firstUser.ID); err != nil {
			t.Fatalf("job deletion removed the user's master resume: %v", err)
		}
	})
}

type securityTestUser struct {
	ID    string
	Email string
}

func createSecurityTestUser(t *testing.T, ctx context.Context, baseURL, serviceKey string) securityTestUser {
	t.Helper()
	email := "security-foundation-" + uuid.NewString() + "@example.test"
	body, err := json.Marshal(map[string]any{
		"email":         email,
		"password":      "Security!" + uuid.NewString(),
		"email_confirm": true,
	})
	if err != nil {
		t.Fatalf("encode temporary auth user: %v", err)
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, baseURL+"/auth/v1/admin/users", bytes.NewReader(body))
	if err != nil {
		t.Fatalf("create temporary auth-user request: %v", err)
	}
	request.Header.Set("apikey", serviceKey)
	request.Header.Set("Authorization", "Bearer "+serviceKey)
	request.Header.Set("Content-Type", "application/json")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatalf("create temporary auth user: %v", err)
	}
	defer response.Body.Close()
	responseBody, _ := io.ReadAll(response.Body)
	if response.StatusCode != http.StatusOK && response.StatusCode != http.StatusCreated {
		t.Fatalf("create temporary auth user returned %d: %s", response.StatusCode, responseBody)
	}
	var result struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(responseBody, &result); err != nil || result.ID == "" {
		t.Fatalf("decode temporary auth user: %v", err)
	}
	return securityTestUser{ID: result.ID, Email: email}
}

func deleteSecurityTestUser(t *testing.T, ctx context.Context, baseURL, serviceKey, userID string) {
	t.Helper()
	request, err := http.NewRequestWithContext(ctx, http.MethodDelete, fmt.Sprintf("%s/auth/v1/admin/users/%s", baseURL, userID), nil)
	if err != nil {
		t.Errorf("create auth-user cleanup request: %v", err)
		return
	}
	request.Header.Set("apikey", serviceKey)
	request.Header.Set("Authorization", "Bearer "+serviceKey)
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Errorf("delete temporary auth user: %v", err)
		return
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK && response.StatusCode != http.StatusNoContent {
		body, _ := io.ReadAll(response.Body)
		t.Errorf("delete temporary auth user returned %d: %s", response.StatusCode, body)
	}
}
