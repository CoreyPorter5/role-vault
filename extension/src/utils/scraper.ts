import {ScrapedJobSchema, type ScrapedJobData} from "./types";
import {captureAppError} from "../../lib/sentry/captureAppError.ts";

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
            captureAppError({
                message: "Failed to scrape and validate schema of user job",
                error: result.error,
                area: "extension",
                action: "scrape_user_job",
                extra: {
                    jobId
                }
            })
            console.error(`SeekSync scraped job validation failed for job ${jobId}:`, result.error);
            return null;
        }

        return result.data;

    } catch (error) {
        captureAppError({
            message: "Unexpected error whilst scraping and validating schema of user job",
            error,
            area: "extension",
            action: "scrape_user_job",
            extra: {
                jobId
            }
        })
        console.error(`SeekSync encountered an error fetching job ${jobId}:`, error);
        return null;
    }
}