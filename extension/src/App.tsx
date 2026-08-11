/// <reference types="chrome" />

import {useEffect, useState} from "react";
import type {ScrapedJobData} from "./utils/types.ts";
import {
    ArrowUpRight,
    BriefcaseBusiness,
    Clock3,
    RefreshCcw,
    Trash2,
} from "lucide-react";
import {createClient} from "@supabase/supabase-js";
import {captureAppError} from "../lib/sentry/captureAppError.ts";
import {API_URL, WEB_APP_URL} from "./config/runtime.ts";

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

type AuthStatus =
    | "checking"
    | "authenticated"
    | "unauthenticated";

interface TokenResponse {
    token?: string | null;
}

interface LogoutResponse {
    success?: boolean;
}

function fetchTokenFromBackground(): Promise<string | null> {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(
            {action: "GET_TOKEN"},
            (response: TokenResponse | undefined) => {
                if (chrome.runtime.lastError) {
                    captureAppError({
                        message:
                            "Failed to fetch auth token from extension background",
                        area: "extension",
                        action: "get_token_from_background",
                        extra: {
                            error: chrome.runtime.lastError.message,
                        },
                    });

                    resolve(null);
                    return;
                }

                resolve(response?.token ?? null);
            },
        );
    });
}

async function fetchUserFirstName(
    jwtToken: string,
): Promise<string> {
    const {
        data,
        error,
    } = await supabase.auth.getUser(jwtToken);

    if (error || !data.user) {
        console.error("Failed to fetch user:", error);

        captureAppError({
            message: "Failed to fetch authenticated user details",
            error,
            area: "extension",
            action: "fetch_authenticated_user",
        });

        return "";
    }

    const metadata = data.user.user_metadata ?? {};

    return (
        metadata.first_name ??
        metadata.given_name ??
        metadata.full_name?.trim().split(/\s+/)[0] ??
        metadata.name?.trim().split(/\s+/)[0] ??
        data.user.email?.split("@")[0] ??
        "User"
    );
}

