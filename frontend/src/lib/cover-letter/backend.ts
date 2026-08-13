import type {CoverLetter} from "@/lib/cover-letter/schema";
import {
    requestGenerationBackend,
    type ResumeGenerationUsage,
} from "@/lib/resume-generation/backend";

export type CoverLetterAttemptResponse = {
    generation_id: string;
    job_id: string;
    status: "reserved" | "succeeded" | "refunded";
    created: boolean;
    cover_letter?: CoverLetter;
    failure_code?: string;
    attempt_count: number;
    repair_attempted: boolean;
    template_version: string;
    usage: ResumeGenerationUsage;
};

export function reserveCoverLetterGeneration(input: {
    authHeader: string;
    generationID: string;
    jobID: string;
    model: string;
    templateVersion: string;
}) {
    return requestGenerationBackend<CoverLetterAttemptResponse>(
        "/api/v1/internal/cover-letter-generations/reserve",
        input.authHeader,
        {
            generation_id: input.generationID,
            job_id: input.jobID,
            model: input.model,
            template_version: input.templateVersion,
        },
    );
}

export function completeCoverLetterGeneration(input: {
    authHeader: string;
    generationID: string;
    coverLetter: CoverLetter;
    tokenUsage: unknown;
    attemptCount: number;
    repairAttempted: boolean;
}) {
    return requestGenerationBackend<CoverLetterAttemptResponse>(
        `/api/v1/internal/cover-letter-generations/${input.generationID}/complete`,
        input.authHeader,
        {
            cover_letter: input.coverLetter,
            token_usage: input.tokenUsage,
            attempt_count: input.attemptCount,
            repair_attempted: input.repairAttempted,
        },
    );
}

export function refundCoverLetterGeneration(input: {
    authHeader: string;
    generationID: string;
    failureCode: string;
    failureDetail: string;
    tokenUsage: unknown;
    attemptCount: number;
    repairAttempted: boolean;
}) {
    return requestGenerationBackend<CoverLetterAttemptResponse>(
        `/api/v1/internal/cover-letter-generations/${input.generationID}/fail`,
        input.authHeader,
        {
            failure_code: input.failureCode,
            failure_detail: input.failureDetail,
            token_usage: input.tokenUsage,
            attempt_count: input.attemptCount,
            repair_attempted: input.repairAttempted,
        },
    );
}
