package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/CoreyPorter5/seek-sync/backend/internal/auth_middleware"
	"github.com/CoreyPorter5/seek-sync/backend/internal/resumeupload"
)

func TestAddUserResumeRejectsInvalidUploadsBeforeDatabaseAccess(t *testing.T) {
	tests := []struct {
		name       string
		filename   string
		content    []byte
		wantStatus int
		wantCode   string
	}{
		{
			name:       "body over hard request limit",
			filename:   "resume.docx",
			content:    bytes.Repeat([]byte("x"), int(resumeupload.MaxMultipartBodyBytes)+1),
			wantStatus: http.StatusRequestEntityTooLarge,
			wantCode:   "FILE_TOO_LARGE",
		},
		{
			name:       "unsupported extension",
			filename:   "resume.pdf",
			content:    []byte("not a PDF or DOCX"),
			wantStatus: http.StatusUnsupportedMediaType,
			wantCode:   "UNSUPPORTED_FILE_TYPE",
		},
		{
			name:       "corrupt DOCX container",
			filename:   "resume.docx",
			content:    []byte("not a zip archive"),
			wantStatus: http.StatusUnprocessableEntity,
			wantCode:   "INVALID_DOCX",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := newResumeMultipartRequest(t, test.filename, test.content)
			request = request.WithContext(context.WithValue(request.Context(), auth_middleware.UserIDKey, "00000000-0000-0000-0000-000000000001"))
			response := httptest.NewRecorder()

			AddUserResume(response, request)

			if response.Code != test.wantStatus {
				t.Fatalf("status = %d, want %d; body = %s", response.Code, test.wantStatus, response.Body.String())
			}
			var payload struct {
				Code string `json:"code"`
			}
			if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
				t.Fatalf("decode error response: %v; body = %s", err, response.Body.String())
			}
			if payload.Code != test.wantCode {
				t.Fatalf("code = %q, want %q", payload.Code, test.wantCode)
			}
		})
	}
}

func TestWriteResumeUploadErrorStatusMapping(t *testing.T) {
	tests := []struct {
		err        error
		wantStatus int
	}{
		{err: resumeupload.ErrFileTooLarge, wantStatus: http.StatusRequestEntityTooLarge},
		{err: resumeupload.ErrUnsupportedFile, wantStatus: http.StatusUnsupportedMediaType},
		{err: resumeupload.ErrInvalidDOCX, wantStatus: http.StatusUnprocessableEntity},
		{err: resumeupload.ErrEmptyResume, wantStatus: http.StatusUnprocessableEntity},
		{err: resumeupload.ErrResumeTextTooLarge, wantStatus: http.StatusUnprocessableEntity},
		{err: resumeupload.ErrInvalidFilename, wantStatus: http.StatusBadRequest},
	}

	for _, test := range tests {
		response := httptest.NewRecorder()
		writeResumeUploadError(response, test.err)
		if response.Code != test.wantStatus {
			t.Fatalf("writeResumeUploadError(%v) status = %d, want %d", test.err, response.Code, test.wantStatus)
		}
	}
}

func newResumeMultipartRequest(t *testing.T, filename string, content []byte) *http.Request {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("resume", filename)
	if err != nil {
		t.Fatalf("create multipart file: %v", err)
	}
	if _, err := part.Write(content); err != nil {
		t.Fatalf("write multipart file: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close multipart writer: %v", err)
	}

	request := httptest.NewRequest(http.MethodPost, "/api/v1/resume", &body)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	return request
}
