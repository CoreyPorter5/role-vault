package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/CoreyPorter5/seek-sync/backend/internal/db"
	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
	"github.com/CoreyPorter5/seek-sync/backend/internal/observability"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

const (
	coverLetterGenerationModel = "gpt-5.6-terra"
	coverLetterTemplateVersion = "cover_letter_v1"
)

func ReserveCoverLetterGenerationHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := authenticatedUserID(w, r)
	if !ok {
		return
	}
	var body models.ReserveCoverLetterGenerationRequest
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
	if body.Model != coverLetterGenerationModel {
		writeJSONError(w, http.StatusBadRequest, "INVALID_MODEL", "model is not supported")
		return
	}
	if body.TemplateVersion != coverLetterTemplateVersion {
		writeJSONError(w, http.StatusBadRequest, "INVALID_COVER_LETTER_TEMPLATE", "cover letter template is not supported")
		return
	}

	attempt, err := db.ReserveCoverLetterGeneration(r.Context(), userID, body.GenerationID, body.JobID, body.Model, body.TemplateVersion)
	if err != nil {
		writeCoverLetterGenerationStoreError(w, r, err, "reserve")
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

func CompleteCoverLetterGenerationHandler(w http.ResponseWriter, r *http.Request) {
	userID, generationID, ok := coverLetterGenerationIdentity(w, r)
	if !ok {
		return
	}
	var body models.CompleteCoverLetterGenerationRequest
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
	if err := validateCoverLetter(body.CoverLetter); err != nil {
		writeJSONError(w, http.StatusBadRequest, "INVALID_COVER_LETTER", err.Error())
		return
	}

	attempt, err := db.CompleteCoverLetterGeneration(
		r.Context(), userID, generationID, body.CoverLetter, body.TokenUsage, body.AttemptCount, body.RepairAttempted,
	)
	if err != nil {
		writeCoverLetterGenerationStoreError(w, r, err, "complete")
		return
	}
	writeJSON(w, http.StatusOK, attempt)
}

func RefundCoverLetterGenerationHandler(w http.ResponseWriter, r *http.Request) {
	userID, generationID, ok := coverLetterGenerationIdentity(w, r)
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

	attempt, err := db.RefundCoverLetterGeneration(
		r.Context(), userID, generationID, body.FailureCode, body.FailureDetail,
		body.TokenUsage, body.AttemptCount, body.RepairAttempted,
	)
	if err != nil {
		writeCoverLetterGenerationStoreError(w, r, err, "refund")
		return
	}
	writeJSON(w, http.StatusOK, attempt)
}

func coverLetterGenerationIdentity(w http.ResponseWriter, r *http.Request) (string, string, bool) {
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

func writeCoverLetterGenerationStoreError(w http.ResponseWriter, r *http.Request, err error, action string) {
	switch {
	case errors.Is(err, db.ErrCoverLetterGenerationQuotaExceeded):
		writeJSONError(w, http.StatusPaymentRequired, "GENERATION_LIMIT_REACHED", "Cover letter generation limit reached")
	case errors.Is(err, db.ErrCoverLetterGenerationIDConflict):
		writeJSONError(w, http.StatusConflict, "GENERATION_ID_CONFLICT", "Generation ID is already in use")
	case errors.Is(err, db.ErrGenerationJobNotFound):
		writeJSONError(w, http.StatusNotFound, "JOB_NOT_FOUND", "Job not found")
	case errors.Is(err, db.ErrCoverLetterGenerationNotFound):
		writeJSONError(w, http.StatusNotFound, "GENERATION_NOT_FOUND", "Generation not found")
	case errors.Is(err, db.ErrCoverLetterGenerationRefunded):
		writeJSONError(w, http.StatusConflict, "GENERATION_REFUNDED", "Generation was already refunded")
	case errors.Is(err, db.ErrCoverLetterGenerationCompleted):
		writeJSONError(w, http.StatusConflict, "GENERATION_COMPLETED", "Generation was already completed")
	case errors.Is(err, db.ErrProfileNotFound):
		writeJSONError(w, http.StatusNotFound, "PROFILE_NOT_FOUND", "Profile not found")
	default:
		captureHandlerError(r, observability.CodeCoverLetterGenerationStoreFailed, err, "cover_letter_generation", action)
		writeJSONError(w, http.StatusInternalServerError, "GENERATION_STORE_ERROR", "Failed to update cover letter generation")
	}
}
