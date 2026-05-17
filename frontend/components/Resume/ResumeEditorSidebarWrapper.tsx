import ResumeEditorSidebar from "./ResumeEditorSidebar";
import {ResumePayload} from "./schema";
import {Dispatch, SetStateAction} from "react";
import ResumeEditorSidebarHealthComponent from "./ResumeEditorSidebarHealthComponent";


type ResumeEditorSidebarWrapperProps = {
    resumeData: ResumePayload | null
    onResumeUpdated: Dispatch<SetStateAction<boolean>>
    loadingResume: boolean
}

export default function ResumeEditorSidebarWrapper({onResumeUpdated, resumeData, loadingResume}: ResumeEditorSidebarWrapperProps){
    return(
        <div className={"flex flex-col gap-y-5 w-1/4"}>
            <ResumeEditorSidebar loadingResume={loadingResume} onResumeUpdated={onResumeUpdated} resumeData={resumeData}/>
            <ResumeEditorSidebarHealthComponent resumeData={resumeData}/>

        </div>

    )
}