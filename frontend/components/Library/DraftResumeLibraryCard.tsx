import {JobLibraryItemDraft} from "./schema";

import Image from "next/image";
import globeSVG from "../../public/globe.svg"

import {useJWKTokenAndUserAndSidebar} from "../Dashboard/Context/DashboardContextProvider";
import {Dispatch, SetStateAction, useState} from "react";
import {DocumentCheckIcon} from "@heroicons/react/24/outline";
import {ArrowDownTrayIcon, BookmarkIcon, DocumentIcon, SparklesIcon, TrashIcon} from "@heroicons/react/24/outline";
import {toast} from "sonner";
import {TailoredResume} from "@/app/api/generate-resume/schema";


type ResumeLibraryCardProps = {
    onResumeSaved: Dispatch<SetStateAction<boolean>>;
    libraryItem: JobLibraryItemDraft;
}


export default function DraftResumeLibraryCard({onResumeSaved, libraryItem}: ResumeLibraryCardProps) {

    const {sidebarOpen, token} = useJWKTokenAndUserAndSidebar();
    const [generatedResume, setGeneratedResume] = useState<TailoredResume | null>(null)
    const [generatedResumeFile, setGeneratedResumeFile] = useState<File | null>(null)


    const getDraftResumeJson = async (): Promise<TailoredResume | null> => {
        if (!token) {
            console.error("You must be logged in to perform this action")
            return null
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/generated-resume-drafts/${libraryItem.draftId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        })

        if (!response.ok) {
            const error = await response.text()
            console.error("Error saving resume to library: ", error)
            toast.error("Error loading draft resume. Try again later.");
            return null
        }

        return await response.json() as TailoredResume


    }

    const handleSaveDraftToLibrary = async () => {
        if (!token) {
            console.error("Error saving draft to library")
            toast.error("Error saving draft to library. Try again later")
            return
        }


        const saveDraftToLibraryPromise = async () => {

            const resume = generatedResume ?? await getDraftResumeJson()
            if (!resume) {
                throw new Error("Could not load draft resume")
            }

            setGeneratedResume(resume)

            const file = generatedResumeFile ?? await exportResumeAsFile(resume, false);

            if (!file) {
                throw new Error("Could not create DOCX file");
            }

            const formData = new FormData();
            formData.append("resume", file);
            formData.append("resumeJson", JSON.stringify(resume))

            const saveResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/generated-resumes/${libraryItem.jobId}/upload`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData,
            })

            if (!saveResponse.ok) {
                const error = await saveResponse.text()
                console.error("Error saving resume to library: ", error)
                throw new Error("Error saving resume to library")
            }

            const deleteResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/generated-resume-drafts/${libraryItem.jobId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })

            if (!deleteResponse.ok) {
                const error = await deleteResponse.text()
                console.error("Error saving resume to library: ", error)
                throw new Error("Error saving resume to library")
            }

            setGeneratedResumeFile(file)


            onResumeSaved(prevState => !prevState);


        }

        toast.promise(saveDraftToLibraryPromise(), {
            success: "Resume saved to library",
            error: "Error saving resume to library. Try again later",
            loading: "Saving resume to library..."
        })


    }

    const exportResumeAsFile = async (resume: TailoredResume, showToast = true): Promise<File | null> => {

        const exportResumePromise = async () => {
            const response = await fetch("/api/export-resume-docx", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    resume,
                })
            })
            if (!response.ok) {
                const error = await response.text()
                console.error("Error exporting docx resume: ", error)
                throw new Error("Error exporting docx resume")
            }

            const blob = await response.blob();
            const date = new Date().toISOString().slice(0, 10)
            const safeCompany = libraryItem.companyName.replace(/[^\w.-]+/g, "_");
            const safeTitle = libraryItem.jobTitle.replace(/[^\w.-]+/g, "_");

            const filename = `${safeCompany}_${safeTitle}_${date}.docx`

            const file = new File([blob], filename, {
                type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            })

            setGeneratedResumeFile(file)
            return file;
        }
        const promise = exportResumePromise();

        if (showToast) {
            toast.promise(promise, {
                loading: "Exporting resume...",
                success: "Resume exported successfully",
                error: "Error exporting resume. Try again later"
            })
        }


        try {
            return await promise;
        } catch {
            return null;
        }

    }


    const downloadDocx = async () => {
        const resume = generatedResume ?? await getDraftResumeJson();

        if (!resume) {

            return;

        }
        setGeneratedResume(resume)
        const file = generatedResumeFile ?? await exportResumeAsFile(resume);

        if (!file) {
            return
        }

        const url = window.URL.createObjectURL(file);

        const a = document.createElement("a")
        a.href = url;
        a.download = file.name;

        document.body.appendChild(a)
        a.click();
        a.remove();

        window.URL.revokeObjectURL(url)
        toast.success("Resume download started")


    }


    const shortenJobTitle = (jobTitle: string) => {
        let maxCharLength = 45
        if (!sidebarOpen) {
            maxCharLength = 60;
        }

        if (jobTitle.length <= maxCharLength) {
            return jobTitle
        }

        return jobTitle.slice(0, maxCharLength).trimEnd() + "...";
    }

    const daysUntil = (dateString?: string) => {
        if (!dateString) {
            return "No expiry date"
        }

        const expiryDate = new Date(dateString)
        const now = new Date()

        const diffMs = expiryDate.getTime() - now.getTime()
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
        if (diffDays < 0) {
            return "Now"
        }
        if (diffDays === 0) {
            return "Today"
        }

        if (diffDays === 1) {
            return "1 day"
        }
        return `${diffDays} days`
    }

    const deleteDraftResume = async () => {
        if (!token) {
            toast.error("Error: User JWK token does not exist")
            return
        }

        const deletePromise = async () => {
            const deleteResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/generated-resume-drafts/${libraryItem.jobId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })

            if (!deleteResponse.ok) {
                const error = await deleteResponse.text()
                console.error("Error deleting resume: ", error)
                throw new Error("Error deleting resume")
            }

            onResumeSaved(prevState => !prevState)
        }
        toast.promise(deletePromise(), {
            loading: "Deleting draft resume...",
            success: "Draft resume deleted successfully",
            error: "Error deleting draft resume. Try again later",

        })


    }


    return (
        <div
            className={"bg-white w-full grid grid-cols-1 md:grid-cols-[minmax(0,1.8fr)_minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,0.8fr)] gap-x-6 py-4 items-center px-4 rounded-sm shadow-md"}>

            <div className={"flex items-center gap-x-4 min-w-0"}>
                <Image width={42} height={42} className={"shrink-0"} alt={libraryItem.companyName}
                       src={libraryItem.companyLogo ?? globeSVG}></Image>
                <div className={"flex flex-col gap-y-0.5"}>
                    <p className={"text-sm font-bold"}>{shortenJobTitle(libraryItem.jobTitle)}</p>
                    <p className={"text-xs text-black/50 truncate"}>{libraryItem.companyName}</p>
                </div>
            </div>


            <div className={"flex text-center gap-x-2 justify-start items-center"}>
                {libraryItem.jobStatus == "Saved" &&
                    <div className={"bg-gray-300/50 px-3 py-1 rounded-full flex items-center gap-x-2 justify-center"}>
                        <div className={"rounded-full bg-gray-500 h-1.5 w-1.5"}></div>
                        <p className={"font-semibold text-black/60 text-xs"}>{libraryItem.jobStatus} DRAFT</p>
                    </div>}
                {libraryItem.jobStatus == "Applied" &&
                    <div className={"bg-blue-300/50 px-3 py-1 rounded-full flex items-center gap-x-2 justify-center"}>
                        <div className={"rounded-full bg-blue-500 h-1.5 w-1.5"}></div>
                        <p className={"font-semibold text-black/60 text-xs"}>{libraryItem.jobStatus}</p>
                    </div>}
                {libraryItem.jobStatus == "Interviewing" &&
                    <div className={"bg-red-200/50 px-3 py-1 rounded-full flex items-center gap-x-2 justify-center"}>
                        <div className={"rounded-full bg-red-400 h-1.5 w-1.5"}></div>
                        <p className={"font-semibold text-black/60 text-xs"}>{libraryItem.jobStatus}</p>
                    </div>}
                {libraryItem.jobStatus == "Offer" &&
                    <div className={"bg-purple-300/50 px-3 py-1 rounded-full flex items-center gap-x-2 justify-center"}>
                        <div className={"rounded-full bg-purple-500 h-1.5 w-1.5"}></div>
                        <p className={"font-semibold text-black/60 text-xs"}>{libraryItem.jobStatus}</p>
                    </div>}
                {libraryItem.jobStatus == "Accepted" &&
                    <div className={"bg-green-300/50 px-3 py-1 rounded-full flex items-center gap-x-2 justify-center"}>
                        <div className={"rounded-full bg-green-500 h-1.5 w-1.5"}></div>
                        <p className={"font-semibold text-black/60 text-xs"}>{libraryItem.jobStatus}</p>
                    </div>}
                {libraryItem.jobStatus == "Rejected" &&
                    <div className={"bg-red-300/50 px-3 py-1 rounded-full flex items-center gap-x-2 justify-center"}>
                        <div className={"rounded-full bg-red-500 h-1.5 w-1.5"}></div>
                        <p className={"font-semibold text-black/60 text-xs"}>{libraryItem.jobStatus}</p>
                    </div>}
            </div>
            <div className={"flex text-center gap-x-2 justify-start items-center"}>
                {libraryItem ?
                    <div className={"flex flex-col items-center justify-start"}>
                        <div className={"flex items-center justify-start gap-x-2"}>
                            <DocumentCheckIcon className={"opacity-50"} width={16} height={16}/>
                            <p className={"font-semibold text-md"}>Draft Resume</p>
                        </div>
                        <p className={"text-sm self-start font-medium text-black/60"}>Expires: {daysUntil(libraryItem.draftExpiresAt)}</p>

                    </div>


                    :
                    <div className={"flex items-center justify-center gap-x-2 text-black/60"}>
                        <DocumentIcon width={16} height={16}/>
                        <p className={"text-sm font-medium"}>No resume generated</p>
                    </div>
                }

            </div>


            <div className={"flex items-center gap-x-3 justify-end"}>
                {libraryItem ?
                    <>
                        <BookmarkIcon onClick={handleSaveDraftToLibrary} width={18} height={18}
                                      className={"hover:cursor-pointer"}/>
                        <ArrowDownTrayIcon onClick={downloadDocx} className={"hover:cursor-pointer"} width={18}
                                           height={18}/>
                        <TrashIcon onClick={deleteDraftResume} className={"hover:cursor-pointer"} width={18}
                                   height={18}/>
                    </>
                    :

                    <button
                        className={"flex items-center hover:cursor-pointer px-2 py-2 gap-x-1.5 rounded-md bg-blue-700 text-white justify-center"}>
                        <SparklesIcon width={16} height={16}/>
                        <p className={"font-semibold text-xs"}>Generate Resume</p>
                    </button>
                }
            </div>


        </div>
    )
}