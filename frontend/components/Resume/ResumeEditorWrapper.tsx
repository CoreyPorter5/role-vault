"use client"

import {useEffect, useState} from "react";
import {useJWKTokenAndUserAndSidebar} from "../Dashboard/Context/DashboardContextProvider"
import {ResumePayload} from "./schema";
import ResumeEditorComponent from "./ResumeEditorComponent";
import ResumeEditorSidebarWrapper from "./ResumeEditorSidebarWrapper";




export default function ResumeEditorWrapper(){
    const {token, user} = useJWKTokenAndUserAndSidebar();
    const [resumeData, setResumeData] = useState<ResumePayload | null>(null)
    const [refreshResume, setRefreshResume] = useState<boolean>(false)

    useEffect(() => {

        const fetchResume = async () => {
            if (token && user) {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/resume`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }

                })
                if (response.ok) {
                    const resumeData: ResumePayload = await response.json();
                    setResumeData(resumeData)
                    return
                } else {
                    console.error("Error fetching user resume: ", response.status)
                    return
                }
            }

        }
        fetchResume()
    }, [token, user, refreshResume]);

    return(
        <div className={"flex gap-x-5 mb-15 flex-1 min-h-0"}>
            <ResumeEditorComponent resumeData={resumeData} setResumeDataAction={setResumeData} token={token}/>
            <ResumeEditorSidebarWrapper resumeData={resumeData} onResumeUpdated={setRefreshResume}/>


        </div>

    )

}