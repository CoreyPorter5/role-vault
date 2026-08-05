/// <reference types="chrome" />

import {captureAppError} from "../../lib/sentry/captureAppError.ts";

const WEB_APP_URL = import.meta.env.VITE_WEB_APP_URL;
const API_URL = import.meta.env.VITE_API_URL;

interface ExtensionSessionResponse {
    accessToken?: string;
    expiresAt?: number | null;
    userId?: string;
    error?: string;
}

async function getAuthToken(): Promise<string | null> {
    try {
        const sessionURL =
            `${WEB_APP_URL.replace(/\/$/, "")}/api/extension/session`;

        const response = await fetch(sessionURL, {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            headers: {
                Accept: "application/json",
                "X-SeekSync-Extension-Id": chrome.runtime.id,
            },
        });

        const responseText = await response.text();

        console.log("Extension session response:", {
            url: sessionURL,
            extensionId: chrome.runtime.id,
            status: response.status,
            body: responseText,
        });

        if (!response.ok) {
            captureAppError({
                message: "Failed to fetch extension auth session",
                area: "extension",
                action: "get_user_auth_token",
                status: response.status,
                statusText: response.statusText,
                endpoint: "/api/extension/session",
                extra: {
                    responseText,
                },
            });

            return null;
        }

        const result = JSON.parse(
            responseText,
        ) as ExtensionSessionResponse;

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
        });

        console.error(
            "Failed to retrieve extension auth token:",
            error,
        );

        return null;
    }
}

async function clearAuthToken(): Promise<boolean> {
    try {
        const response = await fetch(
            `${WEB_APP_URL.replace(/\/$/, "")}/api/extension/logout`,
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
        });

        return false;
    }
}


chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === "SYNC_JOB") {

        (async () => {

            try {

                const token = await getAuthToken();
                if (!token) {
                    sendResponse({
                        success: false,
                        status: 401,
                        error: "Not authenticated"
                    })
                    return
                }
                const response = await fetch(`${API_URL}/api/v1/jobs`, {
                    method: 'POST',
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(request.payload)
                })
                if (response.ok) {
                    sendResponse({success: true});
                    chrome.action.openPopup().catch(err => console.error(err));
                } else {
                    const errorText = await response.text();
                    captureAppError({
                        message: "Failed to sync user job",
                        area: "extension",
                        action: "sync_user_job",
                        status: response.status,
                        statusText: response.statusText,
                        endpoint: `/api/v1/jobs`,
                        extra: {
                            errorText
                        }
                    })
                    sendResponse({success: false, status: response.status, error: errorText});
                }


            } catch (error: unknown) {
                captureAppError({
                    message: "Unexpected error whilst syncing user job",
                    error,
                    area: "extension",
                    action: "sync_user_job",
                })
                console.error("Sync Error: ", error);
                sendResponse({success: false, error: "Unknown error"})
            }


        })();


        return true;
    }
    if (request.action === "GET_TOKEN") {
        getAuthToken().then(token => {
            sendResponse({token: token});
        });
        return true;


    }
    if (request.action === "LOGOUT") {
        clearAuthToken().then(result => {
            sendResponse({success: result})
        });
        return true;

    }

})

