"use client"


import {useEffect, useState} from "react";
import {useJWKTokenAndUserAndSidebar} from "../Dashboard/Context/DashboardContextProvider";
import {JobLibraryItem} from "./schema";
import ResumeLibraryCard from "./ResumeLibraryCard";

export default function ResumeLibraryComponent() {

    const {token} = useJWKTokenAndUserAndSidebar();
    const [getLibraryError, setGetLibraryError] = useState<string | null>(null);
    const [jobResumeLibrary, setJobResumeLibrary] = useState<JobLibraryItem[] | null>(null)

    useEffect(() => {

        const fetchResumeLibraryItems = async () => {
            if (!token) {
                console.error("User does not have a valid JWK token")
                return
            }

            try {
                const result = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/resume-library`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    }
                })
                const data: JobLibraryItem[] = await result.json()
                if (!data) {
                    return
                }
                setJobResumeLibrary(data)
                console.log(data)
                return
            } catch (error) {
                console.error("Error fetching library: ", error)
                setGetLibraryError("Error getting resume library. Please try again")
                return

            }

        }

        fetchResumeLibraryItems()

    }, [token]);

    return (
        <div className={"h-full min-h-0 w-full overflow-y-auto pr-3"}>
            <div className={"flex flex-col gap-y-4"}>
                {jobResumeLibrary && jobResumeLibrary.map((libraryItem, index) => {
                    return (
                        <ResumeLibraryCard libraryItem={libraryItem} key={index}/>
                    )
                })}

                {getLibraryError && <p className={"text-red-500"}>
                    {getLibraryError}
                </p>}
            </div>
        </div>

    )

}