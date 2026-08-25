"use client";

import {usePathname} from "next/navigation";
import {useEffect} from "react";
import posthog from "posthog-js";

import {
    analyticsEvents,
    captureAnalyticsEvent,
    currentAttribution,
    isAnalyticsEnabled,
} from "@/lib/analytics/client";
import {
    safePathname,
    type CTAPlacement,
    type LandingSection,
} from "@/lib/analytics/events";

const scrollDepths = [25, 50, 75, 90] as const;
const ctaPlacements = new Set<CTAPlacement>([
    "header",
    "hero primary",
    "hero secondary",
    "workflow",
    "final call to action",
    "footer",
]);
const ctaDestinations = new Set(["registration", "workflow", "pricing", "dashboard"] as const);

export default function AnalyticsPageTracker() {
    const pathname = usePathname();

    useEffect(() => {
        if (!isAnalyticsEnabled()) return;
        const route = safePathname(pathname);
        const attribution = currentAttribution();

        posthog.capture("$pageview", {
            $current_url: `${window.location.origin}${route}`,
            route,
            ...attribution,
        });

        if (route === "/") {
            captureAnalyticsEvent(analyticsEvents.landingViewed, attribution);
        }
    }, [pathname]);

    useEffect(() => {
        if (pathname !== "/" || !isAnalyticsEnabled()) return;

        const attribution = currentAttribution();
        const observedSections = new Set<LandingSection>();
        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                const section = (entry.target as HTMLElement).dataset.analyticsSection as LandingSection | undefined;
                if (!section || observedSections.has(section)) continue;
                observedSections.add(section);
                captureAnalyticsEvent(analyticsEvents.landingSectionViewed, {section, ...attribution});
                observer.unobserve(entry.target);
            }
        }, {threshold: 0.35});

        document.querySelectorAll<HTMLElement>("[data-analytics-section]").forEach((section) => observer.observe(section));

        const reachedDepths = new Set<number>();
        const captureScrollDepth = () => {
            const available = document.documentElement.scrollHeight - window.innerHeight;
            if (available <= 0) return;
            const percentage = Math.round((window.scrollY / available) * 100);
            for (const depth of scrollDepths) {
                if (percentage < depth || reachedDepths.has(depth)) continue;
                reachedDepths.add(depth);
                captureAnalyticsEvent(analyticsEvents.landingScrollDepthReached, {
                    depth_percent: depth,
                    ...attribution,
                });
            }
        };

        window.addEventListener("scroll", captureScrollDepth, {passive: true});
        const captureTrackedClick = (event: MouseEvent) => {
            const target = event.target instanceof Element
                ? event.target.closest<HTMLElement>("[data-analytics-cta], [data-analytics-chrome-store]")
                : null;
            if (!target) return;

            if (target.dataset.analyticsChromeStore === "true") {
                captureAnalyticsEvent(analyticsEvents.chromeStoreClicked, {
                    placement: "landing extension section",
                    ...attribution,
                });
                return;
            }

            const placement = target.dataset.analyticsPlacement as CTAPlacement | undefined;
            const destination = target.dataset.analyticsDestination as
                | "registration"
                | "workflow"
                | "pricing"
                | "dashboard"
                | undefined;
            if (!placement || !destination || !ctaPlacements.has(placement) || !ctaDestinations.has(destination)) return;
            captureAnalyticsEvent(analyticsEvents.ctaClicked, {
                placement,
                destination,
                ...attribution,
            });
        };

        document.addEventListener("click", captureTrackedClick);
        captureScrollDepth();
        return () => {
            observer.disconnect();
            window.removeEventListener("scroll", captureScrollDepth);
            document.removeEventListener("click", captureTrackedClick);
        };
    }, [pathname]);

    return null;
}
