import {Job} from "@/lib/types/types";
import DraggableJobCard from "./DraggableJobCard";
import {UniqueIdentifier} from "@dnd-kit/abstract";
import {useDroppable} from "@dnd-kit/react";

type PipelineColumnProps = {
    jobs: Job[],
    status: "Saved" | "Applied" | "Interviewing" | "Offer" | "Rejected" | "Accepted",
    isActiveDropTarget?: boolean;
    activeId?: UniqueIdentifier | null;
    onTailorResumeAction: (job: Job) => void
}


export default function PipelineColumn({jobs, status, onTailorResumeAction}: PipelineColumnProps) {
    const {ref, isDropTarget} = useDroppable({
        id: status,
    })



    return (
        <div
            className={"font-inter flex flex-col gap-y-5 w-full uppercase font-semibold text-sm text-black/50"}>
            <div className={"flex items-center gap-x-2 w-full justify-start"}>
                <p>{status}</p>
                <p>{jobs.length}</p>
            </div>
            <div
                ref={ref}
                className={`min-h-75 rounded-xl p-2 transition-colors ${
                    isDropTarget ? "bg-blue-50 ring-2 ring-blue-300" : "bg-transparent"
                }`}

            >
                <div className={"flex items-center justify-center flex-col gap-y-5"}>

                    {jobs.map(job => (
                        <DraggableJobCard onTailorResumeAction={onTailorResumeAction} key={job.jobId} job={job} status={status}/>

                    ))}
                </div>

            </div>

        </div>


    )

}