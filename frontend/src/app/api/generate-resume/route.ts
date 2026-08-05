import {NextResponse} from "next/server";
import type {Job} from "@/lib/types/types";
import {tailoredResumeSchema} from "@/app/api/generate-resume/schema";
import {captureAppError} from "@/lib/sentry/captureAppError";
import {
    assertGenerationBackendConfigured,
    completeGeneration,
    GenerationBackendError,
    refundGeneration,
    reserveGeneration,
    type GenerationAttemptResponse,
} from "@/lib/resume-generation/backend";
import {
    assertAIConfigured,
    generateResumeWithRepair,
    RESUME_GENERATION_MODEL,
    ResumeGenerationFailure,
} from "@/lib/resume-generation/generate";

type GenerateResumeBody = {
    jobID: string;
    generationID: string;
};

type GenerationContext = {
    resumePlaintext: string;
    job: Job;
};

export const maxDuration = 120;

export async function POST(request: Request) {
    const authHeader = request.headers.get("authorization") ?? "";
    if (!/^Bearer\s+\S+$/i.test(authHeader)) {
        return errorResponse(401, "UNAUTHENTICATED", "A valid authorization header is required");
    }

    const body = await parseRequestBody(request);
    if (body instanceof NextResponse) {
        return body;
    }

    try {
        // Configuration is checked before reserving a credit.
        assertGenerationBackendConfigured();
        assertAIConfigured();

        const contextResponse = await fetchGenerationContext(authHeader, body.jobID);
        if (contextResponse instanceof NextResponse) {
            return contextResponse;
        }

        const reservation = await reserveGeneration({
            authHeader,
            generationID: body.generationID,
            jobID: body.jobID,
            model: RESUME_GENERATION_MODEL,
        });

        const existingResponse = existingAttemptResponse(reservation);
        if (existingResponse) {
            return existingResponse;
        }

        let generated;
        try {
            generated = await generateResumeWithRepair(contextResponse);
        } catch (error) {
            const failure = error instanceof ResumeGenerationFailure
                ? error
                : new ResumeGenerationFailure({
                    code: "generation_failed",
                    safeDetail: "Resume generation failed unexpectedly.",
                    tokenUsage: {calls: []},
                    attemptCount: 0,
                    repairAttempted: false,
                    cause: error,
                });

            const refunded = await refundAfterFailure(authHeader, body.generationID, failure);
            captureAppError({
                message: "Resume generation failed and its credit was refunded",
                error: failure.cause ?? failure,
                area: "resume_generator_api",
                action: "generate_and_refund_resume",
                extra: {
                    generationId: body.generationID,
                    jobId: body.jobID,
                    failureCode: failure.code,
                    attemptCount: failure.attemptCount,
                    repairAttempted: failure.repairAttempted,
                },
            });
            return refunded
                ? errorResponse(500, "GENERATION_FAILED", "Resume generation failed. Your credit has been restored.")
                : errorResponse(503, "GENERATION_REFUND_PENDING", "Resume generation failed. Your credit refund is still being reconciled.");
        }

        let completed: GenerationAttemptResponse;
        try {
            completed = await completeGeneration({
                authHeader,
                generationID: body.generationID,
                resume: generated.resume,
                tokenUsage: generated.tokenUsage,
                attemptCount: generated.attemptCount,
                repairAttempted: generated.repairAttempted,
            });
        } catch (completionError) {
            const recovered = await recoverCompletedGeneration(authHeader, body);
            if (recovered) {
                return recovered;
            }

            const persistenceFailure = new ResumeGenerationFailure({
                code: "generation_persistence_failed",
                safeDetail: "The generated resume could not be stored.",
                tokenUsage: generated.tokenUsage,
                attemptCount: generated.attemptCount,
                repairAttempted: generated.repairAttempted,
                cause: completionError,
            });
            const refunded = await refundAfterFailure(authHeader, body.generationID, persistenceFailure);
            captureAppError({
                message: "Generated resume could not be persisted and its credit was refunded",
                error: completionError,
                area: "resume_generator_api",
                action: "persist_and_refund_resume",
                extra: {
                    generationId: body.generationID,
                    jobId: body.jobID,
                },
            });
            return refunded
                ? errorResponse(500, "GENERATION_PERSISTENCE_FAILED", "The resume could not be saved. Your credit has been restored.")
                : errorResponse(503, "GENERATION_REFUND_PENDING", "The resume could not be saved. Your credit refund is still being reconciled.");
        }

        return completedAttemptResponse(completed);
    } catch (error) {
        if (error instanceof GenerationBackendError) {
            return errorResponse(error.status, error.code, error.message);
        }
        if (error instanceof ResumeGenerationFailure && error.code === "generation_not_configured") {
            return errorResponse(503, "GENERATION_SERVICE_NOT_CONFIGURED", "Resume generation is temporarily unavailable");
        }

        captureAppError({
            message: "Unexpected error before resume generation was reserved",
            error,
            area: "resume_generator_api",
            action: "prepare_resume_generation",
            extra: {
                generationId: body.generationID,
                jobId: body.jobID,
            },
        });
        return errorResponse(500, "GENERATION_FAILED", "Failed to generate resume");
    }
}

