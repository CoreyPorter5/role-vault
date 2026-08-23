import {ScrapedJobSchema, type ScrapedJobData} from "./types";
import {reportContentDiagnostic} from "./contentDiagnostics.ts";

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
            reportContentDiagnostic("EXT_CONTENT_SEEK_SCHEMA");
            console.error("RoleVault scraped job validation failed.");
            return null;
        }

        return result.data;

    } catch (error) {
        void error;
        reportContentDiagnostic("EXT_CONTENT_SCRAPE_UNEXPECTED");
        console.error("RoleVault encountered an unexpected scraping error.");
        return null;
    }
}
