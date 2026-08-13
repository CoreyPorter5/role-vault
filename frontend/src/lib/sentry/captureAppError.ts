import * as Sentry from "@sentry/nextjs"
import {
    isBackendOwnedHttpFailure,
    normalizeSentryEndpoint,
    safeSentryExtras,
    shouldCaptureHttpFailure,
} from "./privacy";


type CaptureAppErrorProps = {
    code?: string;
    message: string;
    error?: unknown;
    area: string;
    action: string;
    endpoint?: string;
    status?: string | number;
    statusText?: string;
    extra?: Record<string, unknown>
    forceCapture?: boolean;
}

function generatedErrorCode(area: string, action: string): string {
    const normalize = (value: string) => value
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .toUpperCase();
    return `WEB_${normalize(area)}_${normalize(action)}_FAILED`;
}

function isAbortError(error: unknown): boolean {
    return typeof DOMException !== "undefined" &&
        error instanceof DOMException &&
        error.name === "AbortError";
}

export function captureAppError({code, message, error, area, action, endpoint, status, extra, forceCapture}: CaptureAppErrorProps){
    if (
        isAbortError(error) ||
        (!forceCapture && (
            isBackendOwnedHttpFailure(endpoint, status) ||
            !shouldCaptureHttpFailure(status)
        ))
    ) return;

    const errorCode = code ?? generatedErrorCode(area, action);
    const normalizedEndpoint = endpoint ? normalizeSentryEndpoint(endpoint) : undefined;
    Sentry.withScope((scope) => {
        scope.setTag("error.code", errorCode);
        scope.setTag("surface", "web");
        scope.setTag("area", area);
        scope.setTag("action", action)
        if(normalizedEndpoint){
            scope.setTag("endpoint", normalizedEndpoint)
        }
        if(status !== undefined){
            scope.setTag("http.status_code", String(status))
        }
        scope.setContext("operation", {
            message,
            endpoint: normalizedEndpoint,
            status,
        });
        scope.setExtras(safeSentryExtras(extra));
        if(error instanceof Error){
            Sentry.captureException(error)
        }else{
            Sentry.captureMessage(message, "error")
        }
    })
}
