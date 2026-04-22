"use client"

import {useJWKTokenAndUserAndSidebar} from "../../../components/Dashboard/Context/DashboardContextProvider";
import {useEffect, useState} from "react";
import {Job} from "@/lib/types/types";
import {RefreshCcw} from "lucide-react";
import PipelineComponent from "../../../components/Dashboard/Pipeline/PipelineComponent";
import DashboardResumeUploadComponent
    from "../../../components/Dashboard/ResumeUploader/DashboardResumeUploadComponent";
import DashboardResumePopup from "../../../components/Dashboard/ResumeUploader/DashboardResumePopup";
import DashboardGenerateResumePopup from "../../../components/Dashboard/ResumeGenerator/DashboardGenerateResumePopup";

export default function DashboardPage() {
    const {token, user} = useJWKTokenAndUserAndSidebar()
    const [userJobs, setUserJobs] = useState<Job[]>([])
    const [isSpinning, setIsSpinning] = useState<boolean>(false);
    const [refreshJobs, setRefreshJobs] = useState<boolean>(false)
    const [popupOpen, setPopupOpen] = useState<boolean>(false)
    const [refreshResume, setRefreshResume] = useState<boolean>(false)

    const [selectedJob, setSelectedJob] = useState<Job | null>(null)
    const [generatorOpen, setGeneratorOpen] = useState<boolean>(false)

    const [aiSummary, setAiSummary] = useState<string | null>(null)

    const handleTailorResume = async (job: Job) => {
        setSelectedJob(job);
        setGeneratorOpen(true)
        if (token) {
            const generatedResumeResponse = await fetch(`/api/generate-resume`, {
                method: "POST",
                body: JSON.stringify({jobID: job.jobId}),
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
            })

            if (generatedResumeResponse.ok) {
                const text = await generatedResumeResponse.json();
                setAiSummary(text.generatedResume)
                console.log(text.generatedResume)
                return
            }else{

                return

            }

        }


    }

    useEffect(() => {
        const getUserJobs = async () => {
            if (!token) {
                console.error("No token found. User is not logged in.");
                return;
            }
            const result = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/jobs`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            })
            const data: Job[] = await result.json()
            if (!data) {
                return
            }
            setUserJobs(data);

        }
        getUserJobs()

    }, [token, refreshJobs]);


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
            <DashboardResumeUploadComponent refreshResume={refreshResume} setOpen={setPopupOpen}/>
            {popupOpen && <DashboardResumePopup onResumeUpdated={setRefreshResume} setOpen={setPopupOpen}/>}
            {selectedJob && generatorOpen &&
                <DashboardGenerateResumePopup summary={aiSummary} job={selectedJob} setOpen={setGeneratorOpen}/>}


            <PipelineComponent onTailorResumeAction={handleTailorResume} jobs={userJobs}></PipelineComponent>


        </div>
    )
}
