/// <reference types="chrome" />

import scrapeJobFromCurrentPage from "../utils/scraper.ts";
import {reportContentDiagnostic} from "../utils/contentDiagnostics.ts";
import {
    extractSeekJobIdFromPath,
    isApplyHrefForJob,
} from "../utils/seekNavigation.ts";

const BUTTON_SELECTOR = ".seeksync-btn";
const BUTTON_JOB_ID_ATTRIBUTE = "data-seeksync-job-id";
type SyncButtonState = "idle" | "loading" | "success" | "duplicate" | "error";

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
    state: SyncButtonState = "idle",
): void {
    if (!button.isConnected) {
        return;
    }

    button.innerText = label;
    button.dataset.state = state;
    button.setAttribute("aria-busy", state === "loading" ? "true" : "false");
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

        updateButton(button, "Sync to SeekSync");
        button.disabled = false;
    }, 5000);
}

function createSyncButton(jobId: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "seeksync-btn";
    button.setAttribute(BUTTON_JOB_ID_ATTRIBUTE, jobId);
    button.setAttribute("aria-live", "polite");
    updateButton(button, "Sync to SeekSync");

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
        updateButton(button, "Syncing…", "loading");

        try {
            const companyLogo = extractCompanyImageUrl();
            const metadata = scrapeJobFromCurrentPage(
                currentJobId,
                companyLogo,
            );

            if (!metadata) {
                updateButton(button, "Failed", "error");
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
                        updateButton(button, "Failed", "error");
                        resetButtonLater(button, currentJobId);
                        return;
                    }

                    if (response?.success) {
                        updateButton(button, "Synced", "success");
                    } else if (response?.status === 409) {
                        updateButton(
                            button,
                            "Already synced",
                            "duplicate",
                        );
                    } else {
                        updateButton(button, "Failed", "error");
                    }

                    resetButtonLater(button, currentJobId);
                },
            );
        } catch (error) {
            void error;
            reportContentDiagnostic("EXT_CONTENT_SYNC_UNEXPECTED");
            updateButton(button, "Failed", "error");
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
