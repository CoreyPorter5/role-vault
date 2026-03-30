"use client"

import {useJWKTokenAndUser} from "../../../components/Dashboard/Context/DashboardContextProvider";
import {useEffect, useState} from "react";
import {Job} from "@/lib/types/types";
import {RefreshCcw} from "lucide-react";
import PipelineComponent from "../../../components/Dashboard/Pipeline/PipelineComponent";

export default function DashboardPage(){
    const {token, user} = useJWKTokenAndUser()
    const [userJobs, setUserJobs] = useState<Job[]>([])
    const [isSpinning, setIsSpinning] = useState<boolean>(false);
    const [refreshJobs, setRefreshJobs] = useState<boolean>(false)

    useEffect(() => {
        const getUserJobs = async () => {
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
            const data: Job[] = await result.json()
            setUserJobs(data);

        }
        getUserJobs()

    }, [token, refreshJobs]);



    return (
        <div className={"text-black w-full h-full p-8"}>
            <div className={"text-black text-4xl font-bold"}>Hey {user?.user_metadata.first_name}!</div>
            <RefreshCcw size={22} className={`text-blue-700 hover:cursor-pointer ${isSpinning && "animate-spin"} transform`}
                        onClick={() => {
                            if(!isSpinning){
                                setRefreshJobs(prevState => !prevState);
                                setIsSpinning(true);
                                setTimeout(() => setIsSpinning(false), 1000);
                            }

                        }}/>


            <PipelineComponent jobs={userJobs}></PipelineComponent>



        </div>
    )
}