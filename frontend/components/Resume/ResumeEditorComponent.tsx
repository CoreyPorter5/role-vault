"use client"

import {Dispatch, SetStateAction, useState} from "react";

import {ArrowPathIcon} from "@heroicons/react/24/outline";
import {ResumePayload} from "./schema";

type ResumeEditorComponentProps = {
    resumeData: ResumePayload | null,
    setResumeDataAction: Dispatch<SetStateAction<ResumePayload | null>>,
    token: string | null

}

export default function ResumeEditorComponent({resumeData, setResumeDataAction, token}: ResumeEditorComponentProps) {


    const [isEdited, setIsEdited] = useState<boolean>(false)
    const [savingResume, setSavingResume] = useState<boolean>(false)



    const convertDateToString = (dateString?: string) => {
        if (!dateString) {
            return "Not Generated"
        }

        const date = new Date(dateString).toDateString().split(" ")
        return date.slice(1, date.length).join(" ").toString()
    }

    const saveEditedMasterResume = async () => {
        if (!token || !resumeData) {
            return;
        }

        setSavingResume(true);
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
            console.error("Error saving user resume:", response.status, error)
            return
        }
        setSavingResume(false)
        setIsEdited(false)
        console.log("Resume saved!");



    }

    return (

        <section className={"bg-white flex w-3/4 min-h-0 flex-col gap-y-5 rounded-md shadow-sm px-5 py-5"}>
            <div className={"shrink-0 flex items-center justify-between"}>
                <h2 className={"text-lg font-bold"}>Plaintext Resume</h2>
                <div className={"flex text-sm font-semibold items-center justify-center gap-x-4"}>
                    <p className={"text-black/60"}>Last
                        updated: {convertDateToString(resumeData?.updatedAt)}</p>
                    <button onClick={saveEditedMasterResume} disabled={!isEdited || savingResume}
                            className={"bg-blue-600 font-bold disabled:cursor-auto cursor-pointer rounded-md disabled:bg-black/40 text-white px-2 py-1"}>
                        {savingResume ? <ArrowPathIcon width={24} height={24} className={"animate-spin"}/> : "Save" }
                    </button>
                </div>

            </div>

            <div className={"flex-1 min-h-0"}>
                {resumeData &&
                    <textarea onChange={(event) => {
                        setIsEdited(true)
                        setResumeDataAction(prevState => prevState ? {
                            ...prevState,
                            plaintext: event.target.value
                        } : prevState)
                    }} value={resumeData.plaintext}
                              className={"h-full w-full resize-none rounded-md font-mono p-5 bg-[#ededed] text-sm leading-7 text-slate-800 outline-none"}/>
                }
            </div>


        </section>
    )
}