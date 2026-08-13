import type {ErrorEvent} from "@sentry/browser";

const DYNAMIC_PATH_SEGMENT = /\/(?:\d{5,}|[0-9a-f]{8}-[0-9a-f-]{27,}|[0-9a-f]{24,})(?=\/|$)/gi;
const IGNORED_ERROR_FRAGMENTS = [
    "extension context invalidated",
    "receiving end does not exist",
    "could not establish connection",
];
const OFFLINE_NETWORK_CODES = new Set([
    "EXT_BG_SESSION_FETCH",
    "EXT_BG_LOGOUT",
    "EXT_BG_JOB_SYNC_TRANSPORT",
    "EXT_POPUP_JOBS_FETCH",
    "EXT_POPUP_JOB_DELETE",
    "EXT_POPUP_USER_LOOKUP",
]);
const RUNTIME_MESSAGE_CODES = new Set([
    "EXT_POPUP_RUNTIME_MESSAGE",
]);
const SAFE_ERROR_NAMES = new Set([
    "Error",
    "TypeError",
    "ReferenceError",
    "RangeError",
    "SyntaxError",
    "URIError",
]);

export function normalizeExtensionEndpoint(endpoint: string): string {
    const pathOnly = endpoint.split(/[?#]/, 1)[0] || "/";
    return pathOnly.replace(DYNAMIC_PATH_SEGMENT, "/:id");
}

function sanitizeURL(value: string | undefined): string | undefined {
    if (!value) return value;
    try {
        const url = new URL(value);
        return url.origin;
    } catch {
        return normalizeExtensionEndpoint(value);
    }
}

export function isIgnoredExtensionError(error: unknown): boolean {
    const message = error instanceof Error
        ? error.message
        : typeof error === "string" ? error : "";
    const normalized = message.toLowerCase();
    return IGNORED_ERROR_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

export function shouldIgnoreExtensionError(code: string, error: unknown): boolean {
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    return (offline && OFFLINE_NETWORK_CODES.has(code)) ||
        (RUNTIME_MESSAGE_CODES.has(code) && isIgnoredExtensionError(error));
}

export function safeExtensionException(error: Error, message: string): Error {
    const safeError = new Error(message);
    safeError.name = SAFE_ERROR_NAMES.has(error.name) ? error.name : "Error";

    const stackFrames = error.stack
        ?.split("\n")
        .slice(1, 11)
        .map((line) => line.replace(/[?#][^\s)]*/g, ""))
        .filter((line) => line.trimStart().startsWith("at "));
    if (stackFrames?.length) {
        safeError.stack = [`${safeError.name}: ${message}`, ...stackFrames].join("\n");
    }
    return safeError;
}

export function shouldCaptureExtensionHTTPFailure(
    status?: string | number,
    captureClientFailure = false,
): boolean {
    if (status === undefined) return true;
    const numericStatus = typeof status === "number" ? status : Number(status);
    if (!Number.isFinite(numericStatus)) return true;
    if (numericStatus === 0) return true;
    if (numericStatus >= 500) return true;
    return captureClientFailure && numericStatus >= 400;
}

export function scrubExtensionEvent(event: ErrorEvent): ErrorEvent {
    if (event.request) {
        event.request.url = sanitizeURL(event.request.url);
        event.request.data = undefined;
        event.request.query_string = undefined;
        event.request.cookies = undefined;
        event.request.headers = undefined;
        event.request.env = undefined;
    }
    event.user = undefined;
    if (event.transaction) {
        event.transaction = normalizeExtensionEndpoint(event.transaction);
    }
    event.extra = undefined;
    return event;
}
