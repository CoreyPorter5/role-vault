"use client"

import CurrentUsageModalComponent from "../../../../components/Dashboard/Upgrade/CurrentUsageModalComponent";
import PricingTierModalComponent from "../../../../components/Dashboard/Upgrade/PricingTierModelComponent";
import {useJWKTokenAndUserAndSidebar} from "../../../../components/Dashboard/Context/DashboardContextProvider";
import {useRouter} from "next/navigation";
import {useEffect} from "react";

export default function UpgradePage() {

    const router = useRouter();
    const {profile} = useJWKTokenAndUserAndSidebar()
    const isProUser = profile?.plan === "pro" || profile?.plan === "trial"

    useEffect(() => {
        if (isProUser) {
            router.replace("/dashboard/billing")
        }
    }, [isProUser, router]);

    if (isProUser) {
        return null
    }


    return <main className="flex w-full flex-col items-center justify-center gap-y-3 px-3 pb-10 pt-7 sm:px-6 lg:px-9 lg:pt-10">
        <span className="eyebrow">Plans built for momentum</span>
        <h1 className="max-w-3xl text-center text-3xl font-[580] sm:text-5xl">Upgrade to create more application documents</h1>
        <h2 className="max-w-2xl text-center font-medium leading-7 text-[#6c7179]">Get more resume and cover letter generations, DOCX downloads,
            and application tools to move faster</h2>
        <CurrentUsageModalComponent/>
        <PricingTierModalComponent/>
    </main>
}
