import type {ResumeGenerationUsage} from "../ResumeGenerator/types";

export default function CurrentUsageModalComponent({
                                                       resumeUsage,
                                                       coverLetterUsage,
                                                   }: {
    resumeUsage: ResumeGenerationUsage | null;
    coverLetterUsage: ResumeGenerationUsage | null;
}) {
    return (
        <section className="app-panel mt-7 flex w-full max-w-4xl flex-col gap-5 p-5 sm:p-6" aria-labelledby="current-usage-heading">
            <div>
                <h2 id="current-usage-heading" className="font-semibold text-[#181d26]">Current usage</h2>
                <p className="mt-1 text-sm font-medium text-[#6f747c]">Your live usage for the current allowance period.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <UsageItem label="Tailored resumes" usage={resumeUsage}/>
                <UsageItem label="Cover letters" usage={coverLetterUsage}/>
            </div>

            <p className="text-center text-xs font-medium text-[#6f747c]">
                Upgrade to Pro to unlock 100 tailored resumes and 100 cover letters per allowance period.
            </p>
        </section>
    );
}

function UsageItem({label, usage}: {label: string; usage: ResumeGenerationUsage | null}) {
    if (!usage) {
        return (
            <div className="rounded-xl border border-[#dfddd6] bg-[#faf9f6] p-4">
                <p className="text-sm font-semibold text-[#3f4651]">{label}</p>
                <p className="mt-2 text-sm text-[#6f747c]">Usage is temporarily unavailable.</p>
            </div>
        );
    }

    const used = Math.max(usage.used, 0);
    const limit = Math.max(usage.limit, 0);
    const usagePercent = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

    return (
        <div className="rounded-xl border border-[#dfddd6] bg-[#faf9f6] p-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-[#3f4651]">{label}</p>
                    <p className="mt-1 text-sm font-medium text-[#6f747c]">{used} of {limit} used</p>
                </div>
                <p className="shrink-0 text-xs font-medium text-[#6f747c]">Resets {formatDate(usage.period_end)}</p>
            </div>
            <div
                className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-[#ebe9e4]"
                role="progressbar"
                aria-label={`${label} usage`}
                aria-valuemin={0}
                aria-valuemax={Math.max(limit, 1)}
                aria-valuenow={Math.min(used, limit)}
            >
                <div className="h-full rounded-full bg-[#0D3880]" style={{width: `${usagePercent}%`}}/>
            </div>
            <p className="mt-2 text-xs font-medium text-[#0D3880]">{Math.max(usage.remaining, 0)} remaining</p>
        </div>
    );
}

function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "soon";
    return new Intl.DateTimeFormat("en-AU", {day: "numeric", month: "short"}).format(date);
}
