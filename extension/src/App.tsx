/// <reference types="chrome" />
import {useEffect, useState} from "react";
import type {ScrapedJobData} from "./utils/types.ts";
import {ArrowRightIcon, Clock, RefreshCcw, X} from "lucide-react";
import {createClient} from "@supabase/supabase-js";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);


function App() {

    const [userJobs, setUserJobs] = useState<ScrapedJobData[]>([])
    const [refreshJobs, setRefreshJobs] = useState<boolean>(false);
    const [authToken, setAuthToken] = useState<string | null>(null);
    const [userFirstName, setUserFirstName] = useState<string>("");

    async function getUserFirstName(jwtToken: string){
        const { data, error } = await supabase.auth.getUser(jwtToken)
        if (error || !data?.user) {
            console.error("Failed to fetch user:", error);
            return;
        }
        const firstName = data.user.user_metadata.first_name;
        setUserFirstName(firstName)


    }

    const fetchTokenFromBackground = (): Promise<string | null> => {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({action: "GET_TOKEN"}, (response) => {
                resolve(response?.token || null);
            });
        });
    };

    useEffect(() => {
        const getToken = async () => {
            const token = await fetchTokenFromBackground();
            setAuthToken(token)
            if(token){
                await getUserFirstName(token)
            }
        }

        getToken();
    }, []);



    useEffect(() => {
        const fetchJobs = async () => {
            const token = await fetchTokenFromBackground();
            if (!token) {
                console.error("No token found. User is not logged in.");
                return;
            }
            const result = await fetch('http://localhost:8080/api/v1/jobs', {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            })
            const data: ScrapedJobData[] = await result.json()
            setUserJobs(data);

        }

        fetchJobs()
    }, [refreshJobs]);


    async function deleteJob(jobID: string) {
        try {
            const token = await fetchTokenFromBackground();
            if (!token) {
                console.error("No token found. User is not logged in.");
                return;
            }
            const response = await fetch(`http://localhost:8080/api/v1/jobs/${jobID}`, {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    }
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
        <div className={"flex justify-start w-105 h-130 flex-col bg-gray-50 overflow-hidden"}>
            {authToken && <div
                className={"sticky top-0 z-10 font-bold w-full flex justify-between items-center text-xl py-4 px-4 border-b border-black/10 bg-white shadow-sm"}>
                <div className={"text-blue-500"}>{`Synced Jobs: Hello ${userFirstName} `}</div>
                <RefreshCcw size={22} className={"text-blue-700 hover:cursor-pointer active:animate-spin transform duration-2000"} onClick={() => {
                    setRefreshJobs(prevState => !prevState);
                    

                }}/>
            </div>}

            {authToken ? <div className={" w-full flex justify-between py-2 flex-col items-center px-2 overflow-y-auto"}>
                <div className={"py-2 px-4 flex items-center justify-center w-full gap-y-2 flex-col"}>
                    <div className={"bg-blue-700 rounded-sm w-full py-5 px-2 text-lg font-semibold"}>
                        Active Jobs: {userJobs.length}
                    </div>
                    <div
                        className={"uppercase flex items-center w-full pt-2 font-semibold px-1 text-lg text-black/50 justify-start"}>
                        Recently Synced
                    </div>

                    {
                        userJobs.length !== 0 ? userJobs.map((userJob) => (

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
                            :
                            <div className={"flex justify-center font-semibold px-1 text-black/50 items-center h-screen text-2xl"}>Sync some jobs to get started!</div>
                    }</div>

            </div> :
                <div className={"flex h-full w-full justify-center items-center"}>
                    <button className={"text-black hover:cursor-pointer text-xl font-semibold"} onClick={() => chrome.tabs.create({url: "http://localhost:3000/login"})}>
                        Log in to get started
                    </button>

                </div>




            }
        </div>


    )
}

export default App
