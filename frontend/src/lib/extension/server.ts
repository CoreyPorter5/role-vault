import "server-only";

import type {User} from "@supabase/supabase-js";
import {NextRequest, NextResponse} from "next/server";

import {captureAppError} from "@/lib/sentry/captureAppError";
import {createClient} from "@/lib/supabase/server";
import {
    chromeExtensionOrigin,
    isAllowedExtensionPreflight,
    isAllowedExtensionRequest,
} from "@/lib/extension/request-policy";

const EXTENSION_HEADER = "x-seeksync-extension-id";
const EXTENSION_ID = process.env.CHROME_EXTENSION_ID;
const BACKEND_TIMEOUT_MS = 12_000;
let reportedInvalidExtensionConfig = false;

export type ExtensionSession = {
    user: User;
    backendAccessToken: string;
};

function reportInvalidExtensionConfig(): void {
    if (reportedInvalidExtensionConfig) return;
    reportedInvalidExtensionConfig = true;
    captureAppError({
        code: "WEB_EXTENSION_CONFIG_MISSING",
        message: "Chrome extension authentication is missing or invalid",
        area: "extension_api",
        action: "validate_config",
        endpoint: "/api/extension/*",
    });
}

export function extensionResponseHeaders(methods: string): HeadersInit {
    const origin = chromeExtensionOrigin(EXTENSION_ID);
    return {
        ...(origin ? {"Access-Control-Allow-Origin": origin} : {}),
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": `${methods}, OPTIONS`,
        "Access-Control-Allow-Headers": "Accept, Content-Type, X-SeekSync-Extension-Id",
        "Cache-Control": "private, no-store",
        "Vary": "Origin",
    };
}

export function extensionJSON(
    body: unknown,
    status: number,
    methods: string,
): NextResponse {
    return NextResponse.json(body, {
        status,
        headers: extensionResponseHeaders(methods),
    });
}

export function rejectUntrustedExtensionRequest(
    request: NextRequest,
    methods: string,
): NextResponse | null {
    if (!chromeExtensionOrigin(EXTENSION_ID)) {
        reportInvalidExtensionConfig();
        return extensionJSON({error: "Extension service unavailable"}, 503, methods);
    }

    if (!isAllowedExtensionRequest({
        configuredExtensionID: EXTENSION_ID,
        requestOrigin: request.headers.get("origin"),
        suppliedExtensionID: request.headers.get(EXTENSION_HEADER),
    })) {
        return extensionJSON({error: "Forbidden"}, 403, methods);
    }

    return null;
}

export function extensionPreflight(
    request: NextRequest,
    methods: string,
): NextResponse {
    if (!chromeExtensionOrigin(EXTENSION_ID)) {
        reportInvalidExtensionConfig();
        return extensionJSON({error: "Extension service unavailable"}, 503, methods);
    }

    if (!isAllowedExtensionPreflight({
        configuredExtensionID: EXTENSION_ID,
        requestOrigin: request.headers.get("origin"),
    })) {
        return extensionJSON({error: "Forbidden"}, 403, methods);
    }

    return new NextResponse(null, {
        status: 204,
        headers: extensionResponseHeaders(methods),
    });
}

export async function getAuthenticatedExtensionSession(): Promise<ExtensionSession | null> {
    const supabase = await createClient();
    const {
        data: {user},
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return null;

    const {
        data: {session},
        error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) return null;
    return {user, backendAccessToken: session.access_token};
}

export function extensionUserFirstName(user: User): string {
    const metadata = user.user_metadata ?? {};
    const candidates = [
        metadata.first_name,
        metadata.given_name,
        typeof metadata.full_name === "string" ? metadata.full_name.trim().split(/\s+/)[0] : undefined,
        typeof metadata.name === "string" ? metadata.name.trim().split(/\s+/)[0] : undefined,
        user.email?.split("@")[0],
    ];
    const firstName = candidates.find((candidate): candidate is string =>
        typeof candidate === "string" && candidate.trim().length > 0
    );
    return firstName?.trim().slice(0, 80) || "User";
}

export async function fetchExtensionBackend(
    path: string,
    accessToken: string,
    init: Pick<RequestInit, "method" | "body"> = {},
): Promise<Response> {
    const apiOrigin = process.env.NEXT_PUBLIC_API_URL_PREFIX?.trim();
    if (!apiOrigin) throw new Error("Backend API URL is not configured");

    const headers = new Headers({
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
    });
    if (init.body) headers.set("Content-Type", "application/json");

    return fetch(`${apiOrigin.replace(/\/$/, "")}${path}`, {
        ...init,
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    });
}
