import type {TailoredResume} from "@/app/api/generate-resume/schema";

export type ResumeGenerationUsage = {
    used: number;
    limit: number;
    remaining: number;
    can_generate: boolean;
    period_start: string;
    period_end: string;
};

export type GenerationAttemptResponse = {
    generation_id: string;
    job_id: string;
    status: "reserved" | "succeeded" | "refunded";
    created: boolean;
    resume?: TailoredResume;
    failure_code?: string;
    attempt_count: number;
    repair_attempted: boolean;
    usage: ResumeGenerationUsage;
};

type ErrorResponse = {
    code?: string;
    message?: string;
};

export class GenerationBackendError extends Error {
    readonly status: number;
    readonly code: string;

    constructor(status: number, code: string, message: string) {
        super(message);
        this.name = "GenerationBackendError";
        this.status = status;
        this.code = code;
    }
}

export function assertGenerationBackendConfigured() {
    const secret = process.env.INTERNAL_API_SECRET;
    if (!secret || secret.length < 32) {
        throw new GenerationBackendError(
            503,
            "GENERATION_SERVICE_NOT_CONFIGURED",
            "Resume generation is temporarily unavailable",
        );
    }
    if (!getAPIBaseURL()) {
        throw new GenerationBackendError(
            503,
            "GENERATION_SERVICE_NOT_CONFIGURED",
            "Resume generation is temporarily unavailable",
        );
    }
}

export async function reserveGeneration(input: {
    authHeader: string;
    generationID: string;
    jobID: string;
    model: string;
}): Promise<GenerationAttemptResponse> {
    return requestGenerationBackend("/api/v1/internal/resume-generations/reserve", input.authHeader, {
        generation_id: input.generationID,
        job_id: input.jobID,
        model: input.model,
    });
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

async function requestGenerationBackend<T>(path: string, authHeader: string, body: unknown): Promise<T> {
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
                    "X-Seek-Sync-Internal-Key": secret,
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
            );
        }
        return {message: text};
    }
}

function getAPIBaseURL() {
    return (process.env.API_URL_PREFIX ?? process.env.NEXT_PUBLIC_API_URL_PREFIX ?? "").replace(/\/$/, "");
}
