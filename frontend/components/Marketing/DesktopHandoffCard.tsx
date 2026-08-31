"use client";

import {useState} from "react";
import {Check, Copy, Laptop, Mail} from "lucide-react";

import {
    analyticsEvents,
    captureAnalyticsEvent,
    currentAttribution,
} from "@/lib/analytics/client";

const DESKTOP_URL = "https://www.rolevault.app/";
const EMAIL_DESKTOP_LINK = `mailto:?subject=${encodeURIComponent("Continue with RoleVault on desktop")}&body=${encodeURIComponent(`Open RoleVault on your laptop or desktop using Chrome:\n\n${DESKTOP_URL}`)}`;

export default function DesktopHandoffCard() {
    const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

    const copyDesktopLink = async () => {
        try {
            await navigator.clipboard.writeText(DESKTOP_URL);
            setCopyState("copied");
        } catch {
            setCopyState("failed");
        }

        captureAnalyticsEvent(analyticsEvents.ctaClicked, {
            placement: "desktop handoff",
            destination: "copy desktop link",
            ...currentAttribution(),
        });
    };

    return (
        <aside
            id="desktop-handoff"
            className="mt-7 w-full max-w-xl scroll-mt-28 rounded-2xl border border-[#c8d7ee] bg-white/85 p-5 text-left shadow-[0_18px_45px_-32px_rgba(37,99,235,0.55)] backdrop-blur-md md:hidden"
            aria-labelledby="desktop-handoff-title"
        >
            <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                    <Laptop size={22}/>
                </span>
                <div>
                    <p className="eyebrow">Desktop Chrome experience</p>
                    <h2 id="desktop-handoff-title" className="mt-1.5 text-xl font-semibold text-[#181d26]">
                        Continue on a computer
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#626974]">
                        RoleVault is a desktop web app with a companion Chrome extension. Continue on a laptop or desktop to install the extension, manage your pipeline and create application documents.
                    </p>
                </div>
            </div>

            <div className="mt-5 grid gap-2.5">
                <a
                    href={EMAIL_DESKTOP_LINK}
                    className="button-primary w-full"
                    onClick={() => captureAnalyticsEvent(analyticsEvents.ctaClicked, {
                        placement: "desktop handoff",
                        destination: "email desktop link",
                        ...currentAttribution(),
                    })}
                >
                    <Mail size={17}/>
                    Email me the desktop link
                </a>
                <button type="button" className="button-secondary w-full" onClick={copyDesktopLink}>
                    {copyState === "copied" ? <Check size={17}/> : <Copy size={17}/>} 
                    {copyState === "copied" ? "Desktop link copied" : "Copy website link"}
                </button>
            </div>

            <p className="mt-3 text-center text-xs leading-5 text-[#777c84]" aria-live="polite">
                {copyState === "failed"
                    ? <>Copy was unavailable. Save <span className="font-semibold text-[#4e5560]">rolevault.app</span> and open it on your computer.</>
                    : "You can still explore this website on mobile."}
            </p>
        </aside>
    );
}
