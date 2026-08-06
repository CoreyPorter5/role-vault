"use client"

import {useEffect, useState} from "react";
import {useJWKTokenAndUserAndSidebar} from "../Dashboard/Context/DashboardContextProvider"
import {ResumePayload} from "./schema";
import ResumeEditorComponent from "./ResumeEditorComponent";
import ResumeEditorSidebarWrapper from "./ResumeEditorSidebarWrapper";
import MasterResumeUploadPopup from "../Dashboard/MasterResumeUploader/MasterResumeUploadPopup";
import {captureAppError} from "@/lib/sentry/captureAppError";


export default function ResumeEditorWrapper() {
    const {token, user} = useJWKTokenAndUserAndSidebar();
    const [resumeData, setResumeData] = useState<ResumePayload | null>(null)
    const [refreshResume, setRefreshResume] = useState<boolean>(false)
    const [uploadResumePopupOpen, setUploadResumePopupOpen] = useState<boolean>(false)
    const [loadingResume, setLoadingResume] = useState<boolean>(true)
    const [resumeError, setResumeError] = useState<string | null>(null)

    useEffect(() => {

        const fetchResume = async () => {

            if (!token) {
                console.error("You must be signed in to access resume")
                setResumeError("Please sign in to access resume")
                setLoadingResume(false)
                return

            }

            try {
                setLoadingResume(true)
                setResumeError(null)

                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/resume`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }

                })

                if (response.status === 404) {
                    setResumeData(null)
                    setUploadResumePopupOpen(true)
                    return
                }

                if (!response.ok) {
                    const error = await response.text();
                    captureAppError({
                        message: "Failed to fetch user master resume",
                        area: "master_resume_editor",
                        action: "fetch_master_resume",
                        endpoint: "/api/v1/resume",
                        status: response.status,
                        statusText: response.statusText,
                        extra: {
                            error,
                            userId: user?.id
                        }
                    })
                    console.error("Error fetching user resume: ", response.status)
                    setResumeError("Failed to load resume. Please try again")
                    return
                }
                const resumeData: ResumePayload = await response.json();
                setResumeData(resumeData)


            } catch (error) {
                console.error("Error fetching user resume:", error);
                captureAppError({
                    message: "Unexpected error whilst fetching user master resume for editor",
                    area: "master_resume_editor",
                    action: "fetch_master_resume",
                    endpoint: "/api/v1/resume",
                    extra: {
                        error,
                        userId: user?.id
                    }
                })
                setResumeError("Failed to load resume. Please try again.");
            } finally {
                setLoadingResume(false)
            }

        }
        fetchResume()
    }, [token, user?.id, refreshResume]);

    if (!resumeError) {
        return (
            !uploadResumePopupOpen ?

                <div className="mb-15 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto xl:flex-row xl:overflow-hidden">
                    <ResumeEditorComponent loadingResume={loadingResume} resumeData={resumeData}
                                           setResumeDataAction={setResumeData} token={token}/>
                    <ResumeEditorSidebarWrapper loadingResume={loadingResume} resumeData={resumeData}
                                                onResumeUpdated={setRefreshResume}/>
                </div>
                :
                <MasterResumeUploadPopup setOpen={setUploadResumePopupOpen} onResumeUpdated={setRefreshResume}/>
        )
    }

    return (
        <div className={"text-red-500 font-medium text-md"}>{resumeError}</div>
    )

}
