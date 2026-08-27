import {NextRequest} from "next/server";

import {captureAppError} from "@/lib/sentry/captureAppError";
import {
    extensionJSON,
    extensionPreflight,
    fetchExtensionBackend,
    getAuthenticatedExtensionSession,
    rejectUntrustedExtensionRequest,
} from "@/lib/extension/server";

const METHODS = "DELETE";
const STORED_JOB_ID_PATTERN = /^(?:\d{5,20}|custom_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

export function OPTIONS(request: NextRequest) {
    return extensionPreflight(request, METHODS);
}

export async function DELETE(
    request: NextRequest,
    {params}: {params: Promise<{jobID: string}>},
) {
    const rejection = rejectUntrustedExtensionRequest(request, METHODS);
    if (rejection) return rejection;

    const auth = await getAuthenticatedExtensionSession(request);
    if (!auth.session) {
        return extensionJSON({error: "Not authenticated"}, 401, METHODS, auth.authCookieUpdate);
    }

    const {jobID} = await params;
    if (!STORED_JOB_ID_PATTERN.test(jobID)) {
        return extensionJSON({error: "Invalid job ID"}, 400, METHODS, auth.authCookieUpdate);
    }

    try {
        const response = await fetchExtensionBackend(
            `/api/v1/jobs/${encodeURIComponent(jobID)}`,
            auth.session.backendAccessToken,
            {method: "DELETE"},
        );
        if (!response.ok) {
            return extensionJSON(
                {error: response.status === 404 ? "Job not found" : "Unable to delete job"},
                response.status,
                METHODS,
                auth.authCookieUpdate,
            );
        }
        return extensionJSON({success: true}, 200, METHODS, auth.authCookieUpdate);
    } catch (error) {
        captureAppError({
            code: "WEB_EXTENSION_JOB_PROXY_FAILED",
            message: "Extension job deletion proxy failed",
            error,
            area: "extension_api",
            action: "delete",
            endpoint: "/api/extension/jobs/:jobId",
        });
        return extensionJSON({error: "Unable to delete job"}, 502, METHODS, auth.authCookieUpdate);
    }
}
