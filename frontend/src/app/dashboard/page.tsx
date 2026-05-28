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
import * as Sentry from "@sentry/nextjs"

export default function DashboardPage() {
    const {token, user} = useJWKTokenAndUserAndSidebar()
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
                    const error = await result.text();
                    Sentry.captureMessage("Failed to fetch dashboard jobs", {
                        level: "error",
                        extra: {
                            status: result.status,
                            statusText: result.statusText,
                            response: error,
                            endpoint: "/api/v1/jobs",
                        },
                        tags: {
                            area: "dashboard",
                            action: "fetch_jobs",
                        },
                        user: user?.id
                            ? {
                                id: user.id,
                                email: user.email,
                            }
                            : undefined,
                    });
                    console.error("Error fetching jobs:", error);
                    setGetJobsError("Failed to load your jobs. Please try again")
                    return;
                }

                const data: Job[] = await result.json()

                setUserJobs(data ?? []);
            } catch (error) {
                Sentry.captureException(error, {
                    tags: {
                        area: "dashboard",
                        action: "fetch_jobs",
                    },
                    extra: {
                        endpoint: "/api/v1/jobs",
                    },
                    user: user?.id
                        ? {
                            id: user.id,
                            email: user.email,
                        }
                        : undefined,
                });
                console.error("Error fetching jobs:", error)
                setGetJobsError("Failed to load your jobs. Please try again")
            } finally {
                setLoadingJobs(false)
            }


        }
        getUserJobs()

    }, [token, refreshJobs, user?.id, user?.email]);


    return (
        <div className={"text-black w-full h-full min-h-0 px-6 gap-y-5 pt-8 pb-0 overflow-hidden flex flex-col"}>
            <div className={"text-black flex items-center justify-between gap-x-2 text-4xl font-bold shrink-0"}>
                <p>
                    Hey {user?.user_metadata.first_name}!
                </p>
                <RefreshCcw size={22}
                            className={`text-blue-700 hover:cursor-pointer ${isSpinning && "animate-spin"} transform shrink-0`}
                            onClick={() => {
                                if (!isSpinning) {
                                    setRefreshJobs(prevState => !prevState);
                                    setIsSpinning(true);
                                    setTimeout(() => setIsSpinning(false), 1000);
                                }

                            }}/>

            </div>
            <DashboardMasterResumeUploadComponent refreshResume={refreshResume} setOpen={setPopupOpen}/>
            {popupOpen && <MasterResumeUploadPopup onResumeUpdated={setRefreshResume} setOpen={setPopupOpen}/>}
            {selectedJob && generatorOpen &&
                <DashboardGenerateResumePopup job={selectedJob} setOpen={setGeneratorOpen}/>}


            {loadingJobs ? (
                <div className={"text-black/60 font-medium text-md"}>
                    Loading your applications...
                </div>
            ) : getJobsError ? (
                <div className={"text-red-500 font-medium text-lg"}>
                    {getJobsError}
                </div>
            ) : (
                <PipelineComponent onTailorResumeAction={handleTailorResume} jobs={userJobs}/>
            )}

        </div>
    )
}
