import {Job} from "@/lib/types/types";
import Image from "next/image";
import {useEffect, useRef, useState} from "react";
import {
    BriefcaseBusiness,
    Building2,
    ChevronDown,
    ExternalLink,
    LoaderCircle,
    MapPin,
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
    Saved: "border-slate-200 bg-slate-50 text-slate-700",
    Applied: "border-blue-200 bg-blue-50 text-blue-700",
    Interviewing: "border-violet-200 bg-violet-50 text-violet-700",
    Offer: "border-amber-200 bg-amber-50 text-amber-700",
    Accepted: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Rejected: "border-rose-200 bg-rose-50 text-rose-700",
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
            className="fixed inset-0 z-50 m-0 h-full max-h-none w-full max-w-none bg-transparent p-3 backdrop:bg-slate-950/35 open:flex open:items-center open:justify-center sm:p-6"
        >
            <section
                className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-[#d8d6cf] bg-white shadow-[0_24px_70px_rgba(24,29,38,0.22)] outline-none"
            >
                <header className="relative shrink-0 border-b border-[#dedcd5] bg-white px-5 py-5 sm:px-8 sm:py-7">
                    <button
                        type="button"
                        aria-label="Close job details"
                        onClick={onClose}
                        disabled={isDeleting}
                        className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full border border-[#d8d6cf] bg-white text-slate-500 transition hover:cursor-pointer hover:border-[#aaa79f] hover:bg-[#faf9f6] hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 sm:right-6 sm:top-6"
                    >
                        <X size={20}/>
                    </button>

                    <div className="flex items-start gap-4 pr-11 sm:gap-5 sm:pr-14">
                        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#dedcd5] bg-[#faf9f6] sm:size-16">
                            <Image
                                height={64}
                                width={64}
                                src={job.companyLogo ?? companyImageFallback}
                                alt={`${job.companyName} logo`}
                                className="size-full object-contain p-2"
                            />
                        </div>
                        <div className="min-w-0">
                            <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[job.jobStatus]}`}>
                                {job.jobStatus}
                            </span>
                            <h2 id="job-details-title" className="mt-2 max-w-4xl text-2xl font-semibold leading-tight text-slate-950 sm:text-[30px]">
                                {job.jobTitle}
                            </h2>
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
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

                <div className="min-h-0 flex-1 overflow-y-auto bg-white">
                    <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
                        <article className="p-5 sm:p-8 lg:pr-10">
                            <div className="flex items-center justify-between gap-4">
                                <h3 className="text-lg font-semibold text-slate-950">About the role</h3>
                                <a
                                    href={listingURL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hidden items-center gap-1.5 text-sm font-medium text-[#0D3880] hover:text-[#08285f] sm:inline-flex"
                                >
                                    View original
                                    <ExternalLink size={14}/>
                                </a>
                            </div>
                            <p
                                id="job-details-description"
                                className="mt-5 max-w-[76ch] whitespace-pre-line text-sm leading-7 text-slate-700 sm:text-[15px]"
                            >
                                {description || "No job description was captured for this listing."}
                            </p>
                        </article>

                        <aside className="border-t border-[#dedcd5] bg-[#faf9f6] p-5 sm:p-7 lg:border-l lg:border-t-0">
                            <section>
                                <h3 className="text-sm font-semibold text-slate-950">Job details</h3>
                                <dl className="mt-4 divide-y divide-[#dedcd5] border-y border-[#dedcd5] text-sm">
                                    <JobFact label="Synced" value={formatDate(job.dateSynced)}/>
                                    <JobFact label="Location" value={job.location}/>
                                    {job.jobType ? (
                                        <JobFact label="Work type" value={job.jobType}/>
                                    ) : null}
                                    {job.jobPay ? (
                                        <JobFact label="Salary" value={job.jobPay}/>
                                    ) : null}
                                </dl>
                            </section>
                        </aside>
                    </div>
                </div>

                <footer className="shrink-0 border-t border-[#dedcd5] bg-white px-5 py-4 sm:px-8">
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
                                <label htmlFor="job-status" className="text-sm text-slate-600">Status</label>
                                <div className="relative">
                                    <select
                                        id="job-status"
                                        value={job.jobStatus}
                                        disabled={isUpdatingStatus}
                                        onChange={(event) => handleStatusChange(event.target.value as JobStatus)}
                                        className="min-h-10 appearance-none rounded-lg border border-[#cfcfcf] bg-white py-2 pl-3 pr-9 text-sm font-medium text-slate-900 outline-none transition focus:border-[#0D3880] focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
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
                                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-red-600 transition hover:cursor-pointer hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                                >
                                    <Trash2 size={16}/>
                                    Delete job
                                </button>
                                <a
                                    href={listingURL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#cfcfcf] bg-white px-4 text-sm font-medium text-slate-800 transition hover:border-[#9ea3ab] hover:bg-[#fafafa]"
                                >
                                    View on SEEK
                                    <ExternalLink size={15}/>
                                </a>
                                <button
                                    type="button"
                                    onClick={handleTailorResume}
                                    className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#0D3880] px-5 text-sm font-semibold text-white shadow-[0_2px_5px_rgba(13,56,128,0.16)] transition hover:cursor-pointer hover:bg-[#08285f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                                >
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

function JobFact({label, value}: {label: string; value: string}) {
    return (
        <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 py-3">
            <dt className="text-slate-500">{label}</dt>
            <dd className="wrap-break-word font-medium text-slate-900">{value}</dd>
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
