package analytics

import (
	"testing"

	"github.com/google/uuid"
	posthog "github.com/posthog/posthog-go"
)

type recordingClient struct {
	messages []posthog.Message
}

func (client *recordingClient) Enqueue(message posthog.Message) error {
	client.messages = append(client.messages, message)
	return nil
}

func (client *recordingClient) Close() error { return nil }

func TestCaptureFiltersSensitiveAndUnknownProperties(t *testing.T) {
	recorder := &recordingClient{}
	clientMu.Lock()
	client = recorder
	clientMu.Unlock()
	t.Cleanup(func() { _ = Close() })

	Capture(uuid.NewString(), EventDocumentGenerated, Properties{
		"document_type":   "resume",
		"resume_category": "technology_product_data",
		"email":           "person@example.com",
		"job_description": "private content",
	})

	if len(recorder.messages) != 1 {
		t.Fatalf("expected one message, got %d", len(recorder.messages))
	}
	capture, ok := recorder.messages[0].(posthog.Capture)
	if !ok {
		t.Fatalf("expected posthog.Capture, got %T", recorder.messages[0])
	}
	if capture.Properties["document_type"] != "resume" || capture.Properties["resume_category"] != "technology_product_data" {
		t.Fatalf("expected allowlisted properties, got %#v", capture.Properties)
	}
	if _, exists := capture.Properties["email"]; exists {
		t.Fatal("email must never be captured")
	}
	if _, exists := capture.Properties["job_description"]; exists {
		t.Fatal("job content must never be captured")
	}
}

func TestJobCaptureAllowsOnlyKnownSources(t *testing.T) {
	properties := safeProperties(EventJobSynced, Properties{
		"source":          "custom",
		"job_description": "private content",
	})
	if properties["source"] != "custom" {
		t.Fatalf("expected custom source, got %#v", properties)
	}
	if _, exists := properties["job_description"]; exists {
		t.Fatal("job content must never be captured")
	}
	if invalid := safeProperties(EventJobSynced, Properties{"source": "email"}); len(invalid) != 0 {
		t.Fatalf("unexpected source should be dropped, got %#v", invalid)
	}
}

func TestCaptureOnceIsStableAndRequiresUUIDs(t *testing.T) {
	recorder := &recordingClient{}
	clientMu.Lock()
	client = recorder
	clientMu.Unlock()
	t.Cleanup(func() { _ = Close() })

	userID := uuid.NewString()
	sourceID := uuid.NewString()
	CaptureOnce(userID, EventCheckoutStarted, sourceID, Properties{"pack_code": "credits_100"})
	CaptureOnce(userID, EventCheckoutStarted, sourceID, Properties{"pack_code": "credits_100"})
	CaptureOnce(userID, EventCheckoutStarted, "not-an-id", nil)

	if len(recorder.messages) != 2 {
		t.Fatalf("expected two valid messages, got %d", len(recorder.messages))
	}
	first := recorder.messages[0].(posthog.Capture)
	second := recorder.messages[1].(posthog.Capture)
	if first.Uuid == "" || first.Uuid != second.Uuid {
		t.Fatalf("expected stable event UUIDs, got %q and %q", first.Uuid, second.Uuid)
	}
}

func TestCaptureRejectsInvalidUsersAndEvents(t *testing.T) {
	recorder := &recordingClient{}
	clientMu.Lock()
	client = recorder
	clientMu.Unlock()
	t.Cleanup(func() { _ = Close() })

	Capture("email@example.com", EventJobSynced, nil)
	Capture(uuid.NewString(), Event("arbitrary event"), nil)
	if len(recorder.messages) != 0 {
		t.Fatalf("expected invalid captures to be dropped, got %d", len(recorder.messages))
	}
}
