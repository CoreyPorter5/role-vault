import {Job} from "@/lib/types/types";
import Image from "next/image";
import {Clock, FileCheck, Link2, Sparkles} from "lucide-react";
import {useDraggable} from "@dnd-kit/react";
import companyImageFallBack from "../../../public/globe.svg";
import {ArrowsPointingOutIcon} from "@heroicons/react/24/solid";
import {formatRelativeTime} from "@/lib/date/relative-time";

type DraggableJobCardProps = {
    job: Job;
    status: "Saved" | "Applied" | "Interviewing" | "Offer" | "Rejected" | "Accepted";
    onTailorResumeAction: (job: Job) => void
    onSelectedJob: (job: Job) => void;
    view: "comfortable" | "compact";
}


export default function DraggableJobCard({
                                             job,
                                             status,
                                             onTailorResumeAction,
                                             onSelectedJob,
                                             view
                                         }: DraggableJobCardProps) {

    const {ref} = useDraggable({
        id: String(job.jobId),
    })


    return (
        <div
            ref={ref}
            className={`flex w-full select-none flex-col items-start justify-center rounded-lg bg-white hover:cursor-grab ${
                view === "compact" ? "h-fit gap-y-1.5 p-3 shadow-sm" : "h-fit gap-y-2 p-5 shadow-md"
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
                        className={`flex items-center justify-center gap-x-1 ${view === "compact" ? "text-[10px]" : ""}`}
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
                        className="rounded-md p-1 hover:cursor-pointer text-slate-500 transition hover:bg-slate-100 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                        <ArrowsPointingOutIcon height={16} width={16}/>
                    </button>
                </div>
            </div>

            <p className={`normal-case mt-2 w-full overflow-hidden text-blue-800 font-bold ${
                view === "compact" ? "line-clamp-2 text-xs leading-4" : "text-md"
            }`}>{job.jobTitle}</p>
            <p className={`normal-case w-full truncate text-black/80 font-semibold ${view === "compact" ? "text-[10px]" : "text-sm"}`}>{job.companyName}</p>
            {view === "comfortable" && <div
                className={`flex w-full min-w-0 items-start justify-start gap-x-2 overflow-hidden text-xs`}>
                <div
                    className={`truncate rounded-full bg-blue-200 normal-case px-2 py-1`}>
                    {job.jobType}
                </div>
                <div
                    className={`truncate rounded-full bg-blue-200 normal-case px-2 py-1`}>
                    {job.location}
                </div>
            </div>}
            {view === "comfortable" ? <div className="mt-4 w-full border-b border-b-black/5"/> : null}


            {
                view === "comfortable" && status === "Saved" &&


                <div className={"flex normal-case items-center mt-4 justify-between w-full"}>
                    <div className={"flex items-center gap-x-1 justify-center"}>
                        <Link2 size={16}/>
                        <a
                            target="_blank"
                            rel="noopener noreferrer"
                            onPointerDown={(event) => event.stopPropagation()}
                            href={`https://www.seek.com.au/job/${job.jobId}/apply`}
                        >Apply Now</a>
                    </div>

                    <button
                        type="button"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={() => onTailorResumeAction(job)}
                        className={"hover:cursor-pointer gap-x-2 rounded-md px-2 py-2 bg-blue-700 text-white flex items-center justify-center"}>
                        <Sparkles fill={"white"} width={12} height={12}/>
                        <span>Tailor Resume</span>

                    </button>

                </div>

            }
            {
                view === "comfortable" && status === "Applied" &&

                <div className={"flex normal-case items-center mt-4 justify-between w-full"}>
                    <div className={"flex items-center gap-x-1 justify-center"}>
                        <FileCheck size={16}/>
                        <p>Resume Synced</p>
                    </div>


                </div>


            }
            {
                view === "comfortable" && status === "Interviewing" &&

                <div className={"flex normal-case items-center mt-4 justify-between w-full"}>
                    <div className={"flex items-center gap-x-1 justify-center"}>
                        <FileCheck size={16}/>
                        <p>Resume Synced</p>
                    </div>


                </div>


            }

        </div>
    )

}
