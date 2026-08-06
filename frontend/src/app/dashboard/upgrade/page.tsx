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


    return <main className="flex w-full flex-col items-center justify-center gap-y-3 px-3 pb-10 pt-5 sm:px-6 lg:px-10">
        <h1 className="text-center text-2xl font-bold sm:text-3xl">Upgrade to generate more tailored resumes</h1>
        <h2 className="max-w-2xl text-center font-semibold text-black/60">Get more resume generations, DOCX downloads,
            and application tools to move faster</h2>
        <CurrentUsageModalComponent/>
        <PricingTierModalComponent/>
    </main>
}
