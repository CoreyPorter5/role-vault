import {useEffect, useState} from "react";
import type {ScrapedJobData} from "./utils/types.ts";
import { X } from "lucide-react";

function App() {

  const [userJobs, setUserJobs] = useState<ScrapedJobData[]>([])

  useEffect(() => {
    const fetchJobs = async () => {
      const result = await fetch('http://localhost:8080/api/v1/users/test_user_1/jobs')
      const data: ScrapedJobData[] = await result.json()
      setUserJobs(data);

    }

    fetchJobs()
  }, []);


  async function deleteJob(jobID: string)  {
    try{
      const response = await fetch(`http://localhost:8080/api/v1/users/test_user_1/jobs/${jobID}`, {
            method: "DELETE"
          }
      );
      if (!response.ok){
        const error = await response.text()
        console.error(error)
        return
    }
      setUserJobs((prevState) => prevState.filter((job) => job.jobId !== jobID))


    }catch (error){
      console.error(error)
    }

    }



  return (
      <div className={"flex items-center justify-center w-full flex-col gap-y-10 text-white"}>{
        userJobs.map((userJob) => (
            <div key={userJob.jobId} className={"flex items-center justify-between"}>
              <div>{userJob.jobTitle}</div>
              <X onClick={() => deleteJob(userJob.jobId)}></X>
            </div>

        ))
      }</div>

  )
}

export default App
