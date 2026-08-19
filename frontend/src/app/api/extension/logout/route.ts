import {NextRequest} from "next/server";

import {captureAppError} from "@/lib/sentry/captureAppError";
import {
    extensionJSON,
    extensionPreflight,
    rejectUntrustedExtensionRequest,
    signOutAuthenticatedExtensionSession,
} from "@/lib/extension/server";

const METHODS = "POST";

export function OPTIONS(request: NextRequest) {
    return extensionPreflight(request, METHODS);
}

export async function POST(request: NextRequest) {
    const rejection = rejectUntrustedExtensionRequest(request, METHODS);
    if (rejection) return rejection;

    const {error, authCookieUpdate} = await signOutAuthenticatedExtensionSession(request);

    if (error) {
        captureAppError({
            code: "WEB_EXTENSION_LOGOUT_FAILED",
            message: "Failed to clear the extension session",
            error: new Error("Extension session logout failed"),
            area: "extension_api",
            action: "logout",
            endpoint: "/api/extension/logout",
            status: 500,
        });
        return extensionJSON({error: "Failed to sign out"}, 500, METHODS, authCookieUpdate);
    }

    return extensionJSON({success: true}, 200, METHODS, authCookieUpdate);
}
