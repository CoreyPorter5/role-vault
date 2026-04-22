"use client"

import {useEffect, useState} from "react";
import {useJWKTokenAndUserAndSidebar} from "../Dashboard/Context/DashboardContextProvider";


type ResumePayload = {
    fileName: string,
    plaintext: string,
    mimeType: string,
    storagePath: string,
    updatedAt: string,
    createdAt: string

}

export default function ResumeEditorComponent(){

    const {token, user} = useJWKTokenAndUserAndSidebar();
    const [resumeData, setResumeData] = useState<ResumePayload | null>(null)

    useEffect(() => {

        const fetchResume = async () => {
            if(token && user){
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/resume`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }

                })
                if(response.ok){
                    const resumeData: ResumePayload = await response.json();
                    setResumeData(resumeData)
                    return
                }else{
                    console.error("Error fetching user resume: ", response.status)
                    return
                }
            }

        }
        fetchResume()
    }, [token, user]);

    return(
        <div>
            {resumeData?.plaintext && <div>
                {resumeData.plaintext}
            </div>}
        </div>
    )
}