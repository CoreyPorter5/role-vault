import type {TailoredResume} from "@/app/api/generate-resume/schema";
import type {ResumeCategory} from "@/lib/resume-generation/categories";

export type DocumentCreditUsage = {
    balance: number;
    promotional_balance: number;
    purchased_balance: number;
    can_generate: boolean;
    resumes_generated: number;
    cover_letters_generated: number;
};

export type ResumeGenerationUsage = DocumentCreditUsage;

export type GenerationAttemptResponse = {
    generation_id: string;
    job_id: string;
    status: "reserved" | "succeeded" | "refunded";
    created: boolean;
    resume?: TailoredResume;
    failure_code?: string;
    attempt_count: number;
    repair_attempted: boolean;
    resume_category: ResumeCategory;
    profile_version: number;
    template_version: string;
    usage: ResumeGenerationUsage;
};

export type JobResumeCategoryResponse = {
    job_id: string;
    status: "unclassified" | "classifying" | "classified" | "failed";
    category: ResumeCategory | null;
    source: "ai" | "user" | null;
    confidence: number | null;
    classifier_model?: string;
    classifier_version?: number;
    failure_code?: string;
    claimed?: boolean;
    job_title?: string;
    job_description?: string;
};

type ErrorResponse = {
    code?: string;
    message?: string;
};

export type GenerationBackendErrorSource =
    | "configuration"
    | "response"
    | "transport"
    | "invalid_response"
    | "local_validation";

export class GenerationBackendError extends Error {
    readonly status: number;
    readonly code: string;
    readonly source: GenerationBackendErrorSource;

    constructor(
        status: number,
        code: string,
        message: string,
        source: GenerationBackendErrorSource = "local_validation",
    ) {
        super(message);
        this.name = "GenerationBackendError";
        this.status = status;
        this.code = code;
        this.source = source;
    }
}

export function isGenerationBackendContractFailure(error: GenerationBackendError): boolean {
    return error.source === "response" &&
        error.status === 400 &&
        error.code.startsWith("INVALID_");
}

export function assertGenerationBackendConfigured() {
    const secret = process.env.INTERNAL_API_SECRET;
    if (!secret || secret.length < 32) {
        throw new GenerationBackendError(
            503,
            "GENERATION_SERVICE_NOT_CONFIGURED",
            "Resume generation is temporarily unavailable",
            "configuration",
        );
    }
    if (!getAPIBaseURL()) {
        throw new GenerationBackendError(
            503,
            "GENERATION_SERVICE_NOT_CONFIGURED",
            "Resume generation is temporarily unavailable",
            "configuration",
        );
    }
}

export async function reserveGeneration(input: {
    authHeader: string;
    generationID: string;
    jobID: string;
    model: string;
    resumeCategory: ResumeCategory;
    profileVersion: number;
    templateVersion: string;
}): Promise<GenerationAttemptResponse> {
    return requestGenerationBackend("/api/v1/internal/resume-generations/reserve", input.authHeader, {
        generation_id: input.generationID,
        job_id: input.jobID,
        model: input.model,
        resume_category: input.resumeCategory,
        profile_version: input.profileVersion,
        template_version: input.templateVersion,
    });
}

export async function claimJobResumeCategory(input: {
    authHeader: string;
    jobID: string;
    classifierModel: string;
    classifierVersion: number;
}): Promise<JobResumeCategoryResponse> {
    return requestGenerationBackend(
        `/api/v1/internal/job-resume-categories/${encodeURIComponent(input.jobID)}/claim`,
        input.authHeader,
        {
            classifier_model: input.classifierModel,
            classifier_version: input.classifierVersion,
        },
    );
}

export async function completeJobResumeCategory(input: {
    authHeader: string;
    jobID: string;
    category: ResumeCategory;
    confidence: number;
}): Promise<JobResumeCategoryResponse> {
    return requestGenerationBackend(
        `/api/v1/internal/job-resume-categories/${encodeURIComponent(input.jobID)}/complete`,
        input.authHeader,
        {
            category: input.category,
            confidence: input.confidence,
        },
    );
}

export async function failJobResumeCategory(input: {
    authHeader: string;
    jobID: string;
    failureCode: string;
    confidence?: number;
}): Promise<JobResumeCategoryResponse> {
    return requestGenerationBackend(
        `/api/v1/internal/job-resume-categories/${encodeURIComponent(input.jobID)}/fail`,
        input.authHeader,
        {
            failure_code: input.failureCode,
            ...(input.confidence === undefined ? {} : {confidence: input.confidence}),
        },
    );
}

export async function completeGeneration(input: {
    authHeader: string;
    generationID: string;
    resume: TailoredResume;
    tokenUsage: unknown;
    attemptCount: number;
    repairAttempted: boolean;
}): Promise<GenerationAttemptResponse> {
    return requestGenerationBackend(
        `/api/v1/internal/resume-generations/${input.generationID}/complete`,
        input.authHeader,
        {
            resume: input.resume,
            token_usage: input.tokenUsage,
            attempt_count: input.attemptCount,
            repair_attempted: input.repairAttempted,
        },
    );
}

export async function refundGeneration(input: {
    authHeader: string;
    generationID: string;
    failureCode: string;
    failureDetail: string;
    tokenUsage: unknown;
    attemptCount: number;
    repairAttempted: boolean;
}): Promise<GenerationAttemptResponse> {
    return requestGenerationBackend(
        `/api/v1/internal/resume-generations/${input.generationID}/fail`,
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

export async function requestGenerationBackend<T>(path: string, authHeader: string, body: unknown): Promise<T> {
    assertGenerationBackendConfigured();
    const secret = process.env.INTERNAL_API_SECRET!;
    const url = `${getAPIBaseURL()}${path}`;

    let lastNetworkError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const response = await fetch(url, {
                method: "POST",
                cache: "no-store",
                headers: {
                    "Authorization": authHeader,
                    "Content-Type": "application/json",
                    "X-RoleVault-Internal-Key": secret,
                },
                body: JSON.stringify(body),
            });

            const payload = await readJSON(response);
            if (response.ok) {
                return payload as T;
            }

            const errorPayload = payload as ErrorResponse;
            const backendError = new GenerationBackendError(
                response.status,
                errorPayload.code ?? "GENERATION_BACKEND_ERROR",
                errorPayload.message ?? "Resume generation request failed",
                "response",
            );
            if (response.status < 500 || attempt === 1) {
                throw backendError;
            }
            lastNetworkError = backendError;
        } catch (error) {
            if (error instanceof GenerationBackendError && (error.status < 500 || attempt === 1)) {
                throw error;
            }
            lastNetworkError = error;
        }
    }

    throw new GenerationBackendError(
        503,
        "GENERATION_BACKEND_UNAVAILABLE",
        lastNetworkError instanceof Error ? lastNetworkError.message : "Resume generation service is unavailable",
        "transport",
    );
}

async function readJSON(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) {
        return {};
    }
    try {
        return JSON.parse(text);
    } catch {
        if (response.ok) {
            throw new GenerationBackendError(
                502,
                "INVALID_GENERATION_BACKEND_RESPONSE",
                "Resume generation service returned an invalid response",
                "invalid_response",
            );
        }
        return {message: text};
    }
}

function getAPIBaseURL() {
    return (process.env.API_URL_PREFIX ?? process.env.NEXT_PUBLIC_API_URL_PREFIX ?? "").replace(/\/$/, "");
}
