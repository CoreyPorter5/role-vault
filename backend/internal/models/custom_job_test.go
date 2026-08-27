package models

import (
	"strings"
	"testing"
	"time"
)

func TestCustomJobRequestBuildJob(t *testing.T) {
	category := ResumeCategoryLegal
	pay := "  $80,000–$90,000  "
	jobType := " Full time "
	now := time.Date(2026, time.August, 27, 10, 30, 0, 0, time.UTC)
	request := CustomJobRequest{
		JobTitle:       "  Graduate Lawyer  ",
		CompanyName:    " Example Legal ",
		Location:       " Sydney NSW ",
		Pay:            &pay,
		JobType:        &jobType,
		Description:    strings.Repeat("A", 100),
		ResumeCategory: &category,
	}

	job, err := request.BuildJob("custom_12345678-1234-1234-1234-123456789abc", now)
	if err != nil {
		t.Fatalf("BuildJob() error = %v", err)
	}
	if job.JobTitle != "Graduate Lawyer" || job.CompanyName != "Example Legal" || job.Location != "Sydney NSW" {
		t.Fatalf("job fields were not normalized: %+v", job)
	}
	if job.Pay == nil || *job.Pay != "$80,000–$90,000" || job.JobType == nil || *job.JobType != "Full time" {
		t.Fatalf("optional fields were not normalized: %+v", job)
	}
	if job.Status != string(Saved) || job.DateSynced != now.Format(time.RFC3339Nano) {
		t.Fatalf("custom job defaults are incorrect: %+v", job)
	}
}

func TestCustomJobRequestRejectsIncompleteOrUnsupportedInput(t *testing.T) {
	base := CustomJobRequest{
		JobTitle:    "Graduate Lawyer",
		CompanyName: "Example Legal",
		Location:    "Sydney NSW",
		Description: strings.Repeat("A", 100),
	}

	invalid := base
	invalid.Description = "Too short"
	if _, err := invalid.BuildJob("custom_12345678-1234-1234-1234-123456789abc", time.Now()); err == nil {
		t.Fatal("short job description should be rejected")
	}

	invalid = base
	category := ResumeCategory("unsupported")
	invalid.ResumeCategory = &category
	if _, err := invalid.BuildJob("custom_12345678-1234-1234-1234-123456789abc", time.Now()); err == nil {
		t.Fatal("unsupported category should be rejected")
	}

	if _, err := base.BuildJob("123456", time.Now()); err == nil {
		t.Fatal("non-custom IDs should be rejected")
	}
}
