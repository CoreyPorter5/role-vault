import {Job} from "@/lib/types/types";
import {Dispatch, SetStateAction} from "react";

type SelectedJobCardProps = {
    job: Job
    onSelectedJob: Dispatch<SetStateAction<Job | null>>;
}

export default function SelectedJobCard({job, onSelectedJob}: SelectedJobCardProps){
    return (
        <div className={"fixed inset-0 z-50 flex items-center justify-center"}>
            <button
                onClick={() => onSelectedJob(null)}
                className="absolute inset-0 bg-black/20 backdrop-blur-sm"/>
            <div className={"w-full max-w-md z-10 rounded-md px-4 py-5 bg-[#ededed]"}>
                <p className={"text-2xl font-semibold"}>{job.jobTitle}</p>
                <p>{job.companyName}</p>
            </div>
        </div>
    )

}