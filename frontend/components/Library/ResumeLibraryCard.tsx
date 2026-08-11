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
import {captureAppError} from "@/lib/sentry/captureAppError";
import JobStatusBadge from "../JobStatusBadge";
import ConfirmationDialog from "../ui/ConfirmationDialog";

type ResumeLibraryCardProps = {
    onLibraryChanged: Dispatch<SetStateAction<boolean>>;
    libraryItem: JobLibraryItem;
}

type SignedURLResponse = {
    signedURL?: string
}

export default function ResumeLibraryCard({onLibraryChanged, libraryItem}: ResumeLibraryCardProps) {

    const {token, sidebarOpen, user} = useJWKTokenAndUserAndSidebar();
    const [generatorOpen, setGeneratorOpen] = useState<boolean>(false)
    const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
    const [deletingResume, setDeletingResume] = useState(false);

    const downloadSavedResume = async () => {
        if (!token) {
            console.error("Error: User JWK token does not exist")
            return
        }

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/generated-resumes/${libraryItem.jobId}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })

            if (!response.ok) {
                const error = await response.text();
                captureAppError({
                    message: "Failed to get signed URL for generated resume download",
                    area: "resume_library",
                    action: "get_resume_signed_url",
                    endpoint: `/api/v1/generated-resumes/${libraryItem.jobId}`,
                    status: response.status,
                    statusText: response.statusText,
                    extra: {
                        jobId: libraryItem.jobId,
                        userId: user?.id,
                        error,
                    }
                })
                console.error("Error getting signed URL: ", error);
                toast.error("Error downloading resume. Try again later")
                return
            }

            const data: SignedURLResponse = await response.json()
            const signedUrl = data.signedURL;
            if (!signedUrl) {
                captureAppError({
                    message: "Signed URL missing from generated resume download response",
                    area: "resume_library",
                    action: "get_resume_signed_url",
                    endpoint: `/api/v1/generated-resumes/${libraryItem.jobId}`,
                    extra: {
                        jobId: libraryItem.jobId,
                        userId: user?.id,
                    }
                })
                console.error("Signed URL missing from response:", data);
                toast.error("Error downloading resume. Try again later")
                return;
            }
            const fileResponse = await fetch(signedUrl);
            if (!fileResponse.ok) {
                captureAppError({
                    message: "Failed to download resume file from signed URL",
                    area: "resume_library",
                    action: "download_resume_file",
                    endpoint: `signed_resume_url`,
                    status: fileResponse.status,
                    statusText: fileResponse.statusText,
                    extra: {
                        jobId: libraryItem.jobId,
                        userId: user?.id,
                        hasSignedUrl: Boolean(signedUrl),
                    }
                })
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
            captureAppError({
                message: "Unexpected error downloading saved resume",
                error,
                area: "resume_library",
                action: "download_resume_from_library",
                endpoint: `/api/v1/generated-resumes/${libraryItem.jobId}`,
                extra: {
                    jobId: libraryItem.jobId,
                    userId: user?.id
                }
            })
            console.error("Error downloading resume: ", error);
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
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/generated-resumes/${libraryItem.jobId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })

            if (!response.ok) {
                const error = await response.text();
                if (response.status !== 404) {
                    captureAppError({
                        message: "Failed to delete resume from library",
                        area: "resume_library",
                        action: "delete_resume_from_library",
                        endpoint: `/api/v1/generated-resumes/${libraryItem.jobId}`,
                        status: response.status,
                        statusText: response.statusText,
                        extra: {
                            jobId: libraryItem.jobId,
                            userId: user?.id,
                            error,
                        }
                    })
                }
                console.error("Error deleting resume: ", error);
                throw new Error("Failed to delete resume");
            }

            onLibraryChanged(prevState => !prevState)
        }
        const deletion = deletePromise();
        toast.promise(deletion, {
            loading: "Deleting resume...",
            success: "Resume deleted successfully",
            error: "Error deleting resume. Try again later",

        })
        setDeletingResume(true);
        try {
            await deletion;
            setDeleteConfirmationOpen(false);
        } catch {
            // The toast reports the failure and the dialog stays open for a retry.
        } finally {
            setDeletingResume(false);
        }
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
            className="app-panel grid w-full grid-cols-1 items-center gap-x-6 gap-y-4 px-4 py-4 hover:border-[#b7c7df] md:grid-cols-[minmax(0,1.8fr)_minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,0.8fr)]">

            <div className={"flex items-center gap-x-4 min-w-0"}>
                <Image width={42} height={42} className={"shrink-0"} alt={libraryItem.companyName}
                       src={libraryItem.companyLogo ?? globeSVG}></Image>
                <div className={"flex flex-col gap-y-0.5"}>
                    <p className="text-sm font-semibold text-[#242932]">{shortenJobTitle(libraryItem.jobTitle)}</p>
                    <p className="truncate text-xs text-[#747982]">{libraryItem.companyName}</p>
                </div>
            </div>


            <div className={"flex text-center gap-x-2 justify-start items-center"}>
                <JobStatusBadge status={libraryItem.jobStatus}/>
            </div>


            <div className={"flex text-center gap-x-2 justify-start items-center"}>
                {libraryItem.resume.exists ?
                    <div>
                        <div className={"flex items-center justify-start gap-x-2"}>
                            <DocumentCheckIcon className="text-[#0D3880]" width={16} height={16}/>
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


            <div className="flex items-center justify-start gap-x-3 md:justify-end">
                {libraryItem.resume.exists ?
                    <>
                        <ArrowDownTrayIcon onClick={downloadSavedResume} className={"hover:cursor-pointer"} width={18}
                                           height={18}/>
                        <ArrowPathIcon width={18} height={18} className={"hover:cursor-pointer"}
                                       onClick={() => setGeneratorOpen(true)}/>
                        <button
                            type="button"
                            aria-label={`Delete resume for ${libraryItem.jobTitle}`}
                            title="Delete resume"
                            onClick={() => setDeleteConfirmationOpen(true)}
                            className="rounded-md p-1 text-slate-500 hover:bg-red-50 hover:text-red-600"
                        >
                            <TrashIcon width={18} height={18}/>
                        </button>
                    </>
                    :

                    <button disabled={generatorOpen} onClick={() => setGeneratorOpen(true)}
                            className="flex items-center justify-center gap-x-1.5 rounded-lg bg-[#0D3880] px-3 py-2 text-white hover:bg-[#08285f]">
                        <SparklesIcon width={16} height={16}/>
                        <p className={"font-semibold text-xs"}>Generate Resume</p>
                    </button>
                }
            </div>

            {
                generatorOpen && <DashboardGenerateResumePopup onResumeSaved={onLibraryChanged} job={libraryItem}
                                                               setOpen={setGeneratorOpen}/>
            }
            <ConfirmationDialog
                open={deleteConfirmationOpen}
                title="Delete this saved resume?"
                description={`This permanently removes the tailored resume for ${libraryItem.jobTitle}. The job remains in your application pipeline.`}
                confirmLabel="Delete resume"
                busy={deletingResume}
                onCancel={() => setDeleteConfirmationOpen(false)}
                onConfirm={deleteSavedResume}
            />
        </div>
    )
}
