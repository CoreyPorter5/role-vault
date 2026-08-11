"use client"

import {ArrowRight, Check, CircleCheck, Star} from "lucide-react";
import {LockClosedIcon} from "@heroicons/react/24/outline";
import {useJWKTokenAndUserAndSidebar} from "../Context/DashboardContextProvider";
import {createStripeCheckoutSession} from "@/lib/stripe/client";

export default function PricingTierModalComponent(){

    const {token} = useJWKTokenAndUserAndSidebar()




    return <section className="mt-5 flex w-full max-w-5xl flex-col gap-5 lg:flex-row">
        <div className="app-panel flex w-full flex-col items-center justify-center gap-y-4 p-5 sm:p-8 lg:w-1/2">
            <div className={"flex items-center w-full justify-between"}>
                <p className={"font-bold text-lg"}>Free</p>
                <p className="rounded-md bg-[#ebe9e4] px-2 py-1 text-xs font-semibold text-[#686d75]">Current plan</p>
            </div>
            <p className={"self-start font-bold text-2xl"}>
                $0
            </p>
            <div className={"flex self-start flex-col gap-y-4 items-center justify-center"}>
                <div className={"flex items-center self-start justify-center gap-x-2"}>
                    <Check className={"opacity-60"} height={16} width={16}/>
                    <p className={"text-sm font-medium text-black/60"}>Sync saved jobs from SEEK</p>
                </div>
                <div className={"flex items-center self-start justify-center gap-x-2"}>
                    <Check className={"opacity-60"} height={16} width={16}/>
                    <p className={"text-sm font-medium text-black/60"}>Track applications in your dashboard</p>
                </div>
                <div className={"flex items-center self-start justify-center gap-x-2"}>
                    <Check className={"opacity-60"} height={16} width={16}/>
                    <p className={"text-sm font-medium text-black/60"}>3 tailored resumes per month</p>
                </div>
                <div className={"flex items-center self-start justify-center gap-x-2"}>
                    <Check className={"opacity-60"} height={16} width={16}/>
                    <p className={"text-sm font-medium text-black/60"}>Basic application library</p>
                </div>
                <div className={"flex items-center self-start justify-center gap-x-2"}>
                    <Check className={"opacity-60"} height={16} width={16}/>
                    <p className={"text-sm font-medium text-black/60"}>Manual resume management</p>
                </div>
            </div>
            <button className="mt-auto w-full rounded-lg bg-[#ebe9e4] py-3 hover:cursor-not-allowed">
                <p className={"text-sm font-semibold text-black/60"}>Current plan</p>
            </button>
        </div>



        <div className="flex w-full flex-col items-center justify-center gap-y-4 rounded-xl border-2 border-[#0D3880] bg-[#f8fafc] p-5 sm:p-8 lg:w-1/2">
            <div className={"flex items-center w-full justify-between"}>
                <p className="text-lg font-bold text-[#0D3880]">SeekSync Pro</p>
                <div className={"flex items-center bg-blue-500/20 rounded-full px-2 py-1 justify-center gap-x-1"}>
                    <Star width={12} height={12} className={"opacity-60"}/>
                    <p className={"text-xs font-semibold text-black/60"}>Recommended</p>
                </div>

            </div>
            <div className={"self-start flex gap-x-1 items-center justify-center"}>
                <p className={"font-bold self-baseline-last text-2xl"}>$9.99</p>
                <p className={"self-baseline-last text-sm text-black/60"}>/month</p>
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
            <button onClick={() => createStripeCheckoutSession(token)} className="button-primary mt-auto w-full">
                <p className={"text-sm font-semibold text-white"}>Upgrade now</p>
                <ArrowRight color={"white"} height={16} width={16}/>
            </button>
            <div className="flex items-start justify-center gap-x-1 text-center">
                <LockClosedIcon color={"black"} width={16} height={16} className={"opacity-60"}/>
                <p className={"text-xs text-black/60"}>Secure checkout powered by Stripe. Cancel anytime.</p>
            </div>
        </div>
    </section>
}
