import {useEffect, useState} from "react";
import type {ScrapedJobData} from "./utils/types.ts";
import {ArrowRightIcon, Clock, RefreshCcw, X} from "lucide-react";

function App() {

    const [userJobs, setUserJobs] = useState<ScrapedJobData[]>([])
    const [refreshJobs, setRefreshJobs] = useState<boolean>(false);

    useEffect(() => {
        const fetchJobs = async () => {
            const result = await fetch('http://localhost:8080/api/v1/users/test_user_1/jobs')
            const data: ScrapedJobData[] = await result.json()
            setUserJobs(data);

        }

        fetchJobs()
    }, [refreshJobs]);


    async function deleteJob(jobID: string) {
        try {
            const response = await fetch(`http://localhost:8080/api/v1/users/test_user_1/jobs/${jobID}`, {
                    method: "DELETE"
                }
            );
            if (!response.ok) {
                const error = await response.text()
                console.error(error)
                return
            }
            setUserJobs((prevState) => prevState.filter((job) => job.jobId !== jobID))


        } catch (error) {
            console.error(error)
        }

    }


    return (
        <div className={"flex items-center justify-center w-screen flex-col"}>
            <div
                className={"font-bold w-full flex justify-between items-center text-xl py-5 px-2 border-b border-b-black/10 bg-white"}>
                <div className={"text-blue-500"}>Synced Jobs</div>
                <RefreshCcw size={22} className={"text-blue-700 hover:cursor-pointer"} onClick={() => {
                    setRefreshJobs(prevState => !prevState)
                }}/>
            </div>

            <div className={" w-full flex justify-between py-2 flex-col items-center px-2"}>
                <div className={"py-2 px-4 flex items-center justify-center w-full gap-y-2 flex-col"}>
                    <div className={"bg-blue-700 rounded-sm w-full py-5 px-2 text-lg font-semibold"}>
                        Active Jobs: {userJobs.length}
                    </div>
                    <div
                        className={"uppercase flex items-center w-full pt-2 font-semibold px-1 text-lg text-black/50 justify-start"}>
                        Recently Synced
                    </div>

                    {
                        userJobs.map((userJob) => (

                            <div key={userJob.jobId}
                                 className={"flex bg-white relative rounded-sm border shadow-lg border-gray-200/70 px-3 py-3 flex-col gap-y-2 items-center w-full justify-center"}>
                                <div className={"flex items-center gap-x-10 justify-between w-full"}>
                                    <div
                                        className={"text-lg text-blue-500 font-bold max-w-5/6"}>{userJob.jobTitle}</div>
                                    <X size={20} height={20} width={20}
                                       className={"hover:cursor-pointer absolute top-4 right-2 shrink-0 hover:opacity-50 "}
                                       color={"gray"} onClick={() => deleteJob(userJob.jobId)}></X>
                                </div>
                                <div className={"flex items-center w-full text-xs justify-start text-black"}>
                                    {userJob.companyName + " • " + userJob.location}
                                </div>
                                <div className={"flex items-center justify-start w-full gap-x-2"}>
                                    <div
                                        className={"bg-black/10 rounded-md border border-black/15 shadow-xs text-center text-black/80 px-2 py-1"}>
                                        {userJob.jobType}
                                    </div>
                                    {userJob.jobPay &&
                                        <div
                                            className={"bg-blue-300/70 border border-blue-300/80 rounded-md shadow-xs text-center text-black/80 px-2 py-1"}>
                                            {userJob.jobPay}
                                        </div>
                                    }

                                </div>
                                <div
                                    className={"text-black flex justify-center items-center border-b mt-2 border-black/10 w-full"}/>
                                <div className={"flex items-center w-full justify-between"}>
                                    <div className={"flex items-center justify-center gap-x-1 text-black/70"}>
                                        <Clock size={16} className={" "}></Clock>
                                        <p>{Math.floor((new Date().getTime() - new Date(userJob.dateSynced).getTime()) / (1000 * 60 * 60))}h
                                            ago</p>
                                    </div>
                                    <div
                                        className={"flex items-center gap-x-1 justify-center text-blue-500 hover:cursor-pointer hover:opacity-80 transition duration-100"}>
                                        <p className={"uppercase font-semibold"}>View Details</p>
                                        <ArrowRightIcon size={16} className={""}/>
                                    </div>


                                </div>

                            </div>

                        ))
                    }</div>

            </div>
        </div>


    )
}

export default App
