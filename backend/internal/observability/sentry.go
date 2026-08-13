package observability

import (
	"context"
	"errors"
	"net/http"
	"regexp"
	"strings"

	"github.com/getsentry/sentry-go"
	"github.com/go-chi/chi/v5"
)

// ErrorCode is a stable, searchable identifier for an operational failure.
// Keep codes low-cardinality; use Action to distinguish CRUD operations.
type ErrorCode string

const (
	CodeRuntimePanic                     ErrorCode = "BE_RUNTIME_PANIC"
	CodeStartupDatabaseFailed            ErrorCode = "BE_STARTUP_DB_FAILED"
	CodeHTTPServerFailed                 ErrorCode = "BE_HTTP_SERVER_FAILED"
	CodeAuthKeysFailed                   ErrorCode = "BE_AUTH_KEYS_FAILED"
	CodeInternalAPIConfigFailed          ErrorCode = "BE_INTERNAL_API_CONFIG_FAILED"
	CodeJobStoreFailed                   ErrorCode = "BE_JOB_STORE_FAILED"
	CodeProfileStoreFailed               ErrorCode = "BE_PROFILE_STORE_FAILED"
	CodeUsageStoreFailed                 ErrorCode = "BE_USAGE_STORE_FAILED"
	CodeResumeUploadPrepareFailed        ErrorCode = "BE_RESUME_UPLOAD_PREPARE_FAILED"
	CodeMasterResumeStoreFailed          ErrorCode = "BE_MASTER_RESUME_STORE_FAILED"
	CodeGeneratedResumeStoreFailed       ErrorCode = "BE_GENERATED_RESUME_STORE_FAILED"
	CodeResumeDraftStoreFailed           ErrorCode = "BE_RESUME_DRAFT_STORE_FAILED"
	CodeResumeLibraryStoreFailed         ErrorCode = "BE_RESUME_LIBRARY_STORE_FAILED"
	CodeResumeGenerationStoreFailed      ErrorCode = "BE_RESUME_GENERATION_STORE_FAILED"
	CodeCoverLetterStoreFailed           ErrorCode = "BE_COVER_LETTER_STORE_FAILED"
	CodeCoverLetterDraftStoreFailed      ErrorCode = "BE_COVER_LETTER_DRAFT_STORE_FAILED"
	CodeCoverLetterGenerationStoreFailed ErrorCode = "BE_COVER_LETTER_GENERATION_STORE_FAILED"
	CodeJobCategoryStoreFailed           ErrorCode = "BE_JOB_CATEGORY_STORE_FAILED"
	CodeBillingAPIFailed                 ErrorCode = "BE_BILLING_API_FAILED"
	CodeStripeWebhookDecodeFailed        ErrorCode = "BE_STRIPE_WEBHOOK_DECODE_FAILED"
	CodeStripeWebhookProcessFailed       ErrorCode = "BE_STRIPE_WEBHOOK_PROCESS_FAILED"
	CodeStripeWebhookConfigFailed        ErrorCode = "BE_STRIPE_WEBHOOK_CONFIG_FAILED"
	CodeStorageCleanupFailed             ErrorCode = "BE_STORAGE_CLEANUP_FAILED"
)

type Operation struct {
	Area   string
	Action string
	Level  sentry.Level
}

var sensitiveErrorPatterns = []struct {
	pattern     *regexp.Regexp
	replacement string
}{
	{regexp.MustCompile(`(?i)bearer\s+\S+`), "Bearer [redacted]"},
	{regexp.MustCompile(`(?i)[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}`), "[redacted-email]"},
	{regexp.MustCompile(`(?i)\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b`), "[redacted-id]"},
	{regexp.MustCompile(`\b\d{5,}\b`), "[redacted-id]"},
	{regexp.MustCompile(`(?i)\b(?:sk|pk|rk)_(?:live|test)_[a-z0-9_]+\b`), "[redacted-key]"},
	{regexp.MustCompile(`(?i)\b(?:pi|pm|cus|sub|cs|seti|src|tok)_[a-z0-9_]+\b`), "[redacted-stripe-id]"},
	{regexp.MustCompile(`https?://[^\s"']+`), "[redacted-url]"},
}

func CaptureError(ctx context.Context, code ErrorCode, err error, operation Operation) *sentry.EventID {
	if err == nil || errors.Is(err, context.Canceled) || errors.Is(ctx.Err(), context.Canceled) {
		return nil
	}

	hub := sentry.GetHubFromContext(ctx)
	if hub == nil {
		hub = sentry.CurrentHub()
	}
	if hub == nil || hub.Client() == nil {
		return nil
	}

	captureHub := hub.Clone()
	setOperationTags(captureHub.Scope(), code, operation)
	return captureHub.CaptureException(err)
}

