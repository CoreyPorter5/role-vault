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

    const {token, user} = useJWKTokenAndUserAndSidebar();
    const [generatorOpen, setGeneratorOpen] = useState<boolean>(false)
    const [generatorDocument, setGeneratorDocument] = useState<"resume" | "cover-letter">("resume")
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
                {libraryItem.resume.exists ?
                    <div className="min-w-0">
                        <div className="flex items-center justify-start gap-x-2">
                            <DocumentCheckIcon className="size-4 shrink-0 text-[#0D3880]"/>
                            <p className="text-xs font-semibold text-[#30353d]">Resume ready</p>
                        </div>
                        <p className="mt-0.5 whitespace-nowrap text-xs font-medium text-[#747982]">Updated {convertDateToString(libraryItem.resume.updatedAt)}</p>

                    </div>


                    :
                    <div className="flex min-w-0 items-center gap-x-2 text-[#747982]">
                        <DocumentIcon className="size-4 shrink-0"/>
                        <p className="text-xs font-medium leading-5">No resume generated</p>
                    </div>
                }
            </div>

            <button type="button" onClick={() => {
                    setGeneratorDocument("cover-letter")
                    setGeneratorOpen(true)
                }} className="-ml-2 flex min-w-0 w-fit items-center gap-2 rounded-md p-2 text-left text-xs font-semibold leading-4 text-[#0D3880] hover:bg-[#f5f4f0] hover:text-[#08285f]">
                    <DocumentIcon className="size-4 shrink-0"/>
                    <span>
                    {libraryItem.coverLetter?.status === "saved"
                        ? "Cover letter saved"
                        : libraryItem.coverLetter?.status === "draft"
                            ? "Cover letter draft"
                            : "Add cover letter"}
                    </span>
            </button>


            <div className="flex items-center justify-start gap-x-2 sm:col-span-2 sm:justify-end xl:col-span-1">
                {libraryItem.resume.exists ?
                    <>
                        <button type="button" aria-label="Download resume" title="Download resume" onClick={downloadSavedResume} className="inline-flex size-10 items-center justify-center rounded-md text-slate-600 hover:bg-[#f5f4f0] hover:text-[#0D3880]">
                            <ArrowDownTrayIcon className="size-[18px]"/>
                        </button>
                        <button type="button" aria-label="Tailor another resume" title="Tailor another resume" onClick={() => {
                            setGeneratorDocument("resume")
                            setGeneratorOpen(true)
                        }} className="inline-flex size-10 items-center justify-center rounded-md text-slate-600 hover:bg-[#f5f4f0] hover:text-[#0D3880]">
                            <ArrowPathIcon className="size-[18px]"/>
                        </button>
                        <button
                            type="button"
                            aria-label={`Delete resume for ${libraryItem.jobTitle}`}
                            title="Delete resume"
                            onClick={() => setDeleteConfirmationOpen(true)}
                            className="inline-flex size-10 items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600"
                        >
                            <TrashIcon className="size-[18px]"/>
                        </button>
                    </>
                    :

                    <button disabled={generatorOpen} onClick={() => {
                                setGeneratorDocument("resume")
                                setGeneratorOpen(true)
                            }}
                            className="flex w-full items-center justify-center gap-x-1.5 rounded-lg bg-[#0D3880] px-3 py-2.5 text-white hover:bg-[#08285f] sm:w-auto">
                        <SparklesIcon width={16} height={16}/>
                        <p className={"font-semibold text-xs"}>Generate Resume</p>
                    </button>
                }
            </div>

            {
                generatorOpen && <DashboardGenerateResumePopup onResumeSaved={onLibraryChanged} job={libraryItem}
                                                               setOpen={setGeneratorOpen}
                                                               initialDocument={generatorDocument}/>
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
