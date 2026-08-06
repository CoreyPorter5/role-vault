import {JobLibraryItemDraft} from "./schema";

import Image from "next/image";
import globeSVG from "../../public/globe.svg"

import {useJWKTokenAndUserAndSidebar} from "../Dashboard/Context/DashboardContextProvider";
import {Dispatch, SetStateAction, useState} from "react";
import {DocumentCheckIcon} from "@heroicons/react/24/outline";
import {ArrowDownTrayIcon, BookmarkIcon, TrashIcon} from "@heroicons/react/24/outline";
import {toast} from "sonner";
import {TailoredResume} from "@/app/api/generate-resume/schema";
import {captureAppError} from "@/lib/sentry/captureAppError";
import JobStatusBadge from "../JobStatusBadge";
import ConfirmationDialog from "../ui/ConfirmationDialog";


type ResumeLibraryCardProps = {
    onLibraryChanged: Dispatch<SetStateAction<boolean>>;
    libraryItem: JobLibraryItemDraft;
}


export default function DraftResumeLibraryCard({onLibraryChanged, libraryItem}: ResumeLibraryCardProps) {

    const {sidebarOpen, token, user} = useJWKTokenAndUserAndSidebar();
    const [generatedResume, setGeneratedResume] = useState<TailoredResume | null>(null)
    const [generatedResumeFile, setGeneratedResumeFile] = useState<File | null>(null)
    const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
    const [deletingDraft, setDeletingDraft] = useState(false);


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
            captureAppError({
                message: "Failed to get draft resume JSON",
                area: "draft_resume_library",
                action: "get_draft_resume_json",
                endpoint: `/api/v1/generated-resume-drafts/${libraryItem.draftId}`,
                status: response.status,
                statusText: response.statusText,
                extra: {
                    jobId: libraryItem.jobId,
                    userId: user?.id,
                    draftId: libraryItem.draftId,
                    error,
                }
            })
            console.error("Error loading draft resume JSON: ", error)
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

            const saveResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/generated-resumes/${libraryItem.jobId}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData,
            })

            if (!saveResponse.ok) {
                const error = await saveResponse.text()
                captureAppError({
                    message: "Failed to save draft to library",
                    area: "draft_resume_library",
                    action: "save_draft_resume_to_library",
                    endpoint: `/api/v1/generated-resumes/${libraryItem.jobId}`,
                    status: saveResponse.status,
                    statusText: saveResponse.statusText,
                    extra: {
                        jobId: libraryItem.jobId,
                        userId: user?.id,
                        draftId: libraryItem.draftId,
                        error
                    }
                })
                console.error("Error saving resume to library: ", error)
                throw new Error("Error saving resume to library")
            }

            const deleteResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/generated-resume-drafts/jobs/${libraryItem.jobId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })

            if (!deleteResponse.ok && deleteResponse.status !== 404) {
                const error = await deleteResponse.text()

                captureAppError({
                    message: "Failed to delete draft resume after saving to library",
                    area: "draft_resume_library",
                    action: "delete_draft_resume_after_save",
                    endpoint: `/api/v1/generated-resume-drafts/jobs/${libraryItem.jobId}`,
                    status: deleteResponse.status,
                    statusText: deleteResponse.statusText,
                    extra: {
                        jobId: libraryItem.jobId,
                        userId: user?.id,
                        draftId: libraryItem.draftId,
                        error,
                    }
                })


                console.error("Resume saved to library, but failed to delete draft: ", error)
            }

            setGeneratedResumeFile(file)


            onLibraryChanged(prevState => !prevState);


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
                captureAppError({
                    message: "Failed to export draft resume as DOCX",
                    area: "draft_resume_library",
                    action: "export_draft_resume_docx",
                    endpoint: "/api/export-resume-docx",
                    status: response.status,
                    statusText: response.statusText,
                    extra: {
                        draftId: libraryItem.draftId,
                        jobId: libraryItem.jobId,
                        error,
                        userId: user?.id
                    }
                })
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
        try {
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

        } catch (error) {
            captureAppError({
                message: "Unexpected error downloading draft resume DOCX",
                error,
                area: "draft_resume_library",
                action: "download_draft_resume_docx",
                endpoint: "/api/export-resume-docx",
                extra: {
                    jobId: libraryItem.jobId,
                    draftId: libraryItem.draftId,
                    userId: user?.id
                }
            })
            console.error("Error downloading draft resume: ", error);
            toast.error("Error downloading draft resume. Try again later")

        }


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
            const deleteResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/generated-resume-drafts/jobs/${libraryItem.jobId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })

            if (!deleteResponse.ok) {
                const error = await deleteResponse.text()
                captureAppError({
                    message: "Failed to delete draft resume",
                    area: "draft_resume_library",
                    action: "delete_draft_resume_from_library",
                    endpoint: `/api/v1/generated-resume-drafts/jobs/${libraryItem.jobId}`,
                    status: deleteResponse.status,
                    statusText: deleteResponse.statusText,
                    extra: {
                        jobId: libraryItem.jobId,
                        userId: user?.id,
                        draftId: libraryItem.draftId,
                        error,
                    }
                })
                console.error("Error deleting resume: ", error)
                throw new Error("Error deleting resume")
            }

            onLibraryChanged(prevState => !prevState)
        }
        const deletion = deletePromise();
        toast.promise(deletion, {
            loading: "Deleting draft resume...",
            success: "Draft resume deleted successfully",
            error: "Error deleting draft resume. Try again later",

        })
        setDeletingDraft(true);
        try {
            await deletion;
            setDeleteConfirmationOpen(false);
        } catch {
            // The toast reports the failure and the dialog stays open for a retry.
        } finally {
            setDeletingDraft(false);
        }
    }


    return (
        <div
            className="grid w-full grid-cols-1 items-center gap-x-6 gap-y-4 rounded-md bg-white px-4 py-4 shadow-md md:grid-cols-[minmax(0,1.8fr)_minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,0.8fr)]">

            <div className={"flex items-center gap-x-4 min-w-0"}>
                <Image width={42} height={42} className={"shrink-0"} alt={libraryItem.companyName}
                       src={libraryItem.companyLogo ?? globeSVG}></Image>
                <div className={"flex flex-col gap-y-0.5"}>
                    <p className={"text-sm font-bold"}>{shortenJobTitle(libraryItem.jobTitle)}</p>
                    <p className={"text-xs text-black/50 truncate"}>{libraryItem.companyName}</p>
                </div>
            </div>


            <div className={"flex text-center gap-x-2 justify-start items-center"}>
                <JobStatusBadge
                    status={libraryItem.jobStatus}
                    suffix={libraryItem.jobStatus === "Saved" ? "DRAFT" : undefined}
                />
            </div>
            <div className={"flex text-center gap-x-2 justify-start items-center"}>
                <div className={"flex flex-col items-center justify-start"}>
                    <div className={"flex items-center justify-start gap-x-2"}>
                        <DocumentCheckIcon className={"opacity-50"} width={16} height={16}/>
                        <p className={"font-semibold text-md"}>Draft Resume</p>
                    </div>
                    <p className={"text-sm self-start font-medium text-black/60"}>Expires: {daysUntil(libraryItem.draftExpiresAt)}</p>

                </div>
            </div>


            <div className="flex items-center justify-start gap-x-3 md:justify-end">
                <BookmarkIcon onClick={handleSaveDraftToLibrary} width={18} height={18}
                              className={"hover:cursor-pointer"}/>
                <ArrowDownTrayIcon onClick={downloadDocx} className={"hover:cursor-pointer"} width={18}
                                   height={18}/>
                <button
                    type="button"
                    aria-label={`Delete draft resume for ${libraryItem.jobTitle}`}
                    title="Delete draft resume"
                    onClick={() => setDeleteConfirmationOpen(true)}
                    className="rounded-md p-1 text-slate-500 hover:bg-red-50 hover:text-red-600"
                >
                    <TrashIcon width={18} height={18}/>
                </button>
            </div>
            <ConfirmationDialog
                open={deleteConfirmationOpen}
                title="Delete this draft resume?"
                description={`This permanently removes the unsaved draft for ${libraryItem.jobTitle}. This action cannot be undone.`}
                confirmLabel="Delete draft"
                busy={deletingDraft}
                onCancel={() => setDeleteConfirmationOpen(false)}
                onConfirm={deleteDraftResume}
            />
        </div>
    )
}
