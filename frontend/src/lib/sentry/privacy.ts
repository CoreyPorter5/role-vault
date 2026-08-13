import type {Breadcrumb, ErrorEvent} from "@sentry/nextjs";

const DYNAMIC_PATH_SEGMENT = /\/(?:\d{5,}|[0-9a-f]{8}-[0-9a-f-]{27,}|[0-9a-f]{24,})(?=\/|$)/gi;
const SENSITIVE_ERROR_PATTERNS: Array<[RegExp, string]> = [
    [/bearer\s+\S+/gi, "Bearer [redacted]"],
    [/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/gi, "[redacted-email]"],
    [/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, "[redacted-id]"],
    [/\b\d{5,}\b/g, "[redacted-id]"],
    [/https?:\/\/[^\s"')]+/gi, "[redacted-url]"],
];
const SAFE_EXTRA_KEYS = new Set([
    "errorCode",
    "upstreamErrorCode",
    "failureCode",
    "attemptCount",
    "repairAttempted",
    "hasGeneratedResume",
]);

export function normalizeSentryEndpoint(endpoint: string): string {
    const pathOnly = endpoint.split(/[?#]/, 1)[0] || "/";
    return pathOnly.replace(DYNAMIC_PATH_SEGMENT, "/:id");
}

function sanitizeURL(value: string | undefined): string | undefined {
    if (!value) return value;

    try {
        const url = new URL(value);
        // Absolute URLs can be signed storage links whose path embeds object
        // keys and filenames. Route templates are retained separately through
        // transactions and explicit endpoint tags, so keep only the origin.
        return url.origin;
    } catch {
        return normalizeSentryEndpoint(value);
    }
}

function sanitizeErrorText(value: string | undefined): string | undefined {
    if (!value) return value;
    let sanitized = value;
    for (const [pattern, replacement] of SENSITIVE_ERROR_PATTERNS) {
        sanitized = sanitized.replace(pattern, replacement);
    }
    return sanitized.length > 1_000
        ? `${sanitized.slice(0, 1_000)}…`
        : sanitized;
}

export function safeSentryExtras(extra: Record<string, unknown> | undefined): Record<string, unknown> {
    if (!extra) return {};

    return Object.fromEntries(
        Object.entries(extra).filter(([key, value]) =>
            SAFE_EXTRA_KEYS.has(key) &&
            (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
        ),
    );
}

export function shouldCaptureHttpFailure(status?: string | number): boolean {
    if (status === undefined) return true;
    const numericStatus = typeof status === "number" ? status : Number(status);
    return !Number.isFinite(numericStatus) || numericStatus >= 500;
}

export function isBackendOwnedHttpFailure(
    endpoint: string | undefined,
    status?: string | number,
): boolean {
    if (!endpoint || status === undefined) return false;
    const numericStatus = typeof status === "number" ? status : Number(status);
    return Number.isFinite(numericStatus) &&
        numericStatus >= 400 &&
        normalizeSentryEndpoint(endpoint).startsWith("/api/v1/");
}

export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
    if (event.request) {
        event.request.url = sanitizeURL(event.request.url);
        event.request.data = undefined;
        event.request.query_string = undefined;
        event.request.cookies = undefined;
        event.request.headers = undefined;
        event.request.env = undefined;
    }

    if (event.user?.id) {
        event.user = {id: event.user.id};
    } else {
        event.user = undefined;
    }

    if (event.transaction) {
        event.transaction = normalizeSentryEndpoint(event.transaction);
    }

    event.message = sanitizeErrorText(event.message);
    for (const exception of event.exception?.values ?? []) {
        exception.value = sanitizeErrorText(exception.value);
        if (exception.mechanism) {
            exception.mechanism.data = undefined;
        }
    }

    const nextContext = event.contexts?.nextjs;
    if (nextContext) {
        const requestPath = typeof nextContext.request_path === "string"
            ? normalizeSentryEndpoint(nextContext.request_path)
            : undefined;
        const routerPath = typeof nextContext.router_path === "string"
            ? normalizeSentryEndpoint(nextContext.router_path)
            : undefined;
        event.contexts = {
            ...event.contexts,
            nextjs: {
                ...(typeof nextContext.router_kind === "string" ? {router_kind: nextContext.router_kind} : {}),
                ...(typeof nextContext.route_type === "string" ? {route_type: nextContext.route_type} : {}),
                ...(requestPath ? {request_path: requestPath} : {}),
                ...(routerPath ? {router_path: routerPath} : {}),
            },
        };
    }

    event.extra = safeSentryExtras(event.extra);
    return event;
}

export function scrubSentryBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
    if (breadcrumb.category === "console") return null;

    // Breadcrumb messages can contain arbitrary console or response text. The
    // allowlisted method/status/route data below is enough to reconstruct the
    // request sequence without retaining user content.
    breadcrumb.message = undefined;
    if (!breadcrumb.data) return breadcrumb;

    const method = typeof breadcrumb.data.method === "string"
        ? breadcrumb.data.method
        : undefined;
    const statusCode = typeof breadcrumb.data.status_code === "number"
        ? breadcrumb.data.status_code
        : undefined;
    const url = typeof breadcrumb.data.url === "string"
        ? sanitizeURL(breadcrumb.data.url)
        : undefined;

    breadcrumb.data = {
        ...(method ? {method} : {}),
        ...(typeof statusCode === "number" ? {status_code: statusCode} : {}),
        ...(url ? {url} : {}),
    };
    return breadcrumb;
}
