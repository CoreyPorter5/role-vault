import {redirect} from "next/navigation";

import PricingTierModalComponent from "../../../../components/Dashboard/Upgrade/PricingTierModelComponent";
import {captureAppError} from "@/lib/sentry/captureAppError";
import {createClient} from "@/lib/supabase/server";
import type {DocumentCreditUsage} from "../../../../components/Dashboard/ResumeGenerator/types";

export default async function UpgradePage() {
    const supabase = await createClient();
    const {data: {user}} = await supabase.auth.getUser();

    if (!user) {
        redirect("/");
    }

    const {data: {session}} = await supabase.auth.getSession();
    const usage = await getDocumentCreditUsage(session?.access_token ?? null);

    return (
        <main
            className="flex h-full min-h-0 w-full flex-col items-center overflow-y-auto px-3 pb-10 pt-7 sm:px-6 lg:px-9 lg:pt-10">
            <span className="eyebrow">Credits that move with you</span>
            <h1 className="mt-2 max-w-3xl text-center text-3xl font-[580] sm:text-5xl">
                Buy only the documents you need
            </h1>
            <p className="mt-3 max-w-2xl text-center font-medium leading-7 text-[#6c7179]">
                No monthly plan and no expiry. Every generated resume or cover letter uses one shared credit.
            </p>
            <PricingTierModalComponent usage={usage}/>
        </main>
    );
}

async function getDocumentCreditUsage(accessToken: string | null): Promise<DocumentCreditUsage | null> {
    const apiURL = process.env.NEXT_PUBLIC_API_URL_PREFIX;
    if (!accessToken || !apiURL) return null;

    try {
        const response = await fetch(`${apiURL}/api/v1/usage/document-credits`, {
            headers: {Authorization: `Bearer ${accessToken}`},
            cache: "no-store",
        });
        if (!response.ok) return null;
        return await response.json() as DocumentCreditUsage;
    } catch (error) {
        captureAppError({
            code: "WEB_UPGRADE_CREDITS_LOAD_FAILED",
            message: "Failed to load document credits for the purchase page",
            error,
            area: "upgrade",
            action: "load_document_credits",
            endpoint: "/api/v1/usage/document-credits",
        });
        return null;
    }
}
