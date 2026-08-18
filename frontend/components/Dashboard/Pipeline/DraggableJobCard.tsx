import {Job} from "@/lib/types/types";
import Image from "next/image";
import Link from "next/link";
import {Clock, Files, Link2, Sparkles} from "lucide-react";
import {useDraggable} from "@dnd-kit/react";
import companyImageFallBack from "../../../public/globe.svg";
import {ArrowsPointingOutIcon} from "@heroicons/react/24/solid";
import {formatRelativeTime} from "@/lib/date/relative-time";
import {getPipelineCardFooter} from "@/lib/pipeline/card-footer";

type DraggableJobCardProps = {
    job: Job;
    status: "Saved" | "Applied" | "Interviewing" | "Offer" | "Rejected" | "Accepted";
    onTailorResumeAction: (job: Job) => void
    onSelectedJob: (job: Job) => void;
    view: "comfortable" | "compact";
    hasDocuments: boolean;
}


export default function DraggableJobCard({
                                             job,
                                             status,
                                             onTailorResumeAction,
                                             onSelectedJob,
                                             view,
                                             hasDocuments,
                                         }: DraggableJobCardProps) {

    const {ref} = useDraggable({
        id: String(job.jobId),
    })
    const footer = view === "comfortable"
        ? getPipelineCardFooter(status, hasDocuments)
        : null;


    return (
        <div
            ref={ref}
            className={`flex w-full select-none flex-col items-start justify-center rounded-xl border border-[#dedbd3] bg-white hover:cursor-grab hover:border-[#a9bddc] hover:shadow-[0_5px_18px_-12px_rgba(13,56,128,0.55)] ${
                view === "compact" ? "h-fit gap-y-1.5 p-3" : "h-fit gap-y-2 p-5"
            }`}>
            <div className={"flex items-center w-full justify-between"}>

                <Image
                    height={view === "compact" ? 32 : 48}
                    width={view === "compact" ? 32 : 48}
                    className="shrink-0 object-contain"
                    src={job.companyLogo ?? companyImageFallBack}
                    alt={job.companyName}
                />


                <div
                    className={`${view === "compact" ? "gap-x-1" : "gap-x-3"} normal-case flex items-center justify-center self-baseline`}>
                    <time
                        dateTime={new Date(job.dateSynced).toISOString()}
                        suppressHydrationWarning
                        title={new Date(job.dateSynced).toLocaleString("en-AU")}
                        className={`flex items-center justify-center gap-x-1 text-[#858990] ${view === "compact" ? "text-[10px]" : ""}`}
                    >
                        <Clock height={12} width={12}/>
                        {formatRelativeTime(job.dateSynced)}
                    </time>

                    <button
                        type="button"
                        aria-label={`View details for ${job.jobTitle} at ${job.companyName}`}
                        title="View job details"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={() => onSelectedJob(job)}
                        className="inline-flex size-9 items-center justify-center rounded-md text-[#777c84] hover:bg-[#f2f1ed] hover:text-[#0D3880]"
                    >
                        <ArrowsPointingOutIcon height={16} width={16}/>
                    </button>
                </div>
            </div>

            <p className={`normal-case mt-2 w-full overflow-hidden font-semibold text-[#0D3880] ${
                view === "compact" ? "line-clamp-2 text-xs leading-4" : "text-md"
            }`}>{job.jobTitle}</p>
            <p className={`normal-case w-full truncate font-medium text-[#444a53] ${view === "compact" ? "text-[10px]" : "text-sm"}`}>{job.companyName}</p>
            {view === "comfortable" && <div
                className={`flex w-full min-w-0 items-start justify-start gap-x-2 overflow-hidden text-xs`}>
                <div
                    className="truncate rounded-md bg-[#eef1f4] px-2 py-1 font-medium normal-case text-[#646a73]">
                    {job.jobType}
                </div>
                <div
                    className="truncate rounded-md bg-[#eef1f4] px-2 py-1 font-medium normal-case text-[#646a73]">
                    {job.location}
                </div>
            </div>}
            {footer ? <div className="mt-4 w-full border-b border-b-black/5"/> : null}

            {footer === "saved-actions" ? (
                <div className="mt-4 flex w-full items-center justify-between normal-case">
                    <div className="flex items-center justify-center">
                        <a
                            target="_blank"
                            rel="noopener noreferrer"
                            onPointerDown={(event) => event.stopPropagation()}
                            href={`https://www.seek.com.au/job/${job.jobId}/apply`}
                            className="-ml-2 inline-flex items-center gap-x-1 rounded-md px-2 py-2 text-[#59606a] hover:bg-[#f5f4f0] hover:text-[#0D3880]"
                        >
                            <Link2 size={16}/>
                            Apply on SEEK
                        </a>
                    </div>

                    <button
                        type="button"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={() => onTailorResumeAction(job)}
                        className="flex items-center justify-center gap-x-2 rounded-lg bg-[#0D3880] px-2.5 py-2 text-white hover:bg-[#08285f]">
                        <Sparkles fill={"white"} width={12} height={12}/>
                        <span>Tailor Resume</span>

                    </button>

                </div>
            ) : null}
            {footer === "view-documents" ? (
                <Link
                    href="/dashboard/library"
                    onPointerDown={(event) => event.stopPropagation()}
                    className="-ml-2 mt-2 inline-flex items-center gap-x-1.5 rounded-md px-2 py-2 normal-case text-[#0D3880] hover:bg-[#f5f4f0] hover:text-[#08285f]"
                >
                    <Files size={16}/>
                    View documents
                </Link>
            ) : null}

        </div>
    )

}
