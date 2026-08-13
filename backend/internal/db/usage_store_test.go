package db

import (
	"testing"
	"time"
)

func TestAdvanceFreeUsagePeriod(t *testing.T) {
	expiredEnd := time.Date(2026, time.January, 31, 12, 0, 0, 0, time.UTC)

	tests := []struct {
		name          string
		now           time.Time
		expectedStart time.Time
		expectedEnd   time.Time
	}{
		{
			name:          "exact boundary starts next period",
			now:           expiredEnd,
			expectedStart: expiredEnd,
			expectedEnd:   expiredEnd.Add(freeUsagePeriod),
		},
		{
			name:          "late request retains anchored period",
			now:           expiredEnd.Add(12 * time.Hour),
			expectedStart: expiredEnd,
			expectedEnd:   expiredEnd.Add(freeUsagePeriod),
		},
		{
			name:          "multiple missed periods advance to current window",
			now:           expiredEnd.Add(65 * 24 * time.Hour),
			expectedStart: expiredEnd.Add(60 * 24 * time.Hour),
			expectedEnd:   expiredEnd.Add(90 * 24 * time.Hour),
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			start, end := advanceFreeUsagePeriod(expiredEnd, test.now)
			if !start.Equal(test.expectedStart) {
				t.Fatalf("start = %s, want %s", start, test.expectedStart)
			}
			if !end.Equal(test.expectedEnd) {
				t.Fatalf("end = %s, want %s", end, test.expectedEnd)
			}
		})
	}
}

func TestUsageFromProfileClampsRemaining(t *testing.T) {
	start := time.Date(2026, time.August, 1, 0, 0, 0, 0, time.UTC)
	usage := resumeUsageFromProfile(quotaProfile{
		ResumeUsed:  5,
		ResumeLimit: 3,
		PeriodStart: start,
		PeriodEnd:   start.Add(freeUsagePeriod),
	})

	if usage.Remaining != 0 || usage.CanGenerate {
		t.Fatalf("usage should clamp exhausted quota, got %+v", usage)
	}
}

func TestCoverLetterUsageIsIndependentFromResumeUsage(t *testing.T) {
	start := time.Date(2026, time.August, 1, 0, 0, 0, 0, time.UTC)
	profile := quotaProfile{
		ResumeUsed:       3,
		ResumeLimit:      3,
		CoverLetterUsed:  1,
		CoverLetterLimit: 3,
		PeriodStart:      start,
		PeriodEnd:        start.Add(freeUsagePeriod),
	}

	resumeUsage := resumeUsageFromProfile(profile)
	coverLetterUsage := coverLetterUsageFromProfile(profile)
	if resumeUsage.CanGenerate || resumeUsage.Remaining != 0 {
		t.Fatalf("resume quota should be exhausted, got %+v", resumeUsage)
	}
	if !coverLetterUsage.CanGenerate || coverLetterUsage.Remaining != 2 {
		t.Fatalf("cover-letter quota should remain available, got %+v", coverLetterUsage)
	}
}
