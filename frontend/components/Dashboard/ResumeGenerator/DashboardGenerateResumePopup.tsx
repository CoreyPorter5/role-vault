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
                setGenerationError("Error exporting resume");
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
            return
        }
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