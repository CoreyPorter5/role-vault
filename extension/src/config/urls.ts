const LOCAL_HOSTNAMES = new Set([
    "localhost",
    "127.0.0.1",
    "[::1]",
]);

export function normalizeHTTPOrigin(
    rawValue: string | undefined,
    variableName: string,
): string {
    const value = rawValue?.trim();

    if (!value) {
        throw new Error(`${variableName} must be configured.`);
    }

    let url: URL;

    try {
        url = new URL(value);
    } catch {
        throw new Error(`${variableName} must be a valid URL.`);
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error(`${variableName} must use http or https.`);
    }

    if (url.username || url.password) {
        throw new Error(`${variableName} must not contain credentials.`);
    }

    if (
        url.pathname !== "/" ||
        url.search ||
        url.hash
    ) {
        throw new Error(
            `${variableName} must be an origin without a path, query, or fragment.`,
        );
    }

    return url.origin;
}

export function assertProductionOrigin(
    origin: string,
    variableName: string,
): void {
    const url = new URL(origin);

    if (url.protocol !== "https:") {
        throw new Error(
            `${variableName} must use https for a production extension build.`,
        );
    }

    if (LOCAL_HOSTNAMES.has(url.hostname)) {
        throw new Error(
            `${variableName} must not point to localhost for a production extension build.`,
        );
    }
}

export function toChromeHostPattern(origin: string): string {
    return `${origin}/*`;
}
