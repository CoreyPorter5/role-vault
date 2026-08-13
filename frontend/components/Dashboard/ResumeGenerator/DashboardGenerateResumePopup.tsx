import {Job} from "@/lib/types/types";
import {Dispatch, SetStateAction, useEffect, useRef, useState} from "react";
import {XIcon, LoaderCircle} from "lucide-react";
import {useJWKTokenAndUserAndSidebar} from "../Context/DashboardContextProvider";
import type {TailoredResume} from "@/app/api/generate-resume/schema";
import {DocumentTextIcon, SparklesIcon} from "@heroicons/react/24/outline";
import {JobLibraryItem} from "../../Library/schema";
import {toast} from 'sonner'
import {ResumePayload} from "../../Resume/schema";
import {ResumeGenerationUsage} from "./types";
import {captureAppError} from "@/lib/sentry/captureAppError";
import ResumeCategorySelector from "./ResumeCategorySelector";
import {
    getResumeCategoryDefinition,
    resumeCategorySchema,
    type ResumeCategory,
} from "@/lib/resume-generation/categories";
import {getResumeProfile} from "@/lib/resume-generation/profiles";
import {getJobClassificationFailureNotice} from "@/lib/resume-generation/classification-policy";
import CoverLetterPanel from "./CoverLetterPanel";
import GeneratedResumeReviewPanel, {type ResumeReviewAction} from "./GeneratedResumeReviewPanel";
import InlineErrorMessage from "../../ui/InlineErrorMessage";


type DashboardGenerateResumePopupProps = {
    job: Job | JobLibraryItem;
    setOpen: Dispatch<SetStateAction<boolean>>;
    onResumeSaved?: Dispatch<SetStateAction<boolean>>;
    initialDocument?: "resume" | "cover-letter";

}


