import {Job} from "@/lib/types/types";
import PipelineColumn from "./PipelineCollumn";
import {DragDropProvider, useDroppable} from "@dnd-kit/react";
import {useMemo, useState} from "react";
import {UniqueIdentifier} from "@dnd-kit/abstract";


type PipelineComponentType = {
    jobs: Job[];
}

export default function PipelineComponent({jobs}: PipelineComponentType) {

    const [boardJobs, setBoardJobs] = useState<Job[]>(jobs)
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)

    const jobsByStatus = useMemo(() => {
        return {
            Saved : boardJobs.filter(job => job.jobStatus === "Saved"),
            Applied : boardJobs.filter(job => job.jobStatus === "Applied"),
            Interviewing : boardJobs.filter(job => job.jobStatus === "Interviewing"),
            Accepted : boardJobs.filter(job => job.jobStatus === "Accepted"),
            Rejected : boardJobs.filter(job => job.jobStatus === "Rejected")
        }

    }, [boardJobs])




    const COLUMN_W = 380;




    return (
        <DragDropProvider
            onDragEnd={(event) => {
                setActiveId(null)
            }



        >
            <main className={"min-w-0 flex-1 mb-2 min-h-0 pr-0 flex flex-col"}>
                <p className={"text-xl font-bold mt-20 shrink-0"}>Active Pipeline</p>

                <div className={"mt-6 flex-1 min-h-0 w-full overflow-scroll"}>
                    <div
                        className={"grid w-max grid-flow-col gap-x-8 items-start"}
                        style={{gridAutoColumns: `${COLUMN_W}px`}}
                    >

                        {targets.map(id => (
                            <PipelineColumn jobs={} status={} cardCount={}>
                                {ta}
                            </PipelineColumn>
                        ))}

                    </div>
                </div>

            </main>

        </DragDropProvider>


    )
}
