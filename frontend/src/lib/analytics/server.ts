import "server-only";

import {PostHog} from "posthog-node";

import {
    analyticsEvents,
    type AnalyticsEventProperties,
} from "./events";

type ServerAnalyticsEvent =
    | typeof analyticsEvents.registrationCompleted
    | typeof analyticsEvents.extensionAuthenticated;

let client: PostHog | null | undefined;

function serverAnalyticsClient(): PostHog | null {
    if (client !== undefined) return client;

    const token = (
        process.env.POSTHOG_PROJECT_TOKEN ??
        process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
    )?.trim();
    const host = (
        process.env.POSTHOG_HOST ??
        process.env.NEXT_PUBLIC_POSTHOG_HOST
    )?.trim();

    client = token && host
        ? new PostHog(token, {
            host,
            flushAt: 1,
            flushInterval: 0,
            disableGeoip: true,
        })
        : null;
    return client;
}

export async function captureServerAnalytics<EventName extends ServerAnalyticsEvent>(
    distinctId: string,
    event: EventName,
    properties: AnalyticsEventProperties[EventName],
): Promise<void> {
    if (!distinctId.trim()) return;
    const posthog = serverAnalyticsClient();
    if (!posthog) return;

    try {
        await posthog.captureImmediate({
            distinctId,
            event,
            properties: {
                ...properties,
                service: "web",
                environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
                $geoip_disable: true,
            },
        });
    } catch {
        // Analytics is intentionally best-effort and cannot block authentication.
    }
}
