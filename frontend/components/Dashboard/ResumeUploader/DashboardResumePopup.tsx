import {Dispatch, SetStateAction, useEffect, useState} from "react";
import {LoaderCircle, XIcon} from "lucide-react";
import {CloudArrowUpIcon} from "@heroicons/react/24/solid";
import {useJWKTokenAndUserAndSidebar} from "../Context/DashboardContextProvider";

type DashboardResumePopupProps = {
    setOpen: Dispatch<SetStateAction<boolean>>
}

type ErrorResponseType = {
    code: string,
    message: string
}


export default function DashboardResumePopup({setOpen}: DashboardResumePopupProps) {


    const [inputResume, setInputResume] = useState<File | null>(null);
    const [uploadedResume, setUploadedResume] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null)
    const [uploading, setUploading] = useState<boolean>(false)
    const {token} = useJWKTokenAndUserAndSidebar();


    useEffect(() => {
        const uploadResume = async () => {
            if (uploadedResume) {
                setUploading(true)
                const formData = new FormData();
                formData.append("resume", uploadedResume)

                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/resume`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    body: formData
                })

                if (response.ok) {
                    setUploading(false)
                    setOpen(false)
                    //Success Popup

                    return
                }

                setUploading(false)
                const text: ErrorResponseType = await response.json()
                setError(text.message)
                return


            }
            return

        }

        uploadResume()

    }, [uploadedResume]);


    return (
        <div className={"fixed inset-0 z-50 flex items-center justify-center"}>

            <button disabled={uploading} onClick={() => setOpen(false)}
                    className="absolute inset-0 bg-black/20 backdrop-blur-sm"/>

            <div className={"w-full max-w-xl z-10 flex flex-col gap-y-5 rounded-md px-4 py-5 bg-[#ededed]"}>
                <div className={"flex items-center justify-between"}>
                    <h2 className={"text-lg font-bold"}>Manage Master Resumes</h2>
                    <button disabled={uploading} className={"hover:cursor-pointer"}
                            onClick={() => setOpen(false)}>
                        <XIcon className={"opacity-50"}/>
                    </button>
                </div>
                <div>
                    <p className={"uppercase text-xs font-bold text-black/60"}>Current Primary</p>
                </div>
                <label className={"block cursor-pointer"}>
                    <input onChange={(event) => {
                        setError(null);
                        setInputResume(event.target.files?.[0] ?? null)
                    }} type="file"
                           className={"hidden"} accept={".pdf"}/>
                    <div
                        className={"flex items-center justify-center flex-col gap-y-1 bg-gray-500/15 py-10 rounded-md"}>
                        <div className={"bg-white rounded-lg text-blue-700 mb-5 shadow-md p-3"}>
                            <CloudArrowUpIcon height={24} width={24}/>
                        </div>

                        <p className={"text-sm font-bold"}>Drag & drop your new master resume</p>
                        <p className={"text-sm"}>Supports PDF's up to 5MB</p>

                    </div>

                </label>


                {
                    inputResume &&
                    <div>
                        <p>{inputResume.name}</p>
                    </div>
                }
                {
                    error &&
                    <div>
                        <p className={"text-red-500 text-sm"}>{error}</p>
                    </div>
                }
                <div className={"flex items-center justify-end gap-x-3"}>
                    <div className={"text-sm font-semibold hover:cursor-pointer"} onClick={() => setOpen(false)}>
                        Cancel
                    </div>
                    <button onClick={() => {
                        setUploadedResume(inputResume);
                    }
                    }
                            disabled={!inputResume || uploading}
                            className={"bg-blue-700 disabled:opacity-50 disabled:cursor-auto rounded-lg px-6 shadow-md hover:cursor-pointer py-1.5 text-white text-sm font-semibold"}>
                        {uploading ? <LoaderCircle className={"animate-spin"}></LoaderCircle> : <p>Done</p>}
                    </button>
                </div>
            </div>

        </div>
    )

}