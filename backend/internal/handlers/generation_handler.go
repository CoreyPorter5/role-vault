package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/CoreyPorter5/seek-sync/backend/internal/auth_middleware"
	"github.com/CoreyPorter5/seek-sync/backend/internal/db"
	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
	"github.com/CoreyPorter5/seek-sync/backend/internal/observability"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

const (
	resumeGenerationModel = "gpt-5.6-terra"
	maxGenerationBodySize = int64(1 << 20)
)

func ReserveResumeGenerationHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := authenticatedUserID(w, r)
	if !ok {
		return
	}

	var body models.ReserveResumeGenerationRequest
	if err := decodeGenerationJSON(w, r, &body); err != nil {
		writeJSONError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}

	body.GenerationID = strings.TrimSpace(body.GenerationID)
	body.JobID = strings.TrimSpace(body.JobID)
	body.Model = strings.TrimSpace(body.Model)
	body.TemplateVersion = strings.TrimSpace(body.TemplateVersion)
	if _, err := uuid.Parse(body.GenerationID); err != nil {
		writeJSONError(w, http.StatusBadRequest, "INVALID_GENERATION_ID", "generation_id must be a UUID")
		return
	}
	if body.JobID == "" {
		writeJSONError(w, http.StatusBadRequest, "INVALID_JOB_ID", "job_id is required")
		return
	}
	if body.Model != resumeGenerationModel {
		writeJSONError(w, http.StatusBadRequest, "INVALID_MODEL", "model is not supported")
		return
	}
	if !models.ValidResumeProfileSelection(body.ResumeCategory, body.ProfileVersion, body.TemplateVersion) {
		writeJSONError(w, http.StatusBadRequest, "INVALID_RESUME_PROFILE", "resume category or profile version is not supported")
		return
	}

	attempt, err := db.ReserveResumeGeneration(
		r.Context(),
		userID,
		body.GenerationID,
		body.JobID,
		body.Model,
		body.ResumeCategory,
		body.ProfileVersion,
		body.TemplateVersion,
	)
	if err != nil {
		writeGenerationStoreError(w, r, err, "reserve")
		return
	}

	status := http.StatusOK
	if attempt.Created {
		status = http.StatusCreated
	} else if attempt.Status == "reserved" {
		status = http.StatusAccepted
	}
	writeJSON(w, status, attempt)
}

func CompleteResumeGenerationHandler(w http.ResponseWriter, r *http.Request) {
	userID, generationID, ok := generationRequestIdentity(w, r)
	if !ok {
		return
	}

	var body models.CompleteResumeGenerationRequest
	if err := decodeGenerationJSON(w, r, &body); err != nil {
		writeJSONError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	if body.AttemptCount < 1 || body.AttemptCount > 2 {
		writeJSONError(w, http.StatusBadRequest, "INVALID_ATTEMPT_COUNT", "attempt_count must be between 1 and 2")
		return
	}
	if len(body.TokenUsage) == 0 || !json.Valid(body.TokenUsage) || string(body.TokenUsage) == "null" {
		writeJSONError(w, http.StatusBadRequest, "INVALID_TOKEN_USAGE", "token_usage must be valid JSON")
		return
	}
	if err := validateTailoredResume(body.Resume); err != nil {
		writeJSONError(w, http.StatusBadRequest, "INVALID_RESUME", err.Error())
		return
	}

	attempt, err := db.CompleteResumeGeneration(
		r.Context(),
		userID,
		generationID,
		body.Resume,
		body.TokenUsage,
		body.AttemptCount,
		body.RepairAttempted,
	)
	if err != nil {
		writeGenerationStoreError(w, r, err, "complete")
		return
	}

	writeJSON(w, http.StatusOK, attempt)
}

func RefundResumeGenerationHandler(w http.ResponseWriter, r *http.Request) {
	userID, generationID, ok := generationRequestIdentity(w, r)
	if !ok {
		return
	}

	var body models.FailResumeGenerationRequest
	if err := decodeGenerationJSON(w, r, &body); err != nil {
		writeJSONError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	body.FailureCode = strings.TrimSpace(body.FailureCode)
	body.FailureDetail = strings.TrimSpace(body.FailureDetail)
	if body.FailureCode == "" || len(body.FailureCode) > 64 {
		writeJSONError(w, http.StatusBadRequest, "INVALID_FAILURE_CODE", "failure_code is required and must not exceed 64 characters")
		return
	}
	if len(body.TokenUsage) == 0 || !json.Valid(body.TokenUsage) || string(body.TokenUsage) == "null" {
		writeJSONError(w, http.StatusBadRequest, "INVALID_TOKEN_USAGE", "token_usage must be valid JSON")
		return
	}
	if detailRunes := []rune(body.FailureDetail); len(detailRunes) > 500 {
		body.FailureDetail = string(detailRunes[:500])
	}
	if body.AttemptCount < 0 || body.AttemptCount > 2 {
		writeJSONError(w, http.StatusBadRequest, "INVALID_ATTEMPT_COUNT", "attempt_count must be between 0 and 2")
		return
	}

	attempt, err := db.RefundResumeGeneration(
		r.Context(),
		userID,
		generationID,
		body.FailureCode,
		body.FailureDetail,
		body.TokenUsage,
		body.AttemptCount,
		body.RepairAttempted,
	)
	if err != nil {
		writeGenerationStoreError(w, r, err, "refund")
		return
	}

	writeJSON(w, http.StatusOK, attempt)
}

func authenticatedUserID(w http.ResponseWriter, r *http.Request) (string, bool) {
	userID, ok := r.Context().Value(auth_middleware.UserIDKey).(string)
	if !ok || userID == "" {
		writeJSONError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "User ID not found in context")
		return "", false
	}
	return userID, true
}

func generationRequestIdentity(w http.ResponseWriter, r *http.Request) (string, string, bool) {
	userID, ok := authenticatedUserID(w, r)
	if !ok {
		return "", "", false
	}
	generationID := strings.TrimSpace(chi.URLParam(r, "generationID"))
	if _, err := uuid.Parse(generationID); err != nil {
		writeJSONError(w, http.StatusBadRequest, "INVALID_GENERATION_ID", "generation ID must be a UUID")
		return "", "", false
	}
	return userID, generationID, true
}

func decodeGenerationJSON(w http.ResponseWriter, r *http.Request, destination any) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxGenerationBodySize)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(destination); err != nil {
		return fmt.Errorf("invalid JSON body")
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return fmt.Errorf("request body must contain one JSON object")
	}
	return nil
}

