import {JobLibraryItem} from "./schema";
import {toast} from "sonner";
import Image from "next/image";
import globeSVG from "../../public/globe.svg"
import {
    ArrowDownTrayIcon,
    ArrowPathIcon,
    DocumentIcon,
    SparklesIcon,
    TrashIcon
} from "@heroicons/react/24/outline";

import {
    DocumentCheckIcon,
} from "@heroicons/react/24/solid";

import {useJWKTokenAndUserAndSidebar} from "../Dashboard/Context/DashboardContextProvider";
import {Dispatch, SetStateAction, useState} from "react";
import DashboardGenerateResumePopup from "../Dashboard/ResumeGenerator/DashboardGenerateResumePopup";

type ResumeLibraryCardProps = {
    onResumeSaved: Dispatch<SetStateAction<boolean>>;
    libraryItem: JobLibraryItem;
}

type SignedURLResponse = {
    signedURL?: string
}

export default function ResumeLibraryCard({onResumeSaved, libraryItem}: ResumeLibraryCardProps) {

    const {token, sidebarOpen} = useJWKTokenAndUserAndSidebar();
    const [generatorOpen, setGeneratorOpen] = useState<boolean>(false)

    const downloadSavedResume = async () => {
        if (!token) {
            console.error("Error: User JWK token does not exist")
            return
        }

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/generated-resumes/${libraryItem.jobId}/download`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })

            if (!response.ok) {
                const error = await response.text();
                console.error("Error getting signed URL: ", error);
                toast.error("Error downloading resume. Try again later")
                return
            }

            const data: SignedURLResponse = await response.json()
            const signedUrl = data.signedURL;
            if (!signedUrl) {
                console.error("Signed URL missing from response:", data);
                toast.error("Error downloading resume. Try again later")
                return;
            }
            const fileResponse = await fetch(signedUrl);
            if (!fileResponse.ok) {
                console.error("Error downloading file from signed URL");
                toast.error("Error downloading resume. Try again later")
                return;
            }

            const blob = await fileResponse.blob();
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;

            const date = new Date().toISOString().slice(0, 10)
            const safeCompany = libraryItem.companyName.replace(/[^\w.-]+/g, "_");
            const safeTitle = libraryItem.jobTitle.replace(/[^\w.-]+/g, "_");

            a.download = `${safeCompany}_${safeTitle}_${date}.docx`;

            document.body.appendChild(a);
            a.click();
            a.remove();

            window.URL.revokeObjectURL(url);
            toast.success("Resume download started...")

        } catch (error) {
            console.log("Error: ", error);
            toast.error("Error downloading resume. Try again later")
            return
        }

    }


    const deleteSavedResume = async () => {
        if (!token) {
            toast.error("Error: User JWK token does not exist")
            return
        }

        const deletePromise = async () => {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/generated-resumes/${libraryItem.jobId}/delete`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })

            if (!response.ok) {
                const error = await response.text();
                console.error("Error getting signed URL: ", error);
                throw new Error("Failed to delete resume");
            }

            onResumeSaved(prevState => !prevState)
        }
        toast.promise(deletePromise(), {
            loading: "Deleting resume...",
            success: "Resume deleted successfully",
            error: "Error deleting resume. Try again later",

        })


    }


    const convertDateToString = (dateString?: string) => {
        if (!dateString) {
            return "Not Generated"
        }

        const date = new Date(dateString).toDateString().split(" ")
        return date.slice(1, date.length).join(" ").toString()
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
                        <p className={"font-semibold text-black/60 text-xs"}>{libraryItem.jobStatus}</p>
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
                {libraryItem.resume.exists ?
                    <div>
                        <div className={"flex items-center justify-start gap-x-2"}>
                            <DocumentCheckIcon className={"text-blue-700"} width={16} height={16}/>
                            <p className={"font-semibold text-md"}>Resume ready</p>
                        </div>
                        <p className={"text-sm font-medium text-black/60"}>Updated: {convertDateToString(libraryItem.resume.updatedAt)}</p>

                    </div>


                    :
                    <div className={"flex items-center justify-center gap-x-2 text-black/60"}>
                        <DocumentIcon width={16} height={16}/>
                        <p className={"text-sm font-medium"}>No resume generated</p>
                    </div>
                }

            </div>


            <div className={"flex items-center gap-x-3 justify-end"}>
                {libraryItem.resume.exists ?
                    <>
                        <ArrowDownTrayIcon onClick={downloadSavedResume} className={"hover:cursor-pointer"} width={18}
                                           height={18}/>
                        <ArrowPathIcon width={18} height={18} className={"hover:cursor-pointer"}
                                       onClick={() => setGeneratorOpen(true)}/>
                        <TrashIcon className={"hover:cursor-pointer"} onClick={deleteSavedResume} width={18}
                                   height={18}/>
                    </>
                    :

                    <button disabled={generatorOpen} onClick={() => setGeneratorOpen(true)}
                            className={"flex items-center hover:cursor-pointer px-2 py-2 gap-x-1.5 rounded-md bg-blue-700 text-white justify-center"}>
                        <SparklesIcon width={16} height={16}/>
                        <p className={"font-semibold text-xs"}>Generate Resume</p>
                    </button>
                }
            </div>

            {
                generatorOpen && <DashboardGenerateResumePopup onResumeSaved={onResumeSaved} job={libraryItem}
                                                               setOpen={setGeneratorOpen}/>
            }
        </div>
    )
}