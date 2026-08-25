"use client"

import {useState} from "react";
import {ArrowRight, FileText, LoaderCircle, Lock, Sparkles} from "lucide-react";

import type {DocumentCreditUsage} from "../ResumeGenerator/types";
import {
    createStripeCheckoutSession,
    type CreditPackCode,
} from "@/lib/stripe/client";

export default function DocumentCreditsBillingComponent({
                                                            token,
                                                            usage,
                                                        }: {
    token: string | null;
    usage: DocumentCreditUsage | null;
}) {
    const [loadingPack, setLoadingPack] = useState<CreditPackCode | null>(null);

    const buyPack = async (packCode: CreditPackCode) => {
        if (loadingPack) return;
        setLoadingPack(packCode);
        const redirected = await createStripeCheckoutSession(token, packCode);
        if (!redirected) setLoadingPack(null);
    };

    return (
        <section className="grid w-full gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="flex min-w-0 flex-col gap-5">
                <div className="app-panel p-5 sm:p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="eyebrow">Available now</p>
                            <p className="mt-2 text-5xl font-semibold tracking-[-0.05em] text-[#2563EB]">
                                {usage ? Math.max(usage.balance, 0) : "—"}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-[#33445f]">document credits</p>
                        </div>
                        <div className="rounded-xl border border-[#dfddd6] bg-[#faf9f6] p-4 text-sm leading-6 text-[#5d626a] sm:max-w-xs">
                            One generated resume or cover letter costs one credit. Editing, saving and downloading it later is free.
                        </div>
                    </div>

                    <dl className="mt-6 grid gap-3 border-t border-[#dfddd6] pt-5 sm:grid-cols-2">
                        <BalanceDetail label="Free credits left" value={usage?.promotional_balance}/>
                        <BalanceDetail label="Purchased credits left" value={usage?.purchased_balance} note="Never expire"/>
                    </dl>
                </div>

                <div className="app-panel p-5 sm:p-6">
                    <div>
                        <p className="eyebrow">Add credits</p>
                        <h2 className="mt-1 text-xl font-semibold text-[#181d26]">Choose a one-time pack</h2>
                        <p className="mt-1 text-sm leading-6 text-[#6f747c]">No subscription, renewal, or expiry.</p>
                    </div>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <PackButton
                            title="100 credits"
                            price="$9.99 AUD"
                            detail="10¢ per document"
                            loading={loadingPack === "credits_100"}
                            disabled={Boolean(loadingPack) || !token}
                            onClick={() => buyPack("credits_100")}
                        />
                        <PackButton
                            title="250 credits"
                            price="$19.99 AUD"
                            detail="8¢ per document · best value"
                            featured
                            loading={loadingPack === "credits_250"}
                            disabled={Boolean(loadingPack) || !token}
                            onClick={() => buyPack("credits_250")}
                        />
                    </div>
                    <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-[#6f747c]">
                        <Lock size={14}/> Secure one-time checkout powered by Stripe.
                    </p>
                </div>
            </div>

            <aside className="app-panel h-fit p-5 sm:p-6">
                <div className="flex items-center gap-2">
                    <FileText className="size-5 text-[#2563EB]"/>
                    <h2 className="text-lg font-semibold text-[#181d26]">Lifetime documents</h2>
                </div>
                <div className="mt-5 space-y-3">
                    <LifetimeRow label="Resumes generated" value={usage?.resumes_generated}/>
                    <LifetimeRow label="Cover letters generated" value={usage?.cover_letters_generated}/>
                    <LifetimeRow
                        label="Total generated"
                        value={usage ? usage.resumes_generated + usage.cover_letters_generated : undefined}
                        strong
                    />
                </div>

            </aside>
        </section>
    );
}

function PackButton({title, price, detail, featured, loading, disabled, onClick}: {
    title: string;
    price: string;
    detail: string;
    featured?: boolean;
    loading: boolean;
    disabled: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={featured
                ? "group rounded-xl border-2 border-[#2563EB] bg-[#F4F8FF] p-4 text-left transition-colors hover:bg-[#EAF2FF] disabled:opacity-50"
                : "group rounded-xl border border-[#c9c6bd] bg-white p-4 text-left transition-colors hover:border-[#9ea3ab] hover:bg-[#faf9f6] disabled:opacity-50"}
        >
            <span className="flex items-start justify-between gap-3">
                <span>
                    <span className="block text-sm font-semibold text-[#242933]">{title}</span>
                    <span className="mt-1 block text-2xl font-semibold tracking-[-0.03em] text-[#181d26]">{price}</span>
                    <span className="mt-1 block text-xs font-medium text-[#6f747c]">{detail}</span>
                </span>
                {loading ? <LoaderCircle className="size-5 animate-spin text-[#2563EB]"/> : featured ? <Sparkles className="size-5 text-[#2563EB]"/> : <ArrowRight className="size-5 text-[#586170] transition-transform group-hover:translate-x-0.5"/>}
            </span>
        </button>
    );
}

function BalanceDetail({label, value, note}: {label: string; value?: number; note?: string}) {
    return (
        <div>
            <dt className="text-xs font-medium text-[#777b82]">{label}</dt>
            <dd className="mt-1 text-lg font-semibold text-[#242933]">
                {typeof value === "number" ? Math.max(value, 0) : "—"}
                {note && <span className="ml-2 text-xs font-medium text-[#6f747c]">{note}</span>}
            </dd>
        </div>
    );
}

function LifetimeRow({label, value, strong}: {label: string; value?: number; strong?: boolean}) {
    return (
        <div className={strong ? "flex items-center justify-between border-t border-[#dfddd6] pt-3" : "flex items-center justify-between"}>
            <span className={strong ? "text-sm font-semibold text-[#242933]" : "text-sm text-[#6f747c]"}>{label}</span>
            <span className="text-sm font-semibold text-[#181d26]">{typeof value === "number" ? Math.max(value, 0) : "—"}</span>
        </div>
    );
}
