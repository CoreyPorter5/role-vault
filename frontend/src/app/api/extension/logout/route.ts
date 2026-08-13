import {NextRequest, NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {captureAppError} from "@/lib/sentry/captureAppError";

const EXTENSION_ID = process.env.CHROME_EXTENSION_ID;
const EXTENSION_ORIGIN = EXTENSION_ID
    ? `chrome-extension://${EXTENSION_ID}`
    : "";

const EXTENSION_HEADER = "x-seeksync-extension-id";

function responseHeaders(): HeadersInit {
    return {
        "Access-Control-Allow-Origin": EXTENSION_ORIGIN,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
            "Content-Type, X-SeekSync-Extension-Id",
        "Cache-Control": "private, no-store",
        "Vary": "Origin",
    };
}

function isAllowedExtension(request: NextRequest): boolean {
    return Boolean(
        EXTENSION_ID &&
        request.headers.get(EXTENSION_HEADER) === EXTENSION_ID
    );
}

export async function OPTIONS(request: NextRequest) {
    const requestOrigin = request.headers.get("origin");

    if (requestOrigin && requestOrigin !== EXTENSION_ORIGIN) {
        return new NextResponse(null, {
            status: 403,
        });
    }

    return new NextResponse(null, {
        status: 204,
        headers: responseHeaders(),
    });
}

export async function POST(request: NextRequest) {
    if (!isAllowedExtension(request)) {
        return NextResponse.json(
            {error: "Forbidden"},
            {
                status: 403,
                headers: responseHeaders(),
            },
        );
    }

    const supabase = await createClient();

    const {error} = await supabase.auth.signOut({
        scope: "local",
    });

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

        return NextResponse.json(
            {error: "Failed to sign out"},
            {
                status: 500,
                headers: responseHeaders(),
            },
        );
    }

    return NextResponse.json(
        {success: true},
        {
            headers: responseHeaders(),
        },
    );
}
