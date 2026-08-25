"use client";

import {useEffect, useRef, useState} from "react";
import {
    ArrowRight,
    BriefcaseBusiness,
    Check,
    CheckCircle2,
    Clock3,
    FileCheck2,
    FileText,
    LoaderCircle,
    MapPin,
    RotateCcw,
    Sparkles,
} from "lucide-react";
import {RoleVaultLogo} from "../BrandMark";
import styles from "./InteractiveSyncDemo.module.css";

type SyncState = "idle" | "syncing" | "synced";

const syncCopy: Record<SyncState, string> = {
    idle: "Ready to sync",
    syncing: "Bringing the role into your workspace…",
    synced: "Role synced to the sample workspace.",
};

export default function InteractiveSyncDemo() {
    const [syncState, setSyncState] = useState<SyncState>("idle");
    const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (syncTimer.current) clearTimeout(syncTimer.current);
    }, []);

    const syncRole = () => {
        if (syncState !== "idle") return;

        setSyncState("syncing");
        syncTimer.current = setTimeout(() => {
            setSyncState("synced");
            syncTimer.current = null;
        }, 900);
    };

    const resetDemo = () => {
        if (syncTimer.current) clearTimeout(syncTimer.current);
        syncTimer.current = null;
        setSyncState("idle");
    };

    return (
        <section data-analytics-section="interactive demo" className="border-b border-[#e7e4dd] bg-white py-20 sm:py-28" aria-labelledby="sync-demo-title">
            <div className="marketing-container">
                <div data-reveal className="mx-auto max-w-3xl text-center">
                    <span className="eyebrow"><Sparkles size={14}/> Interactive product tour</span>
                    <h2 id="sync-demo-title" className="mt-4 text-balance text-4xl font-[560] leading-[1.06] tracking-[-0.045em] sm:text-6xl">
                        Save a role without breaking your flow.
                    </h2>
                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#666b73]">
                        Try the button below. RoleVault keeps the listing and its context together, ready for your tailored resume and cover letter.
                    </p>
                </div>

                <div data-reveal="scale" className="mx-auto mt-12 max-w-6xl overflow-hidden rounded-2xl border border-[#d8d5cd] bg-[#f8f8f6] shadow-[0_32px_80px_-50px_rgba(37,99,235,0.55)]">
                    <div className="flex min-h-12 items-center justify-between gap-3 border-b border-[#dfddd6] bg-white px-4 sm:px-5">
                        <div className="flex items-center gap-2" aria-hidden="true">
                            <span className="size-2.5 rounded-full bg-[#f2a77c]"/>
                            <span className="size-2.5 rounded-full bg-[#f2d16b]"/>
                            <span className="size-2.5 rounded-full bg-[#86c69a]"/>
                        </div>
                        <span className="truncate rounded-md bg-[#f5f4f0] px-3 py-1.5 text-[11px] font-medium text-[#737780] sm:text-xs">
                            Job-board preview
                        </span>
                        <span className="hidden rounded-full border border-[#c8d7ee] bg-[#EFF6FF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#2563EB] sm:inline-flex">
                            Interactive demo
                        </span>
                    </div>

                    <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(330px,0.85fr)]">
                        <article className="min-w-0 bg-white p-5 sm:p-8 lg:p-10" aria-label="Example job listing">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#eaf2ff] text-sm font-bold text-[#2563EB]">NT</span>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-[#303640]">Northstar Technologies</p>
                                        <p className="mt-0.5 text-xs text-[#7a7f87]">Jane Doe Inc.</p>
                                    </div>
                                </div>
                                <span className="shrink-0 rounded-full bg-[#eef7f2] px-3 py-1.5 text-xs font-semibold text-[#24683d]">Actively hiring</span>
                            </div>

                            <h3 className="mt-7 text-balance text-3xl font-semibold leading-tight text-[#181d26] sm:text-4xl">Senior Product Designer</h3>
                            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#666c75]">
                                <span className="inline-flex items-center gap-1.5"><MapPin size={16}/> Melbourne VIC · Hybrid</span>
                                <span className="inline-flex items-center gap-1.5"><BriefcaseBusiness size={16}/> Full time</span>
                                <span className="inline-flex items-center gap-1.5"><Clock3 size={16}/> Posted 2 days ago</span>
                            </div>

                            <div className="mt-7 border-t border-[#e4e1da] pt-6">
                                <h4 className="text-sm font-semibold text-[#252b34]">About the role</h4>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#666c75]">
                                    Lead thoughtful product experiences for a growing digital-health platform. You’ll partner with product and engineering to simplify complex customer journeys.
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {["Product strategy", "Design systems", "User research"].map((skill) => (
                                        <span key={skill} className="rounded-md border border-[#e0ded8] bg-[#faf9f6] px-2.5 py-1.5 text-xs font-medium text-[#5f646c]">{skill}</span>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-8 flex flex-col gap-2.5 border-t border-[#e4e1da] pt-6 sm:flex-row sm:items-center">
                                <span className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#f1f2f4] px-5 text-sm font-semibold text-[#4f555e]">Apply now</span>
                                <span className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#d4d1ca] bg-white px-5 text-sm font-semibold text-[#4f555e]">Save</span>
                                <button
                                    type="button"
                                    onClick={syncRole}
                                    disabled={syncState !== "idle"}
                                    aria-describedby="sync-demo-status"
                                    aria-busy={syncState === "syncing"}
                                    className={`inline-flex min-h-11 min-w-[190px] items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold text-white shadow-[0_8px_22px_-14px_rgba(37,99,235,0.9)] transition-[background-color,box-shadow,transform] sm:ml-auto ${
                                        syncState === "synced"
                                            ? `bg-[#2f855a] ${styles.successPulse}`
                                            : syncState === "syncing"
                                                ? "bg-[#4f7fda]"
                                                : `bg-[#2563EB] hover:bg-[#1D4ED8] ${styles.syncButtonIdle}`
                                    }`}
                                >
                                    <span className="relative z-10 inline-flex items-center justify-center gap-2">
                                        {syncState === "idle" && <>Sync to RoleVault</>}
                                        {syncState === "syncing" && <><LoaderCircle className="animate-spin" size={18}/> Syncing…</>}
                                        {syncState === "synced" && <><Check size={18}/> Synced</>}
                                    </span>
                                </button>
                            </div>
                        </article>

                        <aside className="border-t border-[#dfddd6] bg-[#f5f7fa] p-5 sm:p-8 lg:border-l lg:border-t-0 lg:p-10" aria-label="RoleVault sample workspace">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2.5">
                                    <RoleVaultLogo size={30}/>
                                    <span className="font-display text-base font-semibold text-[#181d26]">RoleVault</span>
                                </div>
                                {syncState === "synced" && (
                                    <button type="button" onClick={resetDemo} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-[#5f6570] hover:bg-white" aria-label="Replay sync demonstration">
                                        <RotateCcw size={14}/> Replay
                                    </button>
                                )}
                            </div>

                            <div className="mt-8 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#2563EB]">Saved applications</p>
                                    <h3 className="mt-1 text-2xl font-semibold">Your pipeline</h3>
                                </div>
                                <span className="rounded-full bg-[#eceae5] px-2.5 py-1 text-xs font-semibold text-[#656a72]">Saved {syncState === "synced" ? 1 : 0}</span>
                            </div>

                            <div className="mt-5 min-h-[224px] rounded-xl border border-dashed border-[#c9c6bd] bg-white/65 p-3">
                                {syncState === "synced" ? (
                                    <div className={`${styles.jobCard} rounded-xl border border-[#c8d7ee] bg-white p-4 shadow-[0_16px_35px_-28px_rgba(37,99,235,0.7)]`}>
                                        <div className="flex items-start justify-between gap-3">
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#eaf2ff] text-[11px] font-bold text-[#2563EB]">NH</span>
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eceae5] px-2.5 py-1 text-[11px] font-semibold text-[#60656c]"><span className="size-1.5 rounded-full bg-[#8f8b82]"/>Saved</span>
                                        </div>
                                        <p className="mt-4 text-base font-semibold text-[#2563EB]">Senior Product Designer</p>
                                        <p className="mt-1 text-sm text-[#555c66]">Northstar Health</p>
                                        <p className="mt-1.5 text-xs text-[#7a7f87]">Melbourne VIC · Hybrid</p>
                                        <div className="mt-4 flex items-center justify-between border-t border-[#e7e4dd] pt-3 text-xs font-semibold">
                                            <span className="inline-flex items-center gap-1.5 text-[#2f855a]"><CheckCircle2 size={15}/> Context saved</span>
                                            <span className="inline-flex items-center gap-1 text-[#2563EB]">Open role <ArrowRight size={13}/></span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex min-h-[196px] flex-col items-center justify-center px-5 text-center">
                                        <span className={`flex size-12 items-center justify-center rounded-xl ${syncState === "syncing" ? "bg-[#eaf2ff] text-[#2563EB]" : "bg-[#efeee9] text-[#8a8e94]"}`}>
                                            {syncState === "syncing" ? <LoaderCircle className="animate-spin" size={22}/> : <BriefcaseBusiness size={22}/>} 
                                        </span>
                                        <p className="mt-4 text-sm font-semibold text-[#3d434c]">{syncState === "syncing" ? "Saving role context" : "Your synced role will appear here"}</p>
                                        <p className="mt-1.5 max-w-xs text-xs leading-5 text-[#7a7f87]">{syncState === "syncing" ? "Keeping the title, company, location and description together." : "Press “Sync to RoleVault” on the example listing."}</p>
                                    </div>
                                )}
                            </div>

                            <div className={`mt-4 min-h-[116px] rounded-xl border p-4 transition-colors ${syncState === "synced" ? "border-[#c8d7ee] bg-[#EFF6FF]" : "border-[#e1ded7] bg-white/70"}`}>
                                <div className="flex items-start gap-3">
                                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${syncState === "synced" ? "bg-white text-[#2563EB]" : "bg-[#f1f0ec] text-[#8a8e94]"}`}><FileCheck2 size={18}/></span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-sm font-semibold text-[#313740]">{syncState === "synced" ? "Ready to tailor" : "Documents come next"}</p>
                                            <div className="flex shrink-0 gap-1.5" aria-label="Resume and cover-letter options">
                                                <span className={`flex size-7 items-center justify-center rounded-md ${syncState === "synced" ? "bg-white text-[#2563EB]" : "bg-[#f1f0ec] text-[#a0a3a8]"}`} title="Tailored resume"><FileText size={13}/></span>
                                                <span className={`flex size-7 items-center justify-center rounded-md ${syncState === "synced" ? "bg-white text-[#2563EB]" : "bg-[#f1f0ec] text-[#a0a3a8]"}`} title="Cover letter"><FileCheck2 size={13}/></span>
                                            </div>
                                        </div>
                                        <p className="mt-1 text-xs leading-5 text-[#6c727c]">{syncState === "synced" ? "Use the saved role and your master resume to create a tailored resume or cover letter." : "Once synced, RoleVault can prepare both documents from the same role context."}</p>
                                    </div>
                                </div>
                            </div>
                            <p id="sync-demo-status" className="sr-only" role="status" aria-live="polite">{syncCopy[syncState]}</p>
                        </aside>
                    </div>
                </div>

                <p data-reveal className="mt-5 text-center text-xs leading-5 text-[#858990]">
                    Interactive demonstration only. No account is created and no job data is saved.
                </p>
            </div>
        </section>
    );
}
