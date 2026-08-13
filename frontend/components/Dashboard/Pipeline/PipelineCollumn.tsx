import {Job} from "@/lib/types/types";
import DraggableJobCard from "./DraggableJobCard";
import {UniqueIdentifier} from "@dnd-kit/abstract";
import {useDroppable} from "@dnd-kit/react";
import JobStatusBadge from "../../JobStatusBadge";

type PipelineColumnProps = {
    jobs: Job[],
    status: "Saved" | "Applied" | "Interviewing" | "Offer" | "Rejected" | "Accepted",
    isActiveDropTarget?: boolean;
    activeId?: UniqueIdentifier | null;
    onTailorResumeAction: (job: Job) => void;
    onSelectedJob: (job: Job) => void;
    view: "comfortable" | "compact";
    documentJobIds: ReadonlySet<string>;
}


export default function PipelineColumn({jobs, status, onTailorResumeAction, onSelectedJob, view, documentJobIds}: PipelineColumnProps) {
    const {ref, isDropTarget} = useDroppable({
        id: status,
    })



    return (
        <div
            className={`font-inter flex w-full min-w-0 flex-col text-sm font-semibold text-[#686d75] ${
                view === "compact" ? "gap-y-2.5" : "gap-y-5"
            }`}>
            <div className="flex min-w-0 items-center justify-start">
                <JobStatusBadge status={status} count={jobs.length}/>
            </div>
            <div
                ref={ref}
                className={`rounded-xl border border-dashed transition-colors ${view === "compact" ? "min-h-60 p-1.5" : "min-h-75 p-2.5"} ${
                    isDropTarget ? "border-[#8fb0df] bg-[#eaf1fb] ring-2 ring-[#b8cdec]" : "border-[#d9d6cf] bg-white/35"
                }`}

            >
                <div className={`flex flex-col items-center justify-center ${view === "compact" ? "gap-y-3" : "gap-y-5"}`}>

                    {jobs.map(job => (
                        <DraggableJobCard
                            onTailorResumeAction={onTailorResumeAction}
                            key={job.jobId}
                            job={job}
                            status={status}
                            view={view}
                            onSelectedJob={onSelectedJob}
                            hasDocuments={documentJobIds.has(String(job.jobId))}
                        />

                    ))}
                </div>

            </div>

        </div>


    )

}
