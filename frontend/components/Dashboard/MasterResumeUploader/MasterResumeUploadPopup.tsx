import {Dispatch, SetStateAction, useState} from "react";
import {LoaderCircle, XIcon} from "lucide-react";
import {CloudArrowUpIcon} from "@heroicons/react/24/solid";
import {useJWKTokenAndUserAndSidebar} from "../Context/DashboardContextProvider";
import {toast} from "sonner"
import {captureAppError} from "@/lib/sentry/captureAppError";

type DashboardResumePopupProps = {
    setOpen: Dispatch<SetStateAction<boolean>>
    onResumeUpdated: Dispatch<SetStateAction<boolean>>
}

type ErrorResponseType = {
    code: string,
    message: string
}


export default function MasterResumeUploadPopup({setOpen, onResumeUpdated}: DashboardResumePopupProps) {


    const [inputResume, setInputResume] = useState<File | null>(null);
    const [uploading, setUploading] = useState<boolean>(false)
    const {token, user} = useJWKTokenAndUserAndSidebar();


    const handleUploadResume = async () => {
        if (!inputResume) {
            console.error("Please upload a resume")
            toast.error("Please upload a resume")
            return
        }

        const maxFileSize = 5 * 1024 * 1024
        if (inputResume.size > maxFileSize) {
            toast.error("Resume must be under 5MB.");
            return
        }
        if (!inputResume.name.toLowerCase().endsWith(".docx")) {
            toast.error("Only DOCX resumes are supported")
            return
        }

        if (!token) {
            toast.error("Your session has expired. Please log in again.");
            return;
        }

        const uploadResumePromise = async () => {
            setUploading(true)
            try {
                const formData = new FormData();
                formData.append("resume", inputResume)
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/resume`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    body: formData
                })

                if (!response.ok) {
                    const error: ErrorResponseType = await response.json()
                    captureAppError({
                        message: "Failed to upload user master resume",
                        area: "master_resume_upload_popup",
                        action: "upload_master_resume",
                        endpoint: "/api/v1/resume",
                        status: response.status,
                        statusText: response.statusText,
                        extra: {
                            userId: user?.id,
                            errorMessage: error.message,
                            errorCode: error.code
                        }
                    })

                    throw new Error(`${error.message}`)
                }
                setOpen(false)
                onResumeUpdated(prevState => !prevState)
            } catch (error) {
                captureAppError({
                    message: "Unexpected error uploading user master resume",
                    error,
                    area: "master_resume_upload_popup",
                    action: "upload_master_resume",
                    endpoint: "/api/v1/resume",
                    extra: {
                        userId: user?.id
                    }
                });
                throw error
            } finally {
                setUploading(false)
            }
        }


        toast.promise(uploadResumePromise(), {
            loading: "Uploading resume...",
            success: "Resume uploaded successfully",
            error: "Error uploading resume. Please try again"
        })

    }


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">

            <button disabled={uploading} onClick={() => setOpen(false)}
                    className="absolute inset-0 bg-black/20 backdrop-blur-sm"/>

            <div className="z-10 flex max-h-[calc(100vh-1.5rem)] w-full max-w-xl flex-col gap-y-5 overflow-y-auto rounded-md bg-[#ededed] px-4 py-5 sm:max-h-[calc(100vh-2.5rem)]">
                <div className={"flex items-center justify-between"}>
                    <h2 className={"text-lg font-bold"}>Manage Master Resumes</h2>
                    <button disabled={uploading} className={"hover:cursor-pointer"}
                            onClick={() => setOpen(false)}>
                        <XIcon className={"opacity-50"}/>
                    </button>
                </div>
                <div>
                    <p className={"uppercase text-xs font-bold text-black/60"}>Current Primary</p>
                </div>
                <label className={"block cursor-pointer"}>
                    <input onChange={(event) => {
                        setInputResume(event.target.files?.[0] ?? null)
                    }} type="file"
                           className={"hidden"}
                           accept={"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}/>
                    <div
                        className={"flex items-center justify-center flex-col gap-y-1 bg-gray-500/15 py-10 rounded-md"}>
                        <div className={"bg-white rounded-lg text-blue-700 mb-5 shadow-md p-3"}>
                            <CloudArrowUpIcon height={24} width={24}/>
                        </div>

                        <p className="px-3 text-center text-sm font-bold">Drag & drop your new master resume</p>
                        <p className={"text-sm"}>Supports .docx up to 5MB</p>

                    </div>

                </label>


                {inputResume &&
                    <div>
                        <p>{inputResume.name}</p>
                    </div>
                }

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-x-3">
                    <button disabled={uploading} className={"text-sm font-semibold hover:cursor-pointer"}
                            onClick={() => setOpen(false)}>
                        Cancel
                    </button>
                    <button onClick={handleUploadResume}
                            disabled={!inputResume || uploading}
                            className="flex min-h-10 items-center justify-center rounded-lg bg-blue-700 px-6 py-1.5 text-sm font-semibold text-white shadow-md hover:cursor-pointer disabled:cursor-auto disabled:opacity-50">
                        {uploading ? <LoaderCircle className={"animate-spin"}></LoaderCircle> : <p>Upload</p>}
                    </button>
                </div>
            </div>

        </div>
    )

}
