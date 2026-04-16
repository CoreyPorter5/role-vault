"use client"

import {Job} from "@/lib/types/types";
import DraggableJobCard from "./DraggableJobCard";

type PipelineColumnProps = {
    jobs: Job[],
    status: "Saved" | "Applied" | "Interviewing" | "Offer" | "Rejected" | "Accepted",
    cardCount: number
}


export default function PipelineColumn({jobs, status, cardCount}: PipelineColumnProps) {


    return (
        <div
            className={"font-inter flex flex-col gap-y-5 w-full uppercase font-semibold text-sm text-black/50"}>
            <div className={"flex items-center gap-x-2 w-full justify-start"}>
                <p>Saved</p>
                <p>{cardCount}</p>
            </div>
            <div className={"flex items-center justify-center flex-col gap-y-5"}>

                {jobs.map(job => (
                    <DraggableJobCard key={job.jobId} job={job} status={status}/>

                ))}
            </div>
        </div>


    )

}