func CaptureWarning(ctx context.Context, code ErrorCode, err error, area, action string) *sentry.EventID {
	return CaptureError(ctx, code, err, Operation{
		Area:   area,
		Action: action,
		Level:  sentry.LevelWarning,
	})
}

func CaptureRequestError(r *http.Request, code ErrorCode, err error, operation Operation) *sentry.EventID {
	if r == nil {
		return CaptureError(context.Background(), code, err, operation)
	}
	if err == nil || errors.Is(err, context.Canceled) || errors.Is(r.Context().Err(), context.Canceled) {
		return nil
	}

	hub := sentry.GetHubFromContext(r.Context())
	if hub == nil {
		hub = sentry.CurrentHub()
	}
	if hub == nil || hub.Client() == nil {
		return nil
	}

	captureHub := hub.Clone()
	setOperationTags(captureHub.Scope(), code, operation)
	setRequestTags(captureHub.Scope(), r)
	return captureHub.CaptureException(err)
}

func CapturePanic(r *http.Request, recovered any) *sentry.EventID {
	if r == nil {
		return nil
	}
	hub := sentry.GetHubFromContext(r.Context())
	if hub == nil {
		hub = sentry.CurrentHub()
	}
	if hub == nil || hub.Client() == nil {
		return nil
	}

	captureHub := hub.Clone()
	setOperationTags(captureHub.Scope(), CodeRuntimePanic, Operation{Area: "runtime", Action: "serve_request"})
	setRequestTags(captureHub.Scope(), r)
	return captureHub.RecoverWithContext(r.Context(), recovered)
}

func setOperationTags(scope *sentry.Scope, code ErrorCode, operation Operation) {
	scope.SetTag("error.code", string(code))
	scope.SetTag("surface", "backend")
	if operation.Area != "" {
		scope.SetTag("area", operation.Area)
	}
	if operation.Action != "" {
		scope.SetTag("action", operation.Action)
	}
	if operation.Level != "" {
		scope.SetLevel(operation.Level)
	}
}

func setRequestTags(scope *sentry.Scope, r *http.Request) {
	scope.SetTag("http.method", r.Method)
	if routeContext := chi.RouteContext(r.Context()); routeContext != nil {
		if routePattern := routeContext.RoutePattern(); routePattern != "" {
			scope.SetTag("http.route", routePattern)
		}
	}
}

// ScrubEvent is a final safety boundary. Resume and generation endpoints can
// contain highly sensitive document content, so Sentry never receives request
// bodies, headers, cookies, query strings, raw URLs, or user identity fields.
func ScrubEvent(event *sentry.Event, _ *sentry.EventHint) *sentry.Event {
	if event == nil {
		return nil
	}

	if event.Request != nil {
		event.Request.Data = ""
		event.Request.QueryString = ""
		event.Request.Cookies = ""
		event.Request.Headers = nil
		event.Request.Env = nil
		event.Request.URL = ""
	}
	event.User = sentry.User{}
	event.Message = redactSensitiveErrorText(event.Message)

	providerCode := ErrorCode(event.Tags["error.code"])
	for index := range event.Exception {
		switch providerCode {
		case CodeBillingAPIFailed:
			event.Exception[index].Value = "billing provider request failed"
		case CodeStripeWebhookProcessFailed, CodeStripeWebhookDecodeFailed:
			event.Exception[index].Value = "Stripe webhook processing failed"
		case CodeStorageCleanupFailed:
			event.Exception[index].Value = "storage cleanup failed"
		default:
			event.Exception[index].Value = redactSensitiveErrorText(event.Exception[index].Value)
		}
	}

	for index := range event.Breadcrumbs {
		breadcrumb := event.Breadcrumbs[index]
		if breadcrumb == nil {
			continue
		}
		breadcrumb.Message = ""
		safeData := make(map[string]interface{}, 2)
		for key, value := range breadcrumb.Data {
			switch strings.ToLower(key) {
			case "method", "status", "status_code":
				safeData[key] = value
			}
		}
		if len(safeData) == 0 {
			breadcrumb.Data = nil
		} else {
			breadcrumb.Data = safeData
		}
	}

	return event
}

func redactSensitiveErrorText(value string) string {
	for _, replacement := range sensitiveErrorPatterns {
		value = replacement.pattern.ReplaceAllString(value, replacement.replacement)
	}
	return value
}
