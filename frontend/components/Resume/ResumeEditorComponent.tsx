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
                    const error = await response.text();
                    captureAppError({
                        message: "Failed to save edited master resume",
                        area: "master_resume_editor",
                        action: "save_edit_to_master_resume",
                        endpoint: "/api/v1/resume",
                        status: response.status,
                        statusText: response.statusText,
                        extra: {
                            error,
                        }
                    })
                    console.error("Error saving user resume: ", error)
                    throw new Error(`Error saving user resume: ${error}`)

                }
                setIsEdited(false)
                setResumeDataAction(prevState => prevState ? {
                    ...prevState,
                    updatedAt: new Date().toISOString()
                } : prevState)
            } catch (error) {
                captureAppError({
                    message: "Unexpected error whilst saving edits to master resume",
                    area: "master_resume_editor",
                    error,
                    action: "save_edit_to_master_resume",
                    endpoint: "/api/v1/resume",
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
            <section aria-label="Loading resume editor" aria-busy="true" className="w-full rounded-md bg-white p-5 shadow-sm xl:w-3/4">
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

        <section className="flex min-h-0 w-full flex-col gap-y-5 rounded-md bg-white px-5 py-5 shadow-sm xl:w-3/4">
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className={"text-lg font-bold"}>Plaintext Resume</h2>
                <div className="flex flex-wrap items-center gap-3 text-sm font-semibold sm:justify-center">
                    <p className={"text-black/60 text-center"}>Last
                        updated: {convertDateToString(resumeData?.updatedAt)}</p>
                    <button onClick={saveEditedMasterResume} disabled={!isEdited || savingResume}
                            className={"bg-blue-600 font-bold disabled:cursor-auto cursor-pointer rounded-md disabled:bg-black/40 text-white px-2 py-1"}>
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
                              className={"h-full w-full resize-none rounded-md font-mono p-5 bg-[#ededed] text-sm leading-7 text-slate-800 outline-none"}/>
                    :
                    <div className="h-full w-full rounded-md bg-[#ededed] p-5 text-sm font-medium text-black/60">
                        Upload a master resume to edit its plaintext content.
                    </div>

                }
            </div>


        </section>
    )
}
