import {Job} from "@/lib/types/types";
import PipelineColumn from "./PipelineCollumn";

type PipelineComponentType = {
    jobs: Job[]
}

export default function PipelineComponent({jobs}: PipelineComponentType) {
    const savedUserJobs = jobs.filter(job => job.jobStatus === "Saved")
    const appliedUserJobs = jobs.filter(job => job.jobStatus === "Applied")
    const interviewingUserJobs = jobs.filter(job => job.jobStatus === "Interviewing")
    const acceptedUserJobs = jobs.filter(job => job.jobStatus === "Accepted")
    const rejectedUserJobs = jobs.filter(job => job.jobStatus === "Rejected")

    return (
        <main>
            <p className={"text-xl font-bold mt-20"}>Active Pipeline</p>

            <div className={"grid grid-cols-5 gap-x-8 items-start self-start mt-6 justify-start"}>
                <div
                    className={"font-inter flex flex-col gap-y-5 w-full uppercase font-semibold text-sm text-black/50"}>
                    <div className={"flex items-center gap-x-2 w-full justify-start"}>
                        <p>Saved</p>
                        <p>{savedUserJobs.length}</p>
                    </div>
                    <PipelineColumn jobs={savedUserJobs} status={"Saved"}/>


                </div>
                <div
                    className={"font-inter flex flex-col gap-y-5 w-full uppercase font-semibold text-sm text-black/50"}>
                    <div className={"flex items-center gap-x-2 w-full justify-start"}>
                        <p>Applied</p>
                        <p>{appliedUserJobs.length}</p>
                    </div>
                    <PipelineColumn jobs={appliedUserJobs} status={"Applied"}/>

                </div>

                <div
                    className={"font-inter flex flex-col gap-y-5 w-full uppercase font-semibold text-sm text-black/50"}>
                    <div className={"flex items-center gap-x-2 w-full justify-start"}>
                        <p>Interviewing</p>
                        <p>{interviewingUserJobs.length}</p>
                    </div>
                    <PipelineColumn jobs={interviewingUserJobs} status={"Interviewing"}/>
                </div>

                <div
                    className={"font-inter flex flex-col gap-y-5 w-full uppercase font-semibold text-sm text-black/50"}>
                    <div className={"flex items-center gap-x-2 w-full justify-start"}>
                        <p>Accepted</p>
                        <p>{acceptedUserJobs.length}</p>
                    </div>
                    <PipelineColumn jobs={acceptedUserJobs} status={"Accepted"}/>
                </div>

                <div
                    className={"font-inter flex flex-col gap-y-5 w-full uppercase font-semibold text-sm text-black/50"}>
                    <div className={"flex items-center gap-x-2 w-full justify-start"}>
                        <p>Rejected</p>
                        <p>{rejectedUserJobs.length}</p>
                    </div>
                    <PipelineColumn jobs={rejectedUserJobs} status={"Rejected"}/>
                </div>

            </div>

        </main>
    )
}