func writeGenerationStoreError(w http.ResponseWriter, r *http.Request, err error, action string) {
	switch {
	case errors.Is(err, db.ErrDocumentCreditsExhausted):
		writeJSONError(w, http.StatusPaymentRequired, "DOCUMENT_CREDITS_EXHAUSTED", "You do not have any document credits remaining")
	case errors.Is(err, db.ErrGenerationQuotaExceeded):
		writeJSONError(w, http.StatusPaymentRequired, "GENERATION_LIMIT_REACHED", "Resume generation limit reached")
	case errors.Is(err, db.ErrGenerationIDConflict):
		writeJSONError(w, http.StatusConflict, "GENERATION_ID_CONFLICT", "Generation ID is already in use")
	case errors.Is(err, db.ErrGenerationJobNotFound):
		writeJSONError(w, http.StatusNotFound, "JOB_NOT_FOUND", "Job not found")
	case errors.Is(err, db.ErrGenerationNotFound):
		writeJSONError(w, http.StatusNotFound, "GENERATION_NOT_FOUND", "Generation not found")
	case errors.Is(err, db.ErrGenerationRefunded):
		writeJSONError(w, http.StatusConflict, "GENERATION_REFUNDED", "Generation was already refunded")
	case errors.Is(err, db.ErrGenerationCompleted):
		writeJSONError(w, http.StatusConflict, "GENERATION_COMPLETED", "Generation was already completed")
	case errors.Is(err, db.ErrGenerationCategoryMismatch):
		writeJSONError(w, http.StatusConflict, "RESUME_CATEGORY_MISMATCH", "The selected resume category is no longer current for this job")
	case errors.Is(err, db.ErrProfileNotFound):
		writeJSONError(w, http.StatusNotFound, "PROFILE_NOT_FOUND", "Profile not found")
	default:
		captureHandlerError(r, observability.CodeResumeGenerationStoreFailed, err, "resume_generation", action)
		writeJSONError(w, http.StatusInternalServerError, "GENERATION_STORE_ERROR", "Failed to update resume generation")
	}
}

func writeJSONError(w http.ResponseWriter, status int, code string, message string) {
	writeJSON(w, status, map[string]string{"code": code, "message": message})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		fmt.Printf("Failed to encode JSON response: %v\n", err)
	}
}

func validateTailoredResume(resume models.TailoredResume) error {
	if utf8.RuneCountInString(resume.FullName) > 80 || utf8.RuneCountInString(resume.ProfessionalTitle) > 80 {
		return fmt.Errorf("resume heading exceeds the allowed length")
	}
	if utf8.RuneCountInString(resume.ProfessionalSummary) > 550 {
		return fmt.Errorf("professional summary exceeds the allowed length")
	}
	if len(resume.Skills) > 15 || len(resume.Experience) > 5 || len(resume.Projects) > 3 || len(resume.Credentials) > 8 || len(resume.Education) > 3 {
		return fmt.Errorf("resume contains too many section entries")
	}
	for _, skill := range resume.Skills {
		if utf8.RuneCountInString(skill) > 80 {
			return fmt.Errorf("a skill exceeds the allowed length")
		}
	}
	for _, experience := range resume.Experience {
		if len(experience.Bullets) < 2 || len(experience.Bullets) > 6 {
			return fmt.Errorf("experience bullets must contain between 2 and 6 items")
		}
		for _, bullet := range experience.Bullets {
			if utf8.RuneCountInString(bullet) > 220 {
				return fmt.Errorf("an experience bullet exceeds the allowed length")
			}
		}
	}
	for _, project := range resume.Projects {
		if len(project.Bullets) < 2 || len(project.Bullets) > 5 {
			return fmt.Errorf("project bullets must contain between 2 and 5 items")
		}
		for _, bullet := range project.Bullets {
			if utf8.RuneCountInString(bullet) > 220 {
				return fmt.Errorf("a project bullet exceeds the allowed length")
			}
		}
	}
	for _, credential := range resume.Credentials {
		if utf8.RuneCountInString(credential.Name) > 120 ||
			(credential.Issuer != nil && utf8.RuneCountInString(*credential.Issuer) > 100) ||
			(credential.Date != nil && utf8.RuneCountInString(*credential.Date) > 40) {
			return fmt.Errorf("a credential exceeds the allowed length")
		}
	}
	return nil
}
