"use client"


import {useEffect, useState} from "react";
import {useJWKTokenAndUserAndSidebar} from "../Dashboard/Context/DashboardContextProvider";
import {JobLibraryItem, JobLibraryItemDraft} from "./schema";
import ResumeLibraryCard from "./ResumeLibraryCard";
import DraftResumeLibraryCard from "./DraftResumeLibraryCard";
import {captureAppError} from "@/lib/sentry/captureAppError";

type ResumeLibraryComponentProps = {
    filter: "All" | "Saved Resumes" | "Drafts" | "No Resume"
    searchInput: string
}

export default function ResumeLibraryComponent({filter, searchInput}: ResumeLibraryComponentProps) {

    const {token, user} = useJWKTokenAndUserAndSidebar();
    const [getLibraryError, setGetLibraryError] = useState<string | null>(null);
    const [jobResumeLibrary, setJobResumeLibrary] = useState<JobLibraryItem[] | null>(null)
    const [jobResumeDraftLibrary, setJobResumeDraftLibrary] = useState<JobLibraryItemDraft[] | null>(null)
    const [refreshLibraryItems, setRefreshLibraryItems] = useState<boolean>(false);
    const [loadingLibrary, setLoadingLibrary] = useState<boolean>(true)
    const hasSearch = searchInput.trim() !== "";

    const hasDraft = (libraryItem: JobLibraryItem) => {
        return jobResumeDraftLibrary?.some(draftItem => draftItem.jobId === libraryItem.jobId) ?? false
    }


    const filteredLibraryItems = (jobResumeLibrary ?? []).filter(libraryItem => {

        const matchesFilter =
            filter === "Saved Resumes" ? libraryItem.resume.exists : filter === "No Resume" ? !libraryItem.resume.exists && !hasDraft(libraryItem) : true

        const matchesSearch =
            searchInput.toLowerCase().trim() === "" ||
            libraryItem.companyName.toLowerCase().trim().includes(searchInput.toLowerCase().trim()) ||
            libraryItem.jobTitle.toLowerCase().trim().includes(searchInput.toLowerCase().trim()) ||
            libraryItem.location.toLowerCase().trim().includes(searchInput.toLowerCase().trim())

        return matchesSearch && matchesFilter;
    })

    const filteredDraftLibraryItems = (jobResumeDraftLibrary ?? []).filter(draftItem => {
        const search = searchInput.toLowerCase().trim()
        return (
            search === "" || draftItem.companyName.toLowerCase().includes(search) || draftItem.jobTitle.toLowerCase().includes(search) || draftItem.location.toLowerCase().includes(search)
        )
    })

    useEffect(() => {
        const fetchLibraryData = async () => {
            if (!token) {
                console.error("User does not have a valid JWK token");
                setLoadingLibrary(false);
                setGetLibraryError("You must be logged in to view your library");
                return;
            }

            try {
                setLoadingLibrary(true);
                setGetLibraryError(null);

                const [libraryResult, draftsResult] = await Promise.all([
                    fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/resume-library`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        }
                    }),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/generated-resume-drafts`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        }
                    })
                ]);

                if (!libraryResult.ok) {
                    const error = await libraryResult.text();
                    captureAppError({
                        message: "Failed to fetch library items",
                        area: "resume_library",
                        action: "get_library_items",
                        endpoint: `/api/v1/resume-library`,
                        status: libraryResult.status,
                        statusText: libraryResult.statusText,
                        extra: {
                            userId: user?.id,
                            error,
                        }
                    })
                    console.error("Error fetching library:", error);
                    setGetLibraryError("Error getting resume library. Please try again");
                    return;
                }

                if (!draftsResult.ok) {
                    const error = await draftsResult.text();
                    captureAppError({
                        message: "Failed to fetch draft library items",
                        area: "draft_resume_library",
                        action: "get_draft_library_items",
                        endpoint: `/api/v1/generated-resume-drafts`,
                        status: draftsResult.status,
                        statusText: draftsResult.statusText,
                        extra: {
                            userId: user?.id,
                            error,
                        }
                    })
                    console.error("Error fetching draft library:", error);
                    setGetLibraryError("Error getting resume library drafts. Please try again");
                    return;
                }

                const libraryData: JobLibraryItem[] = await libraryResult.json();
                const draftData: JobLibraryItemDraft[] = await draftsResult.json();

                setJobResumeLibrary(libraryData ?? []);
                setJobResumeDraftLibrary(draftData ?? []);
            } catch (error) {
                console.error("Error fetching library data: ", error);
                captureAppError({
                    message: "Unexpected error whilst fetching draft and library items",
                    error,
                    area: "resume_library",
                    action: "get_library_items",
                    extra: {
                        userId: user?.id,
                    }
                })
                setGetLibraryError("Error getting resume library. Please try again");
            } finally {
                setLoadingLibrary(false);
            }
        };

        fetchLibraryData();
    }, [token, refreshLibraryItems, user?.id]);


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
                {filter === "Drafts" ? (
                    filteredDraftLibraryItems.length > 0 ? (
                        filteredDraftLibraryItems.map((draftLibraryItem) => (
                            <DraftResumeLibraryCard
                                key={draftLibraryItem.draftId}
                                onLibraryChanged={setRefreshLibraryItems}
                                libraryItem={draftLibraryItem}
                            />
                        ))
                    ) : (
                        <div className={"rounded-md bg-white shadow-sm px-6 py-4"}>
                            {hasSearch ? (
                                <>
                                    <p className={"font-bold"}>No drafts match your search</p>
                                    <p className={"text-sm text-black/60"}>
                                        Try searching by job title, company, or location.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className={"font-bold"}>No draft resumes yet</p>
                                    <p className={"text-sm text-black/60"}>
                                        Generated resumes will appear here for 30 days unless saved to your library.
                                    </p>
                                </>
                            )}
                        </div>
                    )
                ) : filteredLibraryItems.length > 0 ? (
                    filteredLibraryItems.map((libraryItem) => {
                        const draftItem = jobResumeDraftLibrary?.find(draftItem => draftItem.jobId === libraryItem.jobId);

                        if (filter === "All" && draftItem) {
                            return <DraftResumeLibraryCard key={draftItem.draftId}
                                                           onLibraryChanged={setRefreshLibraryItems}
                                                           libraryItem={draftItem}/>
                        }
                        return <ResumeLibraryCard key={libraryItem.jobId} onLibraryChanged={setRefreshLibraryItems}
                                                  libraryItem={libraryItem}/>

                    })
                ) : (
                    <div className={"rounded-md bg-white shadow-sm px-6 py-4"}>
                        {hasSearch ? (
                            <>
                                <p className={"font-bold"}>No applications match your search</p>
                                <p className={"text-sm text-black/60"}>
                                    Try searching by job title, company, or location.
                                </p>
                            </>
                        ) : filter === "Saved Resumes" ? (
                            <>
                                <p className={"font-bold"}>No generated resumes yet</p>
                                <p className={"text-sm text-black/60"}>
                                    Generate a tailored resume for one of your saved jobs.
                                </p>
                            </>
                        ) : filter === "No Resume" ? (
                            <>
                                <p className={"font-bold"}>All applications have generated resumes</p>
                                <p className={"text-sm text-black/60"}>
                                    Every saved job currently has a tailored resume.
                                </p>
                            </>
                        ) : (
                            <>
                                <p className={"font-bold"}>No applications saved yet</p>
                                <p className={"text-sm text-black/60"}>
                                    Save jobs to start building your applications library.
                                </p>
                            </>
                        )}
                    </div>
                )}


            </div>
        </div>


    )


}