import { ScrapedJobSchema, type ScrapedJobData } from "./types";

export default async function scrapeJob(jobId: string, companyLogo: string | null): Promise<ScrapedJobData | null> {
    const jobUrl = `https://au.seek.com/job/${jobId}`;

    try {

        const response = await fetch(jobUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch job page: ${response.statusText}`);
        }

        const htmlString = await response.text();

        const parser = new DOMParser();
        const virtualDoc = parser.parseFromString(htmlString, 'text/html');


        const getText = (selector: string) => virtualDoc.querySelector(selector)?.textContent?.trim() || "";



        const data = {
            jobId: jobId,
            jobTitle: getText('[data-automation="job-detail-title"]'),
            companyLogo: companyLogo,
            companyName: getText('[data-automation="advertiser-name"]'),

            jobPay: getText('[data-automation="job-detail-salary"]') || null,
            jobDescription: virtualDoc.querySelector('[data-automation="jobAdDetails"]')?.innerHTML || "",

            location: getText('[data-automation="job-detail-location"]'),
            jobType: getText('[data-automation="job-detail-work-type"]'),
            dataSynced: new Date()
        };


        const result = ScrapedJobSchema.safeParse(data);

        if (!result.success) {
            console.error(`SeekSync Validation Failed for Job ${jobId}:`, result.error);
            return null;
        }

        return result.data;

    } catch (err) {
        console.error(`SeekSync encountered an error fetching job ${jobId}:`, err);
        return null;
    }
}