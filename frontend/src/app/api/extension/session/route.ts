import {NextRequest} from "next/server";

import {
    extensionJSON,
    extensionPreflight,
    extensionUserFirstName,
    getAuthenticatedExtensionSession,
    rejectUntrustedExtensionRequest,
} from "@/lib/extension/server";

const METHODS = "GET";

export function OPTIONS(request: NextRequest) {
    return extensionPreflight(request, METHODS);
}

export async function GET(request: NextRequest) {
    const rejection = rejectUntrustedExtensionRequest(request, METHODS);
    if (rejection) return rejection;

    const auth = await getAuthenticatedExtensionSession(request);
    if (!auth.session) {
        return extensionJSON({authenticated: false}, 401, METHODS, auth.authCookieUpdate);
    }

    return extensionJSON({
        authenticated: true,
        firstName: extensionUserFirstName(auth.session.user),
    }, 200, METHODS, auth.authCookieUpdate);
}
