"use client";

import posthog from "posthog-js";

import {
    analyticsEvents,
    type AnalyticsEventName,
    type AnalyticsEventProperties,
    type AttributionProperties,
    attributionFromSearch,
} from "./events";

const attributionStorageKey = "rolevault.analytics.attribution.v1";

export function isAnalyticsEnabled(): boolean {
    return Boolean(
        process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim() &&
        process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim(),
    );
}

export function captureAnalyticsEvent<EventName extends AnalyticsEventName>(
    event: EventName,
    properties: AnalyticsEventProperties[EventName],
): void {
    if (!isAnalyticsEnabled() || typeof window === "undefined") return;
    posthog.capture(event, properties);
}

export function identifyAnalyticsUser(userId: string): void {
    if (!isAnalyticsEnabled() || !userId.trim()) return;
    posthog.identify(userId);
}

export function resetAnalyticsIdentity(): void {
    if (!isAnalyticsEnabled()) return;
    posthog.reset();
}

export function currentAttribution(): AttributionProperties {
    if (typeof window === "undefined") return {};

    const current = attributionFromSearch(window.location.search);
    if (Object.keys(current).length > 0) {
        try {
            window.localStorage.setItem(attributionStorageKey, JSON.stringify(current));
        } catch {
            // Analytics attribution must never interfere with the product.
        }
        return current;
    }

    try {
        const saved = JSON.parse(window.localStorage.getItem(attributionStorageKey) ?? "{}") as AttributionProperties;
        const params = new URLSearchParams();
        if (saved.utm_source) params.set("utm_source", saved.utm_source);
        if (saved.utm_medium) params.set("utm_medium", saved.utm_medium);
        if (saved.utm_campaign) params.set("utm_campaign", saved.utm_campaign);
        return attributionFromSearch(`?${params.toString()}`);
    } catch {
        return {};
    }
}

export {analyticsEvents};
