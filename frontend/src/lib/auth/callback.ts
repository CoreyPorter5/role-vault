type OAuthUserMetadata = Record<string, unknown> | null | undefined;

/** Keep post-OAuth redirects on this application. */
export function safeOAuthNextPath(value: string | null): string {
  if (!value || !value.startsWith("/")) {
    return "/";
  }

  try {
    const base = new URL("https://rolevault.invalid");
    const target = new URL(value, base);
    if (target.origin !== base.origin) {
      return "/";
    }

    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/";
  }
}

/** Prefer the configured public origin and ignore untrusted forwarding headers. */
export function trustedAuthRedirectOrigin(
  requestOrigin: string,
  configuredSiteUrl = process.env.NEXT_PUBLIC_URL_PREFIX,
): string {
  const configured = configuredSiteUrl?.trim();
  if (configured) {
    try {
      const parsed = new URL(configured);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        return parsed.origin;
      }
    } catch {
      // Fall back to the origin Next.js parsed for this request.
    }
  }

  return new URL(requestOrigin).origin;
}

export function profileNamesFromMetadata(
  metadata: OAuthUserMetadata,
  email?: string,
): { firstName: string; lastName: string } {
  const firstName = firstNonEmptyString(metadata?.first_name, metadata?.given_name);
  const lastName = firstNonEmptyString(metadata?.last_name, metadata?.family_name);
  const fullName = firstNonEmptyString(metadata?.name, metadata?.full_name);
  const nameParts = fullName?.split(/\s+/) ?? [];

  return {
    firstName: firstName ?? nameParts[0] ?? email?.split("@")[0] ?? "RoleVault",
    lastName: lastName ?? nameParts.slice(1).join(" "),
  };
}

export function isDuplicateProfileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

function firstNonEmptyString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}
