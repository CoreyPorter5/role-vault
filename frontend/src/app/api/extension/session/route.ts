import {NextRequest, NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";

const EXTENSION_ID = process.env.CHROME_EXTENSION_ID;
const EXTENSION_ORIGIN = EXTENSION_ID
    ? `chrome-extension://${EXTENSION_ID}`
    : "";

const EXTENSION_HEADER = "x-seeksync-extension-id";

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
        console.error("CHROME_EXTENSION_ID is not configured");
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
    console.log("Extension session request:", {
        origin: request.headers.get("origin"),
        suppliedExtensionId: request.headers.get(EXTENSION_HEADER),
        expectedExtensionId: EXTENSION_ID,
        hasCookieHeader: request.headers.has("cookie"),
    });

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
        console.error("Extension authentication failed:", userError);

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
        console.error(
            "Failed to retrieve extension session:",
            sessionError,
        );

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