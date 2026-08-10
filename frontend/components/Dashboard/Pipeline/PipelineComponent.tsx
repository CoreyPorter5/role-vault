"use client"

import {Job} from "@/lib/types/types";
import PipelineColumn from "./PipelineCollumn";
import {DragDropProvider} from "@dnd-kit/react";
import {Dispatch, SetStateAction, useMemo, useState} from "react";
import {UniqueIdentifier} from "@dnd-kit/abstract";
import {useJWKTokenAndUserAndSidebar} from "../Context/DashboardContextProvider";
import SelectedJobCard from "./SelectedJobCard";
import {LayoutGrid, Rows3} from "lucide-react";


type PipelineComponentType = {
    jobs: Job[];
    setJobs: Dispatch<SetStateAction<Job[]>>;
    onTailorResumeAction: (job: Job) => void;
}

type JobStatus = Job["jobStatus"];
type PipelineView = "comfortable" | "compact";

const STATUSES: JobStatus[] = [
    "Saved",
    "Applied",
    "Interviewing",
    "Offer",
    "Accepted",
    "Rejected",
];


export default function PipelineComponent({jobs, setJobs, onTailorResumeAction}: PipelineComponentType) {

    const {token} = useJWKTokenAndUserAndSidebar();
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
    const [view, setView] = useState<PipelineView>("compact");
    const selectedJob = selectedJobId
        ? jobs.find((job) => String(job.jobId) === selectedJobId) ?? null
        : null;


    const handleStatusChange = async (jobId: string, newStatus: JobStatus) => {
        if (!jobId || !newStatus || !token) {
            console.error("Cannot access jobId or new status")
            return false;
        }


        const previousStatus = jobs.find((job) => String(job.jobId) === jobId)?.jobStatus;
        if (!previousStatus || previousStatus === newStatus) {
            return true;
        }

        setJobs((currentJobs) => currentJobs.map((job) =>
            String(job.jobId) === jobId ? {...job, jobStatus: newStatus} : job
        ));

        try {
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

            if (response.ok) {
                return true;
            }
            console.error("Failed to update job status: ", response.status, await response.text())
        } catch (error) {
            console.error("Failed to update job status", error)
        }

        setJobs((currentJobs) => currentJobs.map((job) =>
            String(job.jobId) === jobId ? {...job, jobStatus: previousStatus} : job
        ));
        return false;
    }

    const handleDeleteJob = async (jobId: string) => {
        if (!jobId || !token) {
            return false;
        }

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/jobs/${jobId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (!response.ok) {
                console.error("Failed to delete job: ", response.status, await response.text());
                return false;
            }
            setJobs((currentJobs) => currentJobs.filter((job) => String(job.jobId) !== jobId));
            setSelectedJobId(null);
            return true;
        } catch (error) {
            console.error("Failed to delete job", error);
            return false;
        }
    }


    const jobsByStatus: Record<JobStatus, Job[]> = useMemo(() => {

        return {
            Saved: jobs.filter(job => job.jobStatus === "Saved"),
            Applied: jobs.filter(job => job.jobStatus === "Applied"),
            Interviewing: jobs.filter(job => job.jobStatus === "Interviewing"),
            Offer: jobs.filter(job => job.jobStatus === "Offer"),
            Accepted: jobs.filter(job => job.jobStatus === "Accepted"),
            Rejected: jobs.filter(job => job.jobStatus === "Rejected")
        }

    }, [jobs])


    return (
        <DragDropProvider

            onDragStart={(event) => {
                setActiveId(event.operation.source?.id ?? null)
            }}

            onDragEnd={async (event) => {
                setActiveId(null);
                if (event.canceled) return;
                const draggedJobId = String(event.operation.source?.id ?? "");
                const targetStatus = event.operation.target?.id as JobStatus | undefined;
                if (!draggedJobId || !targetStatus) return;
                await handleStatusChange(draggedJobId, targetStatus);
            }}
        >
            <main className={"min-w-0 flex-1 mb-2 min-h-0 pr-0 flex flex-col"}>
                <div className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
                    <p className="text-xl font-bold ">Active Pipeline</p>
                    <div
                        role="group"
                        aria-label="Job card view"
                        className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 shadow-sm"
                    >
                        <button
                            type="button"
                            aria-pressed={view === "comfortable"}
                            onClick={() => setView("comfortable")}
                            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                                view === "comfortable"
                                    ? "bg-white text-blue-700 shadow-sm"
                                    : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            <Rows3 size={14}/>
                            Comfortable
                        </button>
                        <button
                            type="button"
                            aria-pressed={view === "compact"}
                            onClick={() => setView("compact")}
                            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                                view === "compact"
                                    ? "bg-white text-blue-700 shadow-sm"
                                    : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            <LayoutGrid size={14}/>
                            Compact
                        </button>
                    </div>
                </div>

                {jobs.length === 0 ? <div className={"mt-6 "}>
                        <p className={"text-lg text-black/60 font-medium"}>No jobs saved yet</p>
                        <p className={"text-sm text-black/40 font-medium"}>Save jobs from SEEK to start tracking your
                            applications.</p>
                        <button className={"bg-blue-700 mt-5 rounded-md px-2 py-1"}><a
                            className={"text-sm text-white font-semibold"} href={"https://au.seek.com"}>Open SEEK</a>
                        </button>

                    </div> :
                    <div
                        data-pipeline-scroll
                        data-view={view}
                        className={`mt-4 min-h-0 w-full flex-1 overflow-y-auto ${
                            view === "compact" ? "overflow-x-auto lg:overflow-x-hidden" : "overflow-x-auto"
                        }`}
                    >
                        <div
                            className={view === "compact"
                                ? "grid w-max grid-flow-col auto-cols-[176px] items-start gap-3 px-1 lg:w-full lg:grid-flow-row lg:grid-cols-6 lg:auto-cols-auto"
                                : "mx-2 grid w-max grid-flow-col auto-cols-[380px] items-start gap-x-8"
                            }
                        >
                            {
                                STATUSES.map((status) => (
                                    <PipelineColumn onTailorResumeAction={onTailorResumeAction} key={status}
                                                    jobs={jobsByStatus[status]} status={status} activeId={activeId}
                                                    isActiveDropTarget={false}
                                                    view={view}
                                                    onSelectedJob={(job) => setSelectedJobId(String(job.jobId))}/>
                                ))
                            }


                        </div>
                    </div>
                }

                {selectedJob &&
                    <SelectedJobCard
                        job={selectedJob}
                        onClose={() => setSelectedJobId(null)}
                        onDelete={handleDeleteJob}
                        onStatusChange={handleStatusChange}
                        onTailorResume={onTailorResumeAction}
                    />

                }
            </main>


        </DragDropProvider>


    )
}
