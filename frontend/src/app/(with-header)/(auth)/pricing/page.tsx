import Link from "next/link";
import {ArrowRight, Check, Sparkles} from "lucide-react";

const sharedFeatures = [
    "Use credits for resumes or cover letters in any mix",
    "Purchased credits never expire",
    "Failed generations restore the credit automatically",
    "Editing, saving and downloading existing documents is free",
];

export default function PricingPage() {
    return (
        <main className="marketing-page min-h-[calc(100vh-4rem)] py-16 sm:py-24">
            <div className="marketing-container">
                <div className="mx-auto max-w-3xl text-center">
                    <span className="eyebrow"><Sparkles size={14}/> Simple, one-time pricing</span>
                    <h1 className="mt-5 text-balance text-5xl font-[580] leading-[1.02] sm:text-7xl">Pay for documents, not another subscription.</h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#626871]">
                        Every generated resume or cover letter costs one shared credit. Buy a pack when you need it and keep unused credits for later.
                    </p>
                </div>

                <div className="mx-auto mt-12 grid max-w-6xl gap-5 lg:grid-cols-3">
                    <PricingCard
                        name="Free workspace"
                        price="$0"
                        suffix="forever"
                        description="Try the complete workflow and create your first application documents."
                        features={["6 one-time document credits", "Full job pipeline and application library", "SEEK job sync and master resume workspace"]}
                        action="Start free"
                    />
                    <PricingCard
                        name="Starter pack"
                        price="$9.99"
                        suffix="AUD once"
                        description="A focused pack for an active round of applications."
                        features={["100 document credits", "About 10¢ per generated document", ...sharedFeatures]}
                        action="Create an account"
                    />
                    <PricingCard
                        name="Momentum pack"
                        price="$19.99"
                        suffix="AUD once"
                        description="The best value when you are applying consistently."
                        features={["250 document credits", "About 8¢ per generated document", ...sharedFeatures]}
                        action="Get the best value"
                        featured
                    />
                </div>

                <p className="mt-8 text-center text-sm text-[#747982]">No automatic renewal. Secure one-time checkout is handled by Stripe.</p>
            </div>
        </main>
    );
}

function PricingCard({name, price, suffix, description, features, action, featured}: {
    name: string;
    price: string;
    suffix: string;
    description: string;
    features: string[];
    action: string;
    featured?: boolean;
}) {
    return (
        <section className={featured
            ? "relative flex flex-col overflow-hidden rounded-xl bg-[#2563EB] p-7 text-white sm:p-8"
            : "editorial-card flex flex-col p-7 sm:p-8"}>
            {featured && <div className="absolute -right-12 -top-16 size-48 rounded-full border-[34px] border-white/8"/>}
            <div className="relative flex items-center justify-between gap-4">
                <p className={featured ? "text-sm font-semibold text-white/75" : "text-sm font-semibold text-[#6c7179]"}>{name}</p>
                {featured && <span className="rounded-md bg-white/12 px-2.5 py-1 text-xs font-semibold">Best value</span>}
            </div>
            <div className="relative mt-5 flex items-end gap-2">
                <span className="font-display text-5xl font-semibold">{price}</span>
                <span className={featured ? "pb-1.5 text-sm text-white/65" : "pb-1.5 text-sm text-[#737880]"}>{suffix}</span>
            </div>
            <p className={featured ? "relative mt-5 min-h-20 leading-7 text-white/72" : "mt-5 min-h-20 leading-7 text-[#626871]"}>{description}</p>
            <Link href="/register" className={featured
                ? "relative mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-[#2563EB] hover:bg-[#f5f4f0]"
                : "button-secondary mt-6 w-full"}>
                {action} <ArrowRight size={16}/>
            </Link>
            <div className={featured ? "relative mt-8 border-t border-white/15 pt-7" : "mt-8 border-t border-[#e4e1da] pt-7"}>
                <p className="mb-4 text-sm font-semibold">What’s included</p>
                <ul className="space-y-3.5">
                    {features.map((feature) => (
                        <li key={feature} className={featured ? "flex items-start gap-2.5 text-sm text-white/82" : "flex items-start gap-2.5 text-sm text-[#565c65]"}>
                            <Check size={16} className="mt-0.5 shrink-0"/>{feature}
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
