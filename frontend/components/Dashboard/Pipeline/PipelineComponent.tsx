import {Job} from "@/lib/types/types";
import Image from "next/image";
import Link from "next/link";

type PipelineComponentType = {
    jobs: Job[]
}

export default function PipelineComponent({jobs}: PipelineComponentType){
    const savedUserJobs = jobs.filter(job => job.jobStatus === "Saved")

    return(
        <main>
            <p className={"text-xl font-bold mt-20"}>Active Pipeline</p>
            <div className={"grid grid-cols-3 items-start self-start mt-6 justify-start"}>
                <div className={"font-inter flex flex-col gap-y-5 w-full uppercase font-semibold text-sm text-black/50"}>
                    <div className={"flex items-center gap-x-2 w-full justify-start"}>
                        <p>Saved</p>
                        <p>{savedUserJobs.length}</p>
                    </div>
                    <div className={"flex items-center justify-center flex-col gap-y-5"}>
                        {savedUserJobs.map(job => (
                            <div key={job.jobId} className={"bg-white rounded-lg p-5 gap-y-1 flex flex-col items-start justify-center"}>
                                <Image width={50} height={50} src={job.companyLogo ?? null} alt={job.companyName}/>
                                <p className={"normal-case mt-2 text-blue-800 font-bold text-md"}>{job.jobTitle}</p>
                                <p className={"normal-case text-black/80 font-semibold text-xs"}>{job.companyName}</p>
                                <div className={"flex items-start text-xs justify-center gap-x-2"}>
                                    <div className={"rounded-full normal-case px-2 py-0.5 bg-blue-200 "}>
                                        {job.jobType}
                                    </div>
                                    <div className={"rounded-full normal-case px-2 py-0.5 bg-blue-200 "}>
                                        {job.location}
                                    </div>
                                </div>
                                <div className={"w-full border-b mt-4 border-b-black/5"}/>
                                <div className={"flex normal-case items-center mt-4 justify-between w-full"}>
                                    <a target={"_blank"} rel={"noopener"} href={`https://seek.com.au/job/${job.jobId}/apply`}>Apply Now</a>
                                    <div>Tailor Resume</div>

                                </div>

                            </div>
                        ))}
                    </div>



                </div>

            </div>

        </main>
    )
}