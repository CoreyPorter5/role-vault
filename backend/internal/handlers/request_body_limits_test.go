package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/CoreyPorter5/seek-sync/backend/internal/auth_middleware"
	"github.com/CoreyPorter5/seek-sync/backend/internal/resumeupload"
	"github.com/go-chi/chi/v5"
)

func TestJSONHandlersRejectOversizedBodies(t *testing.T) {
	tests := []struct {
		name    string
		handler http.HandlerFunc
		body    string
		jobID   string
	}{
		{
			name:    "add job",
			handler: AddUserJob,
			body:    `{"jobDescription":"` + strings.Repeat("x", int(maxJobJSONBodyBytes)) + `"}`,
		},
		{
			name:    "update job status",
			handler: UpdateJobStatus,
			body:    `{"jobStatus":"Saved","padding":"` + strings.Repeat("x", int(maxJobJSONBodyBytes)) + `"}`,
			jobID:   "job-1",
		},
		{
			name:    "save resume draft",
			handler: AddGeneratedUserResumeDraft,
			body:    `{"draft_resume":{"fullName":"` + strings.Repeat("x", int(maxResumeDraftJSONBodyBytes)) + `"}}`,
			jobID:   "job-1",
		},
		{
			name:    "update master resume",
			handler: UpdateUserResume,
			body:    `{"plaintext":"` + strings.Repeat("x", int(maxResumeUpdateBodyBytes)) + `"}`,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := authenticatedHandlerRequest(http.MethodPost, test.body, test.jobID)
			response := httptest.NewRecorder()

			test.handler(response, request)

			if response.Code != http.StatusRequestEntityTooLarge {
				t.Fatalf("status = %d, want %d; body = %q", response.Code, http.StatusRequestEntityTooLarge, response.Body.String())
			}
		})
	}
}

func TestUpdateUserResumeRejectsOversizedPlaintext(t *testing.T) {
	body := `{"plaintext":"` + strings.Repeat("x", resumeupload.MaxPlaintextBytes+1) + `"}`
	request := authenticatedHandlerRequest(http.MethodPatch, body, "")
	response := httptest.NewRecorder()

	UpdateUserResume(response, request)

	if response.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want %d; body = %q", response.Code, http.StatusUnprocessableEntity, response.Body.String())
	}
	if !strings.Contains(response.Body.String(), `"code":"RESUME_TEXT_TOO_LARGE"`) {
		t.Fatalf("response body = %q, want RESUME_TEXT_TOO_LARGE code", response.Body.String())
	}
}

func authenticatedHandlerRequest(method, body, jobID string) *http.Request {
	request := httptest.NewRequest(method, "/", strings.NewReader(body))
	ctx := context.WithValue(request.Context(), auth_middleware.UserIDKey, "user-1")
	if jobID != "" {
		routeContext := chi.NewRouteContext()
		routeContext.URLParams.Add("jobID", jobID)
		ctx = context.WithValue(ctx, chi.RouteCtxKey, routeContext)
	}
	return request.WithContext(ctx)
}
