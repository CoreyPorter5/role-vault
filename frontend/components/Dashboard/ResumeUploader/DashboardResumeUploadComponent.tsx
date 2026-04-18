import {Upload} from "lucide-react";
import {Dispatch, SetStateAction} from "react";

type DashboardResumeUploadComponentProps = {
    setOpen: Dispatch<SetStateAction<boolean>>
}

export default function DashboardResumeUploadComponent({setOpen}: DashboardResumeUploadComponentProps){
    return(
        <div className={"bg-white rounded-md w-full shadow-md flex items-center px-6 py-6 justify-between"}>
            <div>

            </div>
            <div onClick={() => setOpen(true)} className={"flex items-center gap-x-2 border-2 hover:cursor-pointer px-4 py-3 border-black/10 rounded-md text-blue-700 justify-center"}>
                <Upload width={16} height={16}/>
                <p className={"text-blue-700 text-xs font-bold"}>Upload New Version</p>
            </div>

        </div>
    )

}