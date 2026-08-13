/// <reference types="chrome" />

import "../../instrument-background.ts";
import {captureAppError} from "../../lib/sentry/captureAppError.ts";
import {flushExtensionSentry} from "../../lib/sentry/client.ts";
import {API_URL, WEB_APP_URL} from "../config/runtime.ts";

interface ExtensionSessionResponse {
    accessToken?: string;
}

interface RuntimeRequest {
    action?: unknown;
    payload?: unknown;
}

type ContentDiagnosticCode =
    | "EXT_CONTENT_SEEK_SCHEMA"
    | "EXT_CONTENT_SCRAPE_UNEXPECTED"
    | "EXT_CONTENT_SYNC_UNEXPECTED";

const reportedContentDiagnostics = new Set<ContentDiagnosticCode>();
let reportedSessionForbidden = false;

function isTrustedContentSender(sender: chrome.runtime.MessageSender): boolean {
    if (sender.id !== chrome.runtime.id || !sender.url) return false;
    try {
        return new URL(sender.url).origin === "https://au.seek.com";
    } catch {
        return false;
    }
}

async function reportContentDiagnostic(
    sender: chrome.runtime.MessageSender,
    payload: unknown,
): Promise<void> {
    if (!isTrustedContentSender(sender) || typeof payload !== "object" || payload === null) return;
    const code = "code" in payload ? (payload as {code?: unknown}).code : undefined;
    if (
        code !== "EXT_CONTENT_SEEK_SCHEMA" &&
        code !== "EXT_CONTENT_SCRAPE_UNEXPECTED" &&
        code !== "EXT_CONTENT_SYNC_UNEXPECTED"
    ) return;
    if (reportedContentDiagnostics.has(code)) return;

    const eventID = captureAppError({
        code,
        message: code === "EXT_CONTENT_SEEK_SCHEMA"
            ? "SEEK page data no longer matches the sync schema"
            : code === "EXT_CONTENT_SCRAPE_UNEXPECTED"
                ? "Unexpected error while reading the SEEK job page"
                : "Unexpected error while handling the SEEK sync button",
        area: "content_script",
        action: code === "EXT_CONTENT_SEEK_SCHEMA"
            ? "scrape_job"
            : code === "EXT_CONTENT_SCRAPE_UNEXPECTED"
                ? "scrape_job"
                : "sync_button",
    });
    if (eventID && await flushExtensionSentry()) {
        reportedContentDiagnostics.add(code);
    }
}

async function getAuthToken(): Promise<string | null> {
    const sessionURL = `${WEB_APP_URL}/api/extension/session`;

    try {
        const response = await fetch(sessionURL, {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            headers: {
                Accept: "application/json",
                "X-SeekSync-Extension-Id": chrome.runtime.id,
            },
        });

        if (!response.ok) {
            if (response.status >= 500) {
                captureAppError({
                    code: "EXT_BG_SESSION_FETCH",
                    message: "Failed to fetch extension auth session",
                    area: "background",
                    action: "get_user_auth_token",
                    status: response.status,
                    statusText: response.statusText,
                    endpoint: "/api/extension/session",
                });
                await flushExtensionSentry();
            } else if (response.status === 403 && !reportedSessionForbidden) {
                const eventID = captureAppError({
                    code: "EXT_BG_SESSION_FORBIDDEN",
                    message: "Extension session was rejected by web configuration",
                    area: "background",
                    action: "get_user_auth_token",
                    status: response.status,
                    endpoint: "/api/extension/session",
                    captureClientFailure: true,
                });
                if (eventID && await flushExtensionSentry()) {
                    reportedSessionForbidden = true;
                }
            }

            return null;
        }

        let result: ExtensionSessionResponse;

        try {
            result = await response.json() as ExtensionSessionResponse;
        } catch (error) {
            captureAppError({
                code: "EXT_BG_SESSION_INVALID_RESPONSE",
                message: "Extension auth session returned invalid JSON",
                error,
                area: "background",
                action: "parse_user_auth_session",
                endpoint: "/api/extension/session",
            });
            await flushExtensionSentry();

            return null;
        }

        if (
            typeof result.accessToken !== "string" ||
            result.accessToken.length === 0
        ) {
            captureAppError({
                code: "EXT_BG_SESSION_INVALID_RESPONSE",
                message: "Extension auth session omitted its access token",
                area: "background",
                action: "validate_user_auth_session",
                endpoint: "/api/extension/session",
            });
            await flushExtensionSentry();
            return null;
        }

        return result.accessToken;
    } catch (error) {
        captureAppError({
            code: "EXT_BG_SESSION_FETCH",
            message: "Unexpected error whilst getting user auth token",
            error,
            area: "background",
            action: "get_user_auth_token",
            endpoint: "/api/extension/session",
        });
        await flushExtensionSentry();

        console.error("Failed to retrieve extension auth session.");

        return null;
    }
}

