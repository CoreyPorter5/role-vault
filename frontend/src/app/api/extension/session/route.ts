import {NextRequest, NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {captureAppError} from "@/lib/sentry/captureAppError";

const EXTENSION_ID = process.env.CHROME_EXTENSION_ID;
const EXTENSION_ORIGIN = EXTENSION_ID
    ? `chrome-extension://${EXTENSION_ID}`
    : "";

const EXTENSION_HEADER = "x-seeksync-extension-id";
let reportedMissingExtensionConfig = false;

function responseHeaders(): HeadersInit {
    return {
        "Access-Control-Allow-Origin": EXTENSION_ORIGIN,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers":
            "Accept, Content-Type, X-SeekSync-Extension-Id",
        "Cache-Control": "private, no-store",
        "Vary": "Origin",
    };
}

function isAllowedExtension(request: NextRequest): boolean {
    if (!EXTENSION_ID) {
        if (!reportedMissingExtensionConfig) {
            reportedMissingExtensionConfig = true;
            captureAppError({
                code: "WEB_EXTENSION_CONFIG_MISSING",
                message: "Chrome extension authentication is not configured",
                area: "extension_api",
                action: "validate_config",
                endpoint: "/api/extension/session",
            });
        }
        return false;
    }

    const suppliedExtensionId = request.headers.get(EXTENSION_HEADER);

    return suppliedExtensionId === EXTENSION_ID;
}

export async function OPTIONS(request: NextRequest) {
    const requestOrigin = request.headers.get("origin");

    // This mainly protects against ordinary websites attempting a
    // cross-origin request.
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

export async function GET(request: NextRequest) {
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

    const {
        data: {user},
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return NextResponse.json(
            {error: "Not authenticated"},
            {
                status: 401,
                headers: responseHeaders(),
            },
        );
    }

    const {
        data: {session},
        error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
        return NextResponse.json(
            {error: "Session unavailable"},
            {
                status: 401,
                headers: responseHeaders(),
            },
        );
    }

    return NextResponse.json(
        {
            accessToken: session.access_token,
            expiresAt: session.expires_at ?? null,
        },
        {
            status: 200,
            headers: responseHeaders(),
        },
    );
}
