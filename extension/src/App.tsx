/// <reference types="chrome" />

import {useEffect, useState} from "react";
import type {SyncedJobSummary} from "./utils/types.ts";
import {
    ArrowUpRight,
    BriefcaseBusiness,
    Clock3, Loader,
    RefreshCcw,
    Trash2,
} from "lucide-react";
import {captureAppError} from "../lib/sentry/captureAppError.ts";
import {WEB_APP_URL} from "./config/runtime.ts";


type AuthStatus =
    | "checking"
    | "authenticated"
    | "unauthenticated";

interface AuthResponse {
    authenticated?: boolean;
    firstName?: string;
}

interface OperationResponse {
    success?: boolean;
    status?: number;
    jobs?: SyncedJobSummary[];
}

function sendBackgroundMessage<T>(message: { action: string; payload?: unknown }): Promise<T | null> {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, (response: T | undefined) => {
            if (chrome.runtime.lastError) {
                captureAppError({
                    code: "EXT_POPUP_RUNTIME_MESSAGE",
                    message: "Failed to communicate with the extension background",
                    error: new Error(chrome.runtime.lastError.message),
                    area: "extension",
                    action: "background_message",
                });

                resolve(null);
                return;
            }

            resolve(response ?? null);
        });
    });
}

function ExtensionBrand() {
    return (
        <div className="inline-flex items-center gap-2.5">
            <img
                src="/icons/rolevault-mark.svg"
                alt=""
                aria-hidden="true"
                className="size-8 shrink-0"
            />
            <a onClick={() => chrome.tabs.create({url: `${WEB_APP_URL}`})} className="font-display text-xl hover:cursor-pointer font-semibold tracking-[-0.04em] text-[#0f172a]">
                RoleVault
            </a>
        </div>
    );
}

function formatRelativeTime(value: Date | string): string {
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return "Recently";

    const minutesAgo = Math.max(0, Math.floor((Date.now() - timestamp) / (1000 * 60)));
    if (minutesAgo < 2) return "Just now";
    if (minutesAgo < 60) return `${minutesAgo}m ago`;

    const hoursAgo = Math.floor(minutesAgo / 60);
    if (hoursAgo < 24) return `${hoursAgo}h ago`;

    const daysAgo = Math.floor(hoursAgo / 24);
    return `${daysAgo}d ago`;
}

