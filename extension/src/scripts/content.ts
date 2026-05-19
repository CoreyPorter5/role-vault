import scrapeJobFromCurrentPage from "../utils/scraper.ts";



let isAuthenticated = false;

function sanitizeHTML(jobDescription: string): string {
    const doc = new DOMParser().parseFromString(jobDescription, 'text/html');
    return doc.body.textContent || "";

}

function extractJobId(): string | null {
    const match = window.location.pathname.match(/^\/job\/(\d+)/);
    return match?.[1] ?? null
}


function extractCompanyImageUrl(): string | null {
    const imgElement = document.querySelector('[data-testid="bx-logo-image"] img') as HTMLImageElement | null;
    return imgElement?.src ?? null
}

function isSeekJobPage(): boolean {
    return /^\/job\/(\d+)/.test(window.location.pathname)
}

function getApplySaveButtonParentContainer(): HTMLElement | null {
    const applyButton = document.querySelector('[data-automation="job-detail-apply"]');
    if(!applyButton){
        return null
    }

    let current: HTMLElement | null = applyButton.parentElement;
    while(current){
        const saveButton = current.querySelector('[data-testid="jdv-savedjob"]')
        if(saveButton){
            return current
        }
        current = current.parentElement
    }
    return null

}


function runSeekSync() {

    if (!isAuthenticated) {
        return;
    }
    if (!isSeekJobPage()) {
        return;
    }

    if (document.querySelector('.seeksync-btn')) return;

    const jobId = extractJobId();
    if (!jobId) {
        return
    }

    const buttonContainer = getApplySaveButtonParentContainer()
    if (!buttonContainer) {
        return
    }

    const btn = document.createElement('button');
    btn.className = 'seeksync-btn';
    btn.innerText = 'Sync';

    buttonContainer.appendChild(btn)


    btn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        btn.disabled = true;
        btn.innerText = "Syncing ..."


        const companyLogo = extractCompanyImageUrl()
        const fullJobMetaData = scrapeJobFromCurrentPage(jobId, companyLogo)
        if (fullJobMetaData) {
            fullJobMetaData.jobDescription = sanitizeHTML(fullJobMetaData.jobDescription);
            chrome.runtime.sendMessage(
                {action: "SYNC_JOB", payload: fullJobMetaData}, (response) => {
                    if (response && response.success) {
                        btn.innerText = "Synced ✓"
                        btn.style.backgroundColor = "#10b981"
                    } else {
                        console.error("Failed to sync:", response.error)
                        if (response.status === 409) {
                            btn.innerText = "Already Synced"
                            btn.style.backgroundColor = "#ea8d12"
                        } else {
                            btn.innerText = "Failed"
                            btn.style.backgroundColor = "#e50808"
                        }
                    }
                    setTimeout(function () {
                        btn.innerText = "Sync"
                        btn.className = 'seeksync-btn'
                        btn.style.backgroundColor = ""
                        btn.disabled = false

                    }, 5000)
                }
            )

        } else if (!fullJobMetaData) {
            btn.innerText = "Failed";
            btn.style.backgroundColor = '#e50808'
            resetButtonLater(btn)
        }


    };


}

function resetButtonLater(btn: HTMLButtonElement) {
    setTimeout(() => {
        btn.innerText = "Sync"
        btn.className = "seeksync-btn";
        btn.style.backgroundColor = ""
        btn.disabled = false
    }, 5000)
}


function checkAuthStatus() {
    chrome.runtime.sendMessage({action: "GET_TOKEN"},
        (response) => {
            if (response && response.token) {
                isAuthenticated = true;
                runSeekSync()
            } else {
                isAuthenticated = false
            }
        })
}

let observerTimeout: number | null = null

const observer = new MutationObserver(() => {
    if (observerTimeout) {
        window.clearTimeout(observerTimeout)
    }
    observerTimeout = window.setTimeout(() => {
        runSeekSync();
    }, 300)

});


observer.observe(document.body, {
    childList: true,
    subtree: true
});


checkAuthStatus()

