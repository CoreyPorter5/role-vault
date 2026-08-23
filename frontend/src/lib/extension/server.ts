import "server-only";

import {createServerClient} from "@supabase/ssr";
import type {User} from "@supabase/supabase-js";
import {NextRequest, NextResponse} from "next/server";

import {captureAppError} from "@/lib/sentry/captureAppError";
import {createClient} from "@/lib/supabase/server";
import type {Database} from "@/lib/types/database.types";
import {
    combineAuthCookieMutations,
    EXTENSION_AUTH_COOKIE_HEADER,
    EXTENSION_AUTH_COOKIE_UPDATE_HEADER,
    type ExtensionAuthCookieMutation,
    isSupabaseAuthCookieName,
    readBridgedAuthCookie,
    supabaseAuthCookieName,
} from "@/lib/extension/auth-cookie-bridge";
import {
    chromeExtensionOrigin,
    isAllowedExtensionPreflight,
    isAllowedExtensionRequest,
} from "@/lib/extension/request-policy";

const EXTENSION_HEADER = "x-rolevault-extension-id";
const EXTENSION_ID = process.env.CHROME_EXTENSION_ID;
const BACKEND_TIMEOUT_MS = 12_000;
let reportedInvalidExtensionConfig = false;

export type ExtensionSession = {
    user: User;
    backendAccessToken: string;
};

export type ExtensionSessionResult = {
    session: ExtensionSession | null;
    authCookieUpdate: string | null;
};

type ExtensionSupabaseContext = {
    supabase: Awaited<ReturnType<typeof createClient>>;
    authCookieUpdate: () => string | null;
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
        "Access-Control-Allow-Headers": "Accept, Content-Type, X-RoleVault-Auth-Cookie, X-RoleVault-Extension-Id",
        "Access-Control-Expose-Headers": "X-RoleVault-Set-Auth-Cookie",
        "Cache-Control": "private, no-store",
        "Vary": "Origin",
    };
}

export function extensionJSON(
    body: unknown,
    status: number,
    methods: string,
    authCookieUpdate: string | null = null,
): NextResponse {
    const headers = new Headers(extensionResponseHeaders(methods));
    if (authCookieUpdate) {
        headers.set(EXTENSION_AUTH_COOKIE_UPDATE_HEADER, authCookieUpdate);
    }
    return NextResponse.json(body, {
        status,
        headers,
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

async function createExtensionSupabaseContext(
    request: NextRequest,
): Promise<ExtensionSupabaseContext | null> {
    const rawBridgedCookie = request.headers.get(EXTENSION_AUTH_COOKIE_HEADER);
    if (rawBridgedCookie === null) {
        return {
            supabase: await createClient(),
            authCookieUpdate: () => null,
        };
    }

    const supabaseURL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const authCookieName = supabaseAuthCookieName(supabaseURL);
    const authCookie = readBridgedAuthCookie(rawBridgedCookie);
    if (!supabaseURL || !publishableKey || !authCookieName || !authCookie) return null;

    const cookieMutations = new Map<string, ExtensionAuthCookieMutation>();
    const supabase = createServerClient<Database>(supabaseURL, publishableKey, {
        cookies: {
            getAll() {
                return [{name: authCookieName, value: authCookie}];
            },
            setAll(cookiesToSet) {
                for (const {name, value} of cookiesToSet) {
                    if (isSupabaseAuthCookieName(name, authCookieName)) {
                        cookieMutations.set(name, {name, value});
                    }
                }
            },
        },
    });

    return {
        supabase,
        authCookieUpdate: () =>
            combineAuthCookieMutations([...cookieMutations.values()], authCookieName),
    };
}

export async function getAuthenticatedExtensionSession(
    request: NextRequest,
): Promise<ExtensionSessionResult> {
    const context = await createExtensionSupabaseContext(request);
    if (!context) return {session: null, authCookieUpdate: null};

    const {
        data: {user},
        error: userError,
    } = await context.supabase.auth.getUser();

    if (userError || !user) {
        return {session: null, authCookieUpdate: context.authCookieUpdate()};
    }

    const {
        data: {session},
        error: sessionError,
    } = await context.supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
        return {session: null, authCookieUpdate: context.authCookieUpdate()};
    }
    return {
        session: {user, backendAccessToken: session.access_token},
        authCookieUpdate: context.authCookieUpdate(),
    };
}

export async function signOutAuthenticatedExtensionSession(
    request: NextRequest,
): Promise<{error: Error | null; authCookieUpdate: string | null}> {
    const context = await createExtensionSupabaseContext(request);
    if (!context) {
        return {error: new Error("Invalid extension session"), authCookieUpdate: null};
    }

    const {error} = await context.supabase.auth.signOut({scope: "local"});
    return {
        error: error ? new Error("Extension session logout failed") : null,
        authCookieUpdate: context.authCookieUpdate(),
    };
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
