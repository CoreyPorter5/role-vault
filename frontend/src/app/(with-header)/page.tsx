import Link from "next/link";
import {
    ArrowRight,
    BriefcaseBusiness,
    Check,
    Clock3,
    FileCheck2,
    FileText,
    LayoutDashboard,
    Sparkles,
    Upload,
} from "lucide-react";
import JobStatusBadge from "../../../components/JobStatusBadge";
import BrandMark, {RoleVaultLogo} from "../../../components/BrandMark";
import LandingMotion from "../../../components/Marketing/LandingMotion";
import InteractiveSyncDemo from "../../../components/Marketing/InteractiveSyncDemo";
import IntegrationsSection from "../../../components/Marketing/IntegrationsSection";
import HowItWorksSection from "../../../components/Marketing/HowItWorksSection";
import type {Job} from "@/lib/types/types";

const pipelineColumns: Array<{label: Job["jobStatus"]; jobs: string[]}> = [
    {label: "Saved", jobs: ["Product designer", "UX researcher"]},
    {label: "Applied", jobs: ["Senior product designer"]},
    {label: "Interviewing", jobs: ["Design systems lead"]},
];

const outcomes = [
    {
        icon: BriefcaseBusiness,
        label: "Role captured",
        detail: "Product designer · Sydney",
        className: "bg-[#F3F8FF] text-[#2563EB]",
    },
    {
        icon: FileText,
        label: "Resume tailored",
        detail: "Evidence kept intact",
        className: "bg-[#eef7f2] text-[#24683d]",
    },
    {
        icon: FileCheck2,
        label: "Cover letter ready",
        detail: "Prepared for review",
        className: "bg-[#fff4ec] text-[#8a4b27]",
    },
    {
        icon: Check,
        label: "Moved to interview",
        detail: "The next step is clear",
        className: "bg-[#fbf3d2] text-[#785f05]",
    },
];

