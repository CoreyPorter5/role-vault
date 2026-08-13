package handlers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/CoreyPorter5/seek-sync/backend/internal/db"
	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
	"github.com/CoreyPorter5/seek-sync/backend/internal/observability"
	"github.com/go-chi/chi/v5"
)

const (
	jobClassificationModel   = "gpt-5-nano-2025-08-07"
	jobClassificationVersion = 2
)

func GetJobResumeCategoryHandler(w http.ResponseWriter, r *http.Request) {
	userID, jobID, ok := jobCategoryRequestIdentity(w, r)
	if !ok {
		return
	}

	state, err := db.GetJobResumeCategory(r.Context(), userID, jobID)
	if err != nil {
		writeJobCategoryStoreError(w, r, err, "read")
		return
	}
	writeJSON(w, http.StatusOK, state)
}

func SetJobResumeCategoryHandler(w http.ResponseWriter, r *http.Request) {
	userID, jobID, ok := jobCategoryRequestIdentity(w, r)
	if !ok {
		return
	}

	var body models.SetJobResumeCategoryRequest
	if err := decodeGenerationJSON(w, r, &body); err != nil {
		writeJSONError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	if !body.Category.Valid() {
		writeJSONError(w, http.StatusBadRequest, "INVALID_RESUME_CATEGORY", "category is not supported")
		return
	}

	state, err := db.SetJobResumeCategory(r.Context(), userID, jobID, body.Category)
	if err != nil {
		writeJobCategoryStoreError(w, r, err, "set")
		return
	}
	writeJSON(w, http.StatusOK, state)
}

func ClaimJobResumeCategoryHandler(w http.ResponseWriter, r *http.Request) {
	userID, jobID, ok := jobCategoryRequestIdentity(w, r)
	if !ok {
		return
	}

	var body models.ClaimJobResumeCategoryRequest
	if err := decodeGenerationJSON(w, r, &body); err != nil {
		writeJSONError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	body.ClassifierModel = strings.TrimSpace(body.ClassifierModel)
	if body.ClassifierModel != jobClassificationModel || body.ClassifierVersion != jobClassificationVersion {
		writeJSONError(w, http.StatusBadRequest, "INVALID_CLASSIFIER", "classifier is not supported")
		return
	}

	state, err := db.ClaimJobResumeCategory(
		r.Context(),
		userID,
		jobID,
		body.ClassifierModel,
		body.ClassifierVersion,
	)
	if err != nil {
		writeJobCategoryStoreError(w, r, err, "claim")
		return
	}
	status := http.StatusOK
	if state.Claimed {
		status = http.StatusCreated
	}
	writeJSON(w, status, state)
}

func CompleteJobResumeCategoryHandler(w http.ResponseWriter, r *http.Request) {
	userID, jobID, ok := jobCategoryRequestIdentity(w, r)
	if !ok {
		return
	}

	var body models.CompleteJobResumeCategoryRequest
	if err := decodeGenerationJSON(w, r, &body); err != nil {
		writeJSONError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	if !body.Category.Valid() {
		writeJSONError(w, http.StatusBadRequest, "INVALID_RESUME_CATEGORY", "category is not supported")
		return
	}
	if body.Confidence < 0 || body.Confidence > 1 {
		writeJSONError(w, http.StatusBadRequest, "INVALID_CLASSIFICATION_CONFIDENCE", "confidence must be between 0 and 1")
		return
	}

	state, err := db.CompleteJobResumeCategory(
		r.Context(),
		userID,
		jobID,
		body.Category,
		body.Confidence,
	)
	if err != nil {
		writeJobCategoryStoreError(w, r, err, "complete")
		return
	}
	writeJSON(w, http.StatusOK, state)
}

func FailJobResumeCategoryHandler(w http.ResponseWriter, r *http.Request) {
	userID, jobID, ok := jobCategoryRequestIdentity(w, r)
	if !ok {
		return
	}

	var body models.FailJobResumeCategoryRequest
	if err := decodeGenerationJSON(w, r, &body); err != nil {
		writeJSONError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	body.FailureCode = strings.TrimSpace(body.FailureCode)
	if body.FailureCode == "" || len(body.FailureCode) > 64 {
		writeJSONError(w, http.StatusBadRequest, "INVALID_FAILURE_CODE", "failure_code is required and must not exceed 64 characters")
		return
	}
	if body.Confidence != nil && (*body.Confidence < 0 || *body.Confidence > 1) {
		writeJSONError(w, http.StatusBadRequest, "INVALID_CLASSIFICATION_CONFIDENCE", "confidence must be between 0 and 1")
		return
	}

	state, err := db.FailJobResumeCategory(
		r.Context(),
		userID,
		jobID,
		body.FailureCode,
		body.Confidence,
	)
	if err != nil {
		writeJobCategoryStoreError(w, r, err, "fail")
		return
	}
	writeJSON(w, http.StatusOK, state)
}

func jobCategoryRequestIdentity(w http.ResponseWriter, r *http.Request) (string, string, bool) {
	userID, ok := authenticatedUserID(w, r)
	if !ok {
		return "", "", false
	}
	jobID := strings.TrimSpace(chi.URLParam(r, "jobID"))
	if jobID == "" {
		writeJSONError(w, http.StatusBadRequest, "INVALID_JOB_ID", "job ID is required")
		return "", "", false
	}
	return userID, jobID, true
}

func writeJobCategoryStoreError(w http.ResponseWriter, r *http.Request, err error, action string) {
	if errors.Is(err, db.ErrGenerationJobNotFound) {
		writeJSONError(w, http.StatusNotFound, "JOB_NOT_FOUND", "Job not found")
		return
	}
	captureHandlerError(r, observability.CodeJobCategoryStoreFailed, err, "job_category", action)
	writeJSONError(w, http.StatusInternalServerError, "JOB_CATEGORY_STORE_ERROR", "Failed to update the job category")
}
