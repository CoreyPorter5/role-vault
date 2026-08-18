/// <reference types="chrome" />

import "../../instrument-background.ts";
import {captureAppError} from "../../lib/sentry/captureAppError.ts";
import {flushExtensionSentry} from "../../lib/sentry/client.ts";
import {WEB_APP_URL} from "../config/runtime.ts";
import {
    isTrustedExtensionPageSender,
    isTrustedSeekContentSender,
} from "../utils/runtimeSender.ts";

interface ExtensionSessionResponse {
    authenticated?: boolean;
    firstName?: string;
}

interface ExtensionJobsResponse {
    jobs?: unknown[];
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
    return isTrustedSeekContentSender(sender, chrome.runtime.id);
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

async function requestExtensionService(
    path: string,
    init: Pick<RequestInit, "method" | "body"> = {},
): Promise<Response> {
    const headers = new Headers({
        Accept: "application/json",
        "X-SeekSync-Extension-Id": chrome.runtime.id,
    });
    if (init.body) headers.set("Content-Type", "application/json");

    return fetch(`${WEB_APP_URL}${path}`, {
        ...init,
        credentials: "include",
        cache: "no-store",
        headers,
    });
}

async function getAuthSession(): Promise<{authenticated: boolean; firstName: string}> {
    try {
        const response = await requestExtensionService("/api/extension/session");

        if (!response.ok) {
            if (response.status >= 500) {
                captureAppError({
                    code: "EXT_BG_SESSION_FETCH",
                    message: "Failed to fetch extension auth session",
                    area: "background",
                    action: "get_user_session",
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
                    action: "get_user_session",
                    status: response.status,
                    endpoint: "/api/extension/session",
                    captureClientFailure: true,
                });
                if (eventID && await flushExtensionSentry()) {
                    reportedSessionForbidden = true;
                }
            }

            return {authenticated: false, firstName: ""};
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

            return {authenticated: false, firstName: ""};
        }

        if (
            result.authenticated !== true ||
            typeof result.firstName !== "string" ||
            result.firstName.length === 0 ||
            result.firstName.length > 80
        ) {
            captureAppError({
                code: "EXT_BG_SESSION_INVALID_RESPONSE",
                message: "Extension auth session returned invalid profile state",
                area: "background",
                action: "validate_user_auth_session",
                endpoint: "/api/extension/session",
            });
            await flushExtensionSentry();
            return {authenticated: false, firstName: ""};
        }

        return {authenticated: true, firstName: result.firstName};
    } catch (error) {
        captureAppError({
            code: "EXT_BG_SESSION_FETCH",
            message: "Unexpected error whilst getting the extension session",
            error,
            area: "background",
            action: "get_user_session",
            endpoint: "/api/extension/session",
        });
        await flushExtensionSentry();

        console.error("Failed to retrieve extension auth session.");

        return {authenticated: false, firstName: ""};
    }
}

async function clearAuthSession(): Promise<boolean> {
    try {
        const response = await requestExtensionService("/api/extension/logout", {method: "POST"});

        if (!response.ok && response.status >= 500) {
            captureAppError({
                code: "EXT_BG_LOGOUT",
                message: "Failed to clear the extension auth session",
                area: "background",
                action: "clear_user_session",
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
            message: "Unexpected error whilst clearing the extension session",
            error,
            area: "background",
            action: "clear_user_session",
            endpoint: "/api/extension/logout",
        });
        await flushExtensionSentry();

        return false;
    }
}

async function syncJob(payload: unknown) {
    try {
        const response = await requestExtensionService("/api/extension/jobs", {
            method: "POST",
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
                endpoint: "/api/extension/jobs",
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
            endpoint: "/api/extension/jobs",
        });
        await flushExtensionSentry();

        console.error("Unable to sync the SEEK job.");

        return {success: false, error: "Unable to sync job"};
    }
}

async function getJobs() {
    try {
        const response = await requestExtensionService("/api/extension/jobs");
        if (!response.ok) {
            return {success: false, status: response.status, error: "Failed to load synced jobs"};
        }
        const result = await response.json() as ExtensionJobsResponse;
        if (!Array.isArray(result.jobs)) {
            throw new Error("Extension jobs response is invalid");
        }
        return {success: true, jobs: result.jobs};
    } catch (error) {
        captureAppError({
            code: "EXT_BG_JOBS_FETCH",
            message: "Unexpected error whilst fetching user jobs",
            error,
            area: "background",
            action: "fetch_user_jobs",
            endpoint: "/api/extension/jobs",
        });
        await flushExtensionSentry();
        return {success: false, error: "Failed to load synced jobs"};
    }
}

async function deleteJob(payload: unknown) {
    const jobID = typeof payload === "object" && payload !== null && "jobID" in payload
        ? (payload as {jobID?: unknown}).jobID
        : null;
    if (typeof jobID !== "string" || !/^\d{5,20}$/.test(jobID)) {
        return {success: false, status: 400, error: "Invalid job ID"};
    }

    try {
        const response = await requestExtensionService(`/api/extension/jobs/${encodeURIComponent(jobID)}`, {
            method: "DELETE",
        });
        return response.ok
            ? {success: true}
            : {success: false, status: response.status, error: "Failed to delete job"};
    } catch (error) {
        captureAppError({
            code: "EXT_BG_JOB_DELETE",
            message: "Unexpected error whilst deleting user job",
            error,
            area: "background",
            action: "delete_user_job",
            endpoint: "/api/extension/jobs/:jobId",
        });
        await flushExtensionSentry();
        return {success: false, error: "Failed to delete job"};
    }
}

chrome.runtime.onMessage.addListener(
    (
        request: RuntimeRequest,
        sender,
        sendResponse,
    ) => {
        if (request.action === "SYNC_JOB") {
            if (!isTrustedContentSender(sender)) return false;
            void syncJob(request.payload).then(sendResponse);
            return true;
        }

        if (request.action === "GET_JOBS") {
            if (!isTrustedExtensionPageSender(sender, chrome.runtime.id)) return false;
            void getJobs().then(sendResponse);
            return true;
        }

        if (request.action === "DELETE_JOB") {
            if (!isTrustedExtensionPageSender(sender, chrome.runtime.id)) return false;
            void deleteJob(request.payload).then(sendResponse);
            return true;
        }

        if (request.action === "CHECK_AUTH") {
            if (
                !isTrustedContentSender(sender) &&
                !isTrustedExtensionPageSender(sender, chrome.runtime.id)
            ) return false;
            void getAuthSession().then(sendResponse);
            return true;
        }

        if (request.action === "LOGOUT") {
            if (!isTrustedExtensionPageSender(sender, chrome.runtime.id)) return false;
            void clearAuthSession().then((success) => {
                sendResponse({success});
            });
            return true;
        }

        if (request.action === "REPORT_DIAGNOSTIC") {
            if (!isTrustedContentSender(sender)) return false;
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
