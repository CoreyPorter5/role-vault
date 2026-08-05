package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
)

func TestDecodeGenerationJSON(t *testing.T) {
	tests := []struct {
		name    string
		body    string
		wantErr bool
	}{
		{name: "valid object", body: `{"failure_code":"provider","failure_detail":"failed","token_usage":{},"attempt_count":1,"repair_attempted":false}`},
		{name: "unknown field", body: `{"failure_code":"provider","failure_detail":"failed","token_usage":{},"attempt_count":1,"repair_attempted":false,"extra":true}`, wantErr: true},
		{name: "two objects", body: `{} {}`, wantErr: true},
		{name: "malformed trailing data", body: `{} trailing`, wantErr: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(test.body))
			response := httptest.NewRecorder()
			var destination models.FailResumeGenerationRequest
			err := decodeGenerationJSON(response, request, &destination)
			if (err != nil) != test.wantErr {
				t.Fatalf("decodeGenerationJSON() error = %v, wantErr %v", err, test.wantErr)
			}
		})
	}
}

func TestValidateTailoredResume(t *testing.T) {
	valid := models.TailoredResume{
		FullName:            "Corey Porter",
		ProfessionalTitle:   "Software Engineer",
		ProfessionalSummary: "Builds reliable software.",
		Skills:              []string{"Go", "React"},
		Experience: []models.Experience{{
			Title:   "Engineer",
			Company: "Example",
			Bullets: []string{"Built reliable services", "Improved automated tests"},
		}},
		Projects: []models.Project{{
			Name:    "Seek Sync",
			Bullets: []string{"Built a job tracker", "Added resume generation"},
		}},
	}

	if err := validateTailoredResume(valid); err != nil {
		t.Fatalf("valid resume rejected: %v", err)
	}

	invalid := valid
	invalid.Experience = []models.Experience{{Bullets: []string{"only one"}}}
	if err := validateTailoredResume(invalid); err == nil {
		t.Fatal("experience with one bullet should be rejected")
	}
}
