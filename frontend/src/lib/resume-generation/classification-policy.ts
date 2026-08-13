export const JOB_CLASSIFICATION_CONFIDENCE_THRESHOLD = 0.72;

export type JobClassificationFailureCode =
    | "low_confidence"
    | "classification_failed"
    | "incomplete_job_listing";

export function isJobClassificationConfident(confidence: number): boolean {
    return confidence >= JOB_CLASSIFICATION_CONFIDENCE_THRESHOLD;
}

export function getJobClassificationFailureNotice(failureCode: string | null): string {
    switch (failureCode) {
        case "low_confidence":
            return "We could not confidently identify this job type. Choose the closest option below.";
        case "incomplete_job_listing":
            return "This listing does not include enough detail to identify the job type. Choose the closest option below.";
        case "classification_failed":
        default:
            return "Automatic job classification is temporarily unavailable. Choose a job type to continue.";
    }
}
