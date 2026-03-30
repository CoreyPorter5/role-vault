import {Job} from "@/lib/types/types";

type PipelineComponentType = {
    jobs: Job[]
}

export default function PipelineComponent({jobs}: PipelineComponentType){
    return(
        <div>
            {jobs.map(job => (
                <div key={job.jobId}>{job.jobTitle}</div>
            ))}
        </div>
    )
}