import {Upload} from "lucide-react";
import {Dispatch, SetStateAction, useEffect, useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {useJWKTokenAndUserAndSidebar} from "../Context/DashboardContextProvider";
import type {Database} from "@/lib/types/database.types";
import {ClockIcon, DocumentTextIcon} from "@heroicons/react/24/solid";
import {DocumentArrowUpIcon} from "@heroicons/react/24/solid";
import {captureAppError} from "@/lib/sentry/captureAppError";
import {formatRelativeTime} from "@/lib/date/relative-time";
import Skeleton from "../../ui/Skeleton";

type DashboardResumeUploadComponentProps = {
    setOpen: Dispatch<SetStateAction<boolean>>
    refreshResume: boolean
}


export default function DashboardMasterResumeUploadComponent({setOpen, refreshResume}: DashboardResumeUploadComponentProps) {
    const {user} = useJWKTokenAndUserAndSidebar()
    const [resumeData, setResumeData] = useState<Database["public"]["Tables"]["user_master_resumes"]["Row"] | null>(null)
    const [loading, setLoading] = useState<boolean>(true)


    useEffect(() => {
        const getResumeData = async () => {
            if (!user?.id) {
                setResumeData(null)
                setLoading(false)
                return;
            }

            setLoading(true)

            try {
                const supabase = createClient();
                const {
                    data,
                    error
                } = await supabase.from("user_master_resumes").select("*").eq("user_id", user.id).maybeSingle()

                if (error) {
                    captureAppError({
                        message: "Failed to fetch user master resume metadata",
                        area: "dashboard_resume_upload",
                        action: "fetch_master_resume_metadata",
                        endpoint: "supabase:user_master_resumes",
                        extra: {
                            userId: user.id,
                            errorMessage: error.message,
                            errorCode: error.code
                        }
                    })
                    console.error("Error fetching resume:", error.message);
                    setResumeData(null)
                    return
                }
                setResumeData(data)
            } catch (error) {
                captureAppError({
                    message: "Unexpected error fetching user master resume metadata",
                    error,
                    area: "dashboard_resume_upload",
                    action: "fetch_master_resume_metadata",
                    endpoint: "supabase:user_master_resumes",
                    extra: {
                        userId: user.id
                    }
                })
            } finally {
                setLoading(false)
            }

        }

        getResumeData()

    }, [user?.id, refreshResume]);


    return (
        <div className="app-panel flex w-full flex-col items-stretch justify-between gap-4 px-4 py-4 sm:px-5 md:flex-row md:items-center">
            <div className="min-w-0">
                {
                    resumeData && !loading &&

                    <div className="flex min-w-0 items-center justify-start gap-x-4">
                        <div className="rounded-lg bg-[#e7effb] p-3">
                            <DocumentTextIcon className="text-[#0D3880]" width={26} height={26}/>
                        </div>
                        <div className="flex min-w-0 flex-col items-start justify-center gap-y-1">
                            <p className="w-full truncate text-sm font-semibold text-[#242932] sm:text-base">{resumeData.original_filename}</p>
                            <div className="flex items-center justify-center gap-x-2">
                                <ClockIcon height={14} width={14} className="text-[#777c84]"/>
                                <p className="text-xs text-[#777c84] sm:text-sm">
                                    Last updated:{" "}
                                    <time
                                        dateTime={new Date(resumeData.updated_at).toISOString()}
                                        suppressHydrationWarning
                                        title={new Date(resumeData.updated_at).toLocaleString("en-AU")}
                                    >
                                        {formatRelativeTime(resumeData.updated_at)}
                                    </time>
                                </p>

                            </div>

                        </div>

                    </div>

                }
                {
                    loading &&
                    <div aria-label="Loading master resume" aria-busy="true" className="flex items-center gap-4">
                        <Skeleton className="size-14 shrink-0"/>
                        <div>
                            <Skeleton className="h-4 w-40"/>
                            <Skeleton className="mt-2 h-3 w-52"/>
                        </div>
                    </div>
                }
                {
                    !resumeData && !loading &&
                    <div className="flex items-start justify-start gap-x-4 sm:items-center">
                        <div className="rounded-lg bg-[#e7effb] p-3">
                            <DocumentArrowUpIcon className="text-[#0D3880]" width={26} height={26}/>
                        </div>
                        <div className={"flex items-start gap-y-1 justify-center flex-col"}>
                            <p className="font-semibold">Upload your source resume</p>
                            <div className={"flex items-center justify-center gap-x-2"}>
                                <p className="text-sm text-[#6c7179]">Upload a DOCX resume so SeekSync can generate
                                    tailored resumes for your saved jobs.</p>

                            </div>

                        </div>

                    </div>
                }


            </div>
            <button
                 type="button"
                 disabled={loading}
                 onClick={() => setOpen(true)}
                 className="button-secondary flex w-full shrink-0 disabled:cursor-wait disabled:opacity-50 md:w-auto">
                <Upload width={16} height={16}/>
                <span className="text-xs font-bold text-[#0D3880]">{resumeData ? "Upload new version" : "Upload resume"}</span>
            </button>

        </div>
    )

}
