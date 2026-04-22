import {Job} from "@/lib/types/types";
import {Dispatch, SetStateAction} from "react";
import {LoaderCircle, XIcon} from "lucide-react";


type DashboardGenerateResumePopupProps = {
    summary: string | null
    job: Job;
    setOpen: Dispatch<SetStateAction<boolean>>;

}


export default function DashboardGenerateResumePopup({summary, job, setOpen}: DashboardGenerateResumePopupProps) {
    return (
        <div className={"fixed inset-0 z-50 flex items-center justify-center"}>
            <button onClick={() => setOpen(false)}
                    className="absolute inset-0 bg-black/20 backdrop-blur-sm"/>


            <div className={"w-full max-w-xl z-10 flex flex-col gap-y-5 rounded-md px-4 py-5 bg-[#ededed]"}>
                <div className={"flex items-center justify-between"}>
                    <h2 className={"text-lg font-bold"}>Generate Resume</h2>
                    <button className={"hover:cursor-pointer"}
                            onClick={() => setOpen(false)}>
                        <XIcon className={"opacity-50"}/>
                    </button>

                </div>
                <div>
                    <p className={"uppercase text-xs font-bold text-black/60"}>Current Primary</p>
                </div>
                <div>
                    {summary}
                </div>



                <div className={"flex items-center justify-end gap-x-3"}>
                    <div className={"text-sm font-semibold hover:cursor-pointer"} onClick={() => setOpen(false)}>
                        Cancel
                    </div>

                </div>
            </div>

        </div>
    )
}