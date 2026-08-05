/// <reference types="chrome" />

import {useEffect, useState} from "react";
import type {ScrapedJobData} from "./utils/types.ts";
import {
    ArrowRightIcon,
    Briefcase,
    Clock,
    FolderSync,
    RefreshCcw,
    X,
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
            return "No jobs";
        }

        const mostRecentJob = userJobs[0];

        const hoursAgo = Math.floor(
            (
                new Date().getTime() -
                new Date(
                    mostRecentJob.dateSynced,
                ).getTime()
            ) /
            (1000 * 60 * 60),
        );

        if (hoursAgo === 0) {
            return "Just now";
        }

        return `${hoursAgo}h ago`;
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
                className={
                    "flex w-105 h-130 items-center " +
                    "justify-center bg-gray-50"
                }
            >
                <div
                    className={
                        "flex flex-col items-center " +
                        "justify-center gap-y-3"
                    }
                >
                    <div
                        className={
                            "h-7 w-7 animate-spin rounded-full " +
                            "border-2 border-black/10 " +
                            "border-t-blue-600"
                        }
                    />

                    <p
                        className={
                            "text-sm font-semibold " +
                            "text-black/50"
                        }
                    >
                        Loading SeekSync...
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
            className={
                "flex justify-start w-105 h-130 " +
                "flex-col bg-gray-50 overflow-hidden"
            }
        >
            <div
                className={
                    "sticky top-0 z-10 font-bold w-full " +
                    "flex justify-between items-center text-xl " +
                    "py-4 px-4 border-b border-black/10 " +
                    "bg-white shadow-sm"
                }
            >
                <div className="text-blue-500">
                    SeekSync
                </div>

                {isAuthenticated && (
                    <div className="flex flex-col gap-y-0">
                        <div
                            className={
                                "flex items-center flex-row-reverse " +
                                "justify-center gap-x-2"
                            }
                        >
                            <RefreshCcw
                                size={22}
                                className={
                                    `text-blue-700 hover:cursor-pointer ` +
                                    `${isSpinning ? "animate-spin" : ""} ` +
                                    "transform"
                                }
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
                            />

                            <div
                                className={
                                    "text-black/80 select-none " +
                                    "font-semibold"
                                }
                            >
                                {userFirstName}
                            </div>
                        </div>

                        <button
                            type="button"
                            className={
                                "text-xs self-end text-black/60 " +
                                "hover:cursor-pointer"
                            }
                            onClick={() => {
                                void logoutUser();
                            }}
                        >
                            Logout
                        </button>
                    </div>
                )}
            </div>

            {isAuthenticated ? (
                <div
                    className={
                        "w-full flex justify-between py-2 " +
                        "flex-col items-center px-2 " +
                        "overflow-y-auto"
                    }
                >
                    <div
                        className={
                            "py-2 px-4 flex items-center " +
                            "justify-center w-full gap-y-2 " +
                            "flex-col"
                        }
                    >
                        <div
                            className={
                                "justify-between items-center " +
                                "w-full flex gap-x-2"
                            }
                        >
                            <div
                                className={
                                    "bg-blue-700 h-24 flex-col " +
                                    "flex items-start w-full " +
                                    "justify-start text-start uppercase " +
                                    "rounded-sm relative py-5 px-3 " +
                                    "text-lg font-semibold"
                                }
                            >
                                <p
                                    className={
                                        "text-gray-200/50 text-sm"
                                    }
                                >
                                    Active Jobs
                                </p>

                                <p className="text-white text-2xl">
                                    {userJobs.length}
                                </p>

                                <Briefcase
                                    size={52}
                                    className={
                                        "absolute text-gray-200 " +
                                        "bottom-0.5 opacity-50 right-1"
                                    }
                                />
                            </div>

                            <div
                                className={
                                    "bg-gray-200 flex-col h-24 " +
                                    "flex items-start w-full " +
                                    "justify-start text-start rounded-sm " +
                                    "relative py-5 px-3 text-lg " +
                                    "font-semibold"
                                }
                            >
                                <p
                                    className={
                                        "text-black/50 text-sm " +
                                        "uppercase"
                                    }
                                >
                                    Last Sync
                                </p>

                                <p className="text-black text-lg">
                                    {getMostRecentSyncTime()}
                                </p>

                                <FolderSync
                                    size={52}
                                    className={
                                        "absolute text-black bottom-0.5 " +
                                        "opacity-20 right-1"
                                    }
                                />
                            </div>
                        </div>

                        <div
                            className={
                                "uppercase flex items-center w-full " +
                                "pt-2 font-semibold px-1 text-lg " +
                                "text-black/70 justify-start"
                            }
                        >
                            Recently Synced
                        </div>

                        {loadingJobs && (
                            <div
                                className={
                                    "w-full text-lg rounded-md bg-white " +
                                    "px-4 py-6 text-center text-black/60"
                                }
                            >
                                Loading synced jobs...
                            </div>
                        )}

                        {jobsError && !loadingJobs && (
                            <div
                                className={
                                    "w-full text-lg rounded-md bg-white " +
                                    "px-4 py-6 text-center text-red-500"
                                }
                            >
                                {jobsError}
                            </div>
                        )}

                        {!loadingJobs &&
                            !jobsError &&
                            userJobs.length !== 0 &&
                            userJobs.map((userJob) => {
                                const hoursAgo = Math.floor(
                                    (
                                        new Date().getTime() -
                                        new Date(
                                            userJob.dateSynced,
                                        ).getTime()
                                    ) /
                                    (1000 * 60 * 60),
                                );

                                return (
                                    <div
                                        key={userJob.jobId}
                                        className={
                                            "flex bg-white relative rounded-sm " +
                                            "border shadow-lg " +
                                            "border-gray-200/70 px-3 py-3 " +
                                            "flex-col gap-y-2 items-center " +
                                            "w-full justify-center"
                                        }
                                    >
                                        <div
                                            className={
                                                "flex items-center gap-x-10 " +
                                                "justify-between w-full"
                                            }
                                        >
                                            <div
                                                className={
                                                    "text-lg text-blue-500 " +
                                                    "font-bold max-w-5/6"
                                                }
                                            >
                                                {userJob.jobTitle}
                                            </div>

                                            <X
                                                size={20}
                                                className={
                                                    "hover:cursor-pointer " +
                                                    "absolute top-4 right-2 " +
                                                    "shrink-0 hover:opacity-50"
                                                }
                                                color="gray"
                                                onClick={() => {
                                                    void deleteJob(
                                                        userJob.jobId,
                                                    );
                                                }}
                                            />
                                        </div>

                                        <div
                                            className={
                                                "flex items-center w-full " +
                                                "text-xs justify-start text-black"
                                            }
                                        >
                                            {userJob.companyName +
                                                " • " +
                                                userJob.location}
                                        </div>

                                        <div
                                            className={
                                                "flex items-center justify-start " +
                                                "w-full gap-x-2"
                                            }
                                        >
                                            <div
                                                className={
                                                    "bg-black/10 rounded-md " +
                                                    "border border-black/15 " +
                                                    "shadow-xs text-center " +
                                                    "text-black/80 px-2 py-1"
                                                }
                                            >
                                                {userJob.jobType}
                                            </div>

                                            {userJob.jobPay && (
                                                <div
                                                    className={
                                                        "bg-blue-300/70 border " +
                                                        "border-blue-300/80 " +
                                                        "rounded-md shadow-xs " +
                                                        "text-center text-black/80 " +
                                                        "px-2 py-1"
                                                    }
                                                >
                                                    {userJob.jobPay}
                                                </div>
                                            )}
                                        </div>

                                        <div
                                            className={
                                                "text-black flex justify-center " +
                                                "items-center border-b mt-2 " +
                                                "border-black/10 w-full"
                                            }
                                        />

                                        <div
                                            className={
                                                "flex items-center w-full " +
                                                "justify-between"
                                            }
                                        >
                                            <div
                                                className={
                                                    "flex items-center " +
                                                    "justify-center gap-x-1 " +
                                                    "text-black/70"
                                                }
                                            >
                                                <Clock size={16}/>

                                                <p>
                                                    {hoursAgo}h ago
                                                </p>
                                            </div>

                                            <div
                                                className={
                                                    "flex items-center gap-x-1 " +
                                                    "justify-center text-blue-500 " +
                                                    "hover:cursor-pointer " +
                                                    "hover:opacity-80 transition " +
                                                    "duration-100"
                                                }
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        chrome.tabs.create({
                                                            url:
                                                                `${WEB_APP_URL}` +
                                                                "/dashboard",
                                                        })
                                                    }
                                                    className={
                                                        "uppercase " +
                                                        "hover:cursor-pointer " +
                                                        "font-semibold"
                                                    }
                                                >
                                                    View Details
                                                </button>

                                                <ArrowRightIcon
                                                    size={16}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                        {!loadingJobs &&
                            !jobsError &&
                            userJobs.length === 0 && (
                                <div
                                    className={
                                        "w-full rounded-md bg-white " +
                                        "px-4 py-6 text-center " +
                                        "text-black/60"
                                    }
                                >
                                    <p
                                        className={
                                            "font-semibold text-md " +
                                            "text-black"
                                        }
                                    >
                                        No synced jobs yet
                                    </p>

                                    <p className="text-sm">
                                        Open a SEEK job and press Sync
                                        to save it here.
                                    </p>
                                </div>
                            )}
                    </div>
                </div>
            ) : (
                <div
                    className={
                        "flex w-full justify-center items-center " +
                        "flex-col px-4 pt-10 gap-y-3"
                    }
                >
                    <div
                        className={
                            "text-black w-full items-center " +
                            "justify-start text-xl font-semibold"
                        }
                    >
                        Welcome back!
                    </div>

                    <div className="text-black/40 text-md">
                        Log in to sync your job listings and track
                        your career progression seamlessly
                    </div>

                    <button
                        type="button"
                        className={
                            "text-white w-full bg-linear-to-r " +
                            "from-blue-600 to-indigo-500 rounded-md " +
                            "py-3 hover:cursor-pointer text-md shadow-lg " +
                            "hover:opacity-90 hover:translate-y-0.5 " +
                            "transform duration-100 font-semibold"
                        }
                        onClick={() =>
                            chrome.tabs.create({
                                url: `${WEB_APP_URL}/login`,
                            })
                        }
                    >
                        Login
                    </button>
                </div>
            )}
        </div>
    );
}

export default App;
