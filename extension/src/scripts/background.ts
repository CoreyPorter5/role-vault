/// <reference types="chrome" />

import {captureAppError} from "../../lib/sentry/captureAppError.ts";
import {API_URL, WEB_APP_URL} from "../config/runtime.ts";

interface ExtensionSessionResponse {
    accessToken?: string;
}

interface RuntimeRequest {
    action?: unknown;
    payload?: unknown;
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
            captureAppError({
                message: "Failed to fetch extension auth session",
                area: "extension",
                action: "get_user_auth_token",
                status: response.status,
                statusText: response.statusText,
                endpoint: "/api/extension/session",
            });

            return null;
        }

        let result: ExtensionSessionResponse;

        try {
            result = await response.json() as ExtensionSessionResponse;
        } catch (error) {
            captureAppError({
                message: "Extension auth session returned invalid JSON",
                error,
                area: "extension",
                action: "parse_user_auth_session",
                status: response.status,
                endpoint: "/api/extension/session",
            });

            return null;
        }

        if (
            typeof result.accessToken !== "string" ||
            result.accessToken.length === 0
        ) {
            return null;
        }

        return result.accessToken;
    } catch (error) {
        captureAppError({
            message: "Unexpected error whilst getting user auth token",
            error,
            area: "extension",
            action: "get_user_auth_token",
            endpoint: "/api/extension/session",
        });

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

        return response.ok;
    } catch (error) {
        captureAppError({
            message: "Unexpected error whilst clearing user auth token",
            error,
            area: "extension",
            action: "clear_user_auth_token",
            endpoint: "/api/extension/logout",
        });

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

        captureAppError({
            message: "Failed to sync user job",
            area: "extension",
            action: "sync_user_job",
            status: response.status,
            statusText: response.statusText,
            endpoint: "/api/v1/jobs",
        });

        return {
            success: false,
            status: response.status,
            error: response.status === 409
                ? "Job already synced"
                : "Failed to sync job",
        };
    } catch (error) {
        captureAppError({
            message: "Unexpected error whilst syncing user job",
            error,
            area: "extension",
            action: "sync_user_job",
            endpoint: "/api/v1/jobs",
        });

        console.error("Unable to sync the SEEK job.");

        return {success: false, error: "Unable to sync job"};
    }
}

chrome.runtime.onMessage.addListener(
    (
        request: RuntimeRequest,
        _sender,
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

        return false;
    },
);

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
