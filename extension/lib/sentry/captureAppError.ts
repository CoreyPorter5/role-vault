import {getExtensionSentryScope} from "./client.ts";
import {
    normalizeExtensionEndpoint,
    safeExtensionException,
    shouldIgnoreExtensionError,
    shouldCaptureExtensionHTTPFailure,
} from "./privacy.ts";


type CaptureAppErrorProps = {
    code: string;
    message: string;
    error?: unknown;
    area: string;
    action: string;
    endpoint?: string;
    status?: string | number;
    statusText?: string;
    extra?: Record<string, unknown>;
    captureClientFailure?: boolean;
}

export function captureAppError({code, message, error, area, action, endpoint, status, captureClientFailure}: CaptureAppErrorProps): string | undefined {
    if (
        shouldIgnoreExtensionError(code, error) ||
        !shouldCaptureExtensionHTTPFailure(status, captureClientFailure)
    ) {
        return undefined;
    }

    const scope = getExtensionSentryScope();
    if (!scope) return undefined;

    scope.setTag("error.code", code);
    scope.setTag("surface", "extension");
    scope.setTag("area", area);
    scope.setTag("action", action);
    if (endpoint) {
        scope.setTag("endpoint", normalizeExtensionEndpoint(endpoint));
    }
    if (status !== undefined) {
        scope.setTag("http.status_code", String(status));
    }
    scope.setContext("operation", {
        message,
        endpoint: endpoint ? normalizeExtensionEndpoint(endpoint) : undefined,
        status,
    });

    return error instanceof Error
        ? scope.captureException(safeExtensionException(error, message))
        : scope.captureMessage(message, "error");
}
