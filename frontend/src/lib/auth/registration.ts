type AuthSession = {access_token?: string} | null | undefined;
type AuthError = {code?: string; message?: string} | null | undefined;

export function requiresEmailConfirmation(session: AuthSession): boolean {
    return !session;
}

export function emailConfirmationRedirectURL(
    configuredSiteURL = process.env.NEXT_PUBLIC_URL_PREFIX,
): string | undefined {
    const configured = configuredSiteURL?.trim();
    if (!configured) return undefined;

    try {
        const siteOrigin = new URL(configured).origin;
        return new URL("/auth/callback?next=/dashboard", siteOrigin).toString();
    } catch {
        return undefined;
    }
}

export function isEmailNotConfirmedError(error: AuthError): boolean {
    const code = error?.code?.toLowerCase();
    const message = error?.message?.toLowerCase();
    return code === "email_not_confirmed" || Boolean(message?.includes("email not confirmed"));
}