async function clearAuthToken(): Promise<boolean> {
    try {
        const response = await fetch(
            `${WEB_APP_URL}/api/extension/logout`,
            {
                method: "POST",
                credentials: "include",
                cache: "no-store",
                headers: {
                    "X-SeekSync-Extension-Id": chrome.runtime.id,
                },
            },
        );

        if (!response.ok && response.status >= 500) {
            captureAppError({
                code: "EXT_BG_LOGOUT",
                message: "Failed to clear the extension auth session",
                area: "background",
                action: "clear_user_auth_token",
                endpoint: "/api/extension/logout",
                status: response.status,
                statusText: response.statusText,
            });
            await flushExtensionSentry();
        }

        return response.ok;
    } catch (error) {
        captureAppError({
            code: "EXT_BG_LOGOUT",
            message: "Unexpected error whilst clearing user auth token",
            error,
            area: "background",
            action: "clear_user_auth_token",
            endpoint: "/api/extension/logout",
        });
        await flushExtensionSentry();

        return false;
    }
}

async function syncJob(payload: unknown) {
    try {
        const token = await getAuthToken();

        if (!token) {
            return {
                success: false,
                status: 401,
                error: "Not authenticated",
            };
        }

        const response = await fetch(`${API_URL}/api/v1/jobs`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            void chrome.action.openPopup().catch(() => {
                // The job is already synced if Chrome cannot open the popup.
            });

            return {success: true};
        }

        if (response.status === 400 || response.status === 422) {
            captureAppError({
                code: "EXT_BG_JOB_SYNC_REJECTED",
                message: "Failed to sync user job",
                area: "background",
                action: "sync_user_job",
                status: response.status,
                statusText: response.statusText,
                endpoint: "/api/v1/jobs",
                captureClientFailure: true,
            });
            await flushExtensionSentry();
        }

        return {
            success: false,
            status: response.status,
            error: response.status === 409
                ? "Job already synced"
                : "Failed to sync job",
        };
    } catch (error) {
        captureAppError({
            code: "EXT_BG_JOB_SYNC_TRANSPORT",
            message: "Unexpected error whilst syncing user job",
            error,
            area: "background",
            action: "sync_user_job",
            endpoint: "/api/v1/jobs",
        });
        await flushExtensionSentry();

        console.error("Unable to sync the SEEK job.");

        return {success: false, error: "Unable to sync job"};
    }
}

chrome.runtime.onMessage.addListener(
    (
        request: RuntimeRequest,
        sender,
        sendResponse,
    ) => {
        if (request.action === "SYNC_JOB") {
            void syncJob(request.payload).then(sendResponse);
            return true;
        }

        if (request.action === "GET_TOKEN") {
            void getAuthToken().then((token) => {
                sendResponse({token});
            });
            return true;
        }

        if (request.action === "CHECK_AUTH") {
            void getAuthToken().then((token) => {
                sendResponse({authenticated: token !== null});
            });
            return true;
        }

        if (request.action === "LOGOUT") {
            void clearAuthToken().then((success) => {
                sendResponse({success});
            });
            return true;
        }

        if (request.action === "REPORT_DIAGNOSTIC") {
            void reportContentDiagnostic(sender, request.payload).then(() => {
                sendResponse({accepted: true});
            });
            return true;
        }

        return false;
    },
);

self.addEventListener("error", (event) => {
    captureAppError({
        code: "EXT_BG_UNHANDLED",
        message: "Unhandled background worker error",
        error: event.error ?? new Error(event.message),
        area: "background",
        action: "unhandled_error",
    });
    void flushExtensionSentry();
});

self.addEventListener("unhandledrejection", (event) => {
    captureAppError({
        code: "EXT_BG_UNHANDLED",
        message: "Unhandled background worker promise rejection",
        error: event.reason,
        area: "background",
        action: "unhandled_rejection",
    });
    void flushExtensionSentry();
});

chrome.webNavigation.onHistoryStateUpdated.addListener(
    ({frameId, tabId, url}) => {
        if (frameId !== 0) {
            return;
        }

        chrome.tabs.sendMessage(
            tabId,
            {
                action: "SEEK_NAVIGATION_CHANGED",
                url,
            },
            () => {
                // A matching content script is not guaranteed to be ready.
                void chrome.runtime.lastError;
            },
        );
    },
    {
        url: [
            {
                schemes: ["https"],
                hostEquals: "au.seek.com",
            },
        ],
    },
);
