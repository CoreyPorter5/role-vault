import type {User} from "@supabase/auth-js";

const GOOGLE_AVATAR_HOSTS = new Set(["lh3.googleusercontent.com"]);

function safeGoogleAvatarUrl(value: unknown): string | null {
    if (typeof value !== "string" || value.length > 2048) return null;

    try {
        const url = new URL(value);
        if (url.protocol !== "https:" || !GOOGLE_AVATAR_HOSTS.has(url.hostname)) return null;
        return url.toString();
    } catch {
        return null;
    }
}

export function getGoogleAvatarUrl(user: User | null): string | null {
    if (!user) return null;

    const googleIdentity = user.identities?.find((identity) => identity.provider === "google");
    const identityData = googleIdentity?.identity_data;

    for (const candidate of [identityData?.avatar_url, identityData?.picture]) {
        const avatarUrl = safeGoogleAvatarUrl(candidate);
        if (avatarUrl) return avatarUrl;
    }

    const providers = Array.isArray(user.app_metadata?.providers)
        ? user.app_metadata.providers
        : [];
    const hasGoogleProvider = user.app_metadata?.provider === "google" || providers.includes("google");

    if (!hasGoogleProvider) return null;

    for (const candidate of [user.user_metadata?.avatar_url, user.user_metadata?.picture]) {
        const avatarUrl = safeGoogleAvatarUrl(candidate);
        if (avatarUrl) return avatarUrl;
    }

    return null;
}
