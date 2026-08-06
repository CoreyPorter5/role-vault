import {Job} from "@/lib/types/types";
import Image from "next/image";
import {type ReactNode, useEffect, useRef, useState} from "react";
import {
    Banknote,
    BriefcaseBusiness,
    Building2,
    CalendarDays, ChevronDown,
    ExternalLink,
    LoaderCircle,
    MapPin,
    Sparkles,
    Trash2,
    TriangleAlert,
    X,
} from "lucide-react";
import companyImageFallback from "../../../public/globe.svg";
import {toast} from "sonner";

type JobStatus = Job["jobStatus"];

type SelectedJobCardProps = {
    job: Job;
    onClose: () => void;
    onDelete: (jobId: string) => Promise<boolean>;
    onStatusChange: (jobId: string, status: JobStatus) => Promise<boolean>;
    onTailorResume: (job: Job) => void;
}

const STATUS_OPTIONS: JobStatus[] = [
    "Saved",
    "Applied",
    "Interviewing",
    "Offer",
    "Accepted",
    "Rejected",
];

const STATUS_STYLES: Record<JobStatus, string> = {
    Saved: "bg-slate-100 text-slate-700 ring-slate-200",
    Applied: "bg-blue-50 text-blue-700 ring-blue-200",
    Interviewing: "bg-violet-50 text-violet-700 ring-violet-200",
    Offer: "bg-amber-50 text-amber-700 ring-amber-200",
    Accepted: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Rejected: "bg-rose-50 text-rose-700 ring-rose-200",
};

