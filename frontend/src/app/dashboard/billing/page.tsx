"use client"

import {useEffect, useState} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import {CheckCircleIcon} from "@heroicons/react/24/solid";
import {XIcon} from "lucide-react";

import DocumentCreditsBillingComponent from "../../../../components/Dashboard/Billing/DocumentCreditsBillingComponent";
import {useJWKTokenAndUserAndSidebar} from "../../../../components/Dashboard/Context/DashboardContextProvider";
import type {DocumentCreditUsage} from "../../../../components/Dashboard/ResumeGenerator/types";
import Skeleton from "../../../../components/ui/Skeleton";
import InlineErrorMessage from "../../../../components/ui/InlineErrorMessage";
import {captureAppError} from "@/lib/sentry/captureAppError";

type BillingProfile = {
    has_legacy_subscription?: boolean;
};

export default function BillingPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const success = searchParams.get("success") === "true";
    const {token} = useJWKTokenAndUserAndSidebar();
    const [usage, setUsage] = useState<DocumentCreditUsage | null>(null);
    const [profile, setProfile] = useState<BillingProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [paymentSuccessOpen, setPaymentSuccessOpen] = useState(success);

    useEffect(() => {
        if (!token) {
            return;
        }
        let cancelled = false;
        const timers: ReturnType<typeof setTimeout>[] = [];
        const loadBilling = async (showLoading: boolean) => {
            if (showLoading) setLoading(true);
            try {
                const headers = {Authorization: `Bearer ${token}`};
                const [profileResponse, usageResponse] = await Promise.all([
                    fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/profile`, {headers, cache: "no-store"}),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/usage/document-credits`, {headers, cache: "no-store"}),
                ]);
                if (!profileResponse.ok || !usageResponse.ok) {
                    if (!cancelled) setError("Your credit balance could not be loaded. Please try again.");
                    return;
                }
                const [nextProfile, nextUsage] = await Promise.all([
                    profileResponse.json() as Promise<BillingProfile>,
                    usageResponse.json() as Promise<DocumentCreditUsage>,
                ]);
                if (!cancelled) {
                    setProfile(nextProfile);
                    setUsage(nextUsage);
                    setError(null);
                }
            } catch (loadError) {
                captureAppError({
                    code: "WEB_BILLING_CREDITS_FETCH_FAILED",
                    message: "Unexpected error while fetching billing credits",
                    error: loadError,
                    area: "billing",
                    action: "fetch_document_credits",
                    endpoint: "/api/v1/usage/document-credits",
                });
                if (!cancelled) setError("Your credit balance could not be loaded. Please try again.");
            } finally {
                if (!cancelled && showLoading) setLoading(false);
            }
        };

        void loadBilling(true);
        // Checkout redirects can beat the webhook by a moment. Quietly refresh
        // the balance while the confirmation banner is visible.
        if (success) {
            timers.push(setTimeout(() => void loadBilling(false), 1500));
            timers.push(setTimeout(() => void loadBilling(false), 4000));
        }
        return () => {
            cancelled = true;
            timers.forEach(clearTimeout);
        };
    }, [success, token]);

    const closeSuccess = () => {
        setPaymentSuccessOpen(false);
        router.replace("/dashboard/billing", {scroll: false});
    };
    const pageLoading = Boolean(token) && loading;
    const pageError = token ? error : "Your billing session is unavailable. Sign in again to continue.";

    return (
        <main className="flex h-full min-h-0 w-full flex-col overflow-y-auto px-3 py-5 sm:px-6 lg:px-9 lg:py-8">
            <div className="mb-5 flex shrink-0 flex-col gap-y-1">
                <span className="eyebrow">Credits and usage</span>
                <h1 className="page-title mt-1">Billing</h1>
                <p className="font-medium text-[#6c7179]">View your shared document balance and buy one-time credit packs.</p>
            </div>

            {paymentSuccessOpen && (
                <div className="mb-6 flex w-full items-start justify-between rounded-xl border border-[#b9dec8] bg-[#edf8f1] px-4 py-4">
                    <div className="flex items-start gap-3">
                        <CheckCircleIcon className="mt-0.5 size-6 shrink-0 text-[#237a49]"/>
                        <div>
                            <p className="text-sm font-semibold text-[#1f6940]">Payment successful</p>
                            <p className="mt-0.5 text-sm text-[#397756]">Your credits are being added. The balance refreshes automatically.</p>
                        </div>
                    </div>
                    <button type="button" aria-label="Dismiss payment confirmation" onClick={closeSuccess}
                            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-[#397756] hover:bg-[#dcefe3]">
                        <XIcon size={17}/>
                    </button>
                </div>
            )}

            {!pageLoading && !pageError && (
                <DocumentCreditsBillingComponent
                    token={token}
                    usage={usage}
                    hasLegacySubscription={Boolean(profile?.has_legacy_subscription)}
                />
            )}

            {pageLoading && !pageError && <BillingSkeleton/>}
            {!pageLoading && pageError && <InlineErrorMessage>{pageError}</InlineErrorMessage>}
        </main>
    );
}

function BillingSkeleton() {
    return (
        <section aria-label="Loading billing details" aria-busy="true" className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-5">
                <div className="app-panel p-6">
                    <Skeleton className="h-4 w-28"/>
                    <Skeleton className="mt-4 h-14 w-24"/>
                    <Skeleton className="mt-6 h-16 w-full"/>
                </div>
                <div className="app-panel p-6">
                    <Skeleton className="h-6 w-44"/>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <Skeleton className="h-28 w-full"/>
                        <Skeleton className="h-28 w-full"/>
                    </div>
                </div>
            </div>
            <Skeleton className="h-64 w-full rounded-xl"/>
        </section>
    );
}
