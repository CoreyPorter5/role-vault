"use client";

import {Dispatch, SetStateAction, useEffect, useRef, useState} from "react";
import {Download, LoaderCircle, Save, Sparkles, X} from "lucide-react";
import {toast} from "sonner";
import type {Job} from "@/lib/types/types";
import type {JobLibraryItem} from "../../Library/schema";
import type {ResumePayload} from "../../Resume/schema";
import {
    COVER_LETTER_TEMPLATE_VERSION,
    coverLetterSchema,
    coverLetterWordCount,
    type CoverLetter,
} from "@/lib/cover-letter/schema";
import type {ResumeGenerationUsage} from "./types";
import {captureAppError} from "@/lib/sentry/captureAppError";
import InlineErrorMessage from "../../ui/InlineErrorMessage";

type Props = {
    job: Job | JobLibraryItem;
    token: string | null;
    masterResume: ResumePayload | null;
    masterResumeLoading: boolean;
    onClose: () => void;
    documentSwitchLocked: boolean;
    onSelectResume: () => void;
    onDocumentChanged: () => void;
    onBusyChange: (busy: boolean) => void;
    onLibraryChanged?: Dispatch<SetStateAction<boolean>>;
};

type StoredDocument = {
    coverLetter: CoverLetter;
    templateVersion: string;
    updatedAt: string;
    expiresAt?: string;
};

