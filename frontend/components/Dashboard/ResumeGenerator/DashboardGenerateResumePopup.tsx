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
    const [generatedResumeFile, setGeneratedResumeFile] = useState<File | null>(null)
    const [successfullySaved, setSuccessfullySaved] = useState<boolean>(false);
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

    const handleSaveToLibrary = async () => {
        if(!token || !generatedResume){
            console.error("Error saving generated resume")
            return
        }

        const file = generatedResumeFile ?? await exportResumeAsFile();

        if(!file){
            console.error("Could not create downloadable DOCX file")
            return
        }

        const formData = new FormData();
        formData.append("resume", file);
        formData.append("resumeJson", JSON.stringify(generatedResume))

        try {

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/generated-resumes/${job.jobId}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData,
            })

            if(!response.ok){
                const error = await response.text()
                console.error("Error exporting docx resume: ", error)
                return null
            }
            //successfully saved popup
            setSuccessfullySaved(true)
        }catch (error){
            console.error("Error saving generated resume", error);
            return
        }
    }

    const exportResumeAsFile = async (): Promise<File | null> => {
        if(!generatedResume){
            return null;
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
                return null
            }

            const blob = await response.blob();
            const date = new Date().toISOString().slice(0, 10)
            const safeCompany = job.companyName.replace(/[^\w.-]+/g, "_");
            const safeTitle = job.jobTitle.replace(/[^\w.-]+/g, "_");

            const filename = `${safeCompany}_${safeTitle}_${date}.docx`

            const file = new File([blob], filename, {
                type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            })

            setGeneratedResumeFile(file)
            return file;



        } catch (error) {
            console.error(error)
            setGenerationError("Error exporting resume. Please try again")
            return null;
        }


    }

    const downloadDocx = async () => {
        const file = generatedResumeFile ?? await exportResumeAsFile();
        if(!file){
            return
        }

        const url = window.URL.createObjectURL(file);

        const a = document.createElement("a")
        a.href = url;
        a.download = file.name;

        document.body.appendChild(a)
        a.click();
        a.remove();

        window.URL.revokeObjectURL(url)


    }

    return (
        <div className={"fixed inset-0 z-50 flex items-center justify-center"}>
            <button disabled={isLoading} onClick={() => setOpen(false)}
                    className="absolute inset-0 bg-black/20 backdrop-blur-sm"/>
            <div className={"w-full max-w-md z-10 rounded-md px-4 py-5 bg-[#ededed]"}>
                {(isLoading || !object) &&
                    <div className={"flex flex-col gap-y-5"}>
                        <div className={"flex items-center justify-between"}>
                            <h2 className={"text-lg font-bold"}>Generate Tailored Resume</h2>
                            <button disabled={isLoading} className={"hover:cursor-pointer"}
                                    onClick={() => setOpen(false)}>
                                <XIcon className={"opacity-50"}/>
                            </button>


                        </div>
                        <div className={"text-black/70 text-sm font-semibold"}>
                            Our AI will analyse the job description and optimise your source resume, ensuring your
                            skills and experiences are perfectly aligned for this specific role
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
                            <p className={"text-xs font-bold text-black"}><a
                                className={"text-black/60"}>Targeting: </a>{job.jobTitle}</p>
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
                            <div className={"text-red-400"}>Something went wrong generating the resume. Please try
                                again.</div>
                        }


                    </div>}
                {
                    !isLoading && object && generatedResume && !generationError &&
                    <div className={"flex items-center justify-center flex-col gap-y-4"}>
                        <h2 className={"text-xl font-bold"}>Resume Tailored Successfully!</h2>
                        {successfullySaved && <div className={"text-center text-green-500"}>
                            Saved!
                        </div>}
                        <p className={"text-sm text-center text-black/60 font-semibold max-w-2/3"}>Your new document has
                            been optimised for this role and is ready to use</p>
                        <button
                            className={"rounded-md bg-blue-700 mt-5 px-3 py-4 text-sm w-full font-semibold text-white"}
                            onClick={downloadDocx}>
                            Download DOCX
                        </button>
                        <button onClick={handleSaveToLibrary} className={"rounded-md bg-gray-300 px-3 py-4 text-sm w-full font-semibold text-black"}>
                            Save to Library
                        </button>
                        <button disabled={isLoading} className={"text-sm font-semibold hover:cursor-pointer"}
                                onClick={() => setOpen(false)}>
                            Cancel
                        </button>

                    </div>
                }

            </div>

        </div>
    )
}