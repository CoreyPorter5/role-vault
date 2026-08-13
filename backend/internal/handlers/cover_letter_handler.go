package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/CoreyPorter5/seek-sync/backend/internal/db"
	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
	"github.com/CoreyPorter5/seek-sync/backend/internal/observability"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

func GetCoverLetterGenerationContext(w http.ResponseWriter, r *http.Request) {
	userID, ok := authenticatedUserID(w, r)
	if !ok {
		return
	}
	jobID := strings.TrimSpace(chi.URLParam(r, "jobID"))
	if jobID == "" {
		writeJSONError(w, http.StatusBadRequest, "INVALID_JOB_ID", "jobID is required")
		return
	}

	resume, err := db.GetUserResume(r.Context(), userID)
	if errors.Is(err, pgx.ErrNoRows) {
		writeJSONError(w, http.StatusNotFound, "RESUME_NOT_FOUND", "Master resume not found")
		return
	}
	if err != nil {
		captureHandlerError(r, observability.CodeMasterResumeStoreFailed, err, "cover_letter_generation_context", "read_master_resume")
		writeJSONError(w, http.StatusInternalServerError, "GENERATION_CONTEXT_FAILED", "Failed to load master resume")
		return
	}

	job, err := db.GetUserJob(r.Context(), userID, jobID)
	if errors.Is(err, pgx.ErrNoRows) {
		writeJSONError(w, http.StatusNotFound, "JOB_NOT_FOUND", "Job not found")
		return
	}
	if err != nil {
		captureHandlerError(r, observability.CodeJobStoreFailed, err, "cover_letter_generation_context", "read_job")
		writeJSONError(w, http.StatusInternalServerError, "GENERATION_CONTEXT_FAILED", "Failed to load job")
		return
	}

	tailoredResume, err := db.GetLatestTailoredResumeForJob(r.Context(), userID, jobID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		captureHandlerError(r, observability.CodeGeneratedResumeStoreFailed, err, "cover_letter_generation_context", "read_tailored_resume")
		writeJSONError(w, http.StatusInternalServerError, "GENERATION_CONTEXT_FAILED", "Failed to load application context")
		return
	}

	writeJSON(w, http.StatusOK, models.GenerateCoverLetterContext{
		ResumePlaintext: resume.Plaintext,
		Job:             job,
		TailoredResume:  tailoredResume,
	})
}

func GetGeneratedCoverLetterDraft(w http.ResponseWriter, r *http.Request) {
	userID, jobID, ok := coverLetterJobIdentity(w, r)
	if !ok {
		return
	}
	document, err := db.GetGeneratedCoverLetterDraft(r.Context(), userID, jobID)
	if errors.Is(err, pgx.ErrNoRows) {
		writeJSONError(w, http.StatusNotFound, "COVER_LETTER_DRAFT_NOT_FOUND", "Cover letter draft not found")
		return
	}
	if err != nil {
		captureHandlerError(r, observability.CodeCoverLetterDraftStoreFailed, err, "cover_letter_draft", "read")
		writeJSONError(w, http.StatusInternalServerError, "COVER_LETTER_DRAFT_STORE_ERROR", "Failed to load cover letter draft")
		return
	}
	writeJSON(w, http.StatusOK, document)
}

