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

    const session = await getAuthenticatedExtensionSession();
    if (!session) {
        return extensionJSON({authenticated: false}, 401, METHODS);
    }

    return extensionJSON({
        authenticated: true,
        firstName: extensionUserFirstName(session.user),
    }, 200, METHODS);
}
