"use client"

import {useJWKTokenAndUserAndSidebar} from "../../../components/Dashboard/Context/DashboardContextProvider";
import {useEffect, useState} from "react";
import {Job} from "@/lib/types/types";
import {RefreshCcw} from "lucide-react";
import PipelineComponent from "../../../components/Dashboard/Pipeline/PipelineComponent";
import DashboardMasterResumeUploadComponent
    from "../../../components/Dashboard/MasterResumeUploader/DashboardMasterResumeUploadComponent";
import MasterResumeUploadPopup from "../../../components/Dashboard/MasterResumeUploader/MasterResumeUploadPopup";
import DashboardGenerateResumePopup from "../../../components/Dashboard/ResumeGenerator/DashboardGenerateResumePopup";
import {PipelineLoadingSkeleton} from "../../../components/Dashboard/Loading/DashboardLoadingSkeletons";
import {captureAppError} from "@/lib/sentry/captureAppError";

export default function DashboardPage() {
    const {token, profile} = useJWKTokenAndUserAndSidebar()
    const [userJobs, setUserJobs] = useState<Job[]>([])
    const [isSpinning, setIsSpinning] = useState<boolean>(false);
    const [refreshJobs, setRefreshJobs] = useState<boolean>(false)
    const [popupOpen, setPopupOpen] = useState<boolean>(false)
    const [refreshResume, setRefreshResume] = useState<boolean>(false)

    const [selectedJob, setSelectedJob] = useState<Job | null>(null)
    const [generatorOpen, setGeneratorOpen] = useState<boolean>(false)

    const [loadingJobs, setLoadingJobs] = useState<boolean>(true)
    const [getJobsError, setGetJobsError] = useState<string | null>(null)


    const handleTailorResume = async (job: Job) => {
        setSelectedJob(job);
        setGeneratorOpen(true)

    }

    useEffect(() => {
        const getUserJobs = async () => {
            if (!token) {
                console.error("No token found. User is not logged in.");
                setLoadingJobs(false)
                return;
            }
            setLoadingJobs(true)
            try {
                setGetJobsError(null)
                const result = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/jobs`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    }
                })


                if (!result.ok) {
                    // The Go API owns status-bearing backend failures. This
                    // client reports only transport or invalid-response errors.
                    setGetJobsError("Failed to load your jobs. Please try again")
                    return;
                }

                const data: Job[] = await result.json()

                setUserJobs(data ?? []);
            } catch (error) {
                captureAppError({
                    code: "WEB_DASHBOARD_JOBS_FETCH_FAILED",
                    message: "Unexpected error while fetching dashboard jobs",
                    error,
                    area: "dashboard",
                    action: "fetch_jobs",
                    endpoint: "/api/v1/jobs",
                });
                console.error("Error fetching jobs:", error)
                setGetJobsError("Failed to load your jobs. Please try again")
            } finally {
                setLoadingJobs(false)
            }


        }
        getUserJobs()

    }, [token, refreshJobs]);


    return (
        <div className="flex h-full min-h-0 w-full flex-col gap-y-5 overflow-hidden px-3 pb-0 pt-5 text-[#181d26] sm:px-5 sm:pt-7 lg:px-7 lg:pt-8">
            <div className="flex shrink-0 items-end justify-between gap-x-3">
                <div>
                    <p className="eyebrow">Application workspace</p>
                    <h1 className="page-title mt-2">Good to see you, {profile?.first_name ?? "there"}.</h1>
                    <p className="mt-2 text-sm text-[#6c7179] sm:text-base">Keep the next move clear across every active opportunity.</p>
                </div>
                <button type="button" aria-label="Refresh jobs" className="rounded-lg border border-[#d6d3cb] bg-white p-2.5 text-[#0D3880] hover:bg-[#f8f7f4]"
                        onClick={() => {
                            if (!isSpinning) {
                                setRefreshJobs(prevState => !prevState);
                                setIsSpinning(true);
                                setTimeout(() => setIsSpinning(false), 1000);
                            }
                        }}>
                    <RefreshCcw size={18}
                            className={`${isSpinning && "animate-spin"} transform shrink-0`}/>
                </button>

            </div>
            <DashboardMasterResumeUploadComponent refreshResume={refreshResume} setOpen={setPopupOpen}/>
            {popupOpen && <MasterResumeUploadPopup onResumeUpdated={setRefreshResume} setOpen={setPopupOpen}/>}
            {selectedJob && generatorOpen &&
                <DashboardGenerateResumePopup job={selectedJob} setOpen={setGeneratorOpen}/>}


            {loadingJobs ? (
                <PipelineLoadingSkeleton/>
            ) : getJobsError ? (
                <div className={"text-red-500 font-medium text-lg"}>
                    {getJobsError}
                </div>
            ) : (
                <PipelineComponent
                    onTailorResumeAction={handleTailorResume}
                    jobs={userJobs}
                    setJobs={setUserJobs}
                />
            )}

        </div>
    )
}
