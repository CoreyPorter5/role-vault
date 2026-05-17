"use client"

import {Dispatch, SetStateAction, useState} from "react";

import {ArrowPathIcon} from "@heroicons/react/24/outline";
import {ResumePayload} from "./schema";
import {toast} from 'sonner'

type ResumeEditorComponentProps = {
    resumeData: ResumePayload | null,
    setResumeDataAction: Dispatch<SetStateAction<ResumePayload | null>>,
    token: string | null
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
                    console.error("Error saving user resume: ", error)
                    throw new Error(`Error saving user resume: ${error}`)

                }
                setIsEdited(false)
                setResumeDataAction(prevState => prevState ? {...prevState, updatedAt: new Date().toISOString() } : prevState)
            }finally {
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
            <div className={"text-black/60 font-medium text-lg w-3/4"}>Loading resume editor ...</div>
        )
    }

    return (

        <section className={"bg-white flex w-3/4 min-h-0 flex-col gap-y-5 rounded-md shadow-sm px-5 py-5"}>
            <div className={"shrink-0 flex items-center justify-between"}>
                <h2 className={"text-lg font-bold"}>Plaintext Resume</h2>
                <div className={"flex text-sm font-semibold items-center justify-center gap-x-4"}>
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