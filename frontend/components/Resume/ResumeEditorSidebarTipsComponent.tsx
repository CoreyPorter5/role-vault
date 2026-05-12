import {SparklesIcon} from "@heroicons/react/24/outline";
import {Dot} from "lucide-react";


export default function ResumeEditorSidebarTipsComponent(){
    return (
        <div className={"flex flex-col bg-white shadow-md h-1/3 w-full gap-y-4 rounded-md min-h-0 p-5 overflow-y-auto"}>
            <div className={"flex justify-start items-center gap-x-3"}>
                <div className={"p-2 bg-blue-500/20 rounded-xl"}>
                    <SparklesIcon width={20} height={20}/>
                </div>
                <div>
                    <p className={"text-md font-bold"}>AI Tailoring Tips</p>
                </div>
            </div>
            <div className={"flex flex-col items-center justify-start gap-y-2"}>
                <div className={"flex self-start items-center justify-start gap-x-2"}>
                    <Dot className={"self-baseline"} height={20} width={20}/>
                    <p className={"text-xs font-medium"}>Ensure role titles are standard and clear.</p>
                </div>
                <div className={"flex self-start items-center justify-start gap-x-2"}>
                    <Dot className={"self-baseline"} height={20} width={20}/>
                    <p className={"text-xs font-medium"}>Include measurable achievements (%, $, numbers).</p>
                </div>
                <div className={"flex self-start items-center justify-start gap-x-2"}>
                    <Dot className={"self-baseline"} height={20} width={20}/>
                    <p className={"text-xs font-medium"}>Remove outdated or irrelevant early career info.</p>
                </div>

            </div>
        </div>
    )

}