"use client"

import {Job} from "@/lib/types/types";
import PipelineColumn from "./PipelineCollumn";
import {DragDropProvider} from "@dnd-kit/react";
import {useEffect, useMemo, useState} from "react";
import {UniqueIdentifier} from "@dnd-kit/abstract";
import {useJWKTokenAndUserAndSidebar} from "../Context/DashboardContextProvider";


type PipelineComponentType = {
    jobs: Job[];
    onTailorResumeAction: (job: Job) => void;
}

type JobStatus =
    | "Saved"
    | "Applied"
    | "Interviewing"
    | "Offer"
    | "Rejected"
    | "Accepted";

const STATUSES: JobStatus[] = [
    "Saved",
    "Applied",
    "Interviewing",
    "Offer",
    "Accepted",
    "Rejected",
];


export default function PipelineComponent({jobs, onTailorResumeAction}: PipelineComponentType) {

    const {token} = useJWKTokenAndUserAndSidebar();


    const handleStatusChange = async (jobId: string, newStatus: JobStatus) => {
        if(!jobId || !newStatus){
            console.error("Cannot access jobId or new status")
            return;
        }


        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/jobs/${jobId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                jobStatus: newStatus
            })
        })

        const text = await response.text()

        if(!response.ok){
            console.error("Status: ", response.status, " ", text)
            return
        }
        return;




    }

    const [boardJobs, setBoardJobs] = useState<Job[]>(jobs)
    useEffect(() => {
        setBoardJobs(jobs);
    }, [jobs]);

    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)


    const jobsByStatus: Record<JobStatus, Job[]> = useMemo(() => {

        return {
            Saved: boardJobs.filter(job => job.jobStatus === "Saved"),
            Applied: boardJobs.filter(job => job.jobStatus === "Applied"),
            Interviewing: boardJobs.filter(job => job.jobStatus === "Interviewing"),
            Offer: boardJobs.filter(job => job.jobStatus === "Offer"),
            Accepted: boardJobs.filter(job => job.jobStatus === "Accepted"),
            Rejected: boardJobs.filter(job => job.jobStatus === "Rejected")
        }

    }, [boardJobs])


    const COLUMN_W = 380;


    return (
        <DragDropProvider

            onDragStart={(event) => {
                setActiveId(event.operation.source?.id ?? null)
            }}

            onDragEnd={(event) => {
                setActiveId(null)
                if (event.canceled) return;

                const draggedJobId = String(event.operation.source?.id ?? "")
                const targetStatus = event.operation.target?.id as JobStatus | undefined
                if (!draggedJobId || !targetStatus) return;

                setBoardJobs((prevState) => prevState.map(job => String(job.jobId) === draggedJobId ? {
                    ...job,
                    jobStatus: targetStatus
                } : job))

                handleStatusChange(draggedJobId, targetStatus)

            }}


        >
            <main className={"min-w-0 flex-1 mb-2 min-h-0 pr-0 flex flex-col"}>
                <p className={"text-xl font-bold mt-4 shrink-0"}>Active Pipeline</p>

                <div className={"mt-6 flex-1 min-h-0 w-full overflow-scroll"}>
                    <div
                        className={"grid w-max grid-flow-col gap-x-8 items-start"}
                        style={{gridAutoColumns: `${COLUMN_W}px`}}
                    >
                        {
                            STATUSES.map((status) => (
                                <PipelineColumn onTailorResumeAction={onTailorResumeAction} key={status} jobs={jobsByStatus[status]} status={status} activeId={activeId} isActiveDropTarget={false}/>
                            ))
                        }


                    </div>
                </div>

            </main>

        </DragDropProvider>


    )
}
