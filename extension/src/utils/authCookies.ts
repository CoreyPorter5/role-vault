const MAX_AUTH_COOKIE_BYTES = 12_000;
export const SUPABASE_COOKIE_CHUNK_SIZE = 3_180;

type CookieValue = {
    name: string;
    value: string;
};

type OriginCookie = CookieValue & {
    domain: string;
    path: string;
    secure: boolean;
    partitionKey?: unknown;
};

function authCookieChunkIndex(name: string, authCookieName: string): number | null {
    if (name === authCookieName) return -1;
    if (!name.startsWith(`${authCookieName}.`)) return null;

    const suffix = name.slice(authCookieName.length + 1);
    if (!/^(0|[1-9][0-9]*)$/.test(suffix)) return null;
    return Number(suffix);
}

export function normalizeAuthCookieName(
    rawValue: string | undefined,
    variableName = "VITE_AUTH_COOKIE_NAME",
): string {
    const value = rawValue?.trim() ?? "";
    if (!/^sb-[a-z0-9]+-auth-token$/.test(value) || value.length > 128) {
        throw new Error(`${variableName} must be a valid Supabase auth cookie name.`);
    }
    return value;
}

export function combineAuthCookieChunks(
    cookies: CookieValue[],
    authCookieName: string,
): string | null {
    const matching = cookies.flatMap((cookie) => {
        const index = authCookieChunkIndex(cookie.name, authCookieName);
        return index === null ? [] : [{...cookie, index}];
    });
    const unchunked = matching.find(({index}) => index === -1);
    if (unchunked?.value) {
        return isValidAuthCookieValue(unchunked.value) ? unchunked.value : null;
    }

    const chunks = matching
        .filter(({index, value}) => index >= 0 && value.length > 0)
        .sort((left, right) => left.index - right.index);
    if (chunks.length === 0 || chunks.length > 8) return null;
    if (chunks.some(({index}, position) => index !== position)) return null;

    const combined = chunks.map(({value}) => value).join("");
    return isValidAuthCookieValue(combined) ? combined : null;
}

export function splitAuthCookieValue(
    value: string,
    authCookieName: string,
): CookieValue[] {
    if (!isValidAuthCookieValue(value)) return [];
    if (value.length <= SUPABASE_COOKIE_CHUNK_SIZE) {
        return [{name: authCookieName, value}];
    }

    const chunks: CookieValue[] = [];
    for (let offset = 0, index = 0; offset < value.length; offset += SUPABASE_COOKIE_CHUNK_SIZE, index++) {
        chunks.push({
            name: `${authCookieName}.${index}`,
            value: value.slice(offset, offset + SUPABASE_COOKIE_CHUNK_SIZE),
        });
    }
    return chunks;
}

export function isAuthCookieName(name: string, authCookieName: string): boolean {
    return authCookieChunkIndex(name, authCookieName) !== null;
}

export function filterAuthCookiesForOrigin<T extends OriginCookie>(
    cookies: T[],
    webAppOrigin: string,
    authCookieName: string,
): T[] {
    const url = new URL(webAppOrigin);
    return cookies.filter((cookie) => {
        const cookieDomain = cookie.domain.startsWith(".")
            ? cookie.domain.slice(1)
            : cookie.domain;
        return cookieDomain === url.hostname &&
            cookie.path === "/" &&
            (!cookie.secure || url.protocol === "https:") &&
            cookie.partitionKey === undefined &&
            isAuthCookieName(cookie.name, authCookieName);
    });
}

function isValidAuthCookieValue(value: string): boolean {
    return value.length > 0 &&
        value.length <= MAX_AUTH_COOKIE_BYTES &&
        /^[\x21-\x7e]+$/.test(value);
}
