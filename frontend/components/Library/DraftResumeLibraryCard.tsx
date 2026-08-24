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
import DashboardGenerateResumePopup from "../Dashboard/ResumeGenerator/DashboardGenerateResumePopup";
import {DocumentTextIcon} from "@heroicons/react/24/outline";


type ResumeLibraryCardProps = {
    onLibraryChanged: Dispatch<SetStateAction<boolean>>;
    libraryItem: JobLibraryItemDraft;
}


export default function DraftResumeLibraryCard({onLibraryChanged, libraryItem}: ResumeLibraryCardProps) {

    const {token, user} = useJWKTokenAndUserAndSidebar();
    const [generatedResume, setGeneratedResume] = useState<TailoredResume | null>(null)
    const [generatedResumeFile, setGeneratedResumeFile] = useState<File | null>(null)
    const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
    const [deletingDraft, setDeletingDraft] = useState(false);
    const [coverLetterOpen, setCoverLetterOpen] = useState(false);


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
                    resumeCategory: libraryItem.resumeCategory,
                    profileVersion: libraryItem.profileVersion,
                    templateVersion: libraryItem.templateVersion,
                })
            })
            if (!response.ok) {
                const exportError = new Error("Resume export request failed") as Error & {status?: number};
                exportError.status = response.status;
                throw exportError
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
        } catch (error) {
            const status = error instanceof Error && "status" in error
                ? (error as Error & {status?: number}).status
                : undefined;
            if (status === undefined) {
                captureAppError({
                    code: "WEB_DOCX_EXPORT_CLIENT_FAILED",
                    message: "Client failed to receive the draft resume DOCX",
                    error,
                    area: "draft_resume_library",
                    action: "export_draft_resume_docx",
                    endpoint: "/api/export-resume-docx",
                })
            }
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


    const formatExpiry = (dateString?: string) => {
        if (!dateString) {
            return "Expiry unavailable"
        }

        const expiryDate = new Date(dateString)
        const now = new Date()

        const diffMs = expiryDate.getTime() - now.getTime()
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
        if (diffDays < 0) {
            return "Expired"
        }
        if (diffDays === 0) {
            return "Expires today"
        }

        if (diffDays === 1) {
            return "Expires in 1 day"
        }
        return `Expires in ${diffDays} days`
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
            className="app-panel grid min-h-24 w-full grid-cols-1 items-center gap-x-5 gap-y-4 p-4 hover:border-[#b7c7df] sm:grid-cols-[minmax(0,1fr)_auto] sm:px-5 xl:grid-cols-[minmax(0,1.75fr)_minmax(7.5rem,0.45fr)_minmax(10rem,0.75fr)_minmax(9rem,0.7fr)_minmax(14rem,0.65fr)]">

            <div className="flex min-w-0 items-center gap-x-4">
                <Image width={42} height={42} className="size-10 shrink-0 object-contain" alt={libraryItem.companyName}
                       src={libraryItem.companyLogo ?? globeSVG}></Image>
                <div className="min-w-0 flex-1">
                    <p title={libraryItem.jobTitle} className="truncate text-sm font-semibold text-[#242932]">{libraryItem.jobTitle}</p>
                    <p className="truncate text-xs text-[#747982]">{libraryItem.companyName}</p>
                </div>
            </div>


            <div className="flex items-center justify-start text-left sm:justify-end xl:justify-start">
                <JobStatusBadge status={libraryItem.jobStatus}/>
            </div>
            <div className="flex min-w-0 items-center justify-start text-left">
                <div className="min-w-0">
                    <div className="flex items-center justify-start gap-x-2">
                        <DocumentCheckIcon className="size-4 shrink-0 text-[#2563EB]"/>
                        <p className="text-xs font-semibold text-[#30353d]">Resume draft</p>
                    </div>
                    <p className="mt-0.5 whitespace-nowrap text-xs font-medium text-[#747982]">{formatExpiry(libraryItem.draftExpiresAt)}</p>

                </div>
            </div>
            <button type="button" onClick={() => setCoverLetterOpen(true)}
                        className="-ml-2 flex min-w-0 w-fit items-center gap-2 rounded-md p-2 text-left text-xs font-semibold leading-4 text-[#2563EB] hover:bg-[#f5f4f0] hover:text-[#1D4ED8]">
                    <DocumentTextIcon className="size-4 shrink-0"/>
                    <span>
                    {libraryItem.coverLetter?.status === "saved"
                        ? "Cover letter saved"
                        : libraryItem.coverLetter?.status === "draft"
                            ? "Cover letter draft"
                            : "Add cover letter"}
                    </span>
            </button>


            <div className="flex items-center justify-start gap-x-2 sm:col-span-2 sm:justify-end xl:col-span-1">
                <button type="button" aria-label="Save draft to library" title="Save draft to library" onClick={handleSaveDraftToLibrary} className="inline-flex size-10 items-center justify-center rounded-md text-slate-600 hover:bg-[#f5f4f0] hover:text-[#2563EB]">
                    <BookmarkIcon className="size-[18px]"/>
                </button>
                <button type="button" aria-label="Download draft" title="Download draft" onClick={downloadDocx} className="inline-flex size-10 items-center justify-center rounded-md text-slate-600 hover:bg-[#f5f4f0] hover:text-[#2563EB]">
                    <ArrowDownTrayIcon className="size-[18px]"/>
                </button>
                <button
                    type="button"
                    aria-label={`Delete draft resume for ${libraryItem.jobTitle}`}
                    title="Delete draft resume"
                    onClick={() => setDeleteConfirmationOpen(true)}
                    className="inline-flex size-10 items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600"
                >
                    <TrashIcon className="size-[18px]"/>

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
            {coverLetterOpen && (
                <DashboardGenerateResumePopup
                    onResumeSaved={onLibraryChanged}
                    job={{...libraryItem, resume: {exists: false}}}
                    setOpen={setCoverLetterOpen}
                    initialDocument="cover-letter"
                />
            )}
        </div>
    )
}