export default function SelectedJobCard({
                                            job,
                                            onClose,
                                            onDelete,
                                            onStatusChange,
                                            onTailorResume,
                                        }: SelectedJobCardProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const listingURL = `https://www.seek.com.au/job/${encodeURIComponent(String(job.jobId))}`;
    const applyURL = `${listingURL}/apply`;
    const description = normalizeDescription(job.jobDescription);

    useEffect(() => {
        const previouslyFocused = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        const dialog = dialogRef.current;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        dialog?.showModal();

        return () => {
            if (dialog?.open) {
                dialog.close();
            }
            document.body.style.overflow = previousOverflow;
            previouslyFocused?.focus();
        };
    }, []);

    const handleStatusChange = async (status: JobStatus) => {
        setActionError(null);
        setIsUpdatingStatus(true);
        const updated = await onStatusChange(String(job.jobId), status);
        setIsUpdatingStatus(false);
        if (!updated) {
            setActionError("We couldn't update this application's status. Please try again.");
            toast.error("Job status could not be updated");
        }
    };

    const handleDelete = async () => {
        setActionError(null);
        setIsDeleting(true);
        const deleted = await onDelete(String(job.jobId));
        setIsDeleting(false);
        if (deleted) {
            toast.success("Job removed from your pipeline");
            return;
        }
        setActionError("We couldn't delete this job. Please try again.");
        toast.error("Job could not be deleted");
    };

    const handleTailorResume = () => {
        onClose();
        onTailorResume(job);
    };

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby="job-details-title"
            aria-describedby="job-details-description"
            onCancel={(event) => {
                event.preventDefault();
                if (!isDeleting) {
                    onClose();
                }
            }}
            onClick={(event) => {
                if (event.target === dialogRef.current && !isDeleting) {
                    onClose();
                }
            }}
            className="fixed inset-0 z-50 m-0 h-full max-h-none w-full max-w-none bg-transparent p-3 backdrop:bg-slate-950/45 backdrop:backdrop-blur-[2px] open:flex open:items-center open:justify-center sm:p-6"
        >
            <section
                className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl outline-none ring-1 ring-black/5"
            >
                <header className="relative shrink-0 border-b border-slate-200 bg-white px-5 py-5 sm:px-7 sm:py-6">
                    <button
                        type="button"
                        aria-label="Close job details"
                        onClick={onClose}
                        disabled={isDeleting}
                        className="absolute right-4 hover:cursor-pointer top-4 rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 sm:right-6 sm:top-6"
                    >
                        <X size={20}/>
                    </button>

                    <div className="flex items-start gap-4 pr-10 sm:gap-5">
                        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 sm:size-16">
                            <Image
                                height={64}
                                width={64}
                                src={job.companyLogo ?? companyImageFallback}
                                alt={`${job.companyName} logo`}
                                className="size-full object-contain p-2"
                            />
                        </div>
                        <div className="min-w-0">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[job.jobStatus]}`}>
                                {job.jobStatus}
                            </span>
                            <h2 id="job-details-title" className="mt-2 text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">
                                {job.jobTitle}
                            </h2>
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-slate-600">
                                <span className="inline-flex items-center gap-1.5">
                                    <Building2 size={15}/>
                                    {job.companyName}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <MapPin size={15}/>
                                    {job.location}
                                </span>
                                {job.jobType ? (
                                    <span className="inline-flex items-center gap-1.5">
                                        <BriefcaseBusiness size={15}/>
                                        {job.jobType}
                                    </span>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
                    <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_280px]">
                        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <div className="flex items-center justify-between gap-4">
                                <h3 className="text-lg font-bold text-slate-950">About the role</h3>
                                <a
                                    href={listingURL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hidden items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900 sm:inline-flex"
                                >
                                    View original
                                    <ExternalLink size={14}/>
                                </a>
                            </div>
                            <p
                                id="job-details-description"
                                className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700 sm:text-[15px]"
                            >
                                {description || "No job description was captured for this listing."}
                            </p>
                        </article>

                        <aside className="space-y-4">
                            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Job snapshot</h3>
                                <dl className="mt-4 space-y-4 text-sm">
                                    <JobFact icon={<CalendarDays size={17}/>} label="Synced" value={formatDate(job.dateSynced)}/>
                                    <JobFact icon={<MapPin size={17}/>} label="Location" value={job.location}/>
                                    {job.jobType ? (
                                        <JobFact icon={<BriefcaseBusiness size={17}/>} label="Work type" value={job.jobType}/>
                                    ) : null}
                                    {job.jobPay ? (
                                        <JobFact icon={<Banknote size={17}/>} label="Salary" value={job.jobPay}/>
                                    ) : null}
                                </dl>
                            </section>

                            <section className="rounded-xl border border-blue-100 bg-blue-50 p-5">
                                <h3 className="font-bold text-slate-950">Ready for the next step?</h3>
                                <p className="mt-1.5 text-sm leading-6 text-slate-600">
                                    Open the live listing or create a resume tailored to this role.
                                </p>
                                <div className="mt-4 grid gap-2">
                                    <a
                                        href={applyURL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-sm font-semibold text-blue-800 transition hover:border-blue-300 hover:bg-blue-50"
                                    >
                                        Apply on SEEK
                                        <ExternalLink size={15}/>
                                    </a>
                                    <button
                                        type="button"
                                        onClick={handleTailorResume}
                                        className="inline-flex items-center justify-center hover:cursor-pointer gap-2 rounded-lg bg-blue-700 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                                    >
                                        <Sparkles size={15}/>
                                        Tailor resume
                                    </button>
                                </div>
                            </section>
                        </aside>
                    </div>
                </div>

                <footer className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 sm:px-7">
                    {actionError ? (
                        <p role="alert" className="mb-3 text-sm font-medium text-red-600">{actionError}</p>
                    ) : null}

                    {confirmingDelete ? (
                        <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-2.5">
                                <TriangleAlert className="mt-0.5 shrink-0 text-red-600" size={18}/>
                                <div>
                                    <p className="text-sm font-bold text-red-900">Delete this job?</p>
                                    <p className="text-xs leading-5 text-red-700">This also removes its saved drafts and generated resume.</p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={() => setConfirmingDelete(false)}
                                    className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={handleDelete}
                                    className="inline-flex min-w-24 items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                                >
                                    {isDeleting ? <LoaderCircle className="animate-spin" size={15}/> : <Trash2 size={15}/>}
                                    {isDeleting ? "Deleting" : "Delete"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                                <label htmlFor="job-status" className="text-sm font-medium text-slate-600">Move to</label>
                                <div className="relative">
                                    <select
                                        id="job-status"
                                        value={job.jobStatus}
                                        disabled={isUpdatingStatus}
                                        onChange={(event) => handleStatusChange(event.target.value as JobStatus)}
                                        className="appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-9 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                                    >
                                        {STATUS_OPTIONS.map((status) => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                    <div className={"pointer-events-none absolute inset-y-0 right-3 flex items-center"}>
                                        {isUpdatingStatus ? (
                                            <LoaderCircle className="animate-spin text-slate-500" size={16}/>
                                        ) : (
                                            <ChevronDown
                                                size={16}
                                                className="text-slate-500"
                                                aria-hidden="true"
                                            />
                                        )}

                                    </div>

                                </div>
                            </div>

                            <div className="flex flex-col-reverse gap-2 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={() => setConfirmingDelete(true)}
                                    className="inline-flex items-center hover:cursor-pointer justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                                >
                                    <Trash2 size={16}/>
                                    Delete job
                                </button>
                                <a
                                    href={listingURL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                                >
                                    View on SEEK
                                    <ExternalLink size={15}/>
                                </a>
                                <button
                                    type="button"
                                    onClick={handleTailorResume}
                                    className="inline-flex items-center hover:cursor-pointer justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                                >
                                    <Sparkles size={15}/>
                                    Tailor resume
                                </button>
                            </div>
                        </div>
                    )}
                </footer>
            </section>
        </dialog>
    );
}

function JobFact({icon, label, value}: {icon: ReactNode; label: string; value: string}) {
    return (
        <div className="flex gap-3">
            <span className="mt-0.5 text-blue-700">{icon}</span>
            <div className="min-w-0">
                <dt className="text-xs font-medium text-slate-500">{label}</dt>
                <dd className="mt-0.5 wrap-break-word font-semibold text-slate-800">{value}</dd>
            </div>
        </div>
    );
}

function formatDate(value: Date) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }
    return new Intl.DateTimeFormat("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(date);
}

function normalizeDescription(value: string) {
    return value
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, "\"")
        .replace(/&#39;/gi, "'")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
