import Link from "next/link";
import {ArrowRight, Check, Sparkles} from "lucide-react";

const freeFeatures = [
    "Sync jobs directly from SEEK",
    "Full application pipeline",
    "3 tailored resumes each month",
    "Master resume workspace",
];

const proFeatures = [
    "Everything in Free",
    "100 tailored resumes each month",
    "DOCX downloads and resume library",
    "Priority access to new tools",
];

export default function PricingPage() {
    return (
        <main className="marketing-page min-h-[calc(100vh-4rem)] py-16 sm:py-24">
            <div className="marketing-container">
                <div className="mx-auto max-w-3xl text-center">
                    <span className="eyebrow"><Sparkles size={14}/> Simple pricing</span>
                    <h1 className="mt-5 text-balance text-5xl font-[580] leading-[1.02] sm:text-7xl">Start organised. Upgrade when the search gets serious.</h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#626871]">Every plan includes the complete job-tracking workspace. You pay for more tailoring capacity, not basic organisation.</p>
                </div>

                <div className="mx-auto mt-12 grid max-w-5xl gap-5 lg:grid-cols-2">
                    <section className="editorial-card flex flex-col p-7 sm:p-9">
                        <p className="text-sm font-semibold text-[#6c7179]">Free</p>
                        <div className="mt-5 flex items-end gap-2">
                            <span className="font-display text-5xl font-semibold">$0</span>
                            <span className="pb-1.5 text-sm text-[#737880]">forever</span>
                        </div>
                        <p className="mt-5 leading-7 text-[#626871]">For building a calmer, more deliberate job-search routine.</p>
                        <Link href="/register" className="button-secondary mt-8 w-full">Get started free</Link>
                        <div className="mt-8 border-t border-[#e4e1da] pt-7">
                            <p className="mb-4 text-sm font-semibold">What’s included</p>
                            <ul className="space-y-3.5">
                                {freeFeatures.map((feature) => (
                                    <li key={feature} className="flex items-start gap-2.5 text-sm text-[#565c65]"><Check size={16} className="mt-0.5 shrink-0 text-[#0D3880]"/>{feature}</li>
                                ))}
                            </ul>
                        </div>
                    </section>

                    <section className="relative flex flex-col overflow-hidden rounded-xl bg-[#0D3880] p-7 text-white sm:p-9">
                        <div className="absolute -right-12 -top-16 size-48 rounded-full border-[34px] border-white/8"/>
                        <div className="relative flex items-center justify-between gap-4">
                            <p className="text-sm font-semibold text-white/70">SeekSync Pro</p>
                            <span className="rounded-md bg-white/12 px-2.5 py-1 text-xs font-semibold">Best for active searches</span>
                        </div>
                        <div className="relative mt-5 flex items-end gap-2">
                            <span className="font-display text-5xl font-semibold">$9.99</span>
                            <span className="pb-1.5 text-sm text-white/65">AUD / month</span>
                        </div>
                        <p className="relative mt-5 leading-7 text-white/72">For applying consistently without rationing the quality of your resume.</p>
                        <Link href="/register" className="relative mt-8 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-[#0D3880] hover:bg-[#f5f4f0]">
                            Start with Pro <ArrowRight size={16}/>
                        </Link>
                        <div className="relative mt-8 border-t border-white/15 pt-7">
                            <p className="mb-4 text-sm font-semibold">Everything you need</p>
                            <ul className="space-y-3.5">
                                {proFeatures.map((feature) => (
                                    <li key={feature} className="flex items-start gap-2.5 text-sm text-white/82"><Check size={16} className="mt-0.5 shrink-0"/>{feature}</li>
                                ))}
                            </ul>
                        </div>
                    </section>
                </div>
                <p className="mt-8 text-center text-sm text-[#747982]">Cancel anytime. Secure billing is handled by Stripe.</p>
            </div>
        </main>
    );
}
