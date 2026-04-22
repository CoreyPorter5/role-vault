import {Job} from "@/lib/types/types";
import Image from "next/image";
import {Clock, FileCheck, Link2, Sparkles} from "lucide-react";
import {useDraggable} from "@dnd-kit/react";
import companyImageFallBack from "../../../public/globe.svg";

type DraggableJobCardProps = {
    job: Job;
    status: "Saved" | "Applied" | "Interviewing" | "Offer" | "Rejected" | "Accepted";
    onTailorResumeAction: (job: Job) => void
}


export default function DraggableJobCard({job, status, onTailorResumeAction}: DraggableJobCardProps) {

    const {ref} = useDraggable({
        id: String(job.jobId),
    })


    return (
        <div
            ref={ref}
            className={"bg-white h-56 w-full hover:cursor-grab shadow-md rounded-lg select-none p-5 gap-y-1 flex flex-col items-start justify-center"}>
            <div className={"flex items-center w-full justify-between"}>

                <Image height={48} width={48} src={job.companyLogo ?? companyImageFallBack} alt={job.companyName}/>


                <div
                    className={"normal-case flex items-center gap-x-1 justify-center"}>
                    <Clock height={12} width={12}/>
                    {Math.floor((new Date().getTime() - new Date(job.dateSynced).getTime()) / (1000 * 60 * 60))}h
                    ago
                </div>
            </div>

            <p className={"normal-case mt-2 text-blue-800 font-bold text-md"}>{job.jobTitle}</p>
            <p className={"normal-case text-black/80 font-semibold text-sm"}>{job.companyName}</p>
            <div className={"flex items-start text-xs justify-center gap-x-2"}>
                <div className={"rounded-full normal-case px-2 py-1 bg-blue-200 "}>
                    {job.jobType}
                </div>
                <div className={"rounded-full normal-case px-2 py-1 bg-blue-200 "}>
                    {job.location}
                </div>
            </div>
            <div className={"w-full border-b mt-4 border-b-black/5"}/>


            {
                status === "Saved" &&


                <div className={"flex normal-case items-center mt-4 justify-between w-full"}>
                    <div className={"flex items-center gap-x-1 justify-center"}>
                        <Link2 size={16}/>
                        <a target={"_blank"} rel={"noopener"}
                           href={`https://seek.com.au/job/${job.jobId}/apply`}>Apply Now</a>
                    </div>

                    <div
                        className={"hover:cursor-pointer gap-x-2 rounded-md px-2 py-2 bg-blue-700 text-white flex items-center justify-center"}>
                        <Sparkles fill={"white"} width={12} height={12}/>
                        <p onClick={() => onTailorResumeAction(job)}>Tailor Resume</p>

                    </div>

                </div>

            }
            {
                status === "Applied" &&

                <div className={"flex normal-case items-center mt-4 justify-between w-full"}>
                    <div className={"flex items-center gap-x-1 justify-center"}>
                        <FileCheck size={16}/>
                        <p>Resume Synced</p>
                    </div>


                </div>


            }
            {
                status === "Interviewing" &&

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