export default function Home() {
    return (
        <div className="marketing-page overflow-hidden">
            <LandingMotion/>
            <main>
                <section className="relative border-b border-[#e7e4dd] pb-20 pt-[9.5rem] sm:pb-28 sm:pt-48 lg:pt-52">
                    <div
                        className="pointer-events-none absolute left-1/2 top-0 h-[680px] w-full -translate-x-1/2 opacity-90"
                        style={{
                            backgroundImage:
                                "linear-gradient(to bottom, transparent 58%, rgba(255,255,255,0.72) 82%, #fff 100%), radial-gradient(circle at 16% 28%, rgba(37,99,235,0.18), transparent 28%), radial-gradient(circle at 78% 24%, rgba(56,189,248,0.18), transparent 30%), radial-gradient(circle at 67% 72%, rgba(147,197,253,0.18), transparent 27%), radial-gradient(circle at 30% 74%, rgba(219,234,254,0.48), transparent 31%)",
                        }}
                    />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white via-white/50 to-transparent"/>

                    <div className="marketing-container relative">
                        <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
                            <div className="eyebrow rounded-full border border-[#b9cdec] bg-white/75 px-3.5 py-2 shadow-[0_8px_24px_rgba(37,99,235,0.07)] backdrop-blur-md">
                                <Sparkles size={14}/>
                                Your application workspace
                            </div>
                            <h1 className="mt-7 max-w-5xl text-balance text-[clamp(2.8rem,7.2vw,6.5rem)] font-[560] leading-[1.02] tracking-[-0.07em] text-[#181d26]">
                                Turn promising roles into applications
                                <span className="block bg-[linear-gradient(100deg,#2563EB_8%,#3B82F6_44%,#0EA5E9_74%,#60A5FA_100%)] bg-clip-text pb-2 text-transparent">
                                    you’re proud to send.
                                </span>
                            </h1>
                            <p className="mt-6 max-w-3xl text-balance text-lg leading-8 text-[#565c65] sm:text-xl">
                                RoleVault brings job tracking, tailored resumes and cover letters into one calm workspace—so every application keeps its context and every next step stays clear.
                            </p>
                            <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
                                <Link className="button-primary group min-h-12 px-6" href="/register">
                                    Start your free workspace
                                    <ArrowRight className={"group-hover:translate-x-2 transition duration-400"}  size={17}/>
                                </Link>
                                <Link className="button-secondary min-h-12 bg-white/75 px-6 backdrop-blur-sm" href="#workflow">
                                    See the workflow
                                </Link>
                            </div>
                            <p className="mt-4 flex items-center gap-2 text-sm text-[#686e77]">
                                <Check size={15} className="text-[#2563EB]"/> Six free document credits · No card required
                            </p>
                        </div>

                        <div data-hero-journey className="hero-journey relative mx-auto mt-14 max-w-6xl sm:mt-20">
                            <div
                                className="pointer-events-none absolute -inset-8 rounded-[36px] opacity-75 blur-3xl"
                                style={{
                                    backgroundImage:
                                        "linear-gradient(105deg, rgba(37,99,235,0.28), rgba(56,189,248,0.24) 46%, rgba(191,219,254,0.38) 72%, rgba(239,246,255,0.72))",
                                }}
                            />

                            <div data-reveal-group className="relative z-10 mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:px-10">
                                {outcomes.map((outcome) => (
                                    <div data-reveal="soft" key={outcome.label} className="flex min-w-0 items-center gap-3 rounded-xl border border-white/80 bg-white/90 p-3 shadow-[0_10px_30px_rgba(24,29,38,0.10)] backdrop-blur-xl">
                                        <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${outcome.className}`}>
                                            <outcome.icon size={17}/>
                                        </span>
                                        <span className="min-w-0 text-left">
                                            <span className="block truncate text-xs font-bold text-[#252a33]">{outcome.label}</span>
                                            <span className="mt-0.5 block truncate text-[11px] text-[#747982]">{outcome.detail}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div data-reveal="scale" className="relative overflow-hidden rounded-2xl border border-[#c7c4bc] bg-white shadow-[0_34px_90px_-42px_rgba(37,99,235,0.65)]">
                                <div className="flex h-12 items-center justify-between border-b border-[#e4e1da] px-4 sm:px-6">
                                    <div className="flex items-center gap-2">
                                        <span className="size-2.5 rounded-full bg-[#f2a77c]"/>
                                        <span className="size-2.5 rounded-full bg-[#f2d16b]"/>
                                        <span className="size-2.5 rounded-full bg-[#86c69a]"/>
                                    </div>
                                    <span className="text-xs font-semibold text-[#777b82]">A single view of every application</span>
                                    <span className="rounded-md bg-[#EFF6FF] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">Sample workspace</span>
                                </div>
                                <div className="grid min-h-[410px] grid-cols-1 bg-[#f5f4f0] lg:grid-cols-[180px_1fr_290px]">
                                    <aside className="hidden border-r border-[#dfddd6] bg-white p-4 lg:block">
                                        <div className="mb-7 flex items-center gap-2.5">
                                            <RoleVaultLogo size={28}/>
                                            <span className="font-display text-sm font-semibold">RoleVault</span>
                                        </div>
                                        {[
                                            [LayoutDashboard, "Pipeline"],
                                            [FileText, "Resume"],
                                            [BriefcaseBusiness, "Library"],
                                        ].map(([Icon, label], index) => {
                                            const ItemIcon = Icon as typeof LayoutDashboard;
                                            return (
                                                <div key={label as string} className={`mb-1.5 flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold ${index === 0 ? "bg-[#EFF6FF] text-[#2563EB]" : "text-[#71767d]"}`}>
                                                    <ItemIcon size={14}/>{label as string}
                                                </div>
                                            );
                                        })}
                                    </aside>
                                    <div className="min-w-0 p-4 pt-7 sm:p-6 sm:pt-10 lg:pt-12">
                                        <div className="mb-5 flex items-end justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2563EB]">Monday overview</p>
                                                <h2 className="mt-1 text-2xl font-semibold">Your active pipeline</h2>
                                            </div>
                                            <span className="hidden rounded-lg border border-[#d4d1c9] bg-white px-3 py-2 text-xs font-semibold text-[#656a72] sm:block">12 applications</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                                            {pipelineColumns.map((column) => (
                                                <div key={column.label} className="min-w-0">
                                                    <div className="mb-2">
                                                        <JobStatusBadge status={column.label}/>
                                                    </div>
                                                    <div className="space-y-2.5">
                                                        {column.jobs.map((job, index) => (
                                                            <div key={job} className="rounded-lg border border-[#dedbd3] bg-white p-2.5 shadow-[0_1px_2px_rgba(24,29,38,0.04)] sm:p-3">
                                                                <div className="mb-2 flex size-7 items-center justify-center rounded-md bg-[#f2f1ed] text-[10px] font-bold text-[#555a62]">
                                                                    {index === 0 ? "At" : "Co"}
                                                                </div>
                                                                <p className="truncate text-[10px] font-semibold text-[#232831] sm:text-xs">{job}</p>
                                                                <p className="mt-1 truncate text-[9px] text-[#858990] sm:text-[10px]">Sydney · Hybrid</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <aside className="hidden border-l border-[#dfddd6] bg-[#fbfaf7] p-5 pt-12 lg:block">
                                        <span className="eyebrow"><Sparkles size={13}/> Application studio</span>
                                        <h3 className="mt-3 text-xl font-semibold leading-tight">Tailored for the role. Grounded in you.</h3>
                                        <div className="mt-5 rounded-xl border border-[#c8d7ee] bg-[#EFF6FF] p-4">
                                            <FileCheck2 size={23} className="text-[#2563EB]"/>
                                            <p className="mt-3 text-sm font-semibold">Product designer resume</p>
                                            <p className="mt-1 text-xs leading-5 text-[#59616d]">ATS-ready DOCX · Ready to review</p>
                                            <div className="mt-4 h-2 rounded-full bg-white/80">
                                                <div className="h-full w-[82%] rounded-full bg-[#2563EB]"/>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-[#6c7179]">
                                            <Clock3 size={14}/> Updated just now
                                        </div>
                                    </aside>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <IntegrationsSection/>

                <InteractiveSyncDemo/>

                <section id="features" className="py-20 sm:py-28">
                    <div className="marketing-container">
                        <div data-reveal className="mx-auto max-w-4xl text-center">
                            <span className="eyebrow">More than a saved link</span>
                            <h2 className="mt-4 text-balance text-4xl font-[560] leading-[1.06] tracking-[-0.045em] sm:text-6xl">
                                Most job-search tools stop at “saved.” RoleVault stays for what comes next.
                            </h2>
                            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#666b73]">
                                The listing, your evidence, both application documents and the stage you’re at all belong to the same story.
                            </p>
                        </div>

                        <div data-reveal-group className="mt-14 grid gap-5 lg:grid-cols-2">
                            <article data-reveal="scale" className="rounded-2xl border border-[#dedbd3] bg-[#f5f4f0] p-7 sm:p-10">
                                <span className="eyebrow text-[#79776f]">A saved listing</span>
                                <h3 className="mt-5 max-w-md text-3xl font-semibold leading-tight text-[#333840] sm:text-4xl">A job title, a link and another tab to remember.</h3>
                                <div className="mt-10 space-y-3 text-sm font-medium text-[#777b82]">
                                    {["Role context copied somewhere else", "Resume versions scattered across folders", "No clear record of what happens next"].map((item) => (
                                        <div key={item} className="flex items-center gap-3 rounded-xl border border-[#dedbd3] bg-white/70 px-4 py-3.5">
                                            <span className="size-1.5 rounded-full bg-[#9c9a94]"/>{item}
                                        </div>
                                    ))}
                                </div>
                            </article>

                            <article
                                data-reveal="scale"
                                className="relative overflow-hidden rounded-2xl p-7 text-white sm:p-10"
                                style={{backgroundImage: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 48%, #0EA5E9 100%)"}}
                            >
                                <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-[#75c5c1]/25 blur-3xl"/>
                                <div className="pointer-events-none absolute -bottom-20 left-16 size-56 rounded-full bg-[#f6e7a9]/15 blur-3xl"/>
                                <div className="relative">
                                    <span className="eyebrow" style={{color: "#b9d5f5"}}>A working application</span>
                                    <h3 className="mt-5 max-w-lg text-3xl font-semibold leading-tight sm:text-4xl">One place that remembers the role and helps you act on it.</h3>
                                    <div className="mt-10 space-y-3 text-sm font-semibold text-white/90">
                                        {["Role details stay beside your application", "Resume and cover letter share the same evidence", "The next step is visible at a glance"].map((item) => (
                                            <div key={item} className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 backdrop-blur-sm">
                                                <Check size={16} className="shrink-0 text-[#bfe6d0]"/>{item}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </article>
                        </div>

                        <div data-reveal-group className="mt-5 grid gap-5 md:grid-cols-2">
                            <article data-reveal="soft" className="rounded-2xl bg-[#f8e4d4] p-7 sm:p-9">
                                <Upload size={26} className="text-[#8a4b27]"/>
                                <h3 className="mt-7 text-2xl font-semibold">Your experience stays the source</h3>
                                <p className="mt-3 max-w-xl leading-7 text-[#5f5149]">Upload and refine one master resume. Every tailored document starts from facts you control—not a blank prompt.</p>
                            </article>
                            <article data-reveal="soft" className="rounded-2xl bg-[#dcefe3] p-7 sm:p-9">
                                <Sparkles size={26} className="text-[#24683d]"/>
                                <h3 className="mt-7 text-2xl font-semibold">AI works inside the workflow</h3>
                                <p className="mt-3 max-w-xl leading-7 text-[#46594d]">Generate only when you need to, review every section, then save the finished resume or cover letter beside the job.</p>
                            </article>
                        </div>
                    </div>
                </section>

                <HowItWorksSection/>

                <section className="py-20 sm:py-28">
                    <div className="marketing-container">
                        <div data-reveal="scale" className="relative overflow-hidden rounded-2xl bg-[#181d26] px-6 py-16 text-center text-white sm:px-12 sm:py-24">
                            <div
                                className="pointer-events-none absolute inset-x-[8%] -top-32 h-64 rounded-full opacity-70 blur-3xl"
                                style={{backgroundImage: "linear-gradient(90deg, #3B82F6, #4fb8b7 48%, #f0cf63 76%, #e69a70)"}}
                            />
                            <div className="relative">
                                <span className="eyebrow" style={{color: "#b9d5f5"}}>Your next application starts here</span>
                                <h2 className="mx-auto mt-5 max-w-4xl text-balance text-4xl font-[560] leading-[1.05] tracking-[-0.045em] sm:text-6xl">Give every opportunity a clear next move.</h2>
                                <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-white/70">Start with six free document credits and bring your whole job search into one calmer workspace.</p>
                                <Link href="/register" className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-bold text-[#181d26] shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:bg-[#f5f4f0]">
                                    Create your free workspace <ArrowRight size={17}/>
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-[#e4e1da] py-10">
                <div className="marketing-container flex flex-col justify-between gap-6 text-sm text-[#666b73] sm:flex-row sm:items-center">
                    <div>
                        <BrandMark/>
                        <p className="mt-1">A calmer way to run your job search.</p>
                        <p className="mt-1 text-xs text-[#858990]">Independent product. Not affiliated with SEEK.</p>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                        <Link href="/pricing" className="hover:text-[#2563EB]">Pricing</Link>
                        <Link href="/privacy" className="hover:text-[#2563EB]">Privacy &amp; legal</Link>
                        <Link href="/login" className="hover:text-[#2563EB]">Log in</Link>
                        <Link href="/register" className="hover:text-[#2563EB]">Get started</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
