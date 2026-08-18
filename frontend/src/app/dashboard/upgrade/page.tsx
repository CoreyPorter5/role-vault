import {redirect} from "next/navigation";

import PricingTierModalComponent from "../../../../components/Dashboard/Upgrade/PricingTierModelComponent";
import {captureAppError} from "@/lib/sentry/captureAppError";
import {createClient} from "@/lib/supabase/server";

export default async function UpgradePage() {
    const supabase = await createClient();
    const {data: {user}} = await supabase.auth.getUser();

    if (!user) {
        redirect("/");
    }

    const profileResult = await supabase
        .from("profiles")
        .select("plan")
        .eq("user_id", user.id)
        .maybeSingle();

    if (profileResult.error) {
        captureAppError({
            code: "WEB_UPGRADE_PROFILE_LOAD_FAILED",
            message: "Failed to load the plan for the upgrade page",
            error: new Error("Upgrade profile query failed"),
            area: "upgrade",
            action: "load_profile",
            extra: {upstreamErrorCode: profileResult.error.code},
        });
    }

    if (profileResult.data?.plan === "pro" || profileResult.data?.plan === "trial") {
        redirect("/dashboard/billing");
    }


    return (
        <main
            className="flex h-full min-h-0 w-full flex-col items-center overflow-y-auto px-3 pb-10 pt-7 sm:px-6 lg:px-9 lg:pt-10">
            <span className="eyebrow">Plans built for momentum</span>
            <h1 className="mt-2 max-w-3xl text-center text-3xl font-[580] sm:text-5xl">
                Upgrade to create more application documents
            </h1>
            <p className="mt-3 max-w-2xl text-center font-medium leading-7 text-[#6c7179]">
                Get more resume and cover letter generations, DOCX downloads, and application tools to move faster
            </p>
            <PricingTierModalComponent/>
        </main>
    );
}
