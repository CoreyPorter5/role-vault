"use client"

import {useState} from "react";
import type {ReactNode} from "react";
import {ArrowRight, Check, LoaderCircle, Sparkles} from "lucide-react";
import {LockClosedIcon} from "@heroicons/react/24/outline";

import {useJWKTokenAndUserAndSidebar} from "../Context/DashboardContextProvider";
import {
    createStripeCheckoutSession,
    type CreditPackCode,
} from "@/lib/stripe/client";
import type {DocumentCreditUsage} from "../ResumeGenerator/types";

const packs: Array<{
    code: CreditPackCode;
    name: string;
    credits: number;
    price: string;
    perDocument: string;
    featured?: boolean;
}> = [
    {
        code: "credits_100",
        name: "Starter pack",
        credits: 100,
        price: "$9.99",
        perDocument: "10¢ per document",
    },
    {
        code: "credits_250",
        name: "Momentum pack",
        credits: 250,
        price: "$19.99",
        perDocument: "8¢ per document",
        featured: true,
    },
];

export default function PricingTierModalComponent({usage}: {usage?: DocumentCreditUsage | null}) {
    const {token} = useJWKTokenAndUserAndSidebar();
    const [loadingPack, setLoadingPack] = useState<CreditPackCode | null>(null);

    const buyPack = async (packCode: CreditPackCode) => {
        if (loadingPack) return;
        setLoadingPack(packCode);
        const redirected = await createStripeCheckoutSession(token, packCode);
        if (!redirected) setLoadingPack(null);
    };

    return (
        <section className="mt-7 w-full max-w-5xl" aria-labelledby="credit-pack-heading">
            <div className="app-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                    <p className="eyebrow">Your balance</p>
                    <h2 id="credit-pack-heading" className="mt-1 text-2xl font-semibold text-[#181d26]">
                        {usage ? `${Math.max(usage.balance, 0)} document credits` : "Document credits"}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-[#6f747c]">
                        One credit creates one resume or one cover letter. Use them in any mix.
                    </p>
                </div>
                <div className="rounded-xl border border-[#BFDBFE] bg-[#F4F8FF] px-4 py-3 text-sm font-medium text-[#33445f]">
                    New accounts include <strong className="text-[#2563EB]">6 free credits</strong>
                </div>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
                {packs.map((pack) => (
                    <article
                        key={pack.code}
                        className={pack.featured
                            ? "flex min-h-[360px] flex-col rounded-xl border-2 border-[#2563EB] bg-[#f8fafc] p-5 sm:p-7"
                            : "app-panel flex min-h-[360px] flex-col p-5 sm:p-7"}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-lg font-semibold text-[#181d26]">{pack.name}</p>
                                <p className="mt-1 text-sm font-medium text-[#6f747c]">{pack.credits} document credits</p>
                            </div>
                            {pack.featured && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-[#DBEAFE] px-2.5 py-1 text-xs font-semibold text-[#2563EB]">
                                    <Sparkles size={13}/> Best value
                                </span>
                            )}
                        </div>

                        <div className="mt-6 flex items-end gap-2">
                            <p className="text-4xl font-semibold tracking-[-0.04em] text-[#181d26]">{pack.price}</p>
                            <p className="pb-1 text-sm font-medium text-[#6f747c]">AUD once</p>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-[#2563EB]">{pack.perDocument}</p>

                        <ul className="mt-6 space-y-3 text-sm font-medium text-[#3f4651]">
                            <CreditFeature>Generate resumes and cover letters in any combination</CreditFeature>
                            <CreditFeature>Purchased credits never expire</CreditFeature>
                            <CreditFeature>Failed generations automatically restore the credit</CreditFeature>
                            <CreditFeature>Edit, save and download completed documents at no extra cost</CreditFeature>
                        </ul>

                        <button
                            type="button"
                            disabled={Boolean(loadingPack) || !token}
                            onClick={() => buyPack(pack.code)}
                            className={pack.featured ? "button-primary mt-auto w-full" : "button-secondary mt-auto w-full"}
                        >
                            {loadingPack === pack.code ? <LoaderCircle className="size-4 animate-spin"/> : <ArrowRight size={16}/>}
                            {loadingPack === pack.code ? "Opening checkout…" : `Buy ${pack.credits} credits`}
                        </button>
                    </article>
                ))}
            </div>

            <div className="mt-4 flex items-start justify-center gap-1.5 text-center text-xs font-medium text-[#6f747c]">
                <LockClosedIcon width={15} height={15}/>
                Secure one-time checkout powered by Stripe. No subscription or automatic renewal.
            </div>
        </section>
    );
}

function CreditFeature({children}: {children: ReactNode}) {
    return (
        <li className="flex items-start gap-2.5">
            <Check className="mt-0.5 size-4 shrink-0 text-[#2563EB]"/>
            <span>{children}</span>
        </li>
    );
}
