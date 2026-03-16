import scrapeJob from "../utils/scraper.ts";


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
            e.preventDefault();
            e.stopPropagation();
            const jobId = extractJobId(card);
            if (jobId) {
                const companyLogo = extractCompanyImageUrl(card)
                btn.innerText = "Syncing ..."
                const fullJobMetaData = await scrapeJob(jobId, companyLogo)
                if(fullJobMetaData){
                    console.log("Syncing Job:", JSON.stringify(fullJobMetaData, null, 2));
                    btn.innerText = "Synced ✓"

                }else{
                    btn.innerText = "Failed"
                }

            }else{
                console.warn("Could not find job ID on thios card")
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