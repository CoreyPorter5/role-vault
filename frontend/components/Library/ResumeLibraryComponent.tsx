"use client"


import {useEffect, useState} from "react";
import {useJWKTokenAndUserAndSidebar} from "../Dashboard/Context/DashboardContextProvider";
import {JobLibraryItem} from "./schema";
import ResumeLibraryCard from "./ResumeLibraryCard";

type ResumeLibraryComponentProps = {
    filter: "All" | "Generated" | "Not Generated"
}

export default function ResumeLibraryComponent({filter}: ResumeLibraryComponentProps) {

    const {token} = useJWKTokenAndUserAndSidebar();
    const [getLibraryError, setGetLibraryError] = useState<string | null>(null);
    const [jobResumeLibrary, setJobResumeLibrary] = useState<JobLibraryItem[] | null>(null)
    const [refreshLibraryItems, setRefreshLibraryItems] = useState<boolean>(false);


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

                if (!result.ok) {
                    const error = await result.text();
                    console.error("Error fetching library:", error);
                    setGetLibraryError("Error getting resume library. Please try again");
                    return;
                }

                const data: JobLibraryItem[] = await result.json()
                if (!data) {
                    return
                }
                setJobResumeLibrary(data)
                setGetLibraryError(null)
            } catch (error) {
                console.error("Error fetching library: ", error)
                setGetLibraryError("Error getting resume library. Please try again")
                return
            }

        }

        fetchResumeLibraryItems()

    }, [token, refreshLibraryItems]);

    return (
        <div className={"h-full min-h-0 w-full overflow-y-auto pr-3"}>
            <div className={"flex flex-col gap-y-4"}>
                {jobResumeLibrary && filter == "Generated" &&
                    jobResumeLibrary.filter(libraryItem => libraryItem.resume.exists).map((libraryItem) => {
                        return (
                            <ResumeLibraryCard onResumeSaved={setRefreshLibraryItems} libraryItem={libraryItem}
                                               key={libraryItem.jobId}/>
                        )
                    })}
                {jobResumeLibrary && filter == "Not Generated" &&
                    jobResumeLibrary.filter(libraryItem => !libraryItem.resume.exists).map((libraryItem) => {
                        return (
                            <ResumeLibraryCard onResumeSaved={setRefreshLibraryItems} libraryItem={libraryItem}
                                               key={libraryItem.jobId}/>
                        )
                    })}
                {jobResumeLibrary && filter == "All" &&
                    jobResumeLibrary.map((libraryItem) => {
                        return (
                            <ResumeLibraryCard onResumeSaved={setRefreshLibraryItems} libraryItem={libraryItem}
                                               key={libraryItem.jobId}/>
                        )
                    })}

                {getLibraryError && <p className={"text-red-500"}>
                    {getLibraryError}
                </p>}
            </div>
        </div>

    )

}