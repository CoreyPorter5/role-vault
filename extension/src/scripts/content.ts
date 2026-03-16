import scrapeJob from "../utils/scraper.ts";



function runSeekSync() {
    const cards = document.querySelectorAll('div[data-search-sol-meta]'); //Search listing cards
    //const reccomendedCards = document.querySelectorAll('[data-automation="feedJobs"] > div'); //Reccomended listing card
    const superCards = [...cards];

    superCards.forEach(card => {
        if (card.querySelector('.seeksync-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'seeksync-btn';
        btn.innerText = 'Sync';



        // Find the title container to append to
        const titleContainer = card.querySelector('[data-automation="jobTitle"]')?.parentElement;
        if (titleContainer) {
            titleContainer.appendChild(btn);
        }

        btn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const meta = card.getAttribute('data-search-sol-meta');
            if(meta){
                const parsedMeta = JSON.parse(meta);
                const companyLogo: string | null = card.querySelector('[data-automation="company-logo"] img')?.getAttribute('src') ?? null;


                const fullJobMetaData= await scrapeJob(parsedMeta.jobId, companyLogo)
                console.log("Syncing Job:", fullJobMetaData);
            }



        };
    });
}


const observer = new MutationObserver(() => {
    // Every time the page content changes, run our function
    runSeekSync();
});


observer.observe(document.body, {
    childList: true,
    subtree: true
});


runSeekSync();