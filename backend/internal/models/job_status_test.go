package models

import "testing"

func TestJobStatusValid(t *testing.T) {
	for _, status := range []JobStatus{Saved, Applied, Interviewing, Offer, Rejected, Accepted} {
		if !status.Valid() {
			t.Fatalf("expected %q to be valid", status)
		}
	}
	for _, status := range []JobStatus{"", "Unknown", "Applied; DROP TABLE jobs"} {
		if status.Valid() {
			t.Fatalf("expected %q to be invalid", status)
		}
	}
}
