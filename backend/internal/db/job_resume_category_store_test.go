package db

import (
	"testing"
	"time"

	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
)

func TestShouldClaimJobResumeCategory(t *testing.T) {
	now := time.Date(2026, time.August, 11, 12, 0, 0, 0, time.UTC)
	currentModel := "gpt-5-nano-2025-08-07"
	currentVersion := 2
	aiSource := "ai"
	userSource := "user"
	oldModel := "gpt-5-nano"
	oldVersion := 1
	startedRecently := now.Add(-30 * time.Second).Format(time.RFC3339Nano)
	startedStale := now.Add(-jobResumeCategoryClaimTimeout).Format(time.RFC3339Nano)

	tests := []struct {
		name  string
		state models.JobResumeCategory
		want  bool
	}{
		{name: "new classification", state: models.JobResumeCategory{Status: "unclassified"}, want: true},
		{name: "failed classification retries", state: models.JobResumeCategory{Status: "failed"}, want: true},
		{name: "active claim stays owned", state: models.JobResumeCategory{Status: "classifying", StartedAt: &startedRecently}, want: false},
		{name: "stale claim is recovered", state: models.JobResumeCategory{Status: "classifying", StartedAt: &startedStale}, want: true},
		{name: "current ai result stays cached", state: models.JobResumeCategory{
			Status: "classified", Source: &aiSource, ClassifierModel: &currentModel, ClassifierVersion: &currentVersion,
		}, want: false},
		{name: "older ai result is refreshed", state: models.JobResumeCategory{
			Status: "classified", Source: &aiSource, ClassifierModel: &oldModel, ClassifierVersion: &oldVersion,
		}, want: true},
		{name: "manual choice is authoritative", state: models.JobResumeCategory{
			Status: "classified", Source: &userSource,
		}, want: false},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := shouldClaimJobResumeCategory(test.state, currentModel, currentVersion, now); got != test.want {
				t.Fatalf("shouldClaimJobResumeCategory() = %v, want %v", got, test.want)
			}
		})
	}
}
