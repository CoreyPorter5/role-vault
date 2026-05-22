"use client"

import {useEffect, useState} from "react";
import {useJWKTokenAndUserAndSidebar} from "../Dashboard/Context/DashboardContextProvider"
import {ResumePayload} from "./schema";
import ResumeEditorComponent from "./ResumeEditorComponent";
import ResumeEditorSidebarWrapper from "./ResumeEditorSidebarWrapper";
import DashboardResumePopup from "../Dashboard/ResumeUploader/DashboardResumePopup";


export default function ResumeEditorWrapper() {
    const {token, user} = useJWKTokenAndUserAndSidebar();
    const [resumeData, setResumeData] = useState<ResumePayload | null>(null)
    const [refreshResume, setRefreshResume] = useState<boolean>(false)
    const [uploadResumePopupOpen, setUploadResumePopupOpen] = useState<boolean>(false)
    const [loadingResume, setLoadingResume] = useState<boolean>(true)
    const [resumeError, setResumeError] = useState<string | null>(null)

    useEffect(() => {

        const fetchResume = async () => {

            if (!token || !user) {
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
                    console.log("Error fetching user resume: ", response.status)
                    setResumeError("Failed to load resume. Please try again")
                    return
                }
                const resumeData: ResumePayload = await response.json();
                setResumeData(resumeData)


            } catch (error) {
                console.error("Error fetching user resume:", error);
                setResumeError("Failed to load resume. Please try again.");
            } finally {
                setLoadingResume(false)
            }

        }
        fetchResume()
    }, [token, user, refreshResume]);

    if (!resumeError) {
        return (
            !uploadResumePopupOpen ?

                <div className={"flex gap-x-5 mb-15 flex-1 min-h-0"}>
                    <ResumeEditorComponent loadingResume={loadingResume} resumeData={resumeData}
                                           setResumeDataAction={setResumeData} token={token}/>
                    <ResumeEditorSidebarWrapper loadingResume={loadingResume} resumeData={resumeData}
                                                onResumeUpdated={setRefreshResume}/>
                </div>
                :
                <DashboardResumePopup setOpen={setUploadResumePopupOpen} onResumeUpdated={setRefreshResume}/>
        )
    }

    return (
        <div className={"text-red-500 font-medium text-md"}>{resumeError}</div>
    )

}