func DeleteGeneratedCoverLetterDraft(w http.ResponseWriter, r *http.Request) {
	userID, jobID, ok := coverLetterJobIdentity(w, r)
	if !ok {
		return
	}
	deleted, err := db.DeleteGeneratedCoverLetterDraft(r.Context(), userID, jobID)
	if err != nil {
		captureHandlerError(r, observability.CodeCoverLetterDraftStoreFailed, err, "cover_letter_draft", "delete")
		writeJSONError(w, http.StatusInternalServerError, "COVER_LETTER_DRAFT_STORE_ERROR", "Failed to delete cover letter draft")
		return
	}
	if !deleted {
		writeJSONError(w, http.StatusNotFound, "COVER_LETTER_DRAFT_NOT_FOUND", "Cover letter draft not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func GetGeneratedCoverLetter(w http.ResponseWriter, r *http.Request) {
	userID, jobID, ok := coverLetterJobIdentity(w, r)
	if !ok {
		return
	}
	document, err := db.GetGeneratedCoverLetter(r.Context(), userID, jobID)
	if errors.Is(err, pgx.ErrNoRows) {
		writeJSONError(w, http.StatusNotFound, "COVER_LETTER_NOT_FOUND", "Cover letter not found")
		return
	}
	if err != nil {
		captureHandlerError(r, observability.CodeCoverLetterStoreFailed, err, "cover_letter", "read")
		writeJSONError(w, http.StatusInternalServerError, "COVER_LETTER_STORE_ERROR", "Failed to load cover letter")
		return
	}
	writeJSON(w, http.StatusOK, document)
}

func SaveGeneratedCoverLetter(w http.ResponseWriter, r *http.Request) {
	userID, jobID, ok := coverLetterJobIdentity(w, r)
	if !ok {
		return
	}
	var body models.SaveCoverLetterRequest
	if err := decodeGenerationJSON(w, r, &body); err != nil {
		writeJSONError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	if err := validateCoverLetter(body.CoverLetter); err != nil {
		writeJSONError(w, http.StatusBadRequest, "INVALID_COVER_LETTER", err.Error())
		return
	}
	if err := db.SaveGeneratedCoverLetter(r.Context(), userID, jobID, body.CoverLetter); err != nil {
		switch {
		case errors.Is(err, db.ErrGenerationJobNotFound):
			writeJSONError(w, http.StatusNotFound, "JOB_NOT_FOUND", "Job not found")
		case errors.Is(err, db.ErrCoverLetterDraftNotFound):
			writeJSONError(w, http.StatusConflict, "COVER_LETTER_DRAFT_NOT_FOUND", "The cover letter draft is no longer available")
		default:
			captureHandlerError(r, observability.CodeCoverLetterStoreFailed, err, "cover_letter", "save")
			writeJSONError(w, http.StatusInternalServerError, "COVER_LETTER_STORE_ERROR", "Failed to save cover letter")
		}
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"message": "Cover letter saved"})
}

func DeleteGeneratedCoverLetter(w http.ResponseWriter, r *http.Request) {
	userID, jobID, ok := coverLetterJobIdentity(w, r)
	if !ok {
		return
	}
	deleted, err := db.DeleteGeneratedCoverLetter(r.Context(), userID, jobID)
	if err != nil {
		captureHandlerError(r, observability.CodeCoverLetterStoreFailed, err, "cover_letter", "delete")
		writeJSONError(w, http.StatusInternalServerError, "COVER_LETTER_STORE_ERROR", "Failed to delete cover letter")
		return
	}
	if !deleted {
		writeJSONError(w, http.StatusNotFound, "COVER_LETTER_NOT_FOUND", "Cover letter not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func coverLetterJobIdentity(w http.ResponseWriter, r *http.Request) (string, string, bool) {
	userID, ok := authenticatedUserID(w, r)
	if !ok {
		return "", "", false
	}
	jobID := strings.TrimSpace(chi.URLParam(r, "jobID"))
	if jobID == "" {
		writeJSONError(w, http.StatusBadRequest, "INVALID_JOB_ID", "jobID is required")
		return "", "", false
	}
	return userID, jobID, true
}

func validateCoverLetter(letter models.CoverLetter) error {
	if strings.TrimSpace(letter.CandidateName) == "" || utf8.RuneCountInString(letter.CandidateName) > 80 {
		return fmt.Errorf("candidate name is required and must not exceed 80 characters")
	}
	if strings.TrimSpace(letter.CompanyName) == "" || utf8.RuneCountInString(letter.CompanyName) > 120 {
		return fmt.Errorf("company name is required and must not exceed 120 characters")
	}
	if strings.TrimSpace(letter.Salutation) == "" || strings.TrimSpace(letter.SignOff) == "" {
		return fmt.Errorf("cover letter greeting and sign-off are required")
	}
	if utf8.RuneCountInString(letter.Salutation) > 100 || utf8.RuneCountInString(letter.SignOff) > 40 {
		return fmt.Errorf("cover letter greeting or sign-off exceeds the allowed length")
	}
	if len(letter.BodyParagraphs) < 2 || len(letter.BodyParagraphs) > 3 {
		return fmt.Errorf("cover letter must contain two or three evidence paragraphs")
	}
	paragraphs := append([]string{letter.OpeningParagraph}, letter.BodyParagraphs...)
	paragraphs = append(paragraphs, letter.ClosingParagraph)
	wordCount := 0
	for _, paragraph := range paragraphs {
		if strings.TrimSpace(paragraph) == "" || utf8.RuneCountInString(paragraph) > 1100 {
			return fmt.Errorf("cover letter paragraphs must be present and must not exceed 1100 characters")
		}
		wordCount += len(strings.Fields(paragraph))
	}
	if wordCount < 220 || wordCount > 380 {
		return fmt.Errorf("cover letter must contain between 220 and 380 words")
	}
	return nil
}
