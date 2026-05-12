import {ResumePayload} from "./schema";
import {DocumentArrowUpIcon, DocumentTextIcon} from "@heroicons/react/24/outline";
import {Dispatch, SetStateAction, useState} from "react";
import DashboardResumePopup from "../Dashboard/ResumeUploader/DashboardResumePopup";

type ResumeEditorSidebarProps = {
    resumeData: ResumePayload | null
    onResumeUpdated: Dispatch<SetStateAction<boolean>>
}


export default function ResumeEditorSidebar({resumeData, onResumeUpdated}: ResumeEditorSidebarProps){
    const [popupOpen, setPopupOpen] = useState<boolean>(false);

    const convertDateToString = (dateString?: string) => {
        if (!dateString) {
            return "Not Generated"
        }

        const date = new Date(dateString).toDateString().split(" ")
        return date.slice(1, date.length).join(" ").toString()
    }


    return (
        <div className={"flex flex-col bg-white shadow-md h-1/3 w-full gap-y-4 rounded-md min-h-0 p-5 overflow-y-auto"}>
            <div className={"flex justify-start items-center gap-x-3"}>
                <div className={"p-2 bg-blue-500/20 rounded-xl"}>
                    <DocumentTextIcon width={20} height={20}/>
                </div>
                <div>
                    <p className={"text-md font-bold"}>Resume Source</p>
                    <p className={"text-xs text-black/50 font-semibold"}>Original uploaded file</p>
                </div>
            </div>

            <div className={"bg-[#ededed] flex items-start justify-center gap-y-1 flex-col border rounded-md px-2 py-2 border-black/10"}>
                <p className={"text-sm w-full truncate font-bold"}>{resumeData?.fileName}</p>
                <p className={"text-xs text-black/50 font-semibold"}>First Uploaded: {convertDateToString(resumeData?.createdAt)}</p>
            </div>

            <button onClick={() => setPopupOpen(true)} className={"border hover:cursor-pointer flex gap-x-2 items-center py-2 rounded-md justify-center border-black/10"}>
                <DocumentArrowUpIcon width={20} height={20}/>
                <p className={"text-sm text-black/70 font-semibold"}>Replace File</p>
            </button>
            {popupOpen && <DashboardResumePopup setOpen={setPopupOpen} onResumeUpdated={onResumeUpdated}/>}
        </div>
    )
}