import {JobLibraryItem} from "./schema";
import Image from "next/image";
import globeSVG from "../../public/globe.svg"
import {ArrowDownTrayIcon, ArrowPathIcon, TrashIcon} from "@heroicons/react/24/outline";
import {useJWKTokenAndUserAndSidebar} from "../Dashboard/Context/DashboardContextProvider";

type ResumeLibraryCardProps = {
    libraryItem: JobLibraryItem;
}

type SignedURLResponse = {
    signedURL?: string
}

export default function ResumeLibraryCard({libraryItem}: ResumeLibraryCardProps) {

    const {token, sidebarOpen} = useJWKTokenAndUserAndSidebar();

    const downloadSavedResume = async () => {
        if (!token) {
            console.error("Error: User JWK token does not exist")
            return
        }

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/generated-resumes/${libraryItem.jobId}/download`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })

            if (!response.ok) {
                const error = await response.text();
                console.error("Error getting signed URL: ", error);
                return
            }

            const data: SignedURLResponse = await response.json()
            const signedUrl = data.signedURL;
            if (!signedUrl) {
                console.error("Signed URL missing from response:", data);
                return;
            }
            const fileResponse = await fetch(signedUrl);
            if (!fileResponse.ok) {
                console.error("Error downloading file from signed URL");
                return;
            }

            const blob = await fileResponse.blob();
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;

            const date = new Date().toISOString().slice(0, 10)
            const safeCompany = libraryItem.companyName.replace(/[^\w.-]+/g, "_");
            const safeTitle = libraryItem.jobTitle.replace(/[^\w.-]+/g, "_");

            a.download = `${safeCompany}_${safeTitle}_${date}.docx`;

            document.body.appendChild(a);
            a.click();
            a.remove();

            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.log("Error: ", error);
            return
        }

    }


    const deleteSavedResume = async () => {
        if (!token) {
            console.error("Error: User JWK token does not exist")
            return
        }
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/generated-resumes/${libraryItem.jobId}/delete`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })

            if (!response.ok) {
                const error = await response.text();
                console.error("Error getting signed URL: ", error);
                return
            }

            console.log("Successfully deleted resume")
        } catch (error) {
            console.error("Error: ", error)
        }


    }


    const convertDateToString = (dateString?: string) => {
        if (!dateString) {
            return "Not Generated"
        }

        const date = new Date(dateString).toDateString().split(" ")
        return date.slice(1, date.length).join(" ").toString()
    }

    const shortenJobTitle = (jobTitle: string) => {
        let maxCharLength = 45
        if(!sidebarOpen){
            maxCharLength = 60;
        }

        if (jobTitle.length <= maxCharLength) {
            return jobTitle
        }

        return jobTitle.slice(0, maxCharLength).trimEnd() + "...";
    }


    return (
        <div
            className={"bg-white w-full grid grid-cols-1 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.5fr)] gap-x-6 py-4 items-center px-4 rounded-sm shadow-md"}>

            <div className={"flex items-center gap-x-4 min-w-0"}>
                <Image width={42} height={42} className={"shrink-0"} alt={libraryItem.companyName}
                       src={libraryItem.companyLogo ?? globeSVG}></Image>
                <div className={"flex flex-col gap-y-0.5"}>
                    <p className={"text-sm font-bold"}>{shortenJobTitle(libraryItem.jobTitle)}</p>
                    <p className={"text-xs text-black/50 truncate"}>{libraryItem.companyName}</p>
                </div>
            </div>
            <div className={"flex text-center gap-x-2 justify-start items-center"}>
                <div>
                    {libraryItem.jobStatus}
                </div>
                <p className={"text-sm text-black/60"}>Saved: {convertDateToString(libraryItem.resume.updatedAt)}</p>
            </div>


            <div className={"flex items-center gap-x-3 justify-end"}>
                {libraryItem.resume.exists &&
                    <ArrowDownTrayIcon onClick={downloadSavedResume} className={"hover:cursor-pointer"} width={18}
                                       height={18}/>}
                <ArrowPathIcon width={18} height={18}/>

                {libraryItem.resume.exists &&
                    <TrashIcon className={"hover:cursor-pointer"} onClick={deleteSavedResume} width={18} height={18}/>}
            </div>
        </div>

    )
}