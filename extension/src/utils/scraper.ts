import { ScrapedJobSchema, type ScrapedJobData } from "./types";

export default function scrapeJobFromCurrentPage(jobId: string, companyLogo: string | null): ScrapedJobData | null {


    try {

        const getText = (selector: string) => document.querySelector(selector)?.textContent?.trim() || "";


        const data = {
            jobId: jobId,
            jobTitle: getText('[data-automation="job-detail-title"]'),
            companyLogo: companyLogo,
            companyName: getText('[data-automation="advertiser-name"]'),

            jobPay: getText('[data-automation="job-detail-salary"]') || null,
            jobDescription: document.querySelector('[data-automation="jobAdDetails"]')?.innerHTML || "",

            location: getText('[data-automation="job-detail-location"]'),
            jobType: getText('[data-automation="job-detail-work-type"]') || undefined,
            dateSynced: new Date()
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