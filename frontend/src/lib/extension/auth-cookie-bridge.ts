const MAX_AUTH_COOKIE_BYTES = 12_000;
export const EXTENSION_AUTH_COOKIE_HEADER = "x-seeksync-auth-cookie";
export const EXTENSION_AUTH_COOKIE_UPDATE_HEADER = "x-seeksync-set-auth-cookie";
export const DELETE_EXTENSION_AUTH_COOKIE = "delete";

export type ExtensionAuthCookieMutation = {
    name: string;
    value: string;
};

function authCookieChunkIndex(name: string, authCookieName: string): number | null {
    if (name === authCookieName) return -1;
    if (!name.startsWith(`${authCookieName}.`)) return null;

    const suffix = name.slice(authCookieName.length + 1);
    if (!/^(0|[1-9][0-9]*)$/.test(suffix)) return null;
    return Number(suffix);
}

export function supabaseAuthCookieName(supabaseURL: string | undefined): string | null {
    if (!supabaseURL) return null;
    try {
        const url = new URL(supabaseURL);
        const projectReference = url.hostname.split(".")[0];
        if (!/^[a-z0-9]+$/.test(projectReference)) return null;
        return `sb-${projectReference}-auth-token`;
    } catch {
        return null;
    }
}

export function readBridgedAuthCookie(rawValue: string | null): string | null {
    if (
        !rawValue ||
        rawValue.length > MAX_AUTH_COOKIE_BYTES ||
        !rawValue.startsWith("base64-") ||
        !/^[\x21-\x7e]+$/.test(rawValue)
    ) return null;
    return rawValue;
}

export function combineAuthCookieMutations(
    mutations: ExtensionAuthCookieMutation[],
    authCookieName: string,
): string | null {
    const matching = mutations.flatMap((mutation) => {
        const index = authCookieChunkIndex(mutation.name, authCookieName);
        return index === null ? [] : [{...mutation, index}];
    });
    if (matching.length === 0) return null;

    const unchunked = matching.find(({index, value}) => index === -1 && value.length > 0);
    if (unchunked) return readBridgedAuthCookie(unchunked.value);

    const chunks = matching
        .filter(({index, value}) => index >= 0 && value.length > 0)
        .sort((left, right) => left.index - right.index);
    if (chunks.length === 0) return DELETE_EXTENSION_AUTH_COOKIE;
    if (chunks.length > 8 || chunks.some(({index}, position) => index !== position)) return null;

    return readBridgedAuthCookie(chunks.map(({value}) => value).join(""));
}

export function isSupabaseAuthCookieName(name: string, authCookieName: string): boolean {
    return authCookieChunkIndex(name, authCookieName) !== null;
}
