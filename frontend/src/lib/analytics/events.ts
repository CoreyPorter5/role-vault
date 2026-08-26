export const analyticsEvents = {
    landingViewed: "landing viewed",
    landingSectionViewed: "landing section viewed",
    landingScrollDepthReached: "landing scroll depth reached",
    ctaClicked: "cta clicked",
    chromeStoreClicked: "chrome store clicked",
    registrationStarted: "registration started",
    registrationCompleted: "registration completed",
    extensionAuthenticated: "extension authenticated",
} as const;

export type AnalyticsEventName = typeof analyticsEvents[keyof typeof analyticsEvents];

export type AnalyticsEventProperties = {
    "landing viewed": AttributionProperties;
    "landing section viewed": AttributionProperties & {section: LandingSection};
    "landing scroll depth reached": AttributionProperties & {depth_percent: 25 | 50 | 75 | 90};
    "cta clicked": AttributionProperties & {
        placement: CTAPlacement;
        destination: "registration" | "workflow" | "pricing" | "dashboard";
    };
    "chrome store clicked": AttributionProperties & {placement: "header" | "landing extension section"};
    "registration started": AttributionProperties & {method: "email" | "google"};
    "registration completed": {method: "email" | "google"};
    "extension authenticated": {transport: "cookie bridge"};
};

export type AttributionProperties = Partial<{
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
}>;

export type LandingSection =
    | "hero"
    | "integrations"
    | "interactive demo"
    | "extension install"
    | "workflow"
    | "features"
    | "final call to action";

export type CTAPlacement =
    | "header"
    | "hero primary"
    | "hero secondary"
    | "workflow"
    | "final call to action"
    | "footer";

const attributionKeys = ["utm_source", "utm_medium", "utm_campaign"] as const;
const safeAttributionPattern = /[^a-zA-Z0-9 _.-]/g;

export function sanitizeAttributionValue(value: string | null): string | undefined {
    if (!value) return undefined;
    const sanitized = value.trim().replace(safeAttributionPattern, "").slice(0, 80);
    return sanitized || undefined;
}

export function attributionFromSearch(search: string): AttributionProperties {
    const params = new URLSearchParams(search);
    return Object.fromEntries(
        attributionKeys.flatMap((key) => {
            const value = sanitizeAttributionValue(params.get(key));
            return value ? [[key, value]] : [];
        }),
    );
}

export function safePathname(pathname: string): string {
    const pathOnly = pathname.split(/[?#]/, 1)[0] || "/";
    return pathOnly.startsWith("/") ? pathOnly.slice(0, 200) : "/";
}