async function parseRequestBody(request: Request): Promise<GenerateResumeBody | NextResponse> {
    let body: Partial<GenerateResumeBody>;
    try {
        body = await request.json() as Partial<GenerateResumeBody>;
    } catch {
        return errorResponse(400, "INVALID_REQUEST", "Invalid JSON body");
    }

    const jobID = typeof body.jobID === "string" ? body.jobID.trim() : "";
    const generationID = typeof body.generationID === "string" ? body.generationID.trim() : "";
    if (!jobID) {
        return errorResponse(400, "INVALID_JOB_ID", "jobID is required");
    }
    if (!isUUID(generationID)) {
        return errorResponse(400, "INVALID_GENERATION_ID", "generationID must be a UUID");
    }
    return {jobID, generationID};
}

async function fetchGenerationContext(authHeader: string, jobID: string): Promise<GenerationContext | NextResponse> {
    const apiBaseURL = (process.env.API_URL_PREFIX ?? process.env.NEXT_PUBLIC_API_URL_PREFIX ?? "").replace(/\/$/, "");
    const response = await fetch(`${apiBaseURL}/api/v1/resume-generation-context/${encodeURIComponent(jobID)}`, {
        method: "GET",
        cache: "no-store",
        headers: {"Authorization": authHeader},
    });
    if (!response.ok) {
        const errorText = await response.text();
        captureAppError({
            message: "Failed to fetch resume generation context",
            area: "resume_generator_api",
            action: "fetch_user_resume_context_for_generation",
            endpoint: `/api/v1/resume-generation-context/${jobID}`,
            status: response.status,
            statusText: response.statusText,
            extra: {jobId: jobID, errorText},
        });
        return errorResponse(response.status, "GENERATION_CONTEXT_FAILED", "Failed to load the resume generation context");
    }

    const context = await response.json() as GenerationContext;
    if (!context.resumePlaintext || !context.job) {
        return errorResponse(502, "INVALID_GENERATION_CONTEXT", "Resume generation context was incomplete");
    }
    return context;
}

function existingAttemptResponse(attempt: GenerationAttemptResponse): NextResponse | null {
    if (attempt.status === "succeeded") {
        return completedAttemptResponse(attempt);
    }
    if (attempt.status === "refunded") {
        return errorResponse(409, "GENERATION_REFUNDED", "This generation already failed and was refunded. Start a new generation.");
    }
    if (!attempt.created) {
        return NextResponse.json({
            code: "GENERATION_IN_PROGRESS",
            message: "This resume is still being generated",
            generation_id: attempt.generation_id,
            usage: attempt.usage,
        }, {status: 202});
    }
    return null;
}

function completedAttemptResponse(attempt: GenerationAttemptResponse) {
    const parsed = tailoredResumeSchema.safeParse(attempt.resume);
    if (!parsed.success) {
        throw new GenerationBackendError(502, "INVALID_STORED_RESUME", "Stored resume had an invalid format");
    }
    return NextResponse.json({
        generation_id: attempt.generation_id,
        resume: parsed.data,
        usage: attempt.usage,
    });
}

async function recoverCompletedGeneration(authHeader: string, body: GenerateResumeBody): Promise<NextResponse | null> {
    try {
        const attempt = await reserveGeneration({
            authHeader,
            generationID: body.generationID,
            jobID: body.jobID,
            model: RESUME_GENERATION_MODEL,
        });
        if (attempt.status === "succeeded") {
            return completedAttemptResponse(attempt);
        }
    } catch (error) {
        captureAppError({
            message: "Could not recover generation after an ambiguous completion response",
            error,
            area: "resume_generator_api",
            action: "recover_completed_generation",
            extra: {generationId: body.generationID, jobId: body.jobID},
        });
    }
    return null;
}

async function refundAfterFailure(authHeader: string, generationID: string, failure: ResumeGenerationFailure) {
    try {
        await refundGeneration({
            authHeader,
            generationID,
            failureCode: failure.code,
            failureDetail: failure.safeDetail,
            tokenUsage: failure.tokenUsage,
            attemptCount: failure.attemptCount,
            repairAttempted: failure.repairAttempted,
        });
        return true;
    } catch (refundError) {
        captureAppError({
            message: "Immediate resume generation refund failed; stale reconciliation will retry it",
            error: refundError,
            area: "resume_generator_api",
            action: "refund_failed_generation",
            extra: {generationId: generationID, failureCode: failure.code},
        });
        return false;
    }
}

function errorResponse(status: number, code: string, message: string) {
    return NextResponse.json({code, message}, {status});
}

function isUUID(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
