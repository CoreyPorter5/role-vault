import {Job} from "@/lib/types/types";
import {Dispatch, SetStateAction, useState} from "react";
import {XIcon, LoaderCircle} from "lucide-react";
import {useJWKTokenAndUserAndSidebar} from "../Context/DashboardContextProvider";
import {experimental_useObject as useObject} from "@ai-sdk/react";
import {tailoredResumeSchema} from "@/app/api/generate-resume/schema";


type DashboardGenerateResumePopupProps = {
    job: Job;
    setOpen: Dispatch<SetStateAction<boolean>>;

}


export default function DashboardGenerateResumePopup({job, setOpen}: DashboardGenerateResumePopupProps) {
    const [generationError, setGenerationError] = useState<string | null>(null);
    const {token} = useJWKTokenAndUserAndSidebar();

    const {object, submit, isLoading, error, stop} = useObject({
        api: "/api/generate-resume",
        schema: tailoredResumeSchema,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        onFinish({object, error}) {
            if (error) {
                console.error("Schema validation error:", error)
                setGenerationError("Generation failed")
                return
            }
            setGenerationError(null)
            console.log(object);
            return
        },
        onError(error) {
            setGenerationError(error.message)
            return
        }
    })


    const handleGenerate = () => {

        if (!token) {
            return
        }
        submit({
            jobID: job.jobId
        })
    }

    return (
        <div className={"fixed inset-0 z-50 flex items-center justify-center"}>
            <button disabled={isLoading} onClick={() => setOpen(false)}
                    className="absolute inset-0 bg-black/20 backdrop-blur-sm"/>
            <div className={"w-full max-w-xl z-10 flex flex-col gap-y-5 rounded-md px-4 py-5 bg-[#ededed]"}>
                <div className={"flex items-center justify-between"}>
                    <h2 className={"text-lg font-bold"}>Generate Resume</h2>
                    <button disabled={isLoading} className={"hover:cursor-pointer"}
                            onClick={() => setOpen(false)}>
                        <XIcon className={"opacity-50"}/>
                    </button>


                </div>
                <div>
                    <p className={"uppercase text-xs font-bold text-black/60"}>Tailored for {job.jobTitle}</p>
                </div>
                {object && (
                    <div className="max-h-96 text-black overflow-y-auto rounded-md bg-white p-4">
                        <h1 className="text-2xl font-bold">{object.fullName}</h1>
                        <p className="text-sm uppercase">{object.professionalTitle}</p>

                        <h2 className="mt-4 font-bold">Professional Summary</h2>
                        <p>{object.professionalSummary}</p>

                        <h2 className="mt-4 font-bold">Skills</h2>
                        <p>{object.skills?.join(" | ")}</p>

                        <h2 className="mt-4 font-bold">Experience</h2>
                        {object.experience?.map((exp, index) => {
                            if (!exp) return null;
                            return (
                                <div key={index} className="mt-2">
                                    <p className="font-semibold">
                                        {exp.title} | {exp.company}
                                    </p>
                                    <ul className="list-disc pl-6">
                                        {exp.bullets?.map((bullet, bulletIndex) => (
                                            <li key={bulletIndex}>{bullet}</li>
                                        ))}
                                    </ul>
                                </div>
                            )
                        })}
                    </div>
                )}
                {
                    isLoading ?
                        <LoaderCircle className={"animate-spin"}>
                        </LoaderCircle>
                        :
                        <button onClick={handleGenerate}
                                className={"py-1 px-2 rounded-md hover:cursor-pointer bg-blue-700 text-white w-fit"}>
                            Generate Resume
                        </button>

                }


                <div className={"flex items-center justify-end gap-x-3"}>
                    <button disabled={isLoading} className={"text-sm font-semibold hover:cursor-pointer"}
                            onClick={() => setOpen(false)}>
                        Cancel
                    </button>
                </div>
                {
                    generationError &&
                    <div className={"text-red-400"}>Something went wrong generating the resume. Please try again.</div>
                }
            </div>

        </div>
    )
}