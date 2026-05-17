import {Upload} from "lucide-react";
import {Dispatch, SetStateAction, useEffect, useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {useJWKTokenAndUserAndSidebar} from "../Context/DashboardContextProvider";
import type {Database} from "@/lib/types/database.types";
import {ClockIcon, DocumentTextIcon} from "@heroicons/react/24/solid";
import {DocumentArrowUpIcon} from "@heroicons/react/24/solid";

type DashboardResumeUploadComponentProps = {
    setOpen: Dispatch<SetStateAction<boolean>>
    refreshResume: boolean
}


export default function DashboardResumeUploadComponent({setOpen, refreshResume}: DashboardResumeUploadComponentProps) {
    const {user} = useJWKTokenAndUserAndSidebar()
    const [resumeData, setResumeData] = useState<Database["public"]["Tables"]["user_master_resumes"]["Row"] | null>(null)
    const [loading, setLoading] = useState<boolean>(true)


    useEffect(() => {
        const getResumeData = async () => {
            if (user?.id) {
                setLoading(true)
                try {
                    const supabase = createClient();
                    const {
                        data,
                        error
                    } = await supabase.from("user_master_resumes").select("*").eq("user_id", user.id).maybeSingle()

                    if (error) {
                        console.error("Error fetching resume:", error.message);
                        setResumeData(null)
                        return
                    }
                    setResumeData(data)
                } finally {
                    setLoading(false)
                }
            }
        }

        getResumeData()

    }, [user?.id, refreshResume]);


    return (
        <div className={"bg-white rounded-md w-full shadow-md flex items-center px-6 py-6 justify-between"}>
            <div>
                {
                    resumeData && !loading &&

                    <div className={"flex items-center gap-x-4 justify-center"}>
                        <div className={"bg-[#ededed] p-3 rounded-md"}>
                            <DocumentTextIcon className={"text-blue-700"} width={30} height={30}/>
                        </div>
                        <div className={"flex items-start gap-y-1 justify-center flex-col"}>
                            <p className={"font-bold"}>{resumeData.original_filename}</p>
                            <div className={"flex items-center justify-center gap-x-2"}>
                                <ClockIcon height={16} width={16} className={"text-black/75"}/>
                                <p className={"text-black/75 text-sm"}>Last
                                    updated: {Math.floor((new Date().getTime() - new Date(resumeData.updated_at).getTime()) / (1000 * 60 * 60))} hours
                                    ago</p>

                            </div>

                        </div>

                    </div>

                }
                {
                    loading &&
                    <div className={"text-black/60 font-medium text-md"}>
                        Loading resume ...
                    </div>
                }
                {
                    !resumeData && !loading &&
                    <div className={"flex items-center gap-x-4 justify-center"}>
                        <div className={"bg-[#ededed] p-3 rounded-md"}>
                            <DocumentArrowUpIcon className={"text-blue-700"} width={30} height={30}/>
                        </div>
                        <div className={"flex items-start gap-y-1 justify-center flex-col"}>
                            <p className={"font-bold"}>Upload a master resume to get started</p>
                            <div className={"flex items-center justify-center gap-x-2"}>
                                <p className={"text-black/75 text-sm"}>Upload a DOCX resume so SeekSync can generate
                                    tailored resumes for your saved jobs.</p>

                            </div>

                        </div>

                    </div>
                }


            </div>
            <div onClick={() => setOpen(true)}
                 className={"flex items-center gap-x-2 border-2 hover:cursor-pointer px-4 py-3 border-black/10 rounded-md text-blue-700 justify-center"}>
                <Upload width={16} height={16}/>
                <p className={"text-blue-700 text-xs font-bold"}>{resumeData ? "Upload New Version" : "Upload Resume"}</p>
            </div>

        </div>
    )

}