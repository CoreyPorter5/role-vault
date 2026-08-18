import {NextRequest} from "next/server";

import {captureAppError} from "@/lib/sentry/captureAppError";
import {
    extensionJSON,
    extensionPreflight,
    rejectUntrustedExtensionRequest,
} from "@/lib/extension/server";
import {createClient} from "@/lib/supabase/server";

const METHODS = "POST";

export function OPTIONS(request: NextRequest) {
    return extensionPreflight(request, METHODS);
}

export async function POST(request: NextRequest) {
    const rejection = rejectUntrustedExtensionRequest(request, METHODS);
    if (rejection) return rejection;

    const supabase = await createClient();
    const {error} = await supabase.auth.signOut({scope: "local"});

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
        return extensionJSON({error: "Failed to sign out"}, 500, METHODS);
    }

    return extensionJSON({success: true}, 200, METHODS);
}
