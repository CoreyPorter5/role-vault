import Link from "next/link";
import {
    ArrowRight,
    BriefcaseBusiness,
    Check,
    FileCheck2,
    FileText,
    LayoutDashboard,
    Sparkles,
} from "lucide-react";

const steps = [
    {
        number: "1",
        title: "Capture the role",
        description: "Save the listing and its full context from your browser in one click.",
        illustration: (
            <div className="relative flex h-48 items-center justify-center" aria-hidden="true">
                <div className="w-52 overflow-hidden rounded-xl border border-[#d8d5cd] bg-white shadow-[0_18px_35px_-28px_rgba(24,29,38,0.6)]">
                    <div className="flex h-8 items-center gap-1.5 border-b border-[#e6e3dc] px-3">
                        <span className="size-1.5 rounded-full bg-[#bbb8b0]"/>
                        <span className="size-1.5 rounded-full bg-[#d0cdc5]"/>
                        <span className="size-1.5 rounded-full bg-[#dedbd3]"/>
                    </div>
                    <div className="p-4">
                        <div className="flex items-center gap-2.5">
                            <span className="flex size-9 items-center justify-center rounded-lg bg-[#eaf2ff] text-[#2563EB]"><BriefcaseBusiness size={17}/></span>
                            <div className="space-y-1.5">
                                <span className="block h-2 w-24 rounded-full bg-[#333840]"/>
                                <span className="block h-1.5 w-16 rounded-full bg-[#c9c6bd]"/>
                            </div>
                        </div>
                        <div className="mt-4 space-y-2">
                            <span className="block h-1.5 w-full rounded-full bg-[#e0ded8]"/>
                            <span className="block h-1.5 w-[84%] rounded-full bg-[#e0ded8]"/>
                        </div>
                        <div className="mt-4 flex min-h-8 items-center justify-center gap-1.5 rounded-md bg-[#2563EB] text-[10px] font-bold text-white">
                            <Check size={12}/> Sync to RoleVault
                        </div>
                    </div>
                </div>
            </div>
        ),
    },
    {
        number: "2",
        title: "Tailor your documents",
        description: "Create a grounded resume, cover letter or both from the role and your master resume.",
        illustration: (
            <div className="relative flex h-48 items-center justify-center" aria-hidden="true">
                <div className="absolute -translate-x-11 rotate-[-7deg] rounded-xl border border-[#c9d8ef] bg-[#edf5ff] p-4 shadow-[0_18px_35px_-28px_rgba(37,99,235,0.7)]">
                    <FileText size={22} className="text-[#2563EB]"/>
                    <span className="mt-10 block h-1.5 w-24 rounded-full bg-[#7ea6e8]"/>
                    <span className="mt-2 block h-1.5 w-20 rounded-full bg-[#b6cbec]"/>
                    <span className="mt-2 block h-1.5 w-16 rounded-full bg-[#b6cbec]"/>
                </div>
                <div className="absolute translate-x-11 rotate-[7deg] rounded-xl border border-[#d7d4cc] bg-white p-4 shadow-[0_18px_35px_-28px_rgba(24,29,38,0.65)]">
                    <FileCheck2 size={22} className="text-[#2563EB]"/>
                    <span className="mt-10 block h-1.5 w-24 rounded-full bg-[#4d535c]"/>
                    <span className="mt-2 block h-1.5 w-20 rounded-full bg-[#c9c6bd]"/>
                    <span className="mt-2 block h-1.5 w-16 rounded-full bg-[#c9c6bd]"/>
                </div>
                <span className="absolute bottom-3 inline-flex items-center gap-1.5 rounded-full border border-[#c8d7ee] bg-white px-3 py-1.5 text-[10px] font-bold text-[#2563EB] shadow-sm">
                    <Sparkles size={12}/> Role context applied
                </span>
            </div>
        ),
    },
    {
        number: "3",
        title: "Move it forward",
        description: "Keep the documents beside the job and track every next step through your pipeline.",
        illustration: (
            <div className="relative flex h-48 items-center justify-center" aria-hidden="true">
                <div className="w-60 rounded-xl border border-[#d8d5cd] bg-white p-3 shadow-[0_18px_35px_-28px_rgba(24,29,38,0.6)]">
                    <div className="mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#303640]"><LayoutDashboard size={13}/> Pipeline</span>
                        <span className="rounded-full bg-[#e8f1ff] px-2 py-1 text-[8px] font-bold text-[#2563EB]">3 active</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {["Saved", "Applied", "Interview"].map((label, index) => (
                            <div key={label} className="rounded-lg bg-[#f5f4f0] p-2">
                                <span className="block truncate text-[8px] font-bold text-[#70757d]">{label}</span>
                                <div className={`mt-2 rounded-md border bg-white p-2 ${index === 2 ? "border-[#c8d7ee]" : "border-[#e1ded7]"}`}>
                                    <span className={`block size-4 rounded ${index === 2 ? "bg-[#e8f1ff]" : "bg-[#eceae5]"}`}/>
                                    <span className="mt-2 block h-1 w-full rounded-full bg-[#9ca0a6]"/>
                                    <span className="mt-1 block h-1 w-3/4 rounded-full bg-[#d0cdc6]"/>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        ),
    },
];

export default function HowItWorksSection() {
    return (
        <section id="workflow" data-analytics-section="workflow" className="border-y border-[#e7e4dd] bg-[#f5f4f0] py-14 sm:py-20" aria-labelledby="workflow-title">
            <div className="marketing-container">
                <div className="rounded-[28px] border border-[#dedbd3] bg-white px-5 py-14 sm:px-10 sm:py-20 lg:px-14">
                    <div className="mx-auto max-w-3xl text-center">
                        <span className="eyebrow">How it works</span>
                        <h2 id="workflow-title" className="mt-4 text-balance text-4xl font-[560] leading-[1.06] tracking-[-0.045em] sm:text-6xl">
                            One role. Three clear steps.
                        </h2>
                        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#686e77] sm:text-lg">
                            From finding a promising role to sending a tailored application, every step stays connected.
                        </p>
                    </div>

                    <div className="mt-14 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-4">
                        {steps.map((step, index) => (
                            <div key={step.number} className="contents">
                                <article className="mx-auto flex w-full max-w-sm flex-col items-center text-center">
                                    <span className="flex size-8 items-center justify-center rounded-full border border-[#d8d5cd] bg-[#f7f6f3] text-sm font-semibold text-[#303640]">{step.number}</span>
                                    <div className="mt-5 w-full">{step.illustration}</div>
                                    <h3 className="mt-5 text-2xl font-semibold tracking-[-0.025em]">{step.title}</h3>
                                    <p className="mt-3 max-w-xs text-sm leading-6 text-[#6d727b] sm:text-base">{step.description}</p>
                                </article>
                                {index < steps.length - 1 && (
                                    <div className="hidden h-[250px] items-center justify-center text-[#b3b0a9] lg:flex" aria-hidden="true">
                                        <span className="flex size-9 items-center justify-center rounded-full border border-[#e2dfd8] bg-[#faf9f6] shadow-sm">
                                            <ArrowRight size={16}/>
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-14 text-center">
                        <Link
                            href="/register"
                            className="button-primary group min-h-12 px-6"
                            data-analytics-cta
                            data-analytics-placement="workflow"
                            data-analytics-destination="registration"
                        >
                            Start your free workspace
                            <ArrowRight size={17} className="transition-transform group-hover:translate-x-1"/>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
