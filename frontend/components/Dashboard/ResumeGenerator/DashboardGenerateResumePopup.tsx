import {Job} from "@/lib/types/types";
import {Dispatch, SetStateAction, useEffect, useState} from "react";
import {XIcon, LoaderCircle} from "lucide-react";
import {useJWKTokenAndUserAndSidebar} from "../Context/DashboardContextProvider";
import {experimental_useObject as useObject} from "@ai-sdk/react";
import {TailoredResume, tailoredResumeSchema} from "@/app/api/generate-resume/schema";
import {DocumentTextIcon, SparklesIcon} from "@heroicons/react/24/outline";
import {JobLibraryItem} from "../../Library/schema";
import {toast} from 'sonner'
import {ResumePayload} from "../../Resume/schema";
import {ResumeGenerationUsage} from "./types";
import {captureAppError} from "@/lib/sentry/captureAppError";


type DashboardGenerateResumePopupProps = {
    job: Job | JobLibraryItem;
    setOpen: Dispatch<SetStateAction<boolean>>;
    onResumeSaved?: Dispatch<SetStateAction<boolean>>;

}


export default function DashboardGenerateResumePopup({job, setOpen, onResumeSaved}: DashboardGenerateResumePopupProps) {
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [generatedResume, setGeneratedResume] = useState<TailoredResume | null>(null)
    const [generatedResumeFile, setGeneratedResumeFile] = useState<File | null>(null)
    const [masterResume, setMasterResume] = useState<ResumePayload | null>(null)
    const {token, user} = useJWKTokenAndUserAndSidebar();
    const [masterResumeLoading, setMasterResumeLoading] = useState<boolean>(true)
    const [resumeGenerationUsage, setResumeGenerationUsage] = useState<ResumeGenerationUsage | null>(null)
    const [shouldRefreshOnClose, setShouldRefreshOnClose] = useState<boolean>(false)
    const [draftSaveLoading, setDraftSaveLoading] = useState<boolean>(false);

    const closePopup = () => {
        setOpen(false);
        if (shouldRefreshOnClose && onResumeSaved) {
            onResumeSaved(prevState => !prevState)
        }
    }


    useEffect(() => {
        const getUserGenerationUsage = async () => {
            if (!token) {
                return
            }

            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/usage/resume-generations`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                })

                if (response.ok) {
                    const resumeUsageData: ResumeGenerationUsage = await response.json();
                    if (resumeUsageData) {
                        setResumeGenerationUsage(resumeUsageData)
                    }
                } else {
                    const error = await response.text();
                    captureAppError({
                        message: "Failed to fetch resume generation usage",
                        area: "resume_generator",
                        action: "get_user_generation_usage",
                        endpoint: "/api/v1/usage/resume-generations",
                        status: response.status,
                        statusText: response.statusText,
                        extra: {
                            jobId: job.jobId,
                            error,
                            userId: user?.id
                        }
                    })
                    console.log("Error fetching user resume generation usage: ", response.status)
                    setResumeGenerationUsage(null)
                    return
                }
            } catch (error) {
                console.error("Error fetching user resume generation usage: ", error)
                return
            }
        }

        getUserGenerationUsage()

    }, [job.jobId, token, user?.id]);


    useEffect(() => {

        const fetchResume = async () => {
            if (!token) {
                setMasterResume(null)
                setMasterResumeLoading(false)
                return
            }


            setMasterResumeLoading(true)
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/resume`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }

                })
                if (response.ok) {
                    const resumeData: ResumePayload = await response.json();
                    if (resumeData) {
                        setMasterResume(resumeData)
                    }
                } else {
                    const error = await response.text()
                    captureAppError({
                        message: "Failed to fetch user master resume",
                        area: "resume_generator",
                        action: "fetch_user_master_resume_for_generation",
                        endpoint: "/api/v1/resume",
                        status: response.status,
                        statusText: response.statusText,
                        extra: {
                            jobId: job.jobId,
                            error,
                            userId: user?.id
                        }
                    })
                    console.log("Error fetching user resume: ", response.status)
                    setMasterResume(null)
                    return
                }

            } catch (error) {
                captureAppError({
                    message: "Unexpected error fetching user master resume",
                    error,
                    area: "resume_generator",
                    action: "fetch_user_master_resume_for_generation",
                    endpoint: "/api/v1/resume",
                    extra: {
                        jobId: job.jobId,
                        userId: user?.id
                    }
                })
                console.error("Error fetching user resume: ", error)
                setMasterResume(null)
            } finally {
                setMasterResumeLoading(false)
            }


        }
        fetchResume()
    }, [job.jobId, token, user?.id]);


    const {object, submit, isLoading, error, stop} = useObject({
        api: "/api/generate-resume",
        schema: tailoredResumeSchema,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        onFinish({object, error}) {
            if (error || !object) {
                captureAppError({
                    message: "Resume generation schema validation failed",
                    error,
                    area: "resume_generator",
                    action: "schema_validation",
                    endpoint: "/api/generate-resume",
                    extra: {
                        jobId: job.jobId,
                        userId: user?.id,
                        hasObject: Boolean(object)
                    }
                })
                console.error("Schema validation error:", error)
                setGenerationError("Generation failed")
                return
            }
            setGenerationError(null)
            setGeneratedResume(object)
            handleAutoSaveToDrafts(object)

            setResumeGenerationUsage(prevState => {
                if (!prevState) return prevState;
                const used = prevState.used + 1
                const remaining = Math.max(0, prevState.limit - used)
                return {
                    ...prevState,
                    used,
                    remaining,
                    can_generate: remaining > 0
                }
            })
        },
        onError(error) {
            const message = error.message.toLowerCase()
            if (message.includes("402") || message.includes("limit")) {
                setGenerationError("You have reached your resume generation limit. Upgrade to Pro to generate more.");
                toast.error("You have reached your resume generation limit. Upgrade to Pro to generate more.");
                return;
            }

            captureAppError({
                message: "Resume generation failed",
                error,
                area: "resume_generator",
                action: "generate_resume",
                endpoint: "/api/generate-resume",
                extra: {
                    userId: user?.id,
                    jobId: job.jobId,
                },
            })

            setGenerationError("Something went wrong generating the resume. Please try again.")
            return
        }
    })

    useEffect(() => {
        if (!isLoading) {
            return
        }
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault()
        }
        window.addEventListener("beforeunload", handleBeforeUnload)
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload)
        }
    }, [isLoading]);


    const handleGenerate = () => {
        setGenerationError(null)

        if (!token) {
            toast.error("Your session has expired. Please log in again.")
            return
        }

        if (!masterResume) {
            toast.error("Upload a master resume before generating tailored resumes.")
            return

        }

        submit({
            jobID: job.jobId
        })
    }

    const handleAutoSaveToDrafts = async (resume: TailoredResume) => {
        if (!token || !resume) {
            console.error("Error saving generated resume to drafts")
            toast.error("Error saving generated resume to drafts. Try again later")
            return
        }


        const saveToDraftsPromise = async () => {
            try {
                setDraftSaveLoading(true)
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/generated-resume-drafts/jobs/${job.jobId}`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        draft_resume: resume
                    }),
                })

                if (!response.ok) {
                    const error = await response.text()
                    captureAppError({
                        message: "Auto save to drafts failed",
                        area: "resume_generator",
                        action: "auto_save_draft",
                        endpoint: `/api/v1/generated-resume-drafts/jobs/${job.jobId}`,
                        status: response.status,
                        statusText: response.statusText,
                        extra: {
                            jobId: job.jobId,
                            userId: user?.id,
                            error,
                        }
                    })
                    console.error("Error saving resume to drafts: ", error)
                    throw new Error("Error saving resume to drafts")
                }
                setShouldRefreshOnClose(true);
            } finally {
                setDraftSaveLoading(false)
            }


        }

        toast.promise(saveToDraftsPromise(), {
            success: "Resume saved to drafts",
            error: "Error saving resume to drafts.",
            loading: "Saving resume to drafts..."
        })


    }

    const handleSaveToLibrary = async () => {
        if (!token || !generatedResume) {
            console.error("Error saving generated resume")
            toast.error("Error saving generated resume. Try again later")
            return
        }


        const saveToLibraryPromise = async () => {
            const file = generatedResumeFile ?? await exportResumeAsFile(false);

            if (!file) {
                throw new Error("Could not create DOCX file");
            }

            const formData = new FormData();
            formData.append("resume", file);
            formData.append("resumeJson", JSON.stringify(generatedResume))

            const saveResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/generated-resumes/${job.jobId}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData,
            })

            if (!saveResponse.ok) {
                const error = await saveResponse.text()
                captureAppError({
                    message: "failed to save generated resume to library",
                    area: "resume_generator",
                    action: "save_to_library",
                    endpoint: `/api/v1/generated-resumes/${job.jobId}`,
                    status: saveResponse.status,
                    statusText: saveResponse.statusText,
                    extra: {
                        jobId: job.jobId,
                        userId: user?.id,
                        error,
                    }
                })
                console.error("Error saving resume to library: ", error)
                throw new Error("Error saving resume to library")
            }

            const deleteResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/generated-resume-drafts/jobs/${job.jobId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })

            if (!deleteResponse.ok && deleteResponse.status !== 404) {
                const error = await deleteResponse.text()
                captureAppError({
                    message: "Resume saved but failed to delete draft",
                    area: "resume_generator",
                    action: "delete_draft_after_save",
                    endpoint: `/api/v1/generated-resume-drafts/jobs/${job.jobId}`,
                    status: deleteResponse.status,
                    statusText: deleteResponse.statusText,
                    extra: {
                        jobId: job.jobId,
                        userId: user?.id,
                        error,
                    }
                })
                console.error("Resume saved, but failed to delete draft: ", error);
            }


            if (onResumeSaved) {
                onResumeSaved(prevState => !prevState);
            }
            setShouldRefreshOnClose(false)
            setOpen(false)

        }

        toast.promise(saveToLibraryPromise(), {
            success: "Resume saved to library",
            error: "Error saving resume to library. Try again later",
            loading: "Saving resume to library..."
        })


    }

    const exportResumeAsFile = async (showToast = true): Promise<File | null> => {
        if (!generatedResume) {
            return null;
        }

        const exportResumePromise = async () => {
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
                captureAppError({
                    message: "Failed to export generated resume as DOCX",
                    area: "resume_generator",
                    action: "export_generated_resume_docx",
                    endpoint: "/api/export-resume-docx",
                    status: response.status,
                    statusText: response.statusText,
                    extra: {
                        jobId: job.jobId,
                        error,
                        userId: user?.id
                    }
                })
                console.error("Error exporting docx resume: ", error)
                throw new Error("Error exporting docx resume")
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
        }
        const promise = exportResumePromise();

        if (showToast) {
            toast.promise(promise, {
                loading: "Exporting resume...",
                success: "Resume exported successfully",
                error: "Error exporting resume. Try again later"
            })
        }


        try {
            return await promise;
        } catch {
            return null;
        }

    }


    const downloadDocx = async () => {
        try {
            const file = generatedResumeFile ?? await exportResumeAsFile();
            if (!file) {
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
            toast.success("Resume download started")

        } catch (error) {
            captureAppError({
                message: "Unexpected error downloading resume DOCX",
                error,
                area: "resume_generator",
                action: "download_generated_resume_docx",
                endpoint: "/api/export-resume-docx",
                extra: {
                    jobId: job.jobId,
                    userId: user?.id
                }
            })

            console.error("Error downloading generated resume: ", error);
            toast.error("Error downloading resume. Try again later");

        }


    }


    return (
        <div className={"fixed inset-0 z-50 flex items-center justify-center"}>
            <button disabled={isLoading} onClick={closePopup}
                    className="absolute inset-0 bg-black/20 backdrop-blur-sm"/>
            <div className={"w-full max-w-md z-10 rounded-md px-4 py-5 bg-[#ededed]"}>
                {(isLoading || !object) &&
                    <div className={"flex flex-col gap-y-5"}>
                        <div className={"flex items-center justify-between"}>
                            <h2 className={"text-lg font-bold"}>Generate Tailored Resume</h2>
                            <button disabled={isLoading} className={"hover:cursor-pointer"}
                                    onClick={closePopup}>
                                <XIcon className={"opacity-50"}/>
                            </button>


                        </div>
                        <div className={"text-black/60 text-sm font-medium"}>
                            Our AI will analyse the job description and optimise your source resume, ensuring your
                            skills and experiences are perfectly aligned for this specific role
                        </div>

                        <div
                            className={"bg-gray-300/70 rounded-md w-full gap-y-2 flex flex-col px-4 py-2 items-center"}>
                            <div className={"flex items-center w-full justify-between"}>
                                <p className={"uppercase text-sm font-bold text-black/70"}>Source Material</p>
                                <p className={"bg-blue-200 px-2 font-semibold py-0.5 text-black/75 rounded-full text-xs"}>Current
                                    Primary</p>
                            </div>
                            <div
                                className={"bg-[#ededed] p-3 rounded-md gap-x-4 flex items-center justify-start w-full"}>
                                <div className={"bg-gray-300/70 rounded-md p-3"}>
                                    <DocumentTextIcon width={24} height={24}/>
                                </div>
                                {masterResumeLoading ? <div>
                                    <p className={"font-semibold text-black/60 truncate"}>Loading....</p>
                                </div> : masterResume ? (<div>
                                        <p className={"font-bold truncate"}>{masterResume.fileName}</p>
                                        <p className={"text-sm text-black/60 font-medium"}>Last
                                            updated: {masterResume.updatedAt.slice(0, 10)}</p>
                                    </div>) :

                                    <div>
                                        <p className="font-bold truncate">No master resume uploaded</p>
                                        <p className="text-sm text-black/60 font-medium">Upload a resume before
                                            generating.</p>
                                    </div>


                                }

                            </div>
                        </div>

                        <div>
                            <p className={"text-xs font-bold text-black"}><a
                                className={"text-black/60"}>Targeting: </a>{job.jobTitle} at {job.companyName}</p>
                        </div>

                        <div className={"w-full border-b border-b-black/5"}></div>


                        <div className={"flex items-center justify-end gap-x-5"}>
                            {!isLoading ?
                                <button disabled={isLoading} className={"text-sm font-semibold hover:cursor-pointer"}
                                        onClick={closePopup}>
                                    Cancel
                                </button>
                                :
                                <div className={"text-sm font-semibold animate-pulse hover:cursor-default"}>
                                    Generating...
                                </div>}

                            {
                                isLoading ?
                                    <LoaderCircle className={"animate-spin"}>
                                    </LoaderCircle>
                                    :
                                    (resumeGenerationUsage ?
                                            <button
                                                disabled={masterResumeLoading}
                                                onClick={() => {
                                                    if (masterResume && resumeGenerationUsage.can_generate) {
                                                        handleGenerate()
                                                    } else if (!masterResume) {
                                                        toast.error("Please upload a master resume")
                                                    } else {
                                                        toast.error("You’ve used all your resume generations for this month. Upgrade to Pro or wait until your credits reset.")
                                                    }
                                                }}
                                                className={"py-2 px-5 flex gap-x-1 items-center justify-center rounded-md text-sm font-semibold hover:cursor-pointer disabled:bg-blue-700/50 bg-blue-700 text-white w-fit"}>
                                                <SparklesIcon height={16} width={16}/>
                                                Generate resume
                                            </button> :
                                            <button
                                                disabled={true}
                                                className={"py-2 px-5 flex gap-x-1 items-center justify-center rounded-md text-sm font-semibold hover:cursor-pointer disabled:bg-blue-700/50 bg-blue-700 text-white w-fit"}>
                                                <SparklesIcon height={16} width={16}/>
                                                Loading...
                                            </button>


                                    )

                            }
                        </div>
                        {
                            generationError &&
                            <div className={"text-red-400 text-sm font-medium"}>{generationError}</div>
                        }


                    </div>}
                {
                    !isLoading && object && generatedResume && !generationError &&
                    <div className={"flex items-center justify-center flex-col gap-y-4"}>
                        <h2 className={"text-xl font-bold"}>Resume Tailored Successfully!</h2>

                        <p className={"text-sm text-center text-black/60 font-semibold max-w-2/3"}>Your new document has
                            been optimised for this role and is ready to use</p>
                        <button
                            className={"rounded-md bg-blue-700 mt-5 px-3 py-4 text-sm w-full hover:cursor-pointer font-semibold text-white"}
                            onClick={downloadDocx}>
                            Download DOCX
                        </button>
                        <button disabled={draftSaveLoading} onClick={handleSaveToLibrary}
                                className={"rounded-md bg-gray-300 px-3 py-4 hover:cursor-pointer disabled:opacity-70 text-sm w-full font-semibold text-black"}>
                            Save to Library
                        </button>
                        <button disabled={isLoading} className={"text-sm font-semibold hover:cursor-pointer"}
                                onClick={closePopup}>
                            Done
                        </button>

                    </div>
                }

            </div>

        </div>
    )
}