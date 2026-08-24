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
    code?: string,
}


export default function MasterResumeUploadPopup({setOpen, onResumeUpdated}: DashboardResumePopupProps) {


    const [inputResume, setInputResume] = useState<File | null>(null);
    const [uploading, setUploading] = useState<boolean>(false)
    const {token} = useJWKTokenAndUserAndSidebar();


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
                    const errorPayload = await response.json().catch(() => ({})) as ErrorResponseType;
                    const uploadError = new Error("Master resume upload request failed") as Error & {
                        status?: number;
                        upstreamErrorCode?: string;
                    };
                    uploadError.status = response.status;
                    uploadError.upstreamErrorCode = errorPayload.code;
                    throw uploadError
                }
                setOpen(false)
                onResumeUpdated(prevState => !prevState)
            } catch (error) {
                captureAppError({
                    code: "WEB_MASTER_RESUME_UPLOAD_FAILED",
                    message: "Unexpected error uploading user master resume",
                    error,
                    area: "master_resume_upload_popup",
                    action: "upload_master_resume",
                    endpoint: "/api/v1/resume",
                    status: error instanceof Error && "status" in error
                        ? (error as Error & {status?: number}).status
                        : undefined,
                    extra: {
                        upstreamErrorCode: error instanceof Error && "upstreamErrorCode" in error
                            ? (error as Error & {upstreamErrorCode?: string}).upstreamErrorCode
                            : undefined,
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
                    className="absolute inset-0 bg-[#181d26]/35 backdrop-blur-[2px] hover:bg-[#181d26]/40"/>

            <div className="z-10 flex max-h-[calc(100vh-1.5rem)] w-full max-w-xl flex-col gap-y-5 overflow-y-auto rounded-xl border border-[#d5d2ca] bg-white px-5 py-6 shadow-[0_24px_70px_-24px_rgba(24,29,38,0.5)] sm:max-h-[calc(100vh-2.5rem)] sm:px-6">
                <div className={"flex items-center justify-between"}>
                    <div>
                        <p className="eyebrow">Source document</p>
                        <h2 className="mt-1 text-xl font-semibold">Update master resume</h2>
                    </div>
                    <button disabled={uploading}
                            className="inline-flex size-10 items-center justify-center rounded-lg text-[#6f747c] hover:bg-[#f5f4f0] hover:text-[#181d26] disabled:opacity-50"
                            onClick={() => setOpen(false)}>
                        <XIcon className="size-5"/>
                    </button>
                </div>
                <div>
                    <p className="text-xs font-semibold text-[#71767e]">This replaces your current primary resume.</p>
                </div>
                <label className={"block cursor-pointer"}>
                    <input onChange={(event) => {
                        setInputResume(event.target.files?.[0] ?? null)
                    }} type="file"
                           className={"hidden"}
                           accept={"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}/>
                    <div
                        className="flex flex-col items-center justify-center gap-y-1 rounded-xl border border-dashed border-[#bfc7d2] bg-[#f7f9fc] py-10 hover:border-[#7898c8]">
                        <div className="mb-5 rounded-lg bg-[#EFF6FF] p-3 text-[#2563EB]">
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
                    <button disabled={uploading}
                            className="min-h-10 rounded-lg px-4 text-sm font-semibold text-[#59606a] hover:bg-[#f5f4f0] hover:text-[#181d26] disabled:opacity-50"
                            onClick={() => setOpen(false)}>
                        Cancel
                    </button>
                    <button onClick={handleUploadResume}
                            disabled={!inputResume || uploading}
                            className="button-primary px-6 disabled:opacity-50">
                        {uploading ? <LoaderCircle className={"animate-spin"}></LoaderCircle> : <p>Upload</p>}
                    </button>
                </div>
            </div>

        </div>
    )

}
