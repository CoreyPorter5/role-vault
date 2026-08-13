package observability

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/go-chi/chi/v5"
)

func TestCaptureRequestErrorUsesStableSafeTags(t *testing.T) {
	transport := &sentry.MockTransport{}
	client, err := sentry.NewClient(sentry.ClientOptions{
		Dsn:        "https://public@example.com/1",
		Transport:  transport,
		BeforeSend: ScrubEvent,
	})
	if err != nil {
		t.Fatalf("create Sentry client: %v", err)
	}
	hub := sentry.NewHub(client, sentry.NewScope())

	router := chi.NewRouter()
	router.Get("/jobs/{jobID}", func(w http.ResponseWriter, r *http.Request) {
		request := r.WithContext(sentry.SetHubOnContext(r.Context(), hub))
		CaptureRequestError(request, CodeJobStoreFailed, errors.New("database unavailable"), Operation{
			Area:   "jobs",
			Action: "read",
		})
		w.WriteHeader(http.StatusInternalServerError)
	})

	request := httptest.NewRequest(http.MethodGet, "/jobs/12345?token=secret", nil)
	request.Header.Set("Authorization", "Bearer secret")
	router.ServeHTTP(httptest.NewRecorder(), request)

	events := transport.Events()
	if len(events) != 1 {
		t.Fatalf("events = %d, want 1", len(events))
	}
	event := events[0]
	if got := event.Tags["error.code"]; got != string(CodeJobStoreFailed) {
		t.Fatalf("error.code = %q, want %q", got, CodeJobStoreFailed)
	}
	if got := event.Tags["http.route"]; got != "/jobs/{jobID}" {
		t.Fatalf("http.route = %q, want route pattern", got)
	}
	if got := event.Tags["http.method"]; got != http.MethodGet {
		t.Fatalf("http.method = %q, want GET", got)
	}
	if event.Request != nil {
		t.Fatalf("request data should not be attached by explicit captures: %#v", event.Request)
	}
}

func TestScrubEventRemovesRequestAndIdentityData(t *testing.T) {
	event := &sentry.Event{
		Request: &sentry.Request{
			URL:         "https://api.example.com/jobs/123?token=secret",
			Method:      http.MethodPost,
			Data:        `{"resume":"private"}`,
			QueryString: "token=secret",
			Cookies:     "session=secret",
			Headers:     map[string]string{"Authorization": "Bearer secret"},
			Env:         map[string]string{"REMOTE_ADDR": "127.0.0.1"},
		},
		User: sentry.User{ID: "user-id", Email: "person@example.com", IPAddress: "127.0.0.1"},
		Breadcrumbs: []*sentry.Breadcrumb{{
			Message: "private resume text",
			Data: map[string]interface{}{
				"url":      "https://example.com/private?token=secret",
				"response": "private response text",
				"status":   500,
			},
		}},
	}

	got := ScrubEvent(event, nil)
	if got.Request.Data != "" || got.Request.QueryString != "" || got.Request.Cookies != "" || got.Request.URL != "" {
		t.Fatalf("sensitive request fields were not cleared: %#v", got.Request)
	}
	if got.Request.Headers != nil || got.Request.Env != nil {
		t.Fatalf("request headers or environment were retained: %#v", got.Request)
	}
	if got.User.ID != "" || got.User.Email != "" || got.User.IPAddress != "" {
		t.Fatalf("user identity was retained: %#v", got.User)
	}
	if _, exists := got.Breadcrumbs[0].Data["url"]; exists {
		t.Fatal("breadcrumb URL was retained")
	}
	if _, exists := got.Breadcrumbs[0].Data["response"]; exists || got.Breadcrumbs[0].Message != "" {
		t.Fatal("breadcrumb response content was retained")
	}
	if got.Breadcrumbs[0].Data["status"] != 500 {
		t.Fatal("safe breadcrumb data was unexpectedly removed")
	}
}

func TestCaptureErrorSkipsCanceledRequests(t *testing.T) {
	transport := &sentry.MockTransport{}
	client, err := sentry.NewClient(sentry.ClientOptions{
		Dsn:       "https://public@example.com/1",
		Transport: transport,
	})
	if err != nil {
		t.Fatalf("create Sentry client: %v", err)
	}
	hub := sentry.NewHub(client, sentry.NewScope())
	ctx := sentry.SetHubOnContext(context.Background(), hub)

	if eventID := CaptureError(ctx, CodeJobStoreFailed, context.Canceled, Operation{Area: "jobs", Action: "list"}); eventID != nil {
		t.Fatalf("canceled request returned event ID %s", *eventID)
	}
	if got := len(transport.Events()); got != 0 {
		t.Fatalf("events = %d, want 0", got)
	}
}

