import {ResumePayload} from "./schema";
import {DocumentArrowUpIcon, DocumentTextIcon} from "@heroicons/react/24/outline";
import {Dispatch, SetStateAction, useState} from "react";
import MasterResumeUploadPopup from "../Dashboard/MasterResumeUploader/MasterResumeUploadPopup";
import Skeleton from "../ui/Skeleton";

type ResumeEditorSidebarProps = {
    resumeData: ResumePayload | null
    onResumeUpdated: Dispatch<SetStateAction<boolean>>
    loadingResume: boolean
}


export default function ResumeEditorSidebar({resumeData, onResumeUpdated, loadingResume}: ResumeEditorSidebarProps) {
    const [popupOpen, setPopupOpen] = useState<boolean>(false);

    const convertDateToString = (dateString?: string) => {
        if (!dateString) {
            return "Please upload a resume"
        }

        const date = new Date(dateString).toDateString().split(" ")
        return date.slice(1, date.length).join(" ").toString()
    }


    return (
        <div className="app-panel flex h-1/3 min-h-0 w-full flex-col gap-y-4 overflow-y-auto p-5">
            <div className={"flex justify-start items-center gap-x-3"}>
                <div className={"p-2 bg-blue-500/20 rounded-xl"}>
                    <DocumentTextIcon width={20} height={20}/>
                </div>
                <div>
                    <p className={"text-md font-bold"}>Resume Source</p>
                    <p className={"text-xs text-black/50 font-semibold"}>Original uploaded file</p>
                </div>
            </div>

            {loadingResume ?

                <div
                    className="flex flex-col items-center justify-center gap-y-1 rounded-lg border border-[#dedbd3] bg-[#f8f7f4] px-2 py-2">
                    <Skeleton className="h-4 w-full"/>
                    <Skeleton className="mt-1 h-3 w-3/4 self-start"/>
                </div>

                :
                <div
                    className="flex flex-col items-center justify-center gap-y-1 rounded-lg border border-[#dedbd3] bg-[#f8f7f4] px-2 py-2">
                    <p className={"text-sm w-full truncate font-bold"}>{resumeData?.fileName}</p>
                    <p className={"text-xs self-start text-black/50 font-semibold"}>First
                        Uploaded: {convertDateToString(resumeData?.createdAt)}</p>
                </div>

            }


            <button disabled={loadingResume} onClick={() => setPopupOpen(true)}
                    className={"border hover:cursor-pointer flex gap-x-2 items-center py-2 rounded-md justify-center border-black/10"}>
                <DocumentArrowUpIcon width={20} height={20}/>
                <p className={"text-sm text-black/70 font-semibold"}>{resumeData ? "Replace file" : "Upload file"}</p>
            </button>
            {popupOpen && <MasterResumeUploadPopup setOpen={setPopupOpen} onResumeUpdated={onResumeUpdated}/>}
        </div>
    )
}
