package handlers

import (
	"errors"
	"mime/multipart"
	"net/http"

	"github.com/CoreyPorter5/seek-sync/backend/internal/resumeupload"
)

func writeMultipartUploadError(w http.ResponseWriter, err error) {
	var maxBytesError *http.MaxBytesError
	if errors.As(err, &maxBytesError) || errors.Is(err, multipart.ErrMessageTooLarge) {
		writeJSONError(w, http.StatusRequestEntityTooLarge, "FILE_TOO_LARGE", resumeupload.ErrFileTooLarge.Error())
		return
	}
	writeJSONError(w, http.StatusBadRequest, "RESUME_FILE_REQUIRED", "Resume file not found")
}

func writeResumeUploadError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, resumeupload.ErrFileTooLarge):
		writeJSONError(w, http.StatusRequestEntityTooLarge, "FILE_TOO_LARGE", resumeupload.ErrFileTooLarge.Error())
	case errors.Is(err, resumeupload.ErrUnsupportedFile):
		writeJSONError(w, http.StatusUnsupportedMediaType, "UNSUPPORTED_FILE_TYPE", resumeupload.ErrUnsupportedFile.Error())
	case errors.Is(err, resumeupload.ErrEmptyResume):
		writeJSONError(w, http.StatusUnprocessableEntity, "EMPTY_RESUME", resumeupload.ErrEmptyResume.Error())
	case errors.Is(err, resumeupload.ErrResumeTextTooLarge):
		writeJSONError(w, http.StatusUnprocessableEntity, "RESUME_TEXT_TOO_LARGE", resumeupload.ErrResumeTextTooLarge.Error())
	case errors.Is(err, resumeupload.ErrInvalidFilename):
		writeJSONError(w, http.StatusBadRequest, "INVALID_FILENAME", resumeupload.ErrInvalidFilename.Error())
	case errors.Is(err, resumeupload.ErrInvalidDOCX):
		writeJSONError(w, http.StatusUnprocessableEntity, "INVALID_DOCX", resumeupload.ErrInvalidDOCX.Error())
	default:
		writeJSONError(w, http.StatusInternalServerError, "UPLOAD_VALIDATION_ERROR", "Failed to validate resume")
	}
}
