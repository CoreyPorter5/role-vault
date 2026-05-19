"use client"


import {useEffect, useState} from "react";
import {useJWKTokenAndUserAndSidebar} from "../Dashboard/Context/DashboardContextProvider";
import {JobLibraryItem} from "./schema";
import ResumeLibraryCard from "./ResumeLibraryCard";

type ResumeLibraryComponentProps = {
    filter: "All" | "Generated" | "Not Generated"
    searchInput: string
}

export default function ResumeLibraryComponent({filter, searchInput}: ResumeLibraryComponentProps) {

    const {token} = useJWKTokenAndUserAndSidebar();
    const [getLibraryError, setGetLibraryError] = useState<string | null>(null);
    const [jobResumeLibrary, setJobResumeLibrary] = useState<JobLibraryItem[] | null>(null)
    const [refreshLibraryItems, setRefreshLibraryItems] = useState<boolean>(false);
    const [loadingLibrary, setLoadingLibrary] = useState<boolean>(true)
    const hasSearch = searchInput.trim() !== "";


    const filteredLibraryItems = (jobResumeLibrary ?? []).filter(libraryItem => {

        const matchesFilter =
            filter === "Generated" ? libraryItem.resume.exists : filter === "Not Generated" ? !libraryItem.resume.exists : true

        const matchesSearch =
            searchInput.toLowerCase().trim() === "" ||
            libraryItem.companyName.toLowerCase().trim().includes(searchInput.toLowerCase().trim()) ||
            libraryItem.jobTitle.toLowerCase().trim().includes(searchInput.toLowerCase().trim()) ||
            libraryItem.location.toLowerCase().trim().includes(searchInput.toLowerCase().trim())

        return matchesSearch && matchesFilter;
    })


    useEffect(() => {

        const fetchResumeLibraryItems = async () => {
            if (!token) {
                console.error("User does not have a valid JWK token")
                setLoadingLibrary(false)
                setGetLibraryError("You must be logged in to view your library")
                return
            }

            try {
                setLoadingLibrary(true);
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
            } finally {
                setLoadingLibrary(false)
            }

        }

        fetchResumeLibraryItems()

    }, [token, refreshLibraryItems]);


    if (loadingLibrary) {
        return (
            <div className={"text-black/60 text-md font-medium"}>
                Loading library items ...
            </div>
        )
    }

    if (getLibraryError) {
        return (
            <p className={"text-red-500"}>
                {getLibraryError}
            </p>
        )
    }


    return (


        <div className={"h-full min-h-0 w-full overflow-y-auto pr-3"}>
            <div className={"flex flex-col gap-y-4"}>


                {filteredLibraryItems.length > 0 ? (
                        filteredLibraryItems.map((libraryItem) =>
                            <ResumeLibraryCard key={libraryItem.jobId} onResumeSaved={setRefreshLibraryItems}
                                               libraryItem={libraryItem}/>
                        )
                    )
                    :
                    (
                        <div className={"rounded-md bg-white shadow-sm px-6 py-4"}>
                            {hasSearch ?
                                (<>
                                    <p className={"font-bold"}>No applications match your search</p>
                                    <p className={"text-sm text-black/60"}>Try searching by job title, company, or
                                        location.</p>
                                </>) : filter === "Generated" ?
                                    (<>
                                        <p className={"font-bold"}>No generated resumes yet</p>
                                        <p className={"text-sm text-black/60"}>Generate a tailored resume for one of
                                            your
                                            saved jobs.</p>
                                    </>) : filter === "Not Generated" ?
                                        <>
                                            <p className={"font-bold"}>All applications have generated resumes</p>
                                            <p className={"text-sm text-black/60"}>Every saved job currently has a
                                                tailored
                                                resume</p>
                                        </> : filter === "All" &&
                                        <>
                                            <p className={"font-bold"}>No applications saved yet</p>
                                            <p className={"text-sm text-black/60"}>Save jobs to start building your
                                                applications
                                                library.</p>
                                        </>}

                        </div>
                    )


                }


            </div>
        </div>


    )


}