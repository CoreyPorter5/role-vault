package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/CoreyPorter5/seek-sync/backend/internal/db"
)

func TestJobClassificationQuotaErrorIsExpectedAndActionable(t *testing.T) {
	request := httptest.NewRequest(http.MethodPost, "/api/v1/internal/job-resume-categories/job-1/claim", nil)
	response := httptest.NewRecorder()
	writeJobCategoryStoreError(response, request, db.ErrJobClassificationQuotaExceeded, "claim")

	if response.Code != http.StatusTooManyRequests {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusTooManyRequests)
	}
	body := response.Body.String()
	if !strings.Contains(body, "CLASSIFICATION_DAILY_LIMIT_REACHED") || !strings.Contains(body, "choose a job type manually") {
		t.Fatalf("unexpected response body: %s", body)
	}
}