function ExtensionBrand() {
    return (
        <div className="inline-flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-[9px] bg-[#0D3880] text-sm font-extrabold text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)]">
                S
            </span>
            <span className="font-display text-xl font-semibold tracking-[-0.04em] text-[#181d26]">
                SeekSync
            </span>
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
        useState<ScrapedJobData[]>([]);

    const [refreshJobs, setRefreshJobs] =
        useState<boolean>(false);

    const [authToken, setAuthToken] =
        useState<string | null>(null);

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

    useEffect(() => {
        let cancelled = false;

        const checkAuthentication = async () => {
            const token = await fetchTokenFromBackground();

            if (cancelled) {
                return;
            }

            if (!token) {
                setAuthToken(null);
                setAuthStatus("unauthenticated");
                setLoadingJobs(false);
                return;
            }

            setAuthToken(token);
            setAuthStatus("authenticated");

            const firstName =
                await fetchUserFirstName(token);

            if (!cancelled) {
                setUserFirstName(firstName);
            }
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
            const token = await fetchTokenFromBackground();

            if (cancelled) {
                return;
            }

            if (!token) {
                console.error(
                    "No token found. User is not logged in.",
                );

                setAuthToken(null);
                setAuthStatus("unauthenticated");
                setUserJobs([]);
                setLoadingJobs(false);
                return;
            }

            try {
                setLoadingJobs(true);
                setJobsError(null);

                const result = await fetch(
                    `${API_URL}/api/v1/jobs`,
                    {
                        method: "GET",
                        headers: {
                            "Content-Type":
                                "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                    },
                );

                if (cancelled) {
                    return;
                }

                if (result.status === 401) {
                    setAuthToken(null);
                    setAuthStatus("unauthenticated");
                    setUserJobs([]);
                    setJobsError(null);
                    return;
                }

                if (!result.ok) {
                    const error = await result.text();

                    captureAppError({
                        message:
                            "Failed to fetch user jobs",
                        error,
                        area: "extension",
                        action: "fetch_user_jobs",
                        endpoint: "/api/v1/jobs",
                        status: result.status,
                        statusText: result.statusText,
                    });

                    console.error(
                        "Error fetching jobs:",
                        result.status,
                    );

                    setJobsError(
                        "Failed to load synced jobs.",
                    );

                    return;
                }

                const data =
                    await result.json() as ScrapedJobData[];

                if (!cancelled) {
                    setUserJobs(data ?? []);
                }
            } catch (error) {
                if (cancelled) {
                    return;
                }

                captureAppError({
                    message:
                        "Unexpected error whilst fetching user jobs",
                    error,
                    area: "extension",
                    action: "fetch_user_jobs",
                    endpoint: "/api/v1/jobs",
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
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(
                {action: "LOGOUT"},
                (response: LogoutResponse | undefined) => {
                    if (chrome.runtime.lastError) {
                        captureAppError({
                            message:
                                "Failed to log out through extension background",
                            area: "extension",
                            action: "logout_user",
                            extra: {
                                error:
                                chrome.runtime.lastError
                                    .message,
                            },
                        });

                        resolve(false);
                        return;
                    }

                    const success =
                        Boolean(response?.success);

                    if (success) {
                        setAuthToken(null);
                        setAuthStatus("unauthenticated");
                        setUserJobs([]);
                        setUserFirstName("");
                        setJobsError(null);
                        setLoadingJobs(false);
                    }

                    resolve(success);
                },
            );
        });
    };

    function getMostRecentSyncTime(): string {
        if (userJobs.length === 0) {
            return "Nothing yet";
        }

        return formatRelativeTime(userJobs[0].dateSynced);
    }

    async function deleteJob(jobID: string) {
        try {
            const token =
                await fetchTokenFromBackground();

            if (!token) {
                console.error(
                    "No token found. User is not logged in.",
                );

                setAuthToken(null);
                setAuthStatus("unauthenticated");
                return;
            }

            const response = await fetch(
                `${API_URL}/api/v1/jobs/${jobID}`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type":
                            "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            if (response.status === 401) {
                setAuthToken(null);
                setAuthStatus("unauthenticated");
                setUserJobs([]);
                return;
            }

            if (!response.ok) {
                const error = await response.text();

                captureAppError({
                    message:
                        "Failed to delete user job",
                    error,
                    area: "extension",
                    action: "delete_user_job",
                    endpoint:
                        `/api/v1/jobs/${jobID}`,
                    status: response.status,
                    statusText: response.statusText,
                });

                console.error(error);
                return;
            }

            setUserJobs((previousJobs) =>
                previousJobs.filter(
                    (job) => job.jobId !== jobID,
                ),
            );
        } catch (error) {
            captureAppError({
                message:
                    "Unexpected error whilst deleting user job",
                error,
                area: "extension",
                action: "delete_user_job",
                endpoint: `/api/v1/jobs/${jobID}`,
            });

            console.error(error);
        }
    }

    if (authStatus === "checking") {
        return (
            <div
                className="flex h-[560px] w-[420px] flex-col bg-[#f5f4f0]"
            >
                <header className="flex h-[72px] shrink-0 items-center border-b border-[#dfddd6] bg-white px-5">
                    <ExtensionBrand/>
                </header>
                <div
                    className="flex flex-1 flex-col items-center justify-center gap-y-3"
                    role="status"
                    aria-live="polite"
                >
                    <div
                        className="size-7 animate-spin rounded-full border-2 border-[#d8d6cf] border-t-[#0D3880]"
                    />

                    <p className="text-sm font-medium text-[#6f747c]">
                        Connecting to your workspace…
                    </p>
                </div>
            </div>
        );
    }

    const isAuthenticated =
        authStatus === "authenticated" &&
        authToken !== null;

    return (
        <div
            className="flex h-[560px] w-[420px] flex-col overflow-hidden bg-[#f5f4f0] text-[#181d26]"
        >
            <header className="sticky top-0 z-10 flex h-[72px] w-full shrink-0 items-center justify-between border-b border-[#dfddd6] bg-white px-5">
                <ExtensionBrand/>

                {isAuthenticated && (
                    <div className="flex items-center gap-3">
                        <div className="min-w-0 text-right">
                            <p className="max-w-30 truncate text-sm font-semibold text-[#242933]">
                                {userFirstName ? `Hi, ${userFirstName}` : "Your workspace"}
                            </p>
                            <button
                                type="button"
                                className="mt-0.5 text-xs font-medium text-[#6f747c] hover:cursor-pointer hover:text-[#181d26]"
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
                            className="flex size-9 items-center justify-center rounded-full border border-[#d8d6cf] bg-white text-[#0D3880] hover:cursor-pointer hover:border-[#aaa79f] hover:bg-[#faf9f6] disabled:cursor-wait disabled:opacity-60"
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
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0D3880]">
                                Job workspace
                            </p>
                            <h1 className="mt-1 font-display text-2xl font-semibold tracking-[-0.035em] text-[#181d26]">
                                Your synced jobs
                            </h1>
                            <p className="mt-1 text-sm leading-5 text-[#6f747c]">
                                Keep the roles worth pursuing close at hand.
                            </p>
                        </div>

                        <div className="grid w-full grid-cols-2 gap-3">
                            <div className="rounded-xl border border-[#cfd9e9] bg-[#e7effb] p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-medium text-[#50617c]">Synced jobs</p>
                                    <BriefcaseBusiness size={16} className="text-[#0D3880]" aria-hidden="true"/>
                                </div>
                                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#0D3880]">
                                    {userJobs.length}
                                </p>
                            </div>

                            <div className="rounded-xl border border-[#dfddd6] bg-white p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-medium text-[#6f747c]">Last synced</p>
                                    <Clock3 size={16} className="text-[#6f747c]" aria-hidden="true"/>
                                </div>
                                <p className="mt-2 text-lg font-semibold tracking-[-0.025em] text-[#242933]">
                                    {getMostRecentSyncTime()}
                                </p>
                            </div>
                        </div>

                        <div className="flex w-full items-center justify-between pt-1">
                            <h2 className="text-sm font-semibold text-[#242933]">Recently synced</h2>
                            <button
                                type="button"
                                onClick={() => chrome.tabs.create({url: `${WEB_APP_URL}/dashboard`})}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0D3880] hover:cursor-pointer hover:text-[#08285f]"
                            >
                                Open dashboard
                                <ArrowUpRight size={14} aria-hidden="true"/>
                            </button>
                        </div>

                        {loadingJobs && (
                            <div
                                className="flex w-full items-center gap-3 rounded-xl border border-[#dfddd6] bg-white px-4 py-5 text-sm text-[#6f747c]"
                                role="status"
                                aria-live="polite"
                            >
                                <span className="size-4 animate-spin rounded-full border-2 border-[#d8d6cf] border-t-[#0D3880]" aria-hidden="true"/>
                                Loading synced jobs…
                            </div>
                        )}

                        {jobsError && !loadingJobs && (
                            <div
                                className="w-full rounded-xl border border-[#ecd2c9] bg-[#fff5f2] px-4 py-4"
                                role="alert"
                            >
                                <p className="text-sm font-semibold text-[#8f2d21]">We couldn&apos;t load your jobs</p>
                                <p className="mt-1 text-sm leading-5 text-[#7d554e]">{jobsError}</p>
                                <button
                                    type="button"
                                    onClick={() => setRefreshJobs((previousValue) => !previousValue)}
                                    className="mt-3 min-h-9 rounded-lg border border-[#dab9b0] bg-white px-3 text-xs font-semibold text-[#8f2d21] hover:cursor-pointer hover:bg-[#fffaf8]"
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
                                        className="relative flex w-full flex-col gap-y-2.5 rounded-xl border border-[#dfddd6] bg-white p-4 shadow-[0_1px_2px_rgba(24,29,38,0.03)]"
                                    >
                                        <div className="flex w-full items-start justify-between gap-4">
                                            <div className="min-w-0 pr-1 text-[15px] font-semibold leading-5 text-[#0D3880]">
                                                {userJob.jobTitle}
                                            </div>

                                            <button
                                                type="button"
                                                aria-label={`Remove ${userJob.jobTitle}`}
                                                title="Remove synced job"
                                                className="flex size-7 shrink-0 items-center justify-center rounded-full text-[#8a8e95] hover:cursor-pointer hover:bg-[#fff1ed] hover:text-[#b42318]"
                                                onClick={() => {
                                                    void deleteJob(
                                                        userJob.jobId,
                                                    );
                                                }}
                                            >
                                                <Trash2 size={14} aria-hidden="true"/>
                                            </button>
                                        </div>

                                        <div className="flex w-full items-center justify-start text-xs text-[#5f656e]">
                                            {userJob.companyName +
                                                " • " +
                                                userJob.location}
                                        </div>

                                        <div className="flex w-full flex-wrap items-center justify-start gap-1.5">
                                            {userJob.jobType ? (
                                                <span className="rounded-md border border-[#dfddd6] bg-[#faf9f6] px-2 py-1 text-[11px] font-medium text-[#50555e]">
                                                    {userJob.jobType}
                                                </span>
                                            ) : null}

                                            {userJob.jobPay && (
                                                <span className="rounded-md border border-[#cfd9e9] bg-[#edf3fb] px-2 py-1 text-[11px] font-medium text-[#33445f]">
                                                    {userJob.jobPay}
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-1 w-full border-b border-[#e7e5df]"/>

                                        <div className="flex w-full items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-xs text-[#777b82]">
                                                <Clock3 size={14} aria-hidden="true"/>
                                                <span>{formatRelativeTime(userJob.dateSynced)}</span>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => chrome.tabs.create({url: `${WEB_APP_URL}/dashboard`})}
                                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0D3880] hover:cursor-pointer hover:text-[#08285f]"
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
                                <div className="w-full rounded-xl border border-dashed border-[#c9c6bd] bg-[#faf9f6] px-5 py-7 text-center">
                                    <span className="mx-auto flex size-10 items-center justify-center rounded-xl bg-[#e7effb] text-[#0D3880]">
                                        <BriefcaseBusiness size={18} aria-hidden="true"/>
                                    </span>
                                    <p className="mt-3 text-sm font-semibold text-[#242933]">
                                        No synced jobs yet
                                    </p>

                                    <p className="mx-auto mt-1 max-w-65 text-sm leading-5 text-[#6f747c]">
                                        Open a role on SEEK and choose “Sync to SeekSync” to add it here.
                                    </p>
                                </div>
                            )}
                    </div>
                </div>
            ) : (
                <div className="flex flex-1 flex-col px-5 py-7">
                    <span className="inline-flex w-fit rounded-md border border-[#cfd9e9] bg-[#edf3fb] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#0D3880]">
                        SEEK job companion
                    </span>

                    <h1 className="mt-5 font-display text-[32px] font-semibold leading-[1.08] tracking-[-0.045em] text-[#181d26]">
                        Keep every promising role in sync.
                    </h1>

                    <p className="mt-3 text-[15px] leading-6 text-[#5f656e]">
                        Sign in once, then save jobs from SEEK straight into your application workspace.
                    </p>

                    <div className="mt-6 divide-y divide-[#dfddd6] border-y border-[#dfddd6] text-sm text-[#3f4651]">
                        <div className="flex items-center justify-between py-3">
                            <span>Save roles in one click</span>
                            <span className="font-semibold text-[#0D3880]">01</span>
                        </div>
                        <div className="flex items-center justify-between py-3">
                            <span>Continue in your pipeline</span>
                            <span className="font-semibold text-[#0D3880]">02</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="mt-auto inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#0D3880] px-4 text-sm font-semibold text-white shadow-[0_2px_5px_rgba(13,56,128,0.18)] hover:cursor-pointer hover:bg-[#08285f]"
                        onClick={() =>
                            chrome.tabs.create({
                                url: `${WEB_APP_URL}/login`,
                            })
                        }
                    >
                        Log in to SeekSync
                    </button>

                    <button
                        type="button"
                        className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#c9c6bd] bg-white px-4 text-sm font-semibold text-[#242933] hover:cursor-pointer hover:border-[#9ea3ab] hover:bg-[#faf9f6]"
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
