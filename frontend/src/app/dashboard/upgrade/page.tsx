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


    return <main className={"px-10 pt-5 pb-10 flex items-center flex-col gap-y-3 justify-center w-full "}>
        <h1 className={"text-3xl font-bold"}>Upgrade to generate more tailored resumes</h1>
        <h2 className={"font-semibold max-w-1/2 text-center text-black/60"}>Get more resume generations, DOCX downloads,
            and application tools to move faster</h2>
        <CurrentUsageModalComponent/>
        <PricingTierModalComponent/>
    </main>
}