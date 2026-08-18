import ChangePasswordComponent from "../../../../components/Account/ChangePasswordComponent";
import AccountOverviewComponent from "../../../../components/Account/AccountOverviewComponent";
import {createClient} from "@/lib/supabase/server";
import type {DocumentCreditUsage} from "../../../../components/Dashboard/ResumeGenerator/types";
import {captureAppError} from "@/lib/sentry/captureAppError";

export default async function AccountPage() {
    const supabase = await createClient();
    const {data: {user}} = await supabase.auth.getUser();
    const {data: {session}} = await supabase.auth.getSession();
    const [profileResult, creditUsage] = user
        ? await Promise.all([
            supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
            getDocumentCreditUsage(session?.access_token ?? null),
        ])
        : [{data: null}, null] as const;
    const profile = profileResult.data;
    if ("error" in profileResult && profileResult.error) {
        captureAppError({
            code: "WEB_ACCOUNT_PROFILE_LOAD_FAILED",
            message: "Failed to load the account profile",
            error: new Error("Account profile query failed"),
            area: "account",
            action: "load_profile",
            extra: {upstreamErrorCode: profileResult.error.code},
        });
    }
    const providers = (Array.isArray(user?.app_metadata?.providers)
        ? user.app_metadata.providers
        : [user?.app_metadata?.provider])
        .filter((provider): provider is string => typeof provider === "string");
    const canChangePassword = providers.length === 0 || providers.includes("email");

    return (
        <main className="flex h-full min-h-0 w-full flex-col overflow-y-auto px-3 py-5 sm:px-6 lg:px-9 lg:py-8">
            <div className={"shrink-0 flex flex-col gap-y-2"}>
                <span className="eyebrow">Personal settings</span>
                <h1 className="page-title mt-1">Account</h1>
                <p className="font-medium text-[#6c7179]">Review your profile, document credits, and security settings.</p>
            </div>

            <div className="mt-7 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                <AccountOverviewComponent user={user} profile={profile} creditUsage={creditUsage}/>
                <ChangePasswordComponent canChangePassword={canChangePassword}/>
            </div>

        </main>
    )
}

async function getDocumentCreditUsage(accessToken: string | null): Promise<DocumentCreditUsage | null> {
    const apiURL = process.env.NEXT_PUBLIC_API_URL_PREFIX;
    if (!accessToken || !apiURL) return null;

    try {
        const response = await fetch(`${apiURL}/api/v1/usage/document-credits`, {
            headers: {Authorization: `Bearer ${accessToken}`},
            cache: "no-store",
        });

        if (!response.ok) {
            return null;
        }
        try {
            return await response.json() as DocumentCreditUsage;
        } catch (error) {
            captureAppError({
                code: "WEB_ACCOUNT_USAGE_RESPONSE_INVALID",
                message: "Account document credit usage returned invalid JSON",
                error,
                area: "account",
                action: "parse_usage",
                endpoint: "/api/v1/usage/document-credits",
            });
            return null;
        }
    } catch (error) {
        captureAppError({
            code: "WEB_ACCOUNT_USAGE_LOAD_FAILED",
            message: "Failed to load account document credit usage",
            error,
            area: "account",
            action: "load_usage",
            endpoint: "/api/v1/usage/document-credits",
        });
        return null;
    }
}