func TestCaptureRequestErrorSkipsDifferentErrorAfterClientCancellation(t *testing.T) {
	transport := &sentry.MockTransport{}
	client, err := sentry.NewClient(sentry.ClientOptions{
		Dsn:       "https://public@example.com/1",
		Transport: transport,
	})
	if err != nil {
		t.Fatalf("create Sentry client: %v", err)
	}
	hub := sentry.NewHub(client, sentry.NewScope())
	requestContext, cancel := context.WithCancel(context.Background())
	cancel()
	request := httptest.NewRequest(http.MethodGet, "/jobs", nil).WithContext(
		sentry.SetHubOnContext(requestContext, hub),
	)

	if eventID := CaptureRequestError(request, CodeJobStoreFailed, errors.New("connection reset"), Operation{Area: "jobs", Action: "list"}); eventID != nil {
		t.Fatalf("canceled request returned event ID %s", *eventID)
	}
	if got := len(transport.Events()); got != 0 {
		t.Fatalf("events = %d, want 0", got)
	}
}

func TestCaptureErrorReportsDeadlineExceeded(t *testing.T) {
	transport := &sentry.MockTransport{}
	client, err := sentry.NewClient(sentry.ClientOptions{
		Dsn:       "https://public@example.com/1",
		Transport: transport,
	})
	if err != nil {
		t.Fatalf("create Sentry client: %v", err)
	}
	hub := sentry.NewHub(client, sentry.NewScope())
	deadlineContext, cancel := context.WithDeadline(context.Background(), time.Now().Add(-time.Second))
	defer cancel()
	ctx := sentry.SetHubOnContext(deadlineContext, hub)

	if eventID := CaptureError(ctx, CodeJobStoreFailed, context.DeadlineExceeded, Operation{Area: "jobs", Action: "list"}); eventID == nil {
		t.Fatal("deadline exceeded did not return an event ID")
	}
	if got := len(transport.Events()); got != 1 {
		t.Fatalf("events = %d, want 1", got)
	}
}

func TestCaptureRequestErrorReportsFailureAfterDeadline(t *testing.T) {
	transport := &sentry.MockTransport{}
	client, err := sentry.NewClient(sentry.ClientOptions{
		Dsn:       "https://public@example.com/1",
		Transport: transport,
	})
	if err != nil {
		t.Fatalf("create Sentry client: %v", err)
	}
	hub := sentry.NewHub(client, sentry.NewScope())
	deadlineContext, cancel := context.WithDeadline(context.Background(), time.Now().Add(-time.Second))
	defer cancel()
	request := httptest.NewRequest(http.MethodGet, "/jobs", nil).WithContext(
		sentry.SetHubOnContext(deadlineContext, hub),
	)

	if eventID := CaptureRequestError(request, CodeJobStoreFailed, errors.New("database timeout"), Operation{Area: "jobs", Action: "list"}); eventID == nil {
		t.Fatal("failure after deadline did not return an event ID")
	}
	if got := len(transport.Events()); got != 1 {
		t.Fatalf("events = %d, want 1", got)
	}
}

func TestScrubEventReplacesProviderErrorsAndRedactsIdentifiers(t *testing.T) {
	providerEvent := &sentry.Event{
		Tags: map[string]string{"error.code": string(CodeBillingAPIFailed)},
		Exception: []sentry.Exception{{
			Type:  "stripe.Error",
			Value: `customer person@example.com cus_private payment pi_private_secret_value https://request-log.example/private`,
		}},
	}
	ScrubEvent(providerEvent, nil)
	if got := providerEvent.Exception[0].Value; got != "billing provider request failed" {
		t.Fatalf("provider exception = %q", got)
	}

	databaseEvent := &sentry.Event{
		Exception: []sentry.Exception{{
			Type:  "pgconn.PgError",
			Value: "user 550e8400-e29b-41d4-a716-446655440000 and job 12345678 failed for person@example.com",
		}},
	}
	ScrubEvent(databaseEvent, nil)
	value := databaseEvent.Exception[0].Value
	for _, sensitive := range []string{"550e8400", "12345678", "person@example.com"} {
		if strings.Contains(value, sensitive) {
			t.Fatalf("exception retained %q in %q", sensitive, value)
		}
	}
}
