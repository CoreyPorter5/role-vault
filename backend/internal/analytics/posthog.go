package analytics

import (
	"errors"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	posthog "github.com/posthog/posthog-go"
)

type Event string

const (
	EventJobSynced            Event = "job synced"
	EventMasterResumeUploaded Event = "master resume uploaded"
	EventDocumentGenerated    Event = "document generated"
	EventCheckoutStarted      Event = "checkout started"
	EventCreditsPurchased     Event = "credits purchased"
)

type Properties map[string]any

type captureClient interface {
	Enqueue(posthog.Message) error
	Close() error
}

var (
	clientMu sync.RWMutex
	client   captureClient
)

// Init enables privacy-filtered product analytics when POSTHOG_ENABLED=true.
// Analytics is non-critical: callers should warn on an initialization error and
// continue serving the product.
func Init() error {
	if !strings.EqualFold(strings.TrimSpace(os.Getenv("POSTHOG_ENABLED")), "true") {
		return nil
	}

	token := strings.TrimSpace(os.Getenv("POSTHOG_PROJECT_TOKEN"))
	host := strings.TrimRight(strings.TrimSpace(os.Getenv("POSTHOG_HOST")), "/")
	if token == "" || host == "" {
		return errors.New("PostHog is enabled but POSTHOG_PROJECT_TOKEN or POSTHOG_HOST is missing")
	}
	parsedHost, err := url.Parse(host)
	if err != nil || parsedHost.Scheme != "https" || parsedHost.Host == "" {
		return errors.New("POSTHOG_HOST must be a valid HTTPS origin")
	}

	posthogClient, err := posthog.NewWithConfig(token, posthog.Config{
		Endpoint:           host,
		BatchSize:          20,
		Interval:           2 * time.Second,
		ShutdownTimeout:    2 * time.Second,
		BatchUploadTimeout: 5 * time.Second,
		DisableGeoIP:       posthog.Ptr(true),
		DefaultEventProperties: posthog.Properties{
			"service":                 "backend",
			"environment":             analyticsEnvironment(),
			"$process_person_profile": false,
		},
	})
	if err != nil {
		return err
	}

	clientMu.Lock()
	client = posthogClient
	clientMu.Unlock()
	return nil
}

// Capture queues an allowlisted event without blocking the user request.
func Capture(userID string, event Event, properties Properties) {
	capture(userID, event, "", properties)
}

// CaptureOnce derives a stable PostHog event UUID from an internal UUID. It is
// used for retryable operations so a successful retry cannot double-count a
// funnel conversion.
func CaptureOnce(userID string, event Event, sourceID string, properties Properties) {
	if _, err := uuid.Parse(sourceID); err != nil {
		return
	}
	eventUUID := uuid.NewSHA1(uuid.NameSpaceURL, []byte(string(event)+":"+sourceID)).String()
	capture(userID, event, eventUUID, properties)
}

func capture(userID string, event Event, eventUUID string, properties Properties) {
	if _, err := uuid.Parse(userID); err != nil || !validEvent(event) {
		return
	}

	clientMu.RLock()
	posthogClient := client
	clientMu.RUnlock()
	if posthogClient == nil {
		return
	}

	_ = posthogClient.Enqueue(posthog.Capture{
		Uuid:       eventUUID,
		DistinctId: userID,
		Event:      string(event),
		Properties: safeProperties(event, properties),
	})
}

func Close() error {
	clientMu.Lock()
	posthogClient := client
	client = nil
	clientMu.Unlock()
	if posthogClient == nil {
		return nil
	}
	return posthogClient.Close()
}

func validEvent(event Event) bool {
	switch event {
	case EventJobSynced, EventMasterResumeUploaded, EventDocumentGenerated, EventCheckoutStarted, EventCreditsPurchased:
		return true
	default:
		return false
	}
}

func safeProperties(event Event, input Properties) posthog.Properties {
	properties := posthog.Properties{}
	switch event {
	case EventJobSynced:
		copyAllowedString(properties, input, "source", "seek", "custom")
	case EventMasterResumeUploaded:
		copyAllowedString(properties, input, "operation", "upload", "replace")
	case EventDocumentGenerated:
		copyAllowedString(properties, input, "document_type", "resume", "cover_letter")
		copyAllowedString(
			properties,
			input,
			"resume_category",
			"technology_product_data",
			"finance_accounting",
			"sales_marketing",
			"legal",
			"human_resources_admin_operations",
			"hospitality_retail_customer_service",
			"general_professional_other",
		)
	case EventCheckoutStarted, EventCreditsPurchased:
		copyAllowedString(properties, input, "pack_code", "credits_100", "credits_250")
		copyAllowedString(properties, input, "currency", "aud")
		copyPositiveInt(properties, input, "credits", 1000)
		copyPositiveInt(properties, input, "amount_minor", 100000)
	}
	return properties
}

func copyAllowedString(output posthog.Properties, input Properties, key string, allowed ...string) {
	value, ok := input[key].(string)
	if !ok {
		return
	}
	for _, candidate := range allowed {
		if value == candidate {
			output[key] = value
			return
		}
	}
}

func copyPositiveInt(output posthog.Properties, input Properties, key string, maximum int64) {
	var value int64
	switch candidate := input[key].(type) {
	case int:
		value = int64(candidate)
	case int64:
		value = candidate
	default:
		return
	}
	if value > 0 && value <= maximum {
		output[key] = value
	}
}

func analyticsEnvironment() string {
	if environment := strings.TrimSpace(os.Getenv("APP_ENV")); environment != "" {
		return environment
	}
	return "unknown"
}
