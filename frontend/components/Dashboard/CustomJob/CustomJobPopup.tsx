"use client";

import {useState, type FormEvent} from "react";
import {BriefcaseBusiness, LoaderCircle, Sparkles, X} from "lucide-react";
import {toast} from "sonner";

import {useJWKTokenAndUserAndSidebar} from "../Context/DashboardContextProvider";
import InlineErrorMessage from "../../ui/InlineErrorMessage";
import {captureAppError} from "@/lib/sentry/captureAppError";
import {
    resumeCategoryDefinitions,
    type ResumeCategory,
} from "@/lib/resume-generation/categories";
import {JobSchema, type Job} from "@/lib/types/types";

type CustomJobPopupProps = {
    onClose: () => void;
    onCreated: (job: Job) => void;
};

type FormState = {
    jobTitle: string;
    companyName: string;
    location: string;
    jobType: string;
    jobPay: string;
    jobDescription: string;
    resumeCategory: "auto" | ResumeCategory;
};

const initialForm: FormState = {
    jobTitle: "",
    companyName: "",
    location: "",
    jobType: "",
    jobPay: "",
    jobDescription: "",
    resumeCategory: "auto",
};

export default function CustomJobPopup({onClose, onCreated}: CustomJobPopupProps) {
    const {token} = useJWKTokenAndUserAndSidebar();
    const [form, setForm] = useState<FormState>(initialForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateField = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
        setForm((current) => ({...current, [key]: value}));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        if (!token) {
            setError("Your session has expired. Please log in again.");
            return;
        }
        if (form.jobDescription.trim().length < 100) {
            setError("Add at least 100 characters of job context so RoleVault has enough information to tailor your documents.");
            return;
        }

        setSaving(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/jobs/custom`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    jobTitle: form.jobTitle.trim(),
                    companyName: form.companyName.trim(),
                    location: form.location.trim(),
                    jobType: form.jobType.trim() || undefined,
                    jobPay: form.jobPay.trim() || undefined,
                    jobDescription: form.jobDescription.trim(),
                    resumeCategory: form.resumeCategory === "auto" ? undefined : form.resumeCategory,
                }),
            });

            const payload = await response.json().catch(() => null) as unknown;
            if (!response.ok) {
                const message = payload && typeof payload === "object" && "message" in payload
                    ? String(payload.message)
                    : "We couldn't save this job. Please try again.";
                setError(message);
                return;
            }

            const parsedJob = JobSchema.safeParse(payload);
            if (!parsedJob.success) {
                throw new Error("The server returned an invalid custom job");
            }

            onCreated(parsedJob.data);
            toast.success("Custom job added to your pipeline");
            onClose();
        } catch (requestError) {
            captureAppError({
                code: "WEB_CUSTOM_JOB_CREATE_FAILED",
                message: "Unexpected error while creating a custom job",
                error: requestError,
                area: "dashboard",
                action: "create_custom_job",
                endpoint: "/api/v1/jobs/custom",
            });
            setError("We couldn't save this job. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
            <button
                type="button"
                aria-label="Close custom job form"
                disabled={saving}
                onClick={onClose}
                className="absolute inset-0 bg-[#181d26]/35 backdrop-blur-[2px] hover:bg-[#181d26]/40 disabled:cursor-wait"
            />

            <form
                onSubmit={handleSubmit}
                className="relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#d5d2ca] bg-white shadow-[0_24px_70px_-24px_rgba(24,29,38,0.5)] sm:max-h-[calc(100dvh-2.5rem)]"
            >
                <header className="flex shrink-0 items-start justify-between border-b border-[#e2e0da] px-5 py-5 sm:px-7">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                            <BriefcaseBusiness size={20}/>
                        </span>
                        <div>
                            <p className="eyebrow">Add from anywhere</p>
                            <h2 className="mt-1 text-xl font-semibold text-slate-950 sm:text-2xl">Add a custom job</h2>
                            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                                Paste a listing, recruiter email or role brief. Once saved, it works like any other job in RoleVault.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        aria-label="Close"
                        disabled={saving}
                        onClick={onClose}
                        className="ml-3 inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:cursor-pointer hover:bg-[#f5f4f0] hover:text-slate-950 disabled:opacity-50"
                    >
                        <X size={19}/>
                    </button>
                </header>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <TextField label="Job title" value={form.jobTitle} maxLength={300} required onChange={(value) => updateField("jobTitle", value)}/>
                        <TextField label="Company" value={form.companyName} maxLength={300} required onChange={(value) => updateField("companyName", value)}/>
                        <TextField label="Location" value={form.location} maxLength={500} required placeholder="Sydney NSW, Remote…" onChange={(value) => updateField("location", value)}/>
                        <TextField label="Work type" value={form.jobType} maxLength={200} placeholder="Full time, Contract…" onChange={(value) => updateField("jobType", value)}/>
                        <TextField label="Advertised pay" value={form.jobPay} maxLength={500} placeholder="$80k–$95k, Award rate…" onChange={(value) => updateField("jobPay", value)}/>
                        <label className="block">
                            <span className="text-sm font-semibold text-slate-800">Resume type</span>
                            <select
                                value={form.resumeCategory}
                                onChange={(event) => updateField("resumeCategory", event.target.value as FormState["resumeCategory"])}
                                className="mt-1.5 min-h-11 w-full rounded-lg border border-[#d5d2ca] bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="auto">Let RoleVault choose with AI</option>
                                {resumeCategoryDefinitions.map((category) => (
                                    <option key={category.key} value={category.key}>{category.label}</option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <label className="block">
                        <span className="flex items-end justify-between gap-3">
                            <span className="text-sm font-semibold text-slate-800">Job description and context</span>
                            <span className="text-xs text-slate-500">{form.jobDescription.length.toLocaleString()} characters</span>
                        </span>
                        <textarea
                            required
                            minLength={100}
                            maxLength={480000}
                            rows={11}
                            value={form.jobDescription}
                            onChange={(event) => updateField("jobDescription", event.target.value)}
                            placeholder="Paste the full job description, recruiter email, responsibilities, requirements and any other useful context…"
                            className="mt-1.5 min-h-56 w-full resize-y rounded-xl border border-[#d5d2ca] bg-white px-3.5 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                        />
                        <span className="mt-1.5 block text-xs leading-5 text-slate-500">
                            Include responsibilities and requirements where possible. This context is used for classification and document tailoring.
                        </span>
                    </label>

                    {error ? <InlineErrorMessage>{error}</InlineErrorMessage> : null}
                </div>

                <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#e2e0da] bg-[#faf9f6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                    <p className="text-xs leading-5 text-slate-500">You can edit the status, create drafts and save documents after adding it.</p>
                    <div className="flex gap-2 sm:shrink-0">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={onClose}
                            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg px-4 text-sm font-semibold text-slate-700 transition hover:cursor-pointer hover:bg-white disabled:opacity-50 sm:flex-none"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-5 text-sm font-semibold text-white transition hover:cursor-pointer hover:bg-[#1D4ED8] disabled:cursor-wait disabled:opacity-65 sm:flex-none"
                        >
                            {saving ? <LoaderCircle className="animate-spin" size={17}/> : <Sparkles size={16}/>} 
                            {saving ? "Adding job…" : "Add to pipeline"}
                        </button>
                    </div>
                </footer>
            </form>
        </div>
    );
}

function TextField({
    label,
    value,
    onChange,
    placeholder,
    required = false,
    maxLength,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    maxLength: number;
}) {
    return (
        <label className="block">
            <span className="text-sm font-semibold text-slate-800">{label}</span>
            <input
                type="text"
                required={required}
                maxLength={maxLength}
                value={value}
                placeholder={placeholder}
                onChange={(event) => onChange(event.target.value)}
                className="mt-1.5 min-h-11 w-full rounded-lg border border-[#d5d2ca] bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
            />
        </label>
    );
}
