import {Upload} from "lucide-react";
import {Dispatch, SetStateAction, useEffect, useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {useJWKTokenAndUserAndSidebar} from "../Context/DashboardContextProvider";
import type {Database} from "@/lib/types/database.types";

type DashboardResumeUploadComponentProps = {
    setOpen: Dispatch<SetStateAction<boolean>>
    refreshResume: boolean
}


export default function DashboardResumeUploadComponent({setOpen, refreshResume}: DashboardResumeUploadComponentProps) {
    const supabase = createClient();
    const {user} = useJWKTokenAndUserAndSidebar()
    const [resumeData, setResumeData] = useState<Database["public"]["Tables"]["user_master_resumes"]["Row"] | null>(null)
    const [loading, setLoading] = useState<boolean>(false)


    useEffect(() => {
        const getResumeData = async () => {
            if (user?.id) {
                setLoading(true)
                const {
                    data,
                    error
                } = await supabase.from("user_master_resumes").select("*").eq("user_id", user.id)
                if (error || !data) {
                    setLoading(false)
                    return
                }
                setLoading(false)
                setResumeData(data[0] ?? null)
            }

        }

        getResumeData()

    }, [supabase, user?.id, refreshResume]);


    return (
        <div className={"bg-white rounded-md w-full shadow-md flex items-center px-6 py-6 justify-between"}>
            <div>
                {
                    resumeData && !loading &&

                    <div className={"flex items-start justify-center flex-col"}>
                        <p>{resumeData.original_filename}</p>
                        <p>Last
                            updated: {Math.floor((new Date().getTime() - new Date(resumeData.updated_at).getTime()) / (1000 * 60 * 60))} hours
                            ago</p>
                    </div>

                }
                {
                    loading &&
                    <div>
                        Loading...
                    </div>
                }
                {
                    !resumeData && !loading &&
                    <div>
                        Upload a resume
                    </div>
                }


            </div>
            <div onClick={() => setOpen(true)}
                 className={"flex items-center gap-x-2 border-2 hover:cursor-pointer px-4 py-3 border-black/10 rounded-md text-blue-700 justify-center"}>
                <Upload width={16} height={16}/>
                <p className={"text-blue-700 text-xs font-bold"}>Upload New Version</p>
            </div>

        </div>
    )

}