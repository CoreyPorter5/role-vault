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
    WandSparkles,
} from "lucide-react";
import JobStatusBadge from "../../../components/JobStatusBadge";
import type {Job} from "@/lib/types/types";

const pipelineColumns: Array<{label: Job["jobStatus"]; jobs: string[]}> = [
    {label: "Saved", jobs: ["Product designer", "UX researcher"]},
    {label: "Applied", jobs: ["Senior product designer"]},
    {label: "Interviewing", jobs: ["Design systems lead"]},
];

const workflowSteps = [
    {
        number: "01",
        icon: BriefcaseBusiness,
        title: "Save the opportunity",
        copy: "Sync a SEEK listing in one click. The role, company and job description arrive organised and ready.",
    },
    {
        number: "02",
        icon: LayoutDashboard,
        title: "Run your pipeline",
        copy: "Move applications from saved to accepted without losing the context, documents or next step.",
    },
    {
        number: "03",
        icon: WandSparkles,
        title: "Tailor with evidence",
        copy: "Turn your master resume into a role-specific DOCX while keeping every claim grounded in your experience.",
    },
];

export default function Home() {
    return (
        <div className="marketing-page overflow-hidden">
            <main>
                <section className="relative border-b border-[#e7e4dd] pb-16 pt-16 sm:pb-24 sm:pt-24 lg:pb-28 lg:pt-28">
                    <div className="pointer-events-none absolute left-[-5rem] top-20 size-72 rounded-full bg-[#dceafb] opacity-70 blur-3xl"/>
                    <div className="pointer-events-none absolute right-[-6rem] top-56 size-80 rounded-full bg-[#f8e4d4] opacity-55 blur-3xl"/>
                    <div className="marketing-container relative">
                        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
                            <div className="eyebrow rounded-md border border-[#b9cdec] bg-[#f2f6fc] px-3 py-2">
                                <Sparkles size={14}/>
                                Built for the SEEK job search
                            </div>
                            <h1 className="mt-7 max-w-4xl text-balance text-[clamp(3rem,7vw,5.8rem)] font-[580] leading-[0.98] tracking-[-0.065em] text-[#181d26]">
                                Every job, resume and next move—
                                <span className="text-[#0D3880]">finally in sync.</span>
                            </h1>
                            <p className="mt-7 max-w-2xl text-balance text-lg leading-8 text-[#565c65] sm:text-xl">
                                Save roles from SEEK, see your whole application pipeline, and create a truthful tailored resume for every opportunity.
                            </p>
                            <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
                                <Link className="button-primary px-6" href="/register">
                                    Start your search workspace
                                    <ArrowRight size={17}/>
                                </Link>
                                <Link className="button-secondary px-6" href="#workflow">
                                    See how it works
                                </Link>
                            </div>
                            <p className="mt-4 flex items-center gap-2 text-sm text-[#747982]">
                                <Check size={15} className="text-[#0D3880]"/> Free to start · No card required
                            </p>
                        </div>

                        <div className="relative mx-auto mt-14 max-w-6xl sm:mt-18">
                            <div className="absolute -inset-3 rounded-[22px] bg-[#0D3880]/7 blur-xl"/>
                            <div className="relative overflow-hidden rounded-2xl border border-[#cbc8c0] bg-white shadow-[0_28px_70px_-35px_rgba(13,56,128,0.45)]">
                                <div className="flex h-12 items-center justify-between border-b border-[#e4e1da] px-4 sm:px-6">
                                    <div className="flex items-center gap-2">
                                        <span className="size-2.5 rounded-full bg-[#f2a77c]"/>
                                        <span className="size-2.5 rounded-full bg-[#f2d16b]"/>
                                        <span className="size-2.5 rounded-full bg-[#86c69a]"/>
                                    </div>
                                    <span className="text-xs font-semibold text-[#777b82]">Your application workspace</span>
                                    <span className="rounded-md bg-[#e7effb] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0D3880]">Live pipeline</span>
                                </div>
                                <div className="grid min-h-[410px] grid-cols-1 bg-[#f5f4f0] lg:grid-cols-[180px_1fr_290px]">
                                    <aside className="hidden border-r border-[#dfddd6] bg-white p-4 lg:block">
                                        <div className="mb-7 flex items-center gap-2.5">
                                            <span className="flex size-7 items-center justify-center rounded-lg bg-[#0D3880] text-xs font-extrabold text-white">S</span>
                                            <span className="font-display text-sm font-semibold">SeekSync</span>
                                        </div>
                                        {[
                                            [LayoutDashboard, "Pipeline"],
                                            [FileText, "Resume"],
                                            [BriefcaseBusiness, "Library"],
                                        ].map(([Icon, label], index) => {
                                            const ItemIcon = Icon as typeof LayoutDashboard;
                                            return (
                                                <div key={label as string} className={`mb-1.5 flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold ${index === 0 ? "bg-[#e7effb] text-[#0D3880]" : "text-[#71767d]"}`}>
                                                    <ItemIcon size={14}/>{label as string}
                                                </div>
                                            );
                                        })}
                                    </aside>
                                    <div className="min-w-0 p-4 sm:p-6">
                                        <div className="mb-5 flex items-end justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0D3880]">Monday overview</p>
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
                                    <aside className="hidden border-l border-[#dfddd6] bg-[#fbfaf7] p-5 lg:block">
                                        <span className="eyebrow"><Sparkles size={13}/> Resume studio</span>
                                        <h3 className="mt-3 text-xl font-semibold leading-tight">Tailored for the role, grounded in you.</h3>
                                        <div className="mt-5 rounded-xl border border-[#c8d7ee] bg-[#e7effb] p-4">
                                            <FileCheck2 size={23} className="text-[#0D3880]"/>
                                            <p className="mt-3 text-sm font-semibold">Product designer resume</p>
                                            <p className="mt-1 text-xs leading-5 text-[#59616d]">ATS-ready DOCX · Technology profile</p>
                                            <div className="mt-4 h-2 rounded-full bg-white/80">
                                                <div className="h-full w-[82%] rounded-full bg-[#0D3880]"/>
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

                <section className="border-b border-[#e7e4dd] py-8">
                    <div className="marketing-container grid grid-cols-2 gap-y-6 text-center sm:grid-cols-4">
                        {["Sync from SEEK", "Track every stage", "Tailor with AI", "Export as DOCX"].map((item, index) => (
                            <div key={item} className="flex items-center justify-center gap-2 text-sm font-semibold text-[#575c65]">
                                <span className="font-display text-[#0D3880]">0{index + 1}</span>{item}
                            </div>
                        ))}
                    </div>
                </section>

                <section id="features" className="py-20 sm:py-28">
                    <div className="marketing-container">
                        <div className="max-w-3xl">
                            <span className="eyebrow">One focused system</span>
                            <h2 className="mt-4 text-balance text-4xl font-[580] leading-[1.08] sm:text-6xl">
                                Less job-search admin. More deliberate applications.
                            </h2>
                        </div>
                        <div className="mt-12 grid gap-5 lg:grid-cols-12">
                            <article className="relative overflow-hidden rounded-xl bg-[#0D3880] p-7 text-white sm:p-10 lg:col-span-7 lg:min-h-[460px]">
                                <div className="absolute -right-16 -top-20 size-64 rounded-full border-[42px] border-white/8"/>
                                <span className="inline-flex rounded-md bg-white/12 px-2.5 py-1 text-xs font-semibold">Application command centre</span>
                                <h3 className="mt-6 max-w-lg text-4xl font-[560] leading-[1.08] sm:text-5xl">See what needs your attention before opportunity slips.</h3>
                                <p className="mt-5 max-w-xl text-base leading-7 text-white/72">Airtable-style workflow clarity, without building the system yourself. Every job, status and resume stays connected.</p>
                                <div className="mt-10 grid max-w-xl grid-cols-3 gap-2 sm:gap-3">
                                    {["12 active", "4 tailored", "2 interviews"].map((stat) => (
                                        <div key={stat} className="rounded-lg border border-white/15 bg-white/8 p-3 text-xs font-semibold sm:p-4 sm:text-sm">{stat}</div>
                                    ))}
                                </div>
                            </article>
                            <div className="grid gap-5 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
                                <article className="rounded-xl bg-[#f8e4d4] p-7 sm:p-8">
                                    <Upload size={26} className="text-[#8a4b27]"/>
                                    <h3 className="mt-6 text-2xl font-semibold">One source resume</h3>
                                    <p className="mt-3 leading-7 text-[#5f5149]">Upload once, edit the extracted content, and keep every future application anchored to facts you control.</p>
                                </article>
                                <article className="rounded-xl bg-[#dcefe3] p-7 sm:p-8">
                                    <Sparkles size={26} className="text-[#24683d]"/>
                                    <h3 className="mt-6 text-2xl font-semibold">Tailoring you can trust</h3>
                                    <p className="mt-3 leading-7 text-[#46594d]">Role-aware writing strategies optimise relevance while explicit safeguards prevent invented experience.</p>
                                </article>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="workflow" className="bg-[#f5f4f0] py-20 sm:py-28">
                    <div className="marketing-container">
                        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                            <div className="max-w-2xl">
                                <span className="eyebrow">How SeekSync works</span>
                                <h2 className="mt-4 text-4xl font-[580] leading-[1.08] sm:text-5xl">From “worth applying” to ready to send.</h2>
                            </div>
                            <p className="max-w-md text-base leading-7 text-[#666b73]">A simple loop designed around how job seekers actually work—not around another database to maintain.</p>
                        </div>
                        <div className="mt-12 grid gap-4 lg:grid-cols-3">
                            {workflowSteps.map((step) => (
                                <article key={step.number} className="editorial-card flex min-h-72 flex-col p-7 sm:p-8">
                                    <div className="flex items-center justify-between">
                                        <span className="flex size-11 items-center justify-center rounded-lg bg-[#e7effb] text-[#0D3880]"><step.icon size={21}/></span>
                                        <span className="font-display text-sm font-semibold text-[#a09c93]">{step.number}</span>
                                    </div>
                                    <h3 className="mt-auto pt-10 text-2xl font-semibold">{step.title}</h3>
                                    <p className="mt-3 leading-7 text-[#666b73]">{step.copy}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="py-20 sm:py-28">
                    <div className="marketing-container">
                        <div className="relative overflow-hidden rounded-xl bg-[#181d26] px-6 py-14 text-center text-white sm:px-12 sm:py-20">
                            <div className="absolute left-10 top-10 size-3 rounded-sm bg-[#f6e7a9]"/>
                            <div className="absolute bottom-12 right-16 size-4 rounded-full bg-[#dcefe3]"/>
                            <span className="eyebrow text-[#9ebce9]">Your next application starts here</span>
                            <h2 className="mx-auto mt-5 max-w-3xl text-balance text-4xl font-[580] leading-[1.08] sm:text-6xl">Build momentum, not another spreadsheet.</h2>
                            <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-white/65">Start with three tailored resumes each month and a clearer view of every opportunity.</p>
                            <Link href="/register" className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-bold text-[#181d26] hover:bg-[#f5f4f0]">
                                Create your free workspace <ArrowRight size={17}/>
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-[#e4e1da] py-10">
                <div className="marketing-container flex flex-col justify-between gap-6 text-sm text-[#666b73] sm:flex-row sm:items-center">
                    <div>
                        <p className="font-display text-lg font-semibold text-[#181d26]">SeekSync</p>
                        <p className="mt-1">A calmer way to run your job search.</p>
                        <p className="mt-1 text-xs text-[#858990]">Independent product. Not affiliated with SEEK.</p>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                        <Link href="/pricing" className="hover:text-[#0D3880]">Pricing</Link>
                        <Link href="/privacy" className="hover:text-[#0D3880]">Privacy &amp; legal</Link>
                        <Link href="/login" className="hover:text-[#0D3880]">Log in</Link>
                        <Link href="/register" className="hover:text-[#0D3880]">Get started</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
