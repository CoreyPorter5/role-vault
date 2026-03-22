import scrapeJob from "../utils/scraper.ts";




function sanitizeHTML(jobDescription: string): string{
    const doc = new DOMParser().parseFromString(jobDescription, 'text/html');
    return doc.body.textContent || "";

}

function extractJobId(card: Element): string | null {
    const metaStr = card.getAttribute('data-search-sol-meta');
    if (metaStr) {
        try {
            const meta = JSON.parse(metaStr);
            if (meta.jobId) return String(meta.jobId);
        } catch (e) {
            console.error("Failed to parse meta JSON", e);
        }
    }

    const jobLink = card.querySelector('a[href*="/job/"]');
    if (jobLink) {
        const href = jobLink.getAttribute('href') || '';
        const match = href.match(/\/job\/(\d+)/);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
}


function extractCompanyImageUrl(card: Element): string | null {
    const imgElement = card.querySelector('[data-automation="company-logo"] img, [data-automation="job-card-image"] img');
    return imgElement?.getAttribute('src') ?? null;
}




function runSeekSync() {
    const cards = document.querySelectorAll('div[data-search-sol-meta]');
    cards.forEach(card => {
        if (card.querySelector('.seeksync-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'seeksync-btn';
        btn.innerText = 'Sync';


        const titleContainer = card.querySelector('[data-automation="jobTitle"]')?.parentElement;
        if (titleContainer) {
            titleContainer.appendChild(btn);
        }

        btn.onclick = async (e) => {
            btn.innerText = "Syncing ..."
            e.preventDefault();
            e.stopPropagation();

            const jobId = extractJobId(card);
            if (jobId) {
                const companyLogo = extractCompanyImageUrl(card)
                const fullJobMetaData = await scrapeJob(jobId, companyLogo)
                if(fullJobMetaData){
                    fullJobMetaData.jobDescription = sanitizeHTML(fullJobMetaData.jobDescription);
                    chrome.runtime.sendMessage(
                        {action: "SYNC_JOB", payload: fullJobMetaData}, (response) => {
                            if(response && response.success){
                                btn.innerText = "Synced ✓"
                                btn.style.backgroundColor = "#10b981"
                            }else{
                                console.error("Failed to sync:", response.error)
                                if(response.status === 409){
                                    btn.innerText = "Already Synced"
                                    btn.style.backgroundColor = "#ea8d12"
                                }else{
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

                }

            }else{
                console.warn("Could not find job ID on this card")
            }


        };
    });
}


const observer = new MutationObserver(() => {
    runSeekSync();
});


observer.observe(document.body, {
    childList: true,
    subtree: true
});


runSeekSync();