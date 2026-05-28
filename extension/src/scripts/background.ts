/// <reference types="chrome" />

import {captureAppError} from "../../lib/sentry/captureAppError.ts";

const WEB_APP_URL = import.meta.env.VITE_WEB_APP_URL;
const API_URL = import.meta.env.VITE_API_URL;
const AUTH_COOKIE_NAME = import.meta.env.VITE_AUTH_COOKIE_NAME

async function getAuthToken(): Promise<string | null> {
    try {
        const cookie = await chrome.cookies.get({
            url: `${WEB_APP_URL}`,
            name: `${AUTH_COOKIE_NAME}`
        });

        if (!cookie) {
            return null
        }

        let decodedValue = decodeURIComponent(cookie.value);
        if (decodedValue.startsWith("base64-")) {
            const b64Data = decodedValue.replace("base64-", "");
            decodedValue = atob(b64Data);
        }
        const parsed = JSON.parse(decodedValue);


        if (Array.isArray(parsed)) {
            return parsed[0]
        } else if (parsed && parsed.access_token) {
            return parsed.access_token;
        }
        captureAppError({
            message: "Failed to parse user cookie for auth token",
            area: "extension",
            action: "parse_user_cookie_for_auth_token",
            endpoint: `${WEB_APP_URL}`,
        })
        return null

    } catch (error) {
        captureAppError({
            message: "Unexpected error whilst getting user auth token",
            error,
            area: "extension",
            action: "get_user_auth_token",
        })
        console.error("Failed to parse Supabase cookie:", error)
        return null
    }

}

async function clearAuthToken(): Promise<boolean> {
    try {
        const result = await chrome.cookies.remove({
            url: `${WEB_APP_URL}`,
            name: `${AUTH_COOKIE_NAME}`
        })
        return !!result;


    } catch (error) {
        captureAppError({
            message: "Unexpected error whilst clearing user auth token",
            error,
            area: "extension",
            action: "clear_user_auth_token",
        })
        console.error("Failed to clear supabase session:", error)
        return false
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

