import {Job} from "@/lib/types/types";
import {Dispatch, SetStateAction, useState} from "react";
import {XIcon, LoaderCircle} from "lucide-react";
import {useJWKTokenAndUserAndSidebar} from "../Context/DashboardContextProvider";
import {experimental_useObject as useObject} from "@ai-sdk/react";
import {TailoredResume, tailoredResumeSchema} from "@/app/api/generate-resume/schema";


type DashboardGenerateResumePopupProps = {
    job: Job;
    setOpen: Dispatch<SetStateAction<boolean>>;

}


export default function DashboardGenerateResumePopup({job, setOpen}: DashboardGenerateResumePopupProps) {
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [generatedResume, setGeneratedResume] = useState<TailoredResume | null>(null)
    const {token} = useJWKTokenAndUserAndSidebar();

    const {object, submit, isLoading, error, stop} = useObject({
        api: "/api/generate-resume",
        schema: tailoredResumeSchema,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        onFinish({object, error}) {
            if (error || !object) {
                console.error("Schema validation error:", error)
                setGenerationError("Generation failed")
                return
            }
            setGenerationError(null)
            setGeneratedResume(object)
            console.log(object);
            return
        },
        onError(error) {
            setGenerationError(error.message)
            return
        }
    })


    const handleGenerate = () => {
        setGenerationError(null)

        if (!token) {
            return
        }
        submit({
            jobID: job.jobId
        })
    }

    const downloadDocx = async () => {
        if (!generatedResume) {
            return;
        }

        try {
            const response = await fetch("/api/export-resume-docx", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    resume: generatedResume,
                })
            })
            if (!response.ok) {
                const error = await response.text()
                console.error("Error exporting docx resume: ", error)
                setGenerationError("Error exporting resume. Please try again");
                return
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement("a")
            a.href = url;
            a.download = "tailored_resume.docx";
            document.body.appendChild(a)
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url)

        } catch (error) {
            console.error(error)
            setGenerationError("Error exporting resume. Please try again")
            return
        }
    }

    return (
        <div className={"fixed inset-0 z-50 flex items-center justify-center"}>
            <button disabled={isLoading} onClick={() => setOpen(false)}
                    className="absolute inset-0 bg-black/20 backdrop-blur-sm"/>
            <div className={"w-full max-w-md z-10 flex flex-col gap-y-5 rounded-md px-4 py-5 bg-[#ededed]"}>
                <div className={"flex items-center justify-between"}>
                    <h2 className={"text-lg font-bold"}>Generate Tailored Resume</h2>
                    <button disabled={isLoading} className={"hover:cursor-pointer"}
                            onClick={() => setOpen(false)}>
                        <XIcon className={"opacity-50"}/>
                    </button>


                </div>
                <div className={"text-black/70 text-sm font-semibold"}>
                    Our AI will analyse the job description and optimise your source resume, ensuring your skills and experiences are perfectly aligned for this specific role
                </div>

                <div className={"bg-gray-300 rounded-md w-full gap-y-4 flex flex-col px-4 py-2 items-center"}>
                    <div className={"flex items-center w-full justify-between"}>
                        <p>Source Material</p>
                        <p>Current Primary</p>
                    </div>
                    <div className={"bg-[#ededed] rounded-md w-full"}>
                        Resume
                    </div>
                </div>

                <div>
                    <p className={"text-xs font-bold text-black"}><a className={"text-black/60"}>Targeting: </a>{job.jobTitle}</p>
                </div>




                <div className={"flex items-center mt-5 justify-end gap-x-3"}>
                    <button disabled={isLoading} className={"text-sm font-semibold hover:cursor-pointer"}
                            onClick={() => setOpen(false)}>
                        Cancel
                    </button>
                    {
                        isLoading ?
                            <LoaderCircle className={"animate-spin"}>
                            </LoaderCircle>
                            :
                            <button onClick={handleGenerate}
                                    className={"py-2 px-3 rounded-md text-sm font-semibold hover:cursor-pointer bg-blue-700 text-white w-fit"}>
                                Generate Resume
                            </button>

                    }
                </div>
                {
                    generationError &&
                    <div className={"text-red-400"}>Something went wrong generating the resume. Please try again.</div>
                }
                {
                    generatedResume && object && !isLoading &&
                    <button className={"rounded-md bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white"}
                            onClick={downloadDocx}>
                        Download DOCX
                    </button>
                }
            </div>

        </div>
    )
}