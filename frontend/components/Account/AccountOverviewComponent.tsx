import Link from "next/link";
import {ArrowUpRight} from "lucide-react";
import type {User} from "@supabase/auth-js";
import type {Database} from "@/lib/types/database.types";
import type {ResumeGenerationUsage} from "../Dashboard/ResumeGenerator/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default function AccountOverviewComponent({
                                                     user,
                                                     profile,
                                                     usage,
                                                 }: {
    user: User | null;
    profile: Profile | null;
    usage: ResumeGenerationUsage | null;
}) {

    const fullName = getFullName(profile?.first_name, profile?.last_name, user?.user_metadata);
    const email = user?.email || profile?.email || "Email unavailable";
    const initials = getInitials(fullName, email);
    const limit = Math.max(usage?.limit ?? profile?.resume_generations_limit ?? 0, 0);
    const used = Math.max(usage?.used ?? profile?.resume_generations_used ?? 0, 0);
    const remaining = Math.max(usage?.remaining ?? limit - used, 0);
    const usagePercent = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
    const planName = formatPlan(profile?.plan);
    const signInMethod = formatProviders(user?.app_metadata?.providers, user?.app_metadata?.provider);

    return (
        <div className="flex min-w-0 flex-col gap-5">
            <section className="app-panel overflow-hidden">
                <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div className="flex min-w-0 items-center gap-4">
                        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-[#0D3880] font-display text-lg font-semibold text-white">
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#0D3880]">Your profile</p>
                            <h2 className="mt-1 truncate text-xl font-semibold text-[#181d26]">{fullName}</h2>
                            <p className="mt-0.5 truncate text-sm text-[#6f747c]">{email}</p>
                        </div>
                    </div>
                    <span className="inline-flex w-fit rounded-md border border-[#cfd9e9] bg-[#edf3fb] px-2.5 py-1 text-xs font-semibold text-[#0D3880]">
                        {planName} plan
                    </span>
                </div>

                <dl className="grid border-t border-[#dfddd6] sm:grid-cols-2">
                    <AccountDetail label="Member since" value={formatDate(profile?.created_at || user?.created_at)}/>
                    <AccountDetail label="Sign-in method" value={signInMethod}/>
                    <AccountDetail label="Last sign-in" value={formatDateTime(user?.last_sign_in_at)}/>
                    <AccountDetail label="Subscription" value={formatSubscription(profile?.subscription_status, profile?.plan)}/>
                </dl>
            </section>

            <section className="app-panel p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#0D3880]">Monthly allowance</p>
                        <h2 className="mt-1 text-xl font-semibold text-[#181d26]">Tailored resumes</h2>
                        <p className="mt-1 text-sm leading-6 text-[#6f747c]">Your allowance refreshes at the end of each usage period.</p>
                    </div>
                    <Link href="/dashboard/billing"
                          className="inline-flex min-h-10 w-fit items-center gap-1.5 rounded-lg border border-[#cfcfcf] bg-white px-3.5 text-sm font-medium text-[#242933] hover:border-[#9ea3ab] hover:bg-[#faf9f6]">
                        Manage plan
                        <ArrowUpRight size={15}/>
                    </Link>
                </div>

                {profile || usage ? (
                    <div className="mt-6 grid gap-5 md:grid-cols-[170px_minmax(0,1fr)] md:items-center">
                        <div className="rounded-xl border border-[#d8e1ef] bg-[#edf3fb] p-4">
                            <p className="text-4xl font-semibold tracking-[-0.04em] text-[#0D3880]">{remaining}</p>
                            <p className="mt-1 text-sm font-medium text-[#33445f]">resume{remaining === 1 ? "" : "s"} left</p>
                        </div>

                        <div>
                            <div className="flex items-center justify-between gap-4 text-sm">
                                <span className="font-medium text-[#3f4651]">{used} of {limit} used</span>
                                <span className="text-right text-[#6f747c]">Resets {formatDate(usage?.period_end ?? profile?.resume_usage_period_end)}</span>
                            </div>
                            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#ebe9e4]"
                                 role="progressbar"
                                 aria-label="Tailored resume usage"
                                 aria-valuemin={0}
                                 aria-valuemax={Math.max(limit, 1)}
                                 aria-valuenow={Math.min(used, limit)}>
                                <div className="h-full rounded-full bg-[#0D3880] transition-[width]"
                                     style={{width: `${usagePercent}%`}}/>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-[#6f747c]">
                                {remaining > 0
                                    ? `You can tailor ${remaining} more resume${remaining === 1 ? "" : "s"} in this period.`
                                    : "You have used your current allowance. Manage your plan to review your options."}
                            </p>
                        </div>
                    </div>
                ) : (
                    <p className="mt-6 rounded-lg border border-[#dfddd6] bg-[#faf9f6] p-4 text-sm text-[#6f747c]">
                        Usage information is temporarily unavailable. Your account is still active.
                    </p>
                )}
            </section>
        </div>
    );
}

function AccountDetail({label, value}: {label: string; value: string}) {
    return (
        <div className="border-b border-[#dfddd6] px-5 py-4 last:border-b-0 sm:px-6 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(n+3)]:border-b-0">
            <dt className="text-xs font-medium text-[#777b82]">{label}</dt>
            <dd className="mt-1 text-sm font-medium text-[#242933]">{value}</dd>
        </div>
    );
}

function getFullName(firstName?: string | null, lastName?: string | null, metadata?: Record<string, unknown>) {
    const profileName = [firstName, lastName].filter(Boolean).join(" ").trim();
    if (profileName) return profileName;

    const metadataParts = [metadata?.first_name, metadata?.last_name]
        .filter((part): part is string => typeof part === "string" && Boolean(part.trim()))
        .join(" ")
        .trim();
    if (metadataParts) return metadataParts;

    const metadataName = metadata?.full_name ?? metadata?.name;
    return typeof metadataName === "string" && metadataName.trim() ? metadataName.trim() : "SeekSync member";
}

function getInitials(name: string, email: string) {
    const nameInitials = name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");

    if (nameInitials && name !== "SeekSync member") return nameInitials;
    return email[0]?.toUpperCase() || "S";
}

function formatPlan(plan?: string | null) {
    if (plan === "pro") return "Pro";
    if (plan === "trial") return "Pro trial";
    return "Free";
}

function formatProviders(providers?: unknown, primaryProvider?: unknown) {
    const providerList = Array.isArray(providers)
        ? providers.filter((provider): provider is string => typeof provider === "string")
        : typeof primaryProvider === "string" ? [primaryProvider] : [];
    const uniqueProviders = [...new Set(providerList)];

    if (uniqueProviders.includes("google") && uniqueProviders.includes("email")) return "Google and email";
    if (uniqueProviders.includes("google")) return "Google";
    if (uniqueProviders.includes("email")) return "Email and password";
    if (uniqueProviders[0]) return uniqueProviders[0].charAt(0).toUpperCase() + uniqueProviders[0].slice(1);
    return "Email and password";
}

function formatSubscription(status?: string | null, plan?: string | null) {
    if (plan !== "pro" && plan !== "trial") return "Free account";
    if (!status) return plan === "trial" ? "Trial active" : "Active";
    return status
        .split("_")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function formatDate(value?: string | null) {
    if (!value) return "Not available";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not available";
    return new Intl.DateTimeFormat("en-AU", {day: "numeric", month: "short", year: "numeric"}).format(date);
}

function formatDateTime(value?: string | null) {
    if (!value) return "Not available";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not available";
    return new Intl.DateTimeFormat("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
}
