/// <reference types="chrome" />

import {captureAppError} from "../../lib/sentry/captureAppError.ts";
import scrapeJobFromCurrentPage from "../utils/scraper.ts";
import {
    extractSeekJobIdFromPath,
    isApplyHrefForJob,
} from "../utils/seekNavigation.ts";

const BUTTON_SELECTOR = ".seeksync-btn";
const BUTTON_JOB_ID_ATTRIBUTE = "data-seeksync-job-id";

let isAuthenticated = false;
let observerTimeout: number | null = null;

function sanitizeHTML(jobDescription: string): string {
    const doc = new DOMParser().parseFromString(
        jobDescription,
        "text/html",
    );

    return doc.body.textContent || "";
}

function extractJobId(): string | null {
    return extractSeekJobIdFromPath(window.location.pathname);
}

function extractCompanyImageUrl(): string | null {
    const image = document.querySelector<HTMLImageElement>(
        '[data-testid="bx-logo-image"] img',
    );

    return image?.src ?? null;
}

function getApplySaveButtonParentContainer(
    jobId: string,
): HTMLElement | null {
    const applyButton = document.querySelector<HTMLAnchorElement>(
        '[data-automation="job-detail-apply"]',
    );

    if (
        !applyButton ||
        !isApplyHrefForJob(applyButton.getAttribute("href"), jobId)
    ) {
        return null;
    }

    let current = applyButton.parentElement;

    while (current) {
        if (current.querySelector('[data-testid="jdv-savedjob"]')) {
            return current;
        }

        current = current.parentElement;
    }

    return null;
}

function removeInjectedButtons(): void {
    document.querySelectorAll(BUTTON_SELECTOR).forEach((button) => {
        button.remove();
    });
}

function updateButton(
    button: HTMLButtonElement,
    label: string,
    backgroundColor = "",
): void {
    if (!button.isConnected) {
        return;
    }

    button.innerText = label;
    button.style.backgroundColor = backgroundColor;
}

function resetButtonLater(
    button: HTMLButtonElement,
    expectedJobId: string,
): void {
    window.setTimeout(() => {
        if (
            !button.isConnected ||
            button.dataset.seeksyncJobId !== expectedJobId ||
            extractJobId() !== expectedJobId
        ) {
            return;
        }

        updateButton(button, "Sync");
        button.disabled = false;
    }, 5000);
}

function createSyncButton(jobId: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "seeksync-btn";
    button.setAttribute(BUTTON_JOB_ID_ATTRIBUTE, jobId);
    button.innerText = "Sync";

    button.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const currentJobId = extractJobId();

        if (
            !currentJobId ||
            currentJobId !== button.dataset.seeksyncJobId
        ) {
            removeInjectedButtons();
            scheduleReconciliation(0);
            return;
        }

        button.disabled = true;
        updateButton(button, "Syncing ...");

        try {
            const companyLogo = extractCompanyImageUrl();
            const metadata = scrapeJobFromCurrentPage(
                currentJobId,
                companyLogo,
            );

            if (!metadata) {
                captureAppError({
                    message: "Failed to scrape job metadata from SEEK page",
                    area: "extension_content_script",
                    action: "scrape_seek_job_page",
                    extra: {
                        jobId: currentJobId,
                        url: window.location.href,
                        hasCompanyLogo: Boolean(companyLogo),
                    },
                });
                updateButton(button, "Failed", "#e50808");
                resetButtonLater(button, currentJobId);
                return;
            }

            metadata.jobDescription = sanitizeHTML(
                metadata.jobDescription,
            );

            chrome.runtime.sendMessage(
                {action: "SYNC_JOB", payload: metadata},
                (response) => {
                    if (chrome.runtime.lastError) {
                        captureAppError({
                            message: "Failed to send sync job message from content script",
                            area: "extension_content_script",
                            action: "send_sync_job_message",
                            extra: {
                                error: chrome.runtime.lastError.message,
                                jobId: currentJobId,
                                url: window.location.href,
                            },
                        });
                        updateButton(button, "Failed", "#e50808");
                        resetButtonLater(button, currentJobId);
                        return;
                    }

                    if (response?.success) {
                        updateButton(button, "Synced ✓", "#10b981");
                    } else if (response?.status === 409) {
                        updateButton(
                            button,
                            "Already Synced",
                            "#ea8d12",
                        );
                    } else {
                        updateButton(button, "Failed", "#e50808");
                    }

                    resetButtonLater(button, currentJobId);
                },
            );
        } catch (error) {
            captureAppError({
                message: "Unexpected error while syncing job from content script",
                error,
                area: "extension_content_script",
                action: "sync_job_button_click",
                extra: {
                    jobId: currentJobId,
                    url: window.location.href,
                },
            });
            console.error("Unable to sync the SEEK job.");
            updateButton(button, "Failed", "#e50808");
            resetButtonLater(button, currentJobId);
        }
    });

    return button;
}

function reconcileSeekPage(): void {
    const jobId = extractJobId();
    const existingButtons = Array.from(
        document.querySelectorAll<HTMLButtonElement>(BUTTON_SELECTOR),
    );

    if (!isAuthenticated || !jobId) {
        removeInjectedButtons();
        return;
    }

    const currentButton = existingButtons.find(
        (button) => button.dataset.seeksyncJobId === jobId,
    );

    for (const button of existingButtons) {
        if (button !== currentButton) {
            button.remove();
        }
    }

    if (currentButton) {
        return;
    }

    const container = getApplySaveButtonParentContainer(jobId);

    if (!container) {
        return;
    }

    container.appendChild(createSyncButton(jobId));
}

function scheduleReconciliation(delay = 150): void {
    if (observerTimeout !== null) {
        window.clearTimeout(observerTimeout);
    }

    observerTimeout = window.setTimeout(() => {
        observerTimeout = null;
        reconcileSeekPage();
    }, delay);
}

function checkAuthStatus(): void {
    chrome.runtime.sendMessage(
        {action: "CHECK_AUTH"},
        (response) => {
            if (chrome.runtime.lastError) {
                captureAppError({
                    message: "Failed to check auth status from content script",
                    area: "extension_content_script",
                    action: "check_auth_status",
                    extra: {
                        error: chrome.runtime.lastError.message,
                        url: window.location.href,
                    },
                });
                isAuthenticated = false;
                removeInjectedButtons();
                return;
            }

            isAuthenticated = Boolean(response?.authenticated);
            reconcileSeekPage();
        },
    );
}

chrome.runtime.onMessage.addListener((request) => {
    if (request?.action !== "SEEK_NAVIGATION_CHANGED") {
        return;
    }

    removeInjectedButtons();
    checkAuthStatus();
});

const observer = new MutationObserver(() => {
    scheduleReconciliation();
});

observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
});

checkAuthStatus();
