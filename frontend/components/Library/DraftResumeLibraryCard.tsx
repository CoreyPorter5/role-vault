import {JobLibraryItemDraft} from "./schema";

import Image from "next/image";
import globeSVG from "../../public/globe.svg"

import {useJWKTokenAndUserAndSidebar} from "../Dashboard/Context/DashboardContextProvider";
import {Dispatch, SetStateAction} from "react";

type ResumeLibraryCardProps = {
    onResumeSaved: Dispatch<SetStateAction<boolean>>;
    libraryItem: JobLibraryItemDraft;
}


export default function DraftResumeLibraryCard({onResumeSaved, libraryItem}: ResumeLibraryCardProps) {

    const {sidebarOpen} = useJWKTokenAndUserAndSidebar();










    const shortenJobTitle = (jobTitle: string) => {
        let maxCharLength = 45
        if (!sidebarOpen) {
            maxCharLength = 60;
        }

        if (jobTitle.length <= maxCharLength) {
            return jobTitle
        }

        return jobTitle.slice(0, maxCharLength).trimEnd() + "...";
    }


    return (
        <div
            className={"bg-white w-full grid grid-cols-1 md:grid-cols-[minmax(0,1.8fr)_minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,0.8fr)] gap-x-6 py-4 items-center px-4 rounded-sm shadow-md"}>

            <div className={"flex items-center gap-x-4 min-w-0"}>
                <Image width={42} height={42} className={"shrink-0"} alt={libraryItem.companyName}
                       src={libraryItem.companyLogo ?? globeSVG}></Image>
                <div className={"flex flex-col gap-y-0.5"}>
                    <p className={"text-sm font-bold"}>{shortenJobTitle(libraryItem.jobTitle)}</p>
                    <p className={"text-xs text-black/50 truncate"}>{libraryItem.companyName}</p>
                </div>
            </div>


            <div className={"flex text-center gap-x-2 justify-start items-center"}>
                {libraryItem.jobStatus == "Saved" &&
                    <div className={"bg-gray-300/50 px-3 py-1 rounded-full flex items-center gap-x-2 justify-center"}>
                        <div className={"rounded-full bg-gray-500 h-1.5 w-1.5"}></div>
                        <p className={"font-semibold text-black/60 text-xs"}>{libraryItem.jobStatus} DRAFT</p>
                    </div>}
                {libraryItem.jobStatus == "Applied" &&
                    <div className={"bg-blue-300/50 px-3 py-1 rounded-full flex items-center gap-x-2 justify-center"}>
                        <div className={"rounded-full bg-blue-500 h-1.5 w-1.5"}></div>
                        <p className={"font-semibold text-black/60 text-xs"}>{libraryItem.jobStatus}</p>
                    </div>}
                {libraryItem.jobStatus == "Interviewing" &&
                    <div className={"bg-red-200/50 px-3 py-1 rounded-full flex items-center gap-x-2 justify-center"}>
                        <div className={"rounded-full bg-red-400 h-1.5 w-1.5"}></div>
                        <p className={"font-semibold text-black/60 text-xs"}>{libraryItem.jobStatus}</p>
                    </div>}
                {libraryItem.jobStatus == "Offer" &&
                    <div className={"bg-purple-300/50 px-3 py-1 rounded-full flex items-center gap-x-2 justify-center"}>
                        <div className={"rounded-full bg-purple-500 h-1.5 w-1.5"}></div>
                        <p className={"font-semibold text-black/60 text-xs"}>{libraryItem.jobStatus}</p>
                    </div>}
                {libraryItem.jobStatus == "Accepted" &&
                    <div className={"bg-green-300/50 px-3 py-1 rounded-full flex items-center gap-x-2 justify-center"}>
                        <div className={"rounded-full bg-green-500 h-1.5 w-1.5"}></div>
                        <p className={"font-semibold text-black/60 text-xs"}>{libraryItem.jobStatus}</p>
                    </div>}
                {libraryItem.jobStatus == "Rejected" &&
                    <div className={"bg-red-300/50 px-3 py-1 rounded-full flex items-center gap-x-2 justify-center"}>
                        <div className={"rounded-full bg-red-500 h-1.5 w-1.5"}></div>
                        <p className={"font-semibold text-black/60 text-xs"}>{libraryItem.jobStatus}</p>
                    </div>}
            </div>



        </div>
    )
}