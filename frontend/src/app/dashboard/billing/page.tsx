"use client"

import {useSearchParams, useRouter} from "next/navigation";
import ProUserBillingComponent from "../../../../components/Dashboard/Billing/ProUserBillingComponent";
import BillingHistoryComponent from "../../../../components/Dashboard/Billing/BillingHistoryComponent";
import {useEffect, useState} from "react";
import * as Sentry from "@sentry/nextjs";
import {Database} from "@/lib/types/database.types";
import {useJWKTokenAndUserAndSidebar} from "../../../../components/Dashboard/Context/DashboardContextProvider";
import FreeUserBillingComponent from "../../../../components/Dashboard/Billing/FreeUserBillingComponent";
import {CheckCircleIcon} from "@heroicons/react/24/solid";
import {XIcon} from "lucide-react";


export default function BillingPage() {

    const searchParams = useSearchParams();
    const router = useRouter();
    const success = searchParams.get("success") === "true"
    const [userProfile, setUserProfile] = useState<Database["public"]["Tables"]["profiles"]["Row"] | null>(null)
    const [loadingUserProfile, setLoadingUserProfile] = useState<boolean>(true)
    const [getProfileError, setGetProfileError] = useState<string | null>(null)
    const {token, user} = useJWKTokenAndUserAndSidebar();
    const [paymentSuccessPopupOpen, setPaymentSuccessPopupOpen] = useState<boolean>(success)
    const closeSuccessPopup = () => {
        setPaymentSuccessPopupOpen(false);
        router.replace("/dashboard/billing", {scroll: false})
    }


    useEffect(() => {
        const getUserProfile = async () => {
            if (!token) {
                console.error("No token found. User is not logged in.");
                setLoadingUserProfile(false)
                return;
            }
            setLoadingUserProfile(true)
            try {
                setGetProfileError(null)
                const result = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/profile`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    }
                })

                if (!result.ok) {
                    const error = await result.text();
                    Sentry.captureMessage("Failed to fetch user profile", {
                        level: "error",
                        extra: {
                            status: result.status,
                            statusText: result.statusText,
                            response: error,
                            endpoint: "/api/v1/profile",
                        },
                        tags: {
                            area: "dashboard",
                            action: "fetch_profile",
                        },
                        user: user?.id
                            ? {
                                id: user.id,
                                email: user.email,
                            }
                            : undefined,
                    });
                    console.error("Error fetching user profile:", error);
                    setGetProfileError("Failed to load your profile. Please try again")
                    return;
                }

                const data: Database["public"]["Tables"]["profiles"]["Row"] = await result.json()

                setUserProfile(data ?? null);
            } catch (error) {
                Sentry.captureException(error, {
                    tags: {
                        area: "dashboard",
                        action: "fetch_profile",
                    },
                    extra: {
                        endpoint: "/api/v1/profile",
                    },
                    user: user?.id
                        ? {
                            id: user.id,
                            email: user.email,
                        }
                        : undefined,
                });
                console.error("Error fetching jobs:", error)
                setGetProfileError("Failed to load your profile. Please try again")
            } finally {
                setLoadingUserProfile(false)
            }


        }
        getUserProfile()

    }, [token, user?.id, user?.email]);

    return (
        <main className={"w-full h-full min-h-0 flex flex-col px-10 py-5"}>
            <div className={"shrink-0 flex flex-col mb-5 gap-y-1"}>
                <h1 className={"font-bold text-3xl"}>Billing</h1>
                <p className={"text-black/60 font-medium"}>Manage your SeekSync plan, usage, and subscription
                    settings.</p>
            </div>
            {
                paymentSuccessPopupOpen &&
                <div className={"w-full border-green-500/20 flex items-center justify-between rounded-md bg-green-200/40 mb-8 py-5 px-5 border"}>
                    <div className={"flex items-center justify-start gap-x-3"}>
                        <CheckCircleIcon className={"text-green-700 self-baseline"} width={28} height={28}/>
                        <div className={"flex flex-col justify-center gap-y-1"}>
                            <p className={"text-sm text-green-700 font-semibold"}>Payment successful</p>
                            <p className={"text-sm text-green-700"}>Your Pro plan is being activated. This may take a few seconds to update.</p>
                        </div>
                    </div>
                    <XIcon onClick={closeSuccessPopup} className={"opacity-70 self-baseline hover:cursor-pointer"} width={18} height={18}/>
                </div>
            }
            {userProfile && !loadingUserProfile && !getProfileError &&
                <div className={"flex flex-1 min-h-0 flex-col gap-y-5"}>
                    <div className={"shrink-0"}>
                        {userProfile.plan === "pro" || userProfile.plan === "trial" ?
                            <ProUserBillingComponent token={token} userProfile={userProfile}/> :
                            <FreeUserBillingComponent token={token} userProfile={userProfile}/>
                        }

                    </div>
                    <div className={"flex-1 min-h-0"}>
                        <BillingHistoryComponent/>
                    </div>
                </div>}

            {loadingUserProfile && !getProfileError && <div>
                <p className={"font-semibold text-black/60 truncate"}>Loading....</p>
            </div>}

            {!loadingUserProfile && getProfileError &&
                <div className={"text-red-500 font-medium text-lg"}>
                    {getProfileError}
                </div>}


        </main>
    )

}