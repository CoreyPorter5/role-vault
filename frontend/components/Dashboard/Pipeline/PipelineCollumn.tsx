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
}


export default function PipelineColumn({jobs, status, onTailorResumeAction, onSelectedJob, view}: PipelineColumnProps) {
    const {ref, isDropTarget} = useDroppable({
        id: status,
    })



    return (
        <div
            className={`font-inter flex w-full min-w-0 flex-col font-semibold text-sm text-black/50 ${
                view === "compact" ? "gap-y-2.5" : "gap-y-5"
            }`}>
            <div className="flex min-w-0 items-center justify-start">
                <JobStatusBadge status={status} count={jobs.length}/>
            </div>
            <div
                ref={ref}
                className={`rounded-xl transition-colors ${view === "compact" ? "min-h-60 p-1" : "min-h-75 p-2"} ${
                    isDropTarget ? "bg-blue-50 ring-2 ring-blue-300" : "bg-transparent"
                }`}

            >
                <div className={`flex flex-col items-center justify-center ${view === "compact" ? "gap-y-3" : "gap-y-5"}`}>

                    {jobs.map(job => (
                        <DraggableJobCard onTailorResumeAction={onTailorResumeAction} key={job.jobId} job={job} status={status} view={view} onSelectedJob={onSelectedJob}/>

                    ))}
                </div>

            </div>

        </div>


    )

}