export default function CoverLetterPanel({
    job,
    token,
    masterResume,
    masterResumeLoading,
    onClose,
    documentSwitchLocked,
    onSelectResume,
    onDocumentChanged,
    onBusyChange,
    onLibraryChanged,
}: Props) {
    const [usage, setUsage] = useState<ResumeGenerationUsage | null>(null);
    const [letter, setLetter] = useState<CoverLetter | null>(null);
    const [documentState, setDocumentState] = useState<"new" | "draft" | "saved">("new");
    const [emphasisNote, setEmphasisNote] = useState("");
    const [loading, setLoading] = useState(Boolean(token));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const generationIDRef = useRef<string | null>(null);

    useEffect(() => onBusyChange(busy), [busy, onBusyChange]);

    useEffect(() => {
        if (!token) {
            return;
        }
        let cancelled = false;
        const headers = {Authorization: `Bearer ${token}`};
        const load = async () => {
            try {
                const [usageResponse, draftResponse] = await Promise.all([
                    fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/usage/document-credits`, {
                        cache: "no-store",
                        headers,
                    }),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/generated-cover-letter-drafts/jobs/${encodeURIComponent(job.jobId)}`, {
                        cache: "no-store",
                        headers,
                    }),
                ]);
                if (usageResponse.ok && !cancelled) {
                    setUsage(await usageResponse.json() as ResumeGenerationUsage);
                } else if (!cancelled) {
                    setError("Your document credit balance is temporarily unavailable. Please try again shortly.");
                }
                if (draftResponse.ok) {
                    const stored = await draftResponse.json() as StoredDocument;
                    const parsed = coverLetterSchema.safeParse(stored.coverLetter);
                    if (parsed.success && !cancelled) {
                        setLetter(parsed.data);
                        setDocumentState("draft");
                    }
                    return;
                }
                if (draftResponse.status !== 404) return;
                const savedResponse = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/generated-cover-letters/${encodeURIComponent(job.jobId)}`,
                    {cache: "no-store", headers},
                );
                if (savedResponse.ok) {
                    const stored = await savedResponse.json() as StoredDocument;
                    const parsed = coverLetterSchema.safeParse(stored.coverLetter);
                    if (parsed.success && !cancelled) {
                        setLetter(parsed.data);
                        setDocumentState("saved");
                    }
                }
            } catch (loadError) {
                captureAppError({
                    code: "WEB_COVER_LETTER_LOAD_FAILED",
                    message: "Failed to load cover letter workspace",
                    error: loadError,
                    area: "cover_letter_generator",
                    action: "load_cover_letter_workspace",
                });
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        void load();
        return () => { cancelled = true; };
    }, [job.jobId, token]);

    const generate = async () => {
        if (!token || !masterResume) {
            toast.error("Upload a master resume before generating a cover letter.");
            return;
        }
        if (usage && !usage.can_generate) {
            toast.error("You have no document credits left. Buy a credit pack to keep generating.");
            return;
        }
        setBusy(true);
        setError(null);
        const generationID = generationIDRef.current ?? crypto.randomUUID();
        generationIDRef.current = generationID;
        try {
            const response = await fetch("/api/generate-cover-letter", {
                method: "POST",
                headers: {Authorization: `Bearer ${token}`, "Content-Type": "application/json"},
                body: JSON.stringify({jobID: job.jobId, generationID, emphasisNote}),
            });
            const payload = await response.json().catch(() => ({})) as {
                coverLetter?: unknown;
                usage?: ResumeGenerationUsage;
                message?: string;
                code?: string;
            };
            if (!response.ok) {
                if (response.status !== 202) generationIDRef.current = null;
                throw new Error(payload.message ?? "Could not generate the cover letter.");
            }
            const parsed = coverLetterSchema.safeParse(payload.coverLetter);
            if (!parsed.success) throw new Error("The generated cover letter had an invalid format.");
            setLetter(parsed.data);
            setDocumentState("draft");
            if (payload.usage) setUsage(payload.usage);
            generationIDRef.current = null;
            onDocumentChanged();
            toast.success("Cover letter generated");
        } catch (generationError) {
            const message = generationError instanceof Error ? generationError.message : "Could not generate the cover letter.";
            setError(message);
            toast.error(message);
        } finally {
            setBusy(false);
        }
    };

    const save = async () => {
        if (!token || !letter) return;
        const parsed = coverLetterSchema.safeParse(letter);
        if (!parsed.success) {
            toast.error("Check the cover letter fields before saving.");
            return;
        }
        setBusy(true);
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/generated-cover-letters/${encodeURIComponent(job.jobId)}`,
                {
                    method: "POST",
                    headers: {Authorization: `Bearer ${token}`, "Content-Type": "application/json"},
                    body: JSON.stringify({cover_letter: parsed.data}),
                },
            );
            if (!response.ok) throw new Error("Could not save the cover letter.");
            setDocumentState("saved");
            onLibraryChanged?.((value) => !value);
            toast.success("Cover letter saved to your library");
        } catch (saveError) {
            toast.error(saveError instanceof Error ? saveError.message : "Could not save the cover letter.");
        } finally {
            setBusy(false);
        }
    };

    const download = async () => {
        if (!letter) return;
        setBusy(true);
        try {
            const response = await fetch("/api/export-cover-letter-docx", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({coverLetter: letter, templateVersion: COVER_LETTER_TEMPLATE_VERSION}),
            });
            if (!response.ok) throw new Error("Could not export the cover letter.");
            const url = URL.createObjectURL(await response.blob());
            const link = document.createElement("a");
            link.href = url;
            link.download = `${safeFilename(job.companyName)}_${safeFilename(job.jobTitle)}_cover_letter.docx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            toast.success("Cover letter download started");
        } catch (downloadError) {
            toast.error(downloadError instanceof Error ? downloadError.message : "Could not export the cover letter.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="eyebrow">Application studio</p>
                    <h2 className="mt-1 text-2xl font-semibold">Create your documents</h2>
                </div>
                <button type="button" disabled={busy} onClick={onClose}
                        className="rounded-lg p-2 text-[#6f747c] hover:bg-[#f5f4f0] hover:text-[#181d26] disabled:opacity-50"
                        aria-label="Close">
                    <X className="size-5"/>
                </button>
            </div>

            <div className="flex w-fit rounded-lg gap-x-1 border border-[#d9d6ce] bg-[#f5f4f0] p-1" role="tablist" aria-label="Application document">
                <button type="button" role="tab" aria-selected="false" disabled={documentSwitchLocked || busy}
                        onClick={onSelectResume}
                        title={documentSwitchLocked || busy ? "Wait for the current action to finish before switching documents" : undefined}
                        className="rounded-md px-4 py-2 text-sm font-semibold text-[#555b64] hover:bg-white disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent">
                    Resume
                </button>
                <button type="button" role="tab" aria-selected="true"
                        className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-[#0D3880] shadow-sm hover:bg-[#faf9f6]">
                    Cover letter
                </button>
            </div>

            {loading ? (
                <div className="app-panel flex min-h-64 items-center justify-center">
                    <LoaderCircle className="size-6 animate-spin text-[#0D3880]" aria-label="Loading cover letter"/>
                </div>
            ) : letter ? (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="app-panel space-y-4 p-5 sm:p-6">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="eyebrow">{documentState === "saved" ? "Saved cover letter" : "Cover letter draft"}</p>
                                <h3 className="mt-1 font-semibold">{job.jobTitle} at {job.companyName}</h3>
                            </div>
                            <span className="text-xs font-semibold text-[#6f747c]">{coverLetterWordCount(letter)} words</span>
                        </div>
                        <EditableLine label="Greeting" value={letter.salutation}
                                      onChange={(value) => setLetter({...letter, salutation: value})}/>
                        <EditableParagraph label="Opening" value={letter.openingParagraph}
                                           onChange={(value) => setLetter({...letter, openingParagraph: value})}/>
                        {letter.bodyParagraphs.map((paragraph, index) => (
                            <EditableParagraph key={index} label={`Evidence ${index + 1}`} value={paragraph}
                                               onChange={(value) => setLetter({
                                                   ...letter,
                                                   bodyParagraphs: letter.bodyParagraphs.map((item, itemIndex) => itemIndex === index ? value : item),
                                               })}/>
                        ))}
                        <EditableParagraph label="Closing" value={letter.closingParagraph}
                                           onChange={(value) => setLetter({...letter, closingParagraph: value})}/>
                        <EditableLine label="Sign-off" value={letter.signOff}
                                      onChange={(value) => setLetter({...letter, signOff: value})}/>
                    </div>
                    <aside className="flex flex-col gap-3">
                        <div className="app-panel p-4">
                            <p className="text-sm font-semibold">Review before sending</p>
                            <p className="mt-1 text-xs leading-5 text-[#666b73]">Check names, facts and tone. Your edits stay with this application.</p>
                        </div>
                        <button type="button" disabled={busy} onClick={download} className="button-secondary w-full">
                            <Download className="size-4"/> Download DOCX
                        </button>
                        <button type="button" disabled={busy} onClick={save} className="button-primary w-full">
                            {busy ? <LoaderCircle className="size-4 animate-spin"/> : <Save className="size-4"/>}
                            {documentState === "saved" ? "Save changes" : "Save to library"}
                        </button>
                        <button type="button" disabled={busy || !usage?.can_generate} onClick={() => {
                            setLetter(null)
                            setDocumentState("new")
                            setError(null)
                        }} className="w-full rounded-lg px-3 py-2 text-sm font-semibold text-[#59606a] hover:bg-[#f5f4f0] disabled:opacity-50 disabled:hover:bg-transparent">
                            Write another version
                        </button>
                    </aside>
                </div>
            ) : (
                <div className="space-y-5">
                    <div className="max-w-2xl">
                        <h3 className="text-lg font-semibold">Add a focused cover letter</h3>
                        <p className="mt-1 text-sm leading-6 text-[#666b73]">
                            We’ll use your master resume, this job description and any tailored resume already created for the role.
                        </p>
                    </div>
                    <div className="app-panel p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="eyebrow">Source material</p>
                                <p className="mt-2 font-semibold">{masterResumeLoading ? "Loading master resume…" : masterResume?.fileName ?? "No master resume uploaded"}</p>
                                <p className="mt-1 text-sm text-[#666b73]">Targeting {job.jobTitle} at {job.companyName}</p>
                            </div>
                            {usage && <span className="rounded-md bg-[#e7effb] px-2.5 py-1 text-xs font-semibold text-[#0D3880]">{usage.balance} credits left</span>}
                        </div>
                        <label className="mt-5 block text-sm font-semibold" htmlFor="cover-letter-note">
                            Something worth mentioning <span className="font-normal text-[#777c84]">(optional)</span>
                        </label>
                        <textarea id="cover-letter-note" maxLength={800} value={emphasisNote}
                                  onChange={(event) => setEmphasisNote(event.target.value)}
                                  placeholder="For example: why this role interests you, or the tone you'd like the cover letter to be written in."
                                  className="mt-2 min-h-24 w-full rounded-lg border border-[#c9c6bd] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0D3880] focus:ring-2 focus:ring-[#0D3880]/15"/>
                        <p className="mt-1 text-right text-xs text-[#777c84]">{emphasisNote.length}/800</p>
                    </div>
                    {error && <InlineErrorMessage>{error}</InlineErrorMessage>}
                    <div className="flex flex-wrap justify-end gap-3">
                        <button type="button" disabled={busy} onClick={onClose} className="button-secondary">Cancel</button>
                        <button type="button" disabled={busy || masterResumeLoading || !masterResume || !usage}
                                onClick={generate} className="button-primary">
                            {busy ? <LoaderCircle className="size-4 animate-spin"/> : <Sparkles className="size-4"/>}
                            {busy ? "Writing cover letter…" : "Generate cover letter"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function EditableLine({label, value, onChange}: {label: string; value: string; onChange: (value: string) => void}) {
    return (
        <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-[#6f747c]">
            {label}
            <input value={value} onChange={(event) => onChange(event.target.value)}
                   className="mt-1.5 h-10 w-full rounded-lg border border-[#d9d6ce] px-3 text-sm font-normal normal-case tracking-normal text-[#181d26] outline-none focus:border-[#0D3880] focus:ring-2 focus:ring-[#0D3880]/15"/>
        </label>
    );
}

function EditableParagraph({label, value, onChange}: {label: string; value: string; onChange: (value: string) => void}) {
    return (
        <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-[#6f747c]">
            {label}
            <textarea value={value} onChange={(event) => onChange(event.target.value)}
                      className="mt-1.5 min-h-28 w-full resize-y rounded-lg border border-[#d9d6ce] px-3 py-2.5 text-sm font-normal leading-6 normal-case tracking-normal text-[#181d26] outline-none focus:border-[#0D3880] focus:ring-2 focus:ring-[#0D3880]/15"/>
        </label>
    );
}

function safeFilename(value: string) {
    return value.replace(/[^\w.-]+/g, "_");
}
