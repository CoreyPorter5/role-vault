"use client"

import {Dispatch, SetStateAction, useState} from "react";

import {ArrowPathIcon} from "@heroicons/react/24/outline";
import Skeleton from "../ui/Skeleton";
import {ResumePayload} from "./schema";
import {toast} from 'sonner'
import {captureAppError} from "@/lib/sentry/captureAppError";

type ResumeEditorComponentProps = {
    resumeData: ResumePayload | null,
    setResumeDataAction: Dispatch<SetStateAction<ResumePayload | null>>,
    token: string | null;
    loadingResume: boolean;

}

export default function ResumeEditorComponent({
                                                  resumeData,
                                                  setResumeDataAction,
                                                  token,
                                                  loadingResume
                                              }: ResumeEditorComponentProps) {


    const [isEdited, setIsEdited] = useState<boolean>(false)
    const [savingResume, setSavingResume] = useState<boolean>(false)


    const convertDateToString = (dateString?: string) => {
        if (!dateString) {
            return "Please upload a resume"
        }

        const date = new Date(dateString).toDateString().split(" ")
        return date.slice(1, date.length).join(" ").toString()
    }

    const saveEditedMasterResume = async () => {
        if (!token || !resumeData) {
            toast.error("Unable to save resume. Please try again.");
            return;
        }


        const saveEditedMasterResumePromise = async () => {
            setSavingResume(true);
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/resume`, {
                    method: "PATCH",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        plaintext: resumeData.plaintext
                    })

                })
                if (!response.ok) {
                    const saveError = new Error("Failed to save resume changes") as Error & {status?: number};
                    saveError.status = response.status;
                    throw saveError

                }
                setIsEdited(false)
                setResumeDataAction(prevState => prevState ? {
                    ...prevState,
                    updatedAt: new Date().toISOString()
                } : prevState)
            } catch (error) {
                captureAppError({
                    code: "WEB_MASTER_RESUME_UPDATE_FAILED",
                    message: "Unexpected error whilst saving edits to master resume",
                    area: "master_resume_editor",
                    error,
                    action: "save_edit_to_master_resume",
                    endpoint: "/api/v1/resume",
                    status: error instanceof Error && "status" in error
                        ? (error as Error & {status?: number}).status
                        : undefined,
                })
                console.error("Unexpected error saving edits to user master resume: ", error)
            } finally {
                setSavingResume(false)
            }
        }

        toast.promise(saveEditedMasterResumePromise(), {
            success: "Resume changes saved",
            loading: "Saving changes...",
            error: "Error saving changes. Please try again"
        })


    }

    if (loadingResume) {
        return (
            <section aria-label="Loading resume editor" aria-busy="true" className="app-panel min-h-[28rem] w-full shrink-0 p-5 sm:min-h-[32rem] xl:min-h-0 xl:shrink xl:w-3/4">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-36"/>
                    <Skeleton className="h-8 w-24"/>
                </div>
                <Skeleton className="mt-5 h-5 w-full"/>
                <Skeleton className="mt-3 h-5 w-11/12"/>
                <Skeleton className="mt-3 h-5 w-full"/>
                <Skeleton className="mt-3 h-5 w-4/5"/>
                <Skeleton className="mt-6 h-48 w-full"/>
            </section>
        )
    }

    return (

        <section className="app-panel flex min-h-[28rem] w-full shrink-0 flex-col gap-y-5 px-5 py-5 sm:min-h-[32rem] xl:min-h-0 xl:shrink xl:w-3/4">
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className={"text-lg font-bold"}>Plaintext Resume</h2>
                <div className="flex flex-wrap items-center gap-3 text-sm font-semibold sm:justify-center">
                    <p className={"text-black/60 text-center"}>Last
                        updated: {convertDateToString(resumeData?.updatedAt)}</p>
                    <button onClick={saveEditedMasterResume} disabled={!isEdited || savingResume}
                            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#0D3880] px-4 py-2 font-bold text-white hover:bg-[#08285f] disabled:bg-[#a9acb1]">
                        {savingResume ? <ArrowPathIcon width={24} height={24} className={"animate-spin"}/> : "Save"}
                    </button>
                </div>

            </div>

            <div className={"flex-1 min-h-0"}>
                {resumeData ?
                    <textarea disabled={savingResume} onChange={(event) => {
                        setIsEdited(true)
                        setResumeDataAction(prevState => prevState ? {
                            ...prevState,
                            plaintext: event.target.value
                        } : prevState)
                    }} value={resumeData.plaintext}
                              className="h-full w-full resize-none rounded-lg border border-[#dedbd3] bg-[#f8f7f4] p-5 font-mono text-sm leading-7 text-slate-800 outline-none focus:border-[#0D3880]"/>
                    :
                    <div className="h-full w-full rounded-lg border border-[#dedbd3] bg-[#f8f7f4] p-5 text-sm font-medium text-[#6c7179]">
                        Upload a master resume to edit its plaintext content.
                    </div>

                }
            </div>


        </section>
    )
}