function App() {
    const [userJobs, setUserJobs] =
        useState<SyncedJobSummary[]>([]);

    const [refreshJobs, setRefreshJobs] =
        useState<boolean>(false);

    const [authStatus, setAuthStatus] =
        useState<AuthStatus>("checking");

    const [userFirstName, setUserFirstName] =
        useState<string>("");

    const [isSpinning, setIsSpinning] =
        useState<boolean>(false);

    const [loadingJobs, setLoadingJobs] =
        useState<boolean>(true);

    const [jobsError, setJobsError] =
        useState<string | null>(null);

    const [deletingJob, setDeletingJob] = useState<boolean>(false);

    useEffect(() => {
        let cancelled = false;

        const checkAuthentication = async () => {
            const session = await sendBackgroundMessage<AuthResponse>({action: "CHECK_AUTH"});

            if (cancelled) {
                return;
            }

            if (!session?.authenticated) {
                setAuthStatus("unauthenticated");
                setLoadingJobs(false);
                return;
            }

            setAuthStatus("authenticated");
            setUserFirstName(typeof session.firstName === "string" ? session.firstName : "");
        };

        void checkAuthentication();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (authStatus !== "authenticated") {
            return;
        }

        let cancelled = false;

        const fetchJobs = async () => {
            try {
                setLoadingJobs(true);
                setJobsError(null);

                const result = await sendBackgroundMessage<OperationResponse>({action: "GET_JOBS"});

                if (cancelled) {
                    return;
                }

                if (result?.status === 401) {
                    setAuthStatus("unauthenticated");
                    setUserJobs([]);
                    setJobsError(null);
                    return;
                }

                if (!result?.success || !Array.isArray(result.jobs)) {
                    setJobsError(
                        "Failed to load synced jobs.",
                    );

                    return;
                }

                if (!cancelled) {
                    setUserJobs(result.jobs);
                }
            } catch (error) {
                if (cancelled) {
                    return;
                }

                captureAppError({
                    code: "EXT_POPUP_JOBS_FETCH",
                    message:
                        "Unexpected error whilst fetching user jobs",
                    error,
                    area: "extension",
                    action: "fetch_user_jobs",
                    endpoint: "/api/extension/jobs",
                });

                console.error(
                    "Error fetching jobs:",
                    error,
                );

                setJobsError(
                    "Failed to load synced jobs.",
                );
            } finally {
                if (!cancelled) {
                    setLoadingJobs(false);
                }
            }
        };

        void fetchJobs();

        return () => {
            cancelled = true;
        };
    }, [authStatus, refreshJobs]);

    const logoutUser = (): Promise<boolean> => {
        return sendBackgroundMessage<OperationResponse>({action: "LOGOUT"}).then((response) => {
            const success = Boolean(response?.success);
            if (success) {
                setAuthStatus("unauthenticated");
                setUserJobs([]);
                setUserFirstName("");
                setJobsError(null);
                setLoadingJobs(false);
            }
            return success;
        });
    };

    function getMostRecentSyncTime(): string {
        if (userJobs.length === 0) {
            return "Nothing yet";
        }

        return formatRelativeTime(userJobs[0].dateSynced);
    }

    async function deleteJob(jobID: string) {
        setDeletingJob(true)
        try {
            const response = await sendBackgroundMessage<OperationResponse>({
                action: "DELETE_JOB",
                payload: {jobID},
            });

            if (response?.status === 401) {
                setAuthStatus("unauthenticated");
                setUserJobs([]);
                return;
            }

            if (!response?.success) {
                return;
            }

            setUserJobs((previousJobs) =>
                previousJobs.filter(
                    (job) => job.jobId !== jobID,
                ),
            );
        } catch (error) {
            captureAppError({
                code: "EXT_POPUP_JOB_DELETE",
                message:
                    "Unexpected error whilst deleting user job",
                error,
                area: "extension",
                action: "delete_user_job",
                endpoint: "/api/extension/jobs/:jobId",
            });

            console.error(error);
        } finally {
            setDeletingJob(false)
        }
    }

    if (authStatus === "checking") {
        return (
            <div
                className="flex h-[560px] w-[420px] flex-col bg-[#f8fafc]"
            >
                <header className="flex h-[72px] shrink-0 items-center border-b border-[#e2e8f0] bg-white px-5">
                    <ExtensionBrand/>
                </header>
                <div
                    className="flex flex-1 flex-col items-center justify-center gap-y-3"
                    role="status"
                    aria-live="polite"
                >
                    <div
                        className="size-7 animate-spin rounded-full border-2 border-[#dbe4f0] border-t-[#2563eb]"
                    />

                    <p className="text-sm font-medium text-[#64748b]">
                        Connecting to your workspace…
                    </p>
                </div>
            </div>
        );
    }

    const isAuthenticated = authStatus === "authenticated";

    return (
        <div
            className="flex h-[560px] w-[420px] flex-col overflow-hidden bg-[#f8fafc] text-[#0f172a]"
        >
            <header
                className="sticky top-0 z-10 flex h-[72px] w-full shrink-0 items-center justify-between border-b border-[#e2e8f0] bg-white px-5">
                <ExtensionBrand/>

                {isAuthenticated && (
                    <div className="flex items-center gap-3">
                        <div className="min-w-0 text-right">
                            <p className="max-w-30 truncate text-sm font-semibold text-[#1e293b]">
                                {userFirstName ? `Hi, ${userFirstName}` : "Your workspace"}
                            </p>
                            <button
                                type="button"
                                className="mt-0.5 text-xs font-medium text-[#64748b] hover:cursor-pointer hover:text-[#0f172a]"
                                onClick={() => {
                                    void logoutUser();
                                }}
                            >
                                Log out
                            </button>
                        </div>

                        <button
                            type="button"
                            aria-label="Refresh synced jobs"
                            title="Refresh synced jobs"
                            disabled={isSpinning}
                            className="flex size-9 items-center justify-center rounded-full border border-[#dbe4f0] bg-white text-[#2563eb] hover:cursor-pointer hover:border-[#93c5fd] hover:bg-[#eff6ff] disabled:cursor-wait disabled:opacity-60"
                            onClick={() => {
                                if (isSpinning) {
                                    return;
                                }

                                setRefreshJobs(
                                    (previousValue) =>
                                        !previousValue,
                                );

                                setIsSpinning(true);

                                window.setTimeout(
                                    () =>
                                        setIsSpinning(false),
                                    2000,
                                );
                            }}
                        >
                            <RefreshCcw
                                size={16}
                                aria-hidden="true"
                                className={isSpinning ? "animate-spin" : ""}
                            />
                        </button>
                    </div>
                )}
            </header>

            {isAuthenticated ? (
                <div className="flex w-full flex-1 flex-col overflow-y-auto px-5 py-5">
                    <div className="flex w-full flex-col gap-y-4">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2563eb]">
                                Job workspace
                            </p>
                            <h1 className="mt-1 font-display text-2xl font-semibold tracking-[-0.035em] text-[#0f172a]">
                                Your synced jobs
                            </h1>
                            <p className="mt-1 text-sm leading-5 text-[#64748b]">
                                Keep the roles worth pursuing close at hand.
                            </p>
                        </div>

                        <div className="grid w-full grid-cols-2 gap-3">
                            <div className="rounded-xl border border-[#bfdbfe] bg-[#eff6ff] p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-medium text-[#475569]">Synced jobs</p>
                                    <BriefcaseBusiness size={16} className="text-[#2563eb]" aria-hidden="true"/>
                                </div>
                                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#2563eb]">
                                    {userJobs.length}
                                </p>
                            </div>

                            <div className="rounded-xl border border-[#e2e8f0] bg-white p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-medium text-[#64748b]">Last synced</p>
                                    <Clock3 size={16} className="text-[#64748b]" aria-hidden="true"/>
                                </div>
                                <p className="mt-2 text-lg font-semibold tracking-[-0.025em] text-[#1e293b]">
                                    {getMostRecentSyncTime()}
                                </p>
                            </div>
                        </div>

                        <div className="flex w-full items-center justify-between pt-1">
                            <h2 className="text-sm font-semibold text-[#1e293b]">Recently synced</h2>
                            <button
                                type="button"
                                onClick={() => chrome.tabs.create({url: `${WEB_APP_URL}/dashboard`})}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563eb] hover:cursor-pointer hover:text-[#1d4ed8]"
                            >
                                Open dashboard
                                <ArrowUpRight size={14} aria-hidden="true"/>
                            </button>
                        </div>

                        {loadingJobs && (
                            <div
                                className="flex w-full items-center gap-3 rounded-xl border border-[#e2e8f0] bg-white px-4 py-5 text-sm text-[#64748b]"
                                role="status"
                                aria-live="polite"
                            >
                                <span
                                    className="size-4 animate-spin rounded-full border-2 border-[#dbe4f0] border-t-[#2563eb]"
                                    aria-hidden="true"/>
                                Loading synced jobs…
                            </div>
                        )}

                        {jobsError && !loadingJobs && (
                            <div
                                className="w-full rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-4"
                                role="alert"
                            >
                                <p className="text-sm font-semibold text-[#b91c1c]">We couldn&apos;t load your jobs</p>
                                <p className="mt-1 text-sm leading-5 text-[#991b1b]">{jobsError}</p>
                                <button
                                    type="button"
                                    onClick={() => setRefreshJobs((previousValue) => !previousValue)}
                                    className="mt-3 min-h-9 rounded-lg border border-[#fecaca] bg-white px-3 text-xs font-semibold text-[#b91c1c] hover:cursor-pointer hover:bg-[#fff7f7]"
                                >
                                    Try again
                                </button>
                            </div>
                        )}

                        {!loadingJobs &&
                            !jobsError &&
                            userJobs.length !== 0 &&
                            userJobs.map((userJob) => {
                                return (
                                    <div
                                        key={userJob.jobId}
                                        className="relative flex w-full flex-col gap-y-2.5 rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                                    >
                                        <div className="flex w-full items-start justify-between gap-4">
                                            <div
                                                className="min-w-0 pr-1 text-[15px] font-semibold leading-5 text-[#2563eb]">
                                                {userJob.jobTitle}
                                            </div>

                                            <button
                                                type="button"
                                                aria-label={`Remove ${userJob.jobTitle}`}
                                                title="Remove synced job"
                                                disabled={deletingJob}
                                                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[#94a3b8] ${deletingJob ? "hover:cursor-not-allowed" : "hover:cursor-pointer hover:bg-[#fef2f2] hover:text-[#dc2626]"}`}
                                                onClick={() => {
                                                    void deleteJob(
                                                        userJob.jobId,
                                                    );
                                                }}
                                            >
                                                {deletingJob ? <Loader size={14} className={"animate-spin duration-300"}/> :
                                                    <Trash2 size={14} aria-hidden="true"/>}
                                            </button>
                                        </div>

                                        <div className="flex w-full items-center justify-start text-xs text-[#475569]">
                                            {userJob.companyName +
                                                " • " +
                                                userJob.location}
                                        </div>

                                        <div className="flex w-full flex-wrap items-center justify-start gap-1.5">
                                            {userJob.jobType ? (
                                                <span
                                                    className="rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-2 py-1 text-[11px] font-medium text-[#475569]">
                                                    {userJob.jobType}
                                                </span>
                                            ) : null}

                                            {userJob.jobPay && (
                                                <span
                                                    className="rounded-md border border-[#bfdbfe] bg-[#eff6ff] px-2 py-1 text-[11px] font-medium text-[#1e40af]">
                                                    {userJob.jobPay}
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-1 w-full border-b border-[#e2e8f0]"/>

                                        <div className="flex w-full items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
                                                <Clock3 size={14} aria-hidden="true"/>
                                                <span>{formatRelativeTime(userJob.dateSynced)}</span>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => chrome.tabs.create({url: `${WEB_APP_URL}/dashboard`})}
                                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563eb] hover:cursor-pointer hover:text-[#1d4ed8]"
                                            >
                                                View
                                                <ArrowUpRight size={14} aria-hidden="true"/>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                        {!loadingJobs &&
                            !jobsError &&
                            userJobs.length === 0 && (
                                <div
                                    className="w-full rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-5 py-7 text-center">
                                    <span
                                        className="mx-auto flex size-10 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb]">
                                        <BriefcaseBusiness size={18} aria-hidden="true"/>
                                    </span>
                                    <p className="mt-3 text-sm font-semibold text-[#1e293b]">
                                        No synced jobs yet
                                    </p>

                                    <p className="mx-auto mt-1 max-w-65 text-sm leading-5 text-[#64748b]">
                                        Open a role on SEEK and choose “Sync to RoleVault” to add it here.
                                    </p>
                                </div>
                            )}
                    </div>
                </div>
            ) : (
                <div className="flex flex-1 flex-col px-5 py-7">
                    <span
                        className="inline-flex w-fit rounded-md border border-[#bfdbfe] bg-[#eff6ff] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#2563eb]">
                        SEEK job companion
                    </span>

                    <h1 className="mt-5 font-display text-[32px] font-semibold leading-[1.08] tracking-[-0.045em] text-[#0f172a]">
                        Keep every promising role in sync.
                    </h1>

                    <p className="mt-3 text-[15px] leading-6 text-[#475569]">
                        Sign in once, then save jobs from SEEK straight into your application workspace.
                    </p>

                    <div className="mt-6 divide-y divide-[#e2e8f0] border-y border-[#e2e8f0] text-sm text-[#475569]">
                        <div className="flex items-center justify-between py-3">
                            <span>Save roles in one click</span>
                            <span className="font-semibold text-[#2563eb]">01</span>
                        </div>
                        <div className="flex items-center justify-between py-3">
                            <span>Continue in your pipeline</span>
                            <span className="font-semibold text-[#2563eb]">02</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="mt-auto inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#2563eb] px-4 text-sm font-semibold text-white shadow-[0_2px_6px_rgba(37,99,235,0.2)] hover:cursor-pointer hover:bg-[#1d4ed8]"
                        onClick={() =>
                            chrome.tabs.create({
                                url: `${WEB_APP_URL}/login`,
                            })
                        }
                    >
                        Log in to RoleVault
                    </button>

                    <button
                        type="button"
                        className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#cbd5e1] bg-white px-4 text-sm font-semibold text-[#1e293b] hover:cursor-pointer hover:border-[#93c5fd] hover:bg-[#eff6ff]"
                        onClick={() => chrome.tabs.create({url: `${WEB_APP_URL}/register`})}
                    >
                        Create an account
                    </button>
                </div>
            )}
        </div>
    );
}

export default App;