export default function DashboardGenerateResumePopup({
    job,
    setOpen,
    onResumeSaved,
    initialDocument = "resume",
}: DashboardGenerateResumePopupProps) {
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [generatedResume, setGeneratedResume] = useState<TailoredResume | null>(null)
    const [generatedResumeFile, setGeneratedResumeFile] = useState<File | null>(null)
    const [masterResume, setMasterResume] = useState<ResumePayload | null>(null)
    const {token, user} = useJWKTokenAndUserAndSidebar();
    const [masterResumeLoading, setMasterResumeLoading] = useState<boolean>(true)
    const [resumeGenerationUsage, setResumeGenerationUsage] = useState<ResumeGenerationUsage | null>(null)
    const [shouldRefreshOnClose, setShouldRefreshOnClose] = useState<boolean>(false)
    const [resumeGenerationLoading, setResumeGenerationLoading] = useState<boolean>(false)
    const [selectedCategory, setSelectedCategory] = useState<ResumeCategory | null>(null)
    const [suggestedCategory, setSuggestedCategory] = useState<ResumeCategory | null>(null)
    const [categoryLoading, setCategoryLoading] = useState<boolean>(true)
    const [categorySaving, setCategorySaving] = useState<boolean>(false)
    const [categoryNotice, setCategoryNotice] = useState<string | null>(null)
    const [generatedMetadata, setGeneratedMetadata] = useState<GeneratedResumeMetadata | null>(null)
    const generationIDRef = useRef<string | null>(null)
    const [activeDocument, setActiveDocument] = useState<"resume" | "cover-letter">(initialDocument)
    const [coverLetterBusy, setCoverLetterBusy] = useState(false)
    const [resumeReviewAction, setResumeReviewAction] = useState<ResumeReviewAction>(null)
    const documentInteractionLocked = resumeGenerationLoading || coverLetterBusy || resumeReviewAction !== null


    useEffect(() => {
        let cancelled = false;

        if (activeDocument !== "resume") {
            return () => { cancelled = true }
        }

        const applyClassification = (payload: CategoryClassificationResponse) => {
            if (cancelled) {
                return false
            }
            const categoryResult = resumeCategorySchema.safeParse(payload.category);
            if (categoryResult.success) {
                setSelectedCategory(categoryResult.data)
                if (payload.source === "ai") {
                    setSuggestedCategory(categoryResult.data)
                }
                setCategoryNotice(null)
                return true
            }
            if (payload.status === "failed") {
                setCategoryNotice(getJobClassificationFailureNotice(payload.failureCode))
                return true
            }
            return false
        }

        const getPersistedClassification = async (): Promise<CategoryClassificationResponse | null> => {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/jobs/${encodeURIComponent(job.jobId)}/resume-category`,
                {headers: {"Authorization": `Bearer ${token}`}},
            )
            if (!response.ok) {
                return null
            }
            const state = await response.json() as {
                status: CategoryClassificationResponse["status"];
                category: ResumeCategory | null;
                source: CategoryClassificationResponse["source"];
                confidence: number | null;
                failure_code?: string | null;
            }
            return {
                status: state.status,
                category: state.category,
                source: state.source,
                confidence: state.confidence,
                failureCode: state.failure_code ?? null,
                requiresSelection: state.status !== "classified" || !state.category,
            }
        }

        const loadCategory = async () => {
            if (!token) {
                setCategoryLoading(false)
                setCategoryNotice("Choose a job type to continue.")
                return
            }

            setCategoryLoading(true)
            try {
                const response = await fetch("/api/classify-job", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({jobID: job.jobId}),
                })
                const payload = await response.json().catch(() => null) as CategoryClassificationResponse | null

                if ((response.ok || response.status === 202) && payload && applyClassification(payload)) {
                    return
                }

                if (response.status === 202) {
                    for (let attempt = 0; attempt < 25 && !cancelled; attempt++) {
                        await new Promise(resolve => setTimeout(resolve, 1_000))
                        const persisted = await getPersistedClassification()
                        if (persisted && applyClassification(persisted)) {
                            return
                        }
                    }
                    if (!cancelled) {
                        setCategoryNotice("Automatic job classification is taking longer than expected. Choose a job type to continue.")
                    }
                    return
                }

                if (!response.ok && !cancelled) {
                    setCategoryNotice("Automatic job classification is temporarily unavailable. Choose a job type to continue.")
                }
            } catch (error) {
                if (!cancelled) {
                    setCategoryNotice("Automatic job classification is unavailable. Choose a job type to continue.")
                    captureAppError({
                        message: "Failed to classify job for resume generation",
                        error,
                        area: "resume_generator",
                        action: "classify_job",
                        endpoint: "/api/classify-job",
                        extra: {jobId: job.jobId, userId: user?.id},
                    })
                }
            } finally {
                if (!cancelled) {
                    setCategoryLoading(false)
                }
            }
        }

        loadCategory()
        return () => {
            cancelled = true
        }
    }, [activeDocument, job.jobId, token, user?.id]);


    useEffect(() => {
        const getUserGenerationUsage = async () => {
            if (!token) {
                return
            }

            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/usage/resume-generations`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                })

                if (response.ok) {
                    const resumeUsageData: ResumeGenerationUsage = await response.json();
                    if (resumeUsageData) {
                        setResumeGenerationUsage(resumeUsageData)
                    }
                } else {
                    const error = await response.text();
                    captureAppError({
                        message: "Failed to fetch resume generation usage",
                        area: "resume_generator",
                        action: "get_user_generation_usage",
                        endpoint: "/api/v1/usage/resume-generations",
                        status: response.status,
                        statusText: response.statusText,
                        extra: {
                            jobId: job.jobId,
                            error,
                            userId: user?.id
                        }
                    })
                    console.log("Error fetching user resume generation usage: ", response.status)
                    setResumeGenerationUsage(null)
                    return
                }
            } catch (error) {
                console.error("Error fetching user resume generation usage: ", error)
                return
            }
        }

        getUserGenerationUsage()

    }, [job.jobId, token, user?.id]);


    useEffect(() => {

        const fetchResume = async () => {
            if (!token) {
                setMasterResume(null)
                setMasterResumeLoading(false)
                return
            }


            setMasterResumeLoading(true)
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/resume`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }

                })
                if (response.ok) {
                    const resumeData: ResumePayload = await response.json();
                    if (resumeData) {
                        setMasterResume(resumeData)
                    }
                } else {
                    const error = await response.text()
                    captureAppError({
                        message: "Failed to fetch user master resume",
                        area: "resume_generator",
                        action: "fetch_user_master_resume_for_generation",
                        endpoint: "/api/v1/resume",
                        status: response.status,
                        statusText: response.statusText,
                        extra: {
                            jobId: job.jobId,
                            error,
                            userId: user?.id
                        }
                    })
                    console.log("Error fetching user resume: ", response.status)
                    setMasterResume(null)
                    return
                }

            } catch (error) {
                captureAppError({
                    message: "Unexpected error fetching user master resume",
                    error,
                    area: "resume_generator",
                    action: "fetch_user_master_resume_for_generation",
                    endpoint: "/api/v1/resume",
                    extra: {
                        jobId: job.jobId,
                        userId: user?.id
                    }
                })
                console.error("Error fetching user resume: ", error)
                setMasterResume(null)
            } finally {
                setMasterResumeLoading(false)
            }


        }
        fetchResume()
    }, [job.jobId, token, user?.id]);


    useEffect(() => {
        if (!resumeGenerationLoading && !coverLetterBusy) {
            return
        }
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault()
        }
        window.addEventListener("beforeunload", handleBeforeUnload)
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload)
        }
    }, [coverLetterBusy, resumeGenerationLoading]);

    const closePopup = () => {
        if (documentInteractionLocked) {
            return
        }
        setOpen(false);
        if (shouldRefreshOnClose && onResumeSaved) {
            onResumeSaved(prevState => !prevState)
        }
    }

    const selectDocument = (document: "resume" | "cover-letter") => {
        if (documentInteractionLocked) {
            return
        }
        setActiveDocument(document)
    }


    const handleCategorySelect = async (category: ResumeCategory) => {
        if (!token || categorySaving || category === selectedCategory) {
            return
        }

        const previousCategory = selectedCategory
        setSelectedCategory(category)
        setCategoryNotice(null)
        setCategorySaving(true)
        generationIDRef.current = null
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/jobs/${encodeURIComponent(job.jobId)}/resume-category`,
                {
                    method: "PATCH",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({category}),
                },
            )
            if (!response.ok) {
                const categoryError = new Error("Could not save the selected job type") as Error & {status?: number};
                categoryError.status = response.status;
                throw categoryError
            }
            const payload = await response.json() as {category?: unknown}
            const parsedCategory = resumeCategorySchema.safeParse(payload.category)
            if (!parsedCategory.success) {
                throw new Error("The server returned an invalid job type")
            }
            setSelectedCategory(parsedCategory.data)
        } catch (error) {
            setSelectedCategory(previousCategory)
            setCategoryNotice("We could not save that job type. Please try again.")
            const status = error instanceof Error && "status" in error
                ? (error as Error & {status?: number}).status
                : undefined;
            if (status === undefined) {
                captureAppError({
                    code: "WEB_RESUME_CATEGORY_UPDATE_CLIENT_FAILED",
                    message: "Failed to save manual resume category",
                    error,
                    area: "resume_generator",
                    action: "set_resume_category",
                    endpoint: "/api/v1/jobs/:id/resume-category",
                })
            }
        } finally {
            setCategorySaving(false)
        }
    }


    const handleGenerate = () => {
        setGenerationError(null)

        if (!token) {
            toast.error("Your session has expired. Please log in again.")
            return
        }

        if (!masterResume) {
            toast.error("Upload a master resume before generating tailored resumes.")
            return

        }

        if (!selectedCategory) {
            toast.error("Choose a job type before generating your resume.")
            return
        }

        const selectedProfile = getResumeProfile(selectedCategory)

        const generateResumePromise = async () => {
            setResumeGenerationLoading(true);
            const generationID = generationIDRef.current ?? crypto.randomUUID()
            generationIDRef.current = generationID
            try {
                const response = await fetch("/api/generate-resume", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        jobID: job.jobId,
                        generationID,
                        resumeCategory: selectedProfile.key,
                    })
                })
                if (response.status === 202) {
                    const message = "This resume is still being generated. Please try again shortly."
                    setGenerationError(message)
                    const inProgressError = new Error(message) as Error & {status?: number};
                    inProgressError.status = response.status;
                    throw inProgressError
                }
                if (response.status === 402) {
                    generationIDRef.current = null
                    const message = "You have reached your resume generation limit. Upgrade to Pro to generate more"
                    setGenerationError(message)
                    const quotaError = new Error(message) as Error & {status?: number};
                    quotaError.status = response.status;
                    throw quotaError
                }

                if (!response.ok) {
                    const errorPayload = await response.json().catch(() => ({
                        code: "GENERATION_FAILED",
                        message: "Something went wrong generating the resume. Please try again",
                    })) as {code?: string; message?: string};
                    if (errorPayload.code && [
                        "GENERATION_FAILED",
                        "GENERATION_PERSISTENCE_FAILED",
                        "GENERATION_REFUNDED",
                    ].includes(errorPayload.code)) {
                        generationIDRef.current = null
                    }
                    const message = errorPayload.message ?? "Something went wrong generating the resume. Please try again"
                    setGenerationError(message)
                    const generationError = new Error(message) as Error & {
                        status?: number;
                        upstreamErrorCode?: string;
                    };
                    generationError.status = response.status;
                    generationError.upstreamErrorCode = errorPayload.code;
                    throw generationError


                }
                const data = await response.json() as {
                    resume?: unknown;
                    resumeCategory?: unknown;
                    profileVersion?: unknown;
                    templateVersion?: unknown;
                    usage?: ResumeGenerationUsage;
                }
                const responseCategory = resumeCategorySchema.safeParse(data.resumeCategory)
                if (!responseCategory.success ||
                    responseCategory.data !== selectedProfile.key ||
                    data.profileVersion !== selectedProfile.profileVersion ||
                    data.templateVersion !== selectedProfile.templateVersion) {
                    setGenerationError("Generated resume used an invalid profile. Please try again")
                    const profileError = new Error("Generated resume profile validation failed") as Error & {sentryCode?: string};
                    profileError.sentryCode = "WEB_RESUME_GENERATION_PROFILE_INVALID";
                    throw profileError
                }
                const parsed = selectedProfile.schema.safeParse(data.resume)
                if (!parsed.success) {
                    setGenerationError("Generated resume had an invalid format. Please try again")
                    const schemaError = new Error("Generated resume failed client validation") as Error & {sentryCode?: string};
                    schemaError.sentryCode = "WEB_RESUME_GENERATION_SCHEMA_INVALID";
                    throw schemaError
                }
                setGeneratedResume(parsed.data)
                setGeneratedResumeFile(null)
                setGeneratedMetadata({
                    resumeCategory: selectedProfile.key,
                    profileVersion: selectedProfile.profileVersion,
                    templateVersion: selectedProfile.templateVersion,
                })
                setGenerationError(null)
                generationIDRef.current = null
                setShouldRefreshOnClose(true)
                if (data.usage) {
                    setResumeGenerationUsage(data.usage)
                }
                return parsed.data

            } catch (error) {
                const trackedError = error instanceof Error
                    ? error as Error & {status?: number; sentryCode?: string; upstreamErrorCode?: string}
                    : null;
                // The Next.js route is the canonical reporter for HTTP failures.
                // The popup reports only transport failures or invalid 2xx data.
                if (trackedError?.status === undefined) {
                    captureAppError({
                        code: trackedError?.sentryCode ?? "WEB_RESUME_GENERATION_CLIENT_FAILED",
                        message: "Unexpected client-side error generating resume",
                        error,
                        area: "resume_generator",
                        action: "generate_resume",
                        endpoint: "/api/generate-resume",
                        extra: {
                            upstreamErrorCode: trackedError?.upstreamErrorCode,
                        }
                    })
                }
                setGenerationError(error instanceof Error ? error.message : "Something went wrong generating the resume. Please try again")
                throw error

            } finally {
                setResumeGenerationLoading(false)
            }
        }
        toast.promise(generateResumePromise(), {
            loading: "Generating resume...",
            success: "Resume generated successfully",
            error: (error) => error instanceof Error ? error.message : "Error generating resume. Please try again"
        })
    }


    const handleSaveToLibrary = async () => {
        if (!token || !generatedResume || resumeReviewAction !== null) {
            console.error("Error saving generated resume")
            toast.error("Error saving generated resume. Try again later")
            return
        }

        setResumeReviewAction("save")
        const saveToLibraryPromise = async () => {
            const file = generatedResumeFile ?? await exportResumeAsFile(false);

            if (!file) {
                throw new Error("Could not create DOCX file");
            }

            const formData = new FormData();
            formData.append("resume", file);
            formData.append("resumeJson", JSON.stringify(generatedResume))

            const saveResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/generated-resumes/${job.jobId}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData,
            })

            if (!saveResponse.ok) {
                const error = await saveResponse.text()
                captureAppError({
                    message: "failed to save generated resume to library",
                    area: "resume_generator",
                    action: "save_to_library",
                    endpoint: `/api/v1/generated-resumes/${job.jobId}`,
                    status: saveResponse.status,
                    statusText: saveResponse.statusText,
                    extra: {
                        jobId: job.jobId,
                        userId: user?.id,
                        error,
                    }
                })
                console.error("Error saving resume to library: ", error)
                throw new Error("Error saving resume to library")
            }

            const deleteResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/generated-resume-drafts/jobs/${job.jobId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })

            if (!deleteResponse.ok && deleteResponse.status !== 404) {
                const error = await deleteResponse.text()
                captureAppError({
                    message: "Resume saved but failed to delete draft",
                    area: "resume_generator",
                    action: "delete_draft_after_save",
                    endpoint: `/api/v1/generated-resume-drafts/jobs/${job.jobId}`,
                    status: deleteResponse.status,
                    statusText: deleteResponse.statusText,
                    extra: {
                        jobId: job.jobId,
                        userId: user?.id,
                        error,
                    }
                })
                console.error("Resume saved, but failed to delete draft: ", error);
            }


            if (onResumeSaved) {
                onResumeSaved(prevState => !prevState);
            }
            setShouldRefreshOnClose(false)
            setOpen(false)

        }

        const promise = saveToLibraryPromise()
        toast.promise(promise, {
            success: "Resume saved to library",
            error: "Error saving resume to library. Try again later",
            loading: "Saving resume to library..."
        })

        try {
            await promise
        } catch {
            // The toast above owns the user-facing error state.
        } finally {
            setResumeReviewAction(null)
        }
    }

    const exportResumeAsFile = async (showToast = true): Promise<File | null> => {
        if (!generatedResume || !generatedMetadata) {
            return null;
        }

        const exportResumePromise = async () => {
            const response = await fetch("/api/export-resume-docx", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    resume: generatedResume,
                    resumeCategory: generatedMetadata.resumeCategory,
                    profileVersion: generatedMetadata.profileVersion,
                    templateVersion: generatedMetadata.templateVersion,
                })
            })
            if (!response.ok) {
                const exportError = new Error("Resume export request failed") as Error & {status?: number};
                exportError.status = response.status;
                throw exportError
            }

            const blob = await response.blob();
            const date = new Date().toISOString().slice(0, 10)
            const safeCompany = job.companyName.replace(/[^\w.-]+/g, "_");
            const safeTitle = job.jobTitle.replace(/[^\w.-]+/g, "_");

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
                    message: "Client failed to receive the generated resume DOCX",
                    error,
                    area: "resume_generator",
                    action: "export_generated_resume_docx",
                    endpoint: "/api/export-resume-docx",
                })
            }
            return null;
        }

    }


    const downloadDocx = async () => {
        if (resumeReviewAction !== null) {
            return
        }
        setResumeReviewAction("download")
        try {
            const file = generatedResumeFile ?? await exportResumeAsFile();
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
                message: "Unexpected error downloading resume DOCX",
                error,
                area: "resume_generator",
                action: "download_generated_resume_docx",
                endpoint: "/api/export-resume-docx",
                extra: {
                    jobId: job.jobId,
                    userId: user?.id
                }
            })

            console.error("Error downloading generated resume: ", error);
            toast.error("Error downloading resume. Try again later");
        } finally {
            setResumeReviewAction(null)
        }


    }

    const updateGeneratedResume = (resume: TailoredResume) => {
        setGeneratedResume(resume)
        setGeneratedResumeFile(null)
    }

    const startAnotherResume = () => {
        if (documentInteractionLocked) {
            return
        }
        setGeneratedResume(null)
        setGeneratedResumeFile(null)
        setGeneratedMetadata(null)
        setGenerationError(null)
        generationIDRef.current = null
    }


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
            <button disabled={documentInteractionLocked} onClick={closePopup}
                    className="absolute inset-0 bg-[#181d26]/35 backdrop-blur-[2px]"/>
            <div className="z-10 max-h-[calc(100vh-1.5rem)] w-full max-w-4xl overflow-y-auto rounded-xl border border-[#d5d2ca] bg-white px-4 py-5 shadow-[0_24px_70px_-24px_rgba(24,29,38,0.5)] sm:max-h-[calc(100vh-2.5rem)] sm:px-7 sm:py-7">
                {activeDocument === "cover-letter" ? (
                    <CoverLetterPanel
                        job={job}
                        token={token}
                        masterResume={masterResume}
                        masterResumeLoading={masterResumeLoading}
                        onClose={closePopup}
                        documentSwitchLocked={documentInteractionLocked}
                        onSelectResume={() => selectDocument("resume")}
                        onDocumentChanged={() => setShouldRefreshOnClose(true)}
                        onBusyChange={setCoverLetterBusy}
                        onLibraryChanged={onResumeSaved}
                    />
                ) : <>
                {(resumeGenerationLoading || !generatedResume) &&
                    <div className={"flex flex-col gap-y-5"}>
                        <div className={"flex items-center justify-between"}>
                            <div>
                                <p className="eyebrow">Resume studio</p>
                                <h2 className="mt-1 text-2xl font-semibold">Tailor this application</h2>
                            </div>
                            <button disabled={resumeGenerationLoading} className={"hover:cursor-pointer"}
                                    onClick={closePopup}>
                                <XIcon className={"opacity-50"}/>
                            </button>


                        </div>
                        <div className="max-w-2xl text-sm font-medium leading-6 text-[#666b73]">
                            Our AI will analyse the job description and optimise your source resume, ensuring your
                            skills and experiences are perfectly aligned for this specific role
                        </div>

                        <div className="flex w-fit rounded-lg border border-[#d9d6ce] bg-[#f5f4f0] p-1" role="tablist" aria-label="Application document">
                            <button type="button" role="tab" aria-selected="true"
                                    className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-[#0D3880] shadow-sm">
                                Resume
                            </button>
                            <button type="button" role="tab" aria-selected="false"
                                    disabled={documentInteractionLocked}
                                    onClick={() => selectDocument("cover-letter")}
                                    title={documentInteractionLocked ? "Wait for resume generation to finish before switching documents" : undefined}
                                    className="rounded-md px-4 py-2 text-sm font-semibold text-[#555b64] hover:bg-white disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent">
                                Cover letter
                            </button>
                        </div>

                        <ResumeCategorySelector
                            selectedCategory={selectedCategory}
                            suggestedCategory={suggestedCategory}
                            loading={categoryLoading}
                            saving={categorySaving}
                            onSelect={handleCategorySelect}
                        />
                        {categoryNotice && (
                            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                                {categoryNotice}
                            </p>
                        )}

                        <div
                            className="flex w-full flex-col items-center gap-y-2 rounded-xl border border-[#dedbd3] bg-[#f8f7f4] px-4 py-4">
                            <div className={"flex items-center w-full justify-between"}>
                                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#666b73]">Source material</p>
                                <p className="rounded-md bg-[#e7effb] px-2 py-1 text-xs font-semibold text-[#0D3880]">Current
                                    Primary</p>
                            </div>
                            <div
                                className="flex w-full items-center justify-start gap-x-4 rounded-lg border border-[#dedbd3] bg-white p-3">
                                <div className="rounded-lg bg-[#e7effb] p-3 text-[#0D3880]">
                                    <DocumentTextIcon width={24} height={24}/>
                                </div>
                                {masterResumeLoading ? <div>
                                    <p className={"font-semibold text-black/60 truncate"}>Loading....</p>
                                </div> : masterResume ? (<div>
                                        <p className={"font-bold truncate"}>{masterResume.fileName}</p>
                                        <p className={"text-sm text-black/60 font-medium"}>Last
                                            updated: {masterResume.updatedAt.slice(0, 10)}</p>
                                    </div>) :

                                    <div>
                                        <p className="font-bold truncate">No master resume uploaded</p>
                                        <p className="text-sm text-black/60 font-medium">Upload a resume before
                                            generating.</p>
                                    </div>


                                }

                            </div>
                        </div>

                        <div>
                            <p className={"text-xs font-bold text-black"}><a
                                className={"text-black/60"}>Targeting: </a>{job.jobTitle} at {job.companyName}</p>
                        </div>

                        <div className={"w-full border-b border-b-black/5"}></div>


                        <div className="flex flex-wrap items-center justify-end gap-3">
                            {!resumeGenerationLoading ?
                                <button disabled={resumeGenerationLoading}
                                        className={"text-sm font-semibold hover:cursor-pointer"}
                                        onClick={closePopup}>
                                    Cancel
                                </button>
                                :
                                <div className={"text-sm font-semibold animate-pulse hover:cursor-default"}>
                                    Generating...
                                </div>}

                            {
                                resumeGenerationLoading ?
                                    <LoaderCircle className={"animate-spin"}>
                                    </LoaderCircle>
                                    :
                                    (resumeGenerationUsage ?
                                            <button
                                                disabled={masterResumeLoading || resumeGenerationLoading || categoryLoading || categorySaving || !selectedCategory}
                                                onClick={() => {
                                                    if (!selectedCategory) {
                                                        toast.error("Choose a job type before generating your resume")
                                                    } else if (masterResume && resumeGenerationUsage.can_generate) {
                                                        handleGenerate()
                                                    } else if (!masterResume) {
                                                        toast.error("Please upload a master resume")
                                                    } else {
                                                        toast.error("You’ve used all your resume generations for this month. Upgrade to Pro or wait until your credits reset.")
                                                    }
                                                }}
                                                className="button-primary w-fit px-5 disabled:opacity-50">
                                                <SparklesIcon height={16} width={16}/>
                                                Generate resume
                                            </button> :
                                            <button
                                                disabled={true}
                                                className="button-primary w-fit px-5 disabled:opacity-50">
                                                <SparklesIcon height={16} width={16}/>
                                                Loading...
                                            </button>


                                    )

                            }
                        </div>
                        {
                            generationError &&
                            <InlineErrorMessage>{generationError}</InlineErrorMessage>
                        }


                    </div>}
                {!resumeGenerationLoading && generatedResume && generatedMetadata && !generationError ? (
                    <GeneratedResumeReviewPanel
                        job={job}
                        resume={generatedResume}
                        categoryLabel={getResumeCategoryDefinition(generatedMetadata.resumeCategory).label}
                        resumeCategory={generatedMetadata.resumeCategory}
                        action={resumeReviewAction}
                        documentSwitchLocked={documentInteractionLocked}
                        onChange={updateGeneratedResume}
                        onClose={closePopup}
                        onSelectCoverLetter={() => selectDocument("cover-letter")}
                        onDownload={downloadDocx}
                        onSave={handleSaveToLibrary}
                        onStartAnother={startAnotherResume}
                    />
                ) : null}
                </>}

            </div>

        </div>
    )
}

type GeneratedResumeMetadata = {
    resumeCategory: ResumeCategory;
    profileVersion: number;
    templateVersion: string;
};

type CategoryClassificationResponse = {
    status: "unclassified" | "classifying" | "classified" | "failed";
    category: ResumeCategory | null;
    source: "ai" | "user" | null;
    confidence: number | null;
    failureCode: string | null;
    requiresSelection: boolean;
    message?: string;
};
