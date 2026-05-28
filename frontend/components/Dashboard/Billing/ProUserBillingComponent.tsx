"use client"

import {CalendarSync, CircleCheck, InfoIcon} from "lucide-react";
import {LockClosedIcon} from "@heroicons/react/24/outline";
import {StarIcon} from "@heroicons/react/24/solid";
import {Database} from "@/lib/types/database.types";
import {createStripeUserPortalSession} from "@/lib/stripe/client";


type ProUserBillingComponentProps = {
    token: string | null,
    userProfile: Database["public"]["Tables"]["profiles"]["Row"]
}

export default function ProUserBillingComponent({token, userProfile}: ProUserBillingComponentProps) {
    const usagePercent = (userProfile.resume_generations_used / userProfile.resume_generations_limit) * 100;
    const convertDateToString = (dateString: string | null) => {
        if (!dateString) {
            return "Please upload a resume"
        }

        const date = new Date(dateString).toDateString().split(" ")
        return date.slice(1, date.length).join(" ").toString()
    }


    return (
        <section className={"flex gap-x-5 w-full items-stretch"}>
            <div className={"bg-white w-2/3 p-6 flex flex-col items-start justify-center gap-y-5 rounded-md"}>
                <div className={"flex items-center justify-start gap-x-2"}>
                    <p className={"text-lg font-bold text-blue-700"}>SeekSync Pro</p>
                    <p className={"uppercase bg-green-200/50 text-green-800/70 px-2 py-1 text-xs font-bold rounded-full"}>Active</p>
                </div>
                <div className={"flex flex-col gap-y-1 items-center justify-center"}>
                    <div className={"flex gap-x-1 items-center justify-start"}>
                        <p className={"font-bold self-baseline-last text-3xl"}>$9.99</p>
                        <p className={"self-baseline-last font-medium text-sm text-black/60"}>/month</p>
                    </div>
                    <div className={"flex self-start items-center justify-center gap-x-1"}>
                        <CalendarSync className={"opacity-60"} width={16} height={16}/>
                        <p className={"text-xs font-semibold text-black/60"}>Renews monthly</p>
                    </div>
                </div>

                <div className={"w-full flex flex-col mt-5 gap-y-3"}>
                    <div className={"flex items-center justify-between"}>
                        <p className={"text-lg font-bold"}>Resume generations</p>
                        <p className={"text-blue-700 font-bold text-sm"}>{userProfile.resume_generations_used} / {userProfile.resume_generations_limit} used
                            this month</p>
                    </div>
                    <div className={"w-full h-2.5 rounded-full bg-[#ededed]"}>
                        <div style={{width: `${usagePercent}%`}}
                             className={`z-10 bg-blue-700 h-2.5 rounded-full`}></div>
                    </div>
                    <div className={"flex items-center gap-x-1"}>
                        <InfoIcon className={"opacity-70"} width={16} height={16}/>
                        <p className={"text-black/70 text-xs"}>Usage resets at the start of your next billing
                            cycle: {convertDateToString(userProfile.resume_usage_period_end)} </p>
                    </div>
                </div>

                <div className={"border-b border-b-black/15 w-full"}/>
                <div className={"flex justify-between w-full items-center"}>
                    <button onClick={() => createStripeUserPortalSession(token)}
                            className={"text-white hover:cursor-pointer bg-blue-700 px-5 py-2 rounded-md font-semibold"}>Manage
                        subscription
                    </button>
                    <div className={"flex items-center gap-x-1 justify-center"}>
                        <LockClosedIcon width={16} height={16} className={"opacity-70"}/>
                        <p className={"text-xs text-black/70 font-medium"}>Secure billing powered by Stripe</p>
                    </div>
                </div>
            </div>


            <div className={"bg-white w-1/3 p-6 flex flex-col items-start justify-start gap-y-8 rounded-md"}>
                <div className={"flex items-center gap-x-2"}>
                    <StarIcon className={"text-blue-700"} height={24} width={24}/>
                    <p className={"text-lg font-bold"}>Pro Features</p>
                </div>
                <div className={"flex self-start flex-col gap-y-4 items-center justify-center"}>
                    <div className={"flex items-center self-start justify-center gap-x-2"}>
                        <CircleCheck className={"text-blue-700"} height={16} width={16}/>
                        <p className={"text-sm font-medium text-black"}>100 tailored resumes per month</p>
                    </div>
                    <div className={"flex items-center self-start justify-center gap-x-2"}>
                        <CircleCheck className={"text-blue-700"} height={16} width={16}/>
                        <p className={"text-sm font-medium text-black"}>Download DOCX resumes</p>
                    </div>
                    <div className={"flex items-center self-start justify-center gap-x-2"}>
                        <CircleCheck className={"text-blue-700"} height={16} width={16}/>
                        <p className={"text-sm font-medium text-black"}>Save generated resumes to your library</p>
                    </div>
                    <div className={"flex items-center self-start justify-center gap-x-2"}>
                        <CircleCheck className={"text-blue-700"} height={16} width={16}/>
                        <p className={"text-sm font-medium text-black"}>Track resume status for every job</p>
                    </div>
                    <div className={"flex items-center self-start justify-center gap-x-2"}>
                        <CircleCheck className={"text-blue-700"} height={16} width={16}/>
                        <p className={"text-sm font-medium text-black"}>Generate cover letters</p>
                    </div>
                    <div className={"flex items-center self-start justify-center gap-x-2"}>
                        <CircleCheck className={"text-blue-700"} height={16} width={16}/>
                        <p className={"text-sm font-medium text-black"}>Priority access to new features</p>
                    </div>
                </div>
            </div>

        </section>)


}