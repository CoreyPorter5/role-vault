import {ResumePayload} from "./schema";
import {CheckCircleIcon, XCircleIcon} from "@heroicons/react/24/outline";
import {DocumentCheckIcon} from "@heroicons/react/24/outline";
import {analyseResumeHealth} from "./resume_health_helper";

type ResumeEditorSidebarHealthComponentProps = {
    resumeData: ResumePayload | null
}


export default function ResumeEditorSidebarHealthComponent({resumeData}: ResumeEditorSidebarHealthComponentProps) {
    const checks = analyseResumeHealth(resumeData?.plaintext);
    return (
        <div className="app-panel flex h-2/3 min-h-0 w-full flex-col gap-y-4 overflow-y-auto p-5">
            <div className={"flex justify-start items-center gap-x-3"}>
                <div className={"p-2 bg-blue-500/20 rounded-xl"}>
                    <DocumentCheckIcon width={20} height={20}/>
                </div>
                <div>
                    <p className={"text-md font-bold"}>Resume Health</p>
                </div>
            </div>
            <div className="flex flex-col pl-2 items-start gap-y-3">

                {checks.map((check) => (

                    <div key={check.label} className="flex items-start gap-x-2">

                        {check.passed ? (

                            <CheckCircleIcon className="mt-0.5 text-green-600 shrink-0" height={20} width={20}/>

                        ) : (

                            <XCircleIcon className="mt-0.5 text-red-500 shrink-0" height={20} width={20}/>

                        )}

                        <div>

                            <p className="text-sm font-medium">{check.label}</p>

                            {check.helper && (

                                <p className="text-xs text-black/50">{check.helper}</p>

                            )}

                        </div>

                    </div>

                ))}

            </div>
        </div>
    )

}
