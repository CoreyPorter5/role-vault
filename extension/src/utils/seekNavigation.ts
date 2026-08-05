const SEEK_JOB_PATH = /^\/job\/(\d+)(?:\/|$)/;

export function extractSeekJobIdFromPath(
    pathname: string,
): string | null {
    return pathname.match(SEEK_JOB_PATH)?.[1] ?? null;
}

export function isSeekJobURL(value: string): boolean {
    try {
        const url = new URL(value);

        return (
            url.protocol === "https:" &&
            url.hostname === "au.seek.com" &&
            extractSeekJobIdFromPath(url.pathname) !== null
        );
    } catch {
        return false;
    }
}

export function isApplyHrefForJob(
    href: string | null,
    jobId: string,
): boolean {
    if (!href) {
        return false;
    }

    try {
        const url = new URL(href, "https://au.seek.com");

        return (
            url.protocol === "https:" &&
            url.hostname === "au.seek.com" &&
            url.pathname === `/job/${jobId}/apply`
        );
    } catch {
        return false;
    }
}
