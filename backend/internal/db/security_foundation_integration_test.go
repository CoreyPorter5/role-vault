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
		   job_description, status, resume_category, resume_category_source,
		   resume_category_status, resume_category_resolved_at
		 ) VALUES
		   ($1, $2, 'First private job', 'Example', 'Sydney', 'Private to first user', 'Saved', 'technology_product_data', 'user', 'classified', now()),
		   ($3, $4, 'Second private job', 'Example', 'Melbourne', 'Private to second user', 'Saved', 'technology_product_data', 'user', 'classified', now())`,
		firstUser.ID,
		firstJobID,
		secondUser.ID,
		secondJobID,
	); err != nil {
		t.Fatalf("create private jobs: %v", err)
	}

	t.Run("job reads and mutations are owner scoped", func(t *testing.T) {
		jobs, err := GetUserJobs(ctx, firstUser.ID)
		if err != nil {
			t.Fatalf("get first user's jobs: %v", err)
		}
		if len(jobs) != 1 || jobs[0].JobID != firstJobID {
			t.Fatalf("first user's jobs = %+v, want only %s", jobs, firstJobID)
		}

		if _, err := GetUserJob(ctx, secondUser.ID, firstJobID); !errors.Is(err, pgx.ErrNoRows) {
			t.Fatalf("cross-user job read error = %v, want pgx.ErrNoRows", err)
		}
		updated, err := UpdateJobStatus(ctx, secondUser.ID, firstJobID, models.Applied)
		if err != nil || updated {
			t.Fatalf("cross-user job update = (%v, %v), want (false, nil)", updated, err)
		}
		deleted, err := DeleteUserJob(context.Background(), secondUser.ID, firstJobID)
		if err != nil || deleted {
			t.Fatalf("cross-user job delete = (%v, %v), want (false, nil)", deleted, err)
		}

		owned, err := GetUserJob(ctx, firstUser.ID, firstJobID)
		if err != nil || owned.Status != string(models.Saved) {
			t.Fatalf("owner's job changed after cross-user mutations: job=%+v error=%v", owned, err)
		}
	})

	t.Run("job classification is claimed once, cached, and cannot overwrite a user choice", func(t *testing.T) {
		classificationJobID := "classification-" + uuid.NewString()
		manualOverrideJobID := "classification-manual-" + uuid.NewString()
		if _, err := pool.Exec(
			ctx,
			`INSERT INTO jobs (
			   user_id, seek_job_id, job_title, company_name, location, job_description, status
			 ) VALUES
			   ($1, $2, 'Data Analyst', 'Example', 'Sydney', 'Analyse data and build reports.', 'Saved'),
			   ($1, $3, 'Operations Analyst', 'Example', 'Sydney', 'Coordinate operational reporting.', 'Saved')`,
			firstUser.ID,
			classificationJobID,
			manualOverrideJobID,
		); err != nil {
			t.Fatalf("create classification fixtures: %v", err)
		}

		firstClaim, err := ClaimJobResumeCategory(ctx, firstUser.ID, classificationJobID, "gpt-5-nano", 1)
		if err != nil || !firstClaim.Claimed || firstClaim.Status != "classifying" {
			t.Fatalf("first classification claim = %+v, error=%v", firstClaim, err)
		}
		secondClaim, err := ClaimJobResumeCategory(ctx, firstUser.ID, classificationJobID, "gpt-5-nano", 1)
		if err != nil || secondClaim.Claimed || secondClaim.Status != "classifying" {
			t.Fatalf("duplicate classification claim = %+v, error=%v", secondClaim, err)
		}
		completed, err := CompleteJobResumeCategory(
			ctx,
			firstUser.ID,
			classificationJobID,
			models.ResumeCategoryTechnologyProductData,
			0.95,
		)
		if err != nil || completed.Category == nil || *completed.Category != models.ResumeCategoryTechnologyProductData {
			t.Fatalf("complete classification = %+v, error=%v", completed, err)
		}
		cached, err := ClaimJobResumeCategory(ctx, firstUser.ID, classificationJobID, "gpt-5-nano", 1)
		if err != nil || cached.Claimed || cached.Status != "classified" {
			t.Fatalf("cached classification = %+v, error=%v", cached, err)
		}

		if _, err := ClaimJobResumeCategory(ctx, firstUser.ID, manualOverrideJobID, "gpt-5-nano", 1); err != nil {
			t.Fatalf("claim manual-override fixture: %v", err)
		}
		manual, err := SetJobResumeCategory(ctx, firstUser.ID, manualOverrideJobID, models.ResumeCategoryFinanceAccounting)
		if err != nil || manual.Source == nil || *manual.Source != "user" {
			t.Fatalf("manual category override = %+v, error=%v", manual, err)
		}
		afterLateAI, err := CompleteJobResumeCategory(
			ctx,
			firstUser.ID,
			manualOverrideJobID,
			models.ResumeCategoryTechnologyProductData,
			0.99,
		)
		if err != nil || afterLateAI.Category == nil || *afterLateAI.Category != models.ResumeCategoryFinanceAccounting || afterLateAI.Source == nil || *afterLateAI.Source != "user" {
			t.Fatalf("late AI result overwrote manual category: state=%+v error=%v", afterLateAI, err)
		}
	})

	t.Run("failed and stale job classifications can be reclaimed", func(t *testing.T) {
		failedJobID := "classification-failed-" + uuid.NewString()
		staleJobID := "classification-stale-" + uuid.NewString()
		if _, err := pool.Exec(
			ctx,
			`INSERT INTO jobs (
			   user_id, seek_job_id, job_title, company_name, location, job_description, status
			 ) VALUES
			   ($1, $2, 'Finance Analyst', 'Example', 'Sydney', 'Prepare financial reports and forecasts.', 'Saved'),
			   ($1, $3, 'Software Engineer', 'Example', 'Sydney', 'Build and maintain software systems.', 'Saved')`,
			firstUser.ID,
			failedJobID,
			staleJobID,
		); err != nil {
			t.Fatalf("create retry classification fixtures: %v", err)
		}

		if _, err := ClaimJobResumeCategory(ctx, firstUser.ID, failedJobID, "gpt-5-nano", 1); err != nil {
			t.Fatalf("claim failed classification fixture: %v", err)
		}
		if _, err := FailJobResumeCategory(ctx, firstUser.ID, failedJobID, "classification_failed", nil); err != nil {
			t.Fatalf("fail classification fixture: %v", err)
		}
		retried, err := ClaimJobResumeCategory(ctx, firstUser.ID, failedJobID, "gpt-5-nano", 1)
		if err != nil || !retried.Claimed || retried.Status != "classifying" || retried.FailureCode != nil {
			t.Fatalf("retry failed classification = %+v, error=%v", retried, err)
		}

		if _, err := ClaimJobResumeCategory(ctx, firstUser.ID, staleJobID, "gpt-5-nano", 1); err != nil {
			t.Fatalf("claim stale classification fixture: %v", err)
		}
		if _, err := pool.Exec(
			ctx,
			`UPDATE jobs
			 SET resume_category_started_at = now() - interval '3 minutes'
			 WHERE user_id = $1 AND seek_job_id = $2`,
			firstUser.ID,
			staleJobID,
		); err != nil {
			t.Fatalf("age stale classification fixture: %v", err)
		}
		reclaimed, err := ClaimJobResumeCategory(ctx, firstUser.ID, staleJobID, "gpt-5-nano", 1)
		if err != nil || !reclaimed.Claimed || reclaimed.Status != "classifying" {
			t.Fatalf("reclaim stale classification = %+v, error=%v", reclaimed, err)
		}
	})

	t.Run("quota reservation and refund are atomic and idempotent", func(t *testing.T) {
		generationID := uuid.NewString()
		reserved, err := ReserveResumeGeneration(ctx, firstUser.ID, generationID, firstJobID, "gpt-5-nano", models.ResumeCategoryTechnologyProductData, 1, "technology_product_data_v1")
		if err != nil {
			t.Fatalf("reserve first credit: %v", err)
		}
		if !reserved.Created || reserved.Usage.Used != 1 || reserved.Usage.Remaining != 0 {
			t.Fatalf("first reservation = %+v, want newly created 1/1 usage", reserved)
		}

		duplicate, err := ReserveResumeGeneration(ctx, firstUser.ID, generationID, firstJobID, "gpt-5-nano", models.ResumeCategoryTechnologyProductData, 1, "technology_product_data_v1")
		if err != nil || duplicate.Created || duplicate.Usage.Used != 1 {
			t.Fatalf("duplicate reservation = %+v, error=%v; want idempotent 1/1", duplicate, err)
		}
		if _, err := ReserveResumeGeneration(ctx, firstUser.ID, uuid.NewString(), firstJobID, "gpt-5-nano", models.ResumeCategoryTechnologyProductData, 1, "technology_product_data_v1"); !errors.Is(err, ErrGenerationQuotaExceeded) {
			t.Fatalf("exhausted reservation error = %v, want %v", err, ErrGenerationQuotaExceeded)
		}
		if _, err := ReserveResumeGeneration(ctx, secondUser.ID, uuid.NewString(), firstJobID, "gpt-5-nano", models.ResumeCategoryTechnologyProductData, 1, "technology_product_data_v1"); !errors.Is(err, ErrGenerationJobNotFound) {
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

	t.Run("cover letter completion persists a thirty day draft", func(t *testing.T) {
		jobID := "cover-letter-completion-" + uuid.NewString()
		if _, err := pool.Exec(
			ctx,
			`INSERT INTO jobs (
			   user_id, seek_job_id, job_title, company_name, location, job_description, status
			 ) VALUES ($1, $2, 'Software Engineer', 'Example', 'Sydney', 'Build reliable systems.', 'Saved')`,
			firstUser.ID,
			jobID,
		); err != nil {
			t.Fatalf("create cover-letter completion job: %v", err)
		}
		defer func() {
			_, _ = pool.Exec(ctx, `DELETE FROM jobs WHERE user_id = $1 AND seek_job_id = $2`, firstUser.ID, jobID)
		}()

		generationID := uuid.NewString()
		reserved, err := ReserveCoverLetterGeneration(
			ctx,
			firstUser.ID,
			generationID,
			jobID,
			"gpt-5.6-terra",
			"cover_letter_v1",
		)
		if err != nil || !reserved.Created {
			t.Fatalf("reserve cover-letter generation = %+v, error=%v", reserved, err)
		}

		completed, err := CompleteCoverLetterGeneration(
			ctx,
			firstUser.ID,
			generationID,
			models.CoverLetter{
				CandidateName:    "Security Test",
				CompanyName:      "Example",
				Salutation:       "Dear Hiring Manager,",
				OpeningParagraph: "I am applying for the Software Engineer role.",
				BodyParagraphs: []string{
					"I have delivered reliable software systems for customers.",
					"My experience aligns with the role's engineering requirements.",
				},
				ClosingParagraph: "I would welcome the opportunity to discuss my application.",
				SignOff:          "Kind regards,",
			},
			json.RawMessage(`{"calls":[]}`),
			1,
			false,
		)
		if err != nil || completed.Status != "succeeded" {
			t.Fatalf("complete cover-letter generation = %+v, error=%v", completed, err)
		}

		var expiresInThirtyDays bool
		if err := pool.QueryRow(
			ctx,
			`SELECT expires_at = created_at + interval '30 days'
			 FROM user_generated_cover_letter_drafts
			 WHERE user_id = $1 AND seek_job_id = $2`,
			firstUser.ID,
			jobID,
		).Scan(&expiresInThirtyDays); err != nil {
			t.Fatalf("read generated cover-letter draft expiry: %v", err)
		}
		if !expiresInThirtyDays {
			t.Fatal("generated cover-letter draft did not receive an exact 30-day expiry")
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

		if _, err := GetUserResume(ctx, secondUser.ID); !errors.Is(err, pgx.ErrNoRows) {
			t.Fatalf("cross-user resume read error = %v, want pgx.ErrNoRows", err)
		}
		updated, err := UpdateUserResume(ctx, secondUser.ID, "Attacker replacement")
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
			`INSERT INTO cover_letter_generation_attempts (
			   id, user_id, seek_job_id, model, template_version, usage_period_start
			 ) VALUES ('f3ddc574-f72e-4a23-99f5-157a85adb6a8', $1, $2, 'gpt-5.6-terra', 'cover_letter_v1', now())`,
			firstUser.ID,
			firstJobID,
		); err != nil {
			t.Fatalf("create cover-letter attempt deletion fixture: %v", err)
		}
		if _, err := pool.Exec(
			ctx,
			`INSERT INTO user_generated_cover_letter_drafts (
			   user_id, seek_job_id, cover_letter_json, template_version, expires_at
			 ) VALUES ($1, $2, '{}'::jsonb, 'cover_letter_v1', now() + interval '1 day')`,
			firstUser.ID,
			firstJobID,
		); err != nil {
			t.Fatalf("create cover-letter draft deletion fixture: %v", err)
		}
		if _, err := pool.Exec(
			ctx,
			`INSERT INTO user_generated_cover_letters (
			   user_id, seek_job_id, cover_letter_json, template_version
			 ) VALUES ($1, $2, '{}'::jsonb, 'cover_letter_v1')`,
			firstUser.ID,
			firstJobID,
		); err != nil {
			t.Fatalf("create saved cover-letter deletion fixture: %v", err)
		}
		if _, err := pool.Exec(
			ctx,
			`INSERT INTO user_generated_resume_drafts (
			   user_id, seek_job_id, resume_json, expires_at,
			   resume_category, profile_version, template_version
			 ) VALUES ($1, $2, '{}'::jsonb, now() + interval '1 day', 'technology_product_data', 1, 'technology_product_data_v1')`,
			firstUser.ID,
			firstJobID,
		); err != nil {
			t.Fatalf("create draft deletion fixture: %v", err)
		}
		if _, err := pool.Exec(
			ctx,
			`INSERT INTO user_generated_resumes (
			   user_id, seek_job_id, resume_json, storage_path, mime_type, original_filename,
			   resume_category, profile_version, template_version
			 ) VALUES ($1, $2, '{}'::jsonb, $3, $4, 'generated.docx', 'technology_product_data', 1, 'technology_product_data_v1')`,
			firstUser.ID,
			firstJobID,
			firstUser.ID+"/generated-resumes/test.docx",
			resumeupload.DOCXMIMEType,
		); err != nil {
			t.Fatalf("create generated-resume deletion fixture: %v", err)
		}

		deleted, err := DeleteUserJob(context.Background(), firstUser.ID, firstJobID)
		if err != nil || !deleted {
			t.Fatalf("owner job deletion = (%v, %v), want (true, nil)", deleted, err)
		}

		for _, table := range []string{
			"jobs",
			"resume_generation_attempts",
			"cover_letter_generation_attempts",
			"user_generated_resume_drafts",
			"user_generated_cover_letter_drafts",
			"user_generated_resumes",
			"user_generated_cover_letters",
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

		if _, err := GetUserJob(ctx, secondUser.ID, secondJobID); err != nil {
			t.Fatalf("deleting first user's job affected second user's job: %v", err)
		}
		if _, err := GetUserResume(ctx, firstUser.ID); err != nil {
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
