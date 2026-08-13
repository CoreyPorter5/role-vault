import {NextResponse} from "next/server";
import type {Job} from "@/lib/types/types";
import type {TailoredResume} from "@/app/api/generate-resume/schema";
import {captureAppError} from "@/lib/sentry/captureAppError";
import {
    assertGenerationBackendConfigured,
    GenerationBackendError,
    isGenerationBackendContractFailure,
} from "@/lib/resume-generation/backend";
import {
    completeCoverLetterGeneration,
    refundCoverLetterGeneration,
    reserveCoverLetterGeneration,
    type CoverLetterAttemptResponse,
} from "@/lib/cover-letter/backend";
import {
    assertCoverLetterAIConfigured,
    COVER_LETTER_GENERATION_MODEL,
    CoverLetterGenerationFailure,
    generateCoverLetterWithRepair,
} from "@/lib/cover-letter/generate";
import {
    COVER_LETTER_TEMPLATE_VERSION,
    coverLetterQualityIssues,
    coverLetterSchema,
} from "@/lib/cover-letter/schema";

type GenerateCoverLetterBody = {
    jobID: string;
    generationID: string;
    emphasisNote: string;
};

type GenerationContext = {
    resumePlaintext: string;
    job: Job;
    tailoredResume?: TailoredResume | null;
};

export const maxDuration = 120;

export async function POST(request: Request) {
    const authHeader = request.headers.get("authorization") ?? "";
    if (!/^Bearer\s+\S+$/i.test(authHeader)) {
        return errorResponse(401, "UNAUTHENTICATED", "A valid authorization header is required");
    }

    const body = await parseRequestBody(request);
    if (body instanceof NextResponse) return body;

    try {
        assertGenerationBackendConfigured();
        assertCoverLetterAIConfigured();

        const context = await fetchGenerationContext(authHeader, body.jobID);
        if (context instanceof NextResponse) return context;

        const reservation = await reserveCoverLetterGeneration({
            authHeader,
            generationID: body.generationID,
            jobID: body.jobID,
            model: COVER_LETTER_GENERATION_MODEL,
            templateVersion: COVER_LETTER_TEMPLATE_VERSION,
        });
        const existing = existingAttemptResponse(reservation);
        if (existing) return existing;

        let generated;
        try {
            generated = await generateCoverLetterWithRepair(context, body.emphasisNote);
        } catch (error) {
            const failure = error instanceof CoverLetterGenerationFailure
                ? error
                : new CoverLetterGenerationFailure({
                    code: "generation_failed",
                    safeDetail: "Cover letter generation failed unexpectedly.",
                    tokenUsage: {calls: []},
                    attemptCount: 0,
                    repairAttempted: false,
                    cause: error,
                });
            const refunded = await refundAfterFailure(authHeader, body.generationID, failure);
            captureAppError({
                code: "WEB_COVER_LETTER_GENERATION_PROVIDER_FAILED",
                message: "Cover letter generation failed and its credit was refunded",
                error: safeTrackedError("CoverLetterGenerationFailure", failure.safeDetail),
                area: "cover_letter_generator_api",
                action: "generate_and_refund_cover_letter",
                extra: {
                    failureCode: failure.code,
                    attemptCount: failure.attemptCount,
                    repairAttempted: failure.repairAttempted,
                },
            });
            return refunded
                ? errorResponse(500, "GENERATION_FAILED", "Cover letter generation failed. Your credit has been restored.")
                : errorResponse(503, "GENERATION_REFUND_PENDING", "Cover letter generation failed. Your credit refund is still being reconciled.");
        }

        try {
            const completed = await completeCoverLetterGeneration({
                authHeader,
                generationID: body.generationID,
                coverLetter: generated.coverLetter,
                tokenUsage: generated.tokenUsage,
                attemptCount: generated.attemptCount,
                repairAttempted: generated.repairAttempted,
            });
            return completedAttemptResponse(completed);
        } catch (completionError) {
            const recovered = await recoverCompletedGeneration(authHeader, body);
            if (recovered) return recovered;

            const failure = new CoverLetterGenerationFailure({
                code: "generation_persistence_failed",
                safeDetail: "The generated cover letter could not be stored.",
                tokenUsage: generated.tokenUsage,
                attemptCount: generated.attemptCount,
                repairAttempted: generated.repairAttempted,
                cause: completionError,
            });
            const refunded = await refundAfterFailure(authHeader, body.generationID, failure);
            captureAppError({
                code: "WEB_COVER_LETTER_GENERATION_PERSIST_FAILED",
                message: "Generated cover letter could not be persisted",
                error: safeTrackedError("CoverLetterPersistenceFailure", "Cover letter persistence failed"),
                area: "cover_letter_generator_api",
                action: "persist_and_refund_cover_letter",
                extra: {
                    upstreamErrorCode: completionError instanceof GenerationBackendError
                        ? completionError.code
                        : undefined,
                },
            });
            return refunded
                ? errorResponse(500, "GENERATION_PERSISTENCE_FAILED", "The cover letter could not be saved. Your credit has been restored.")
                : errorResponse(503, "GENERATION_REFUND_PENDING", "The cover letter could not be saved. Your credit refund is still being reconciled.");
        }
    } catch (error) {
        if (error instanceof GenerationBackendError) {
            const contractFailure = isGenerationBackendContractFailure(error);
            if (error.source !== "response" || contractFailure) {
                captureAppError({
                    code: "WEB_COVER_LETTER_GENERATION_BACKEND_FAILED",
                    message: "Cover letter generation backend request failed",
                    error: safeTrackedError("GenerationBackendError", "Cover letter backend request failed"),
                    area: "cover_letter_generator_api",
                    action: "call_generation_backend",
                    status: error.status,
                    forceCapture: contractFailure,
                    extra: {upstreamErrorCode: error.code},
                });
            }
            return errorResponse(error.status, error.code, error.message);
        }
        if (error instanceof CoverLetterGenerationFailure && error.code === "generation_not_configured") {
            captureAppError({
                code: "WEB_COVER_LETTER_GENERATION_CONFIG_MISSING",
                message: "Cover letter generation is not configured",
                error: safeTrackedError("CoverLetterConfigurationError", "Cover letter generation is not configured"),
                area: "cover_letter_generator_api",
                action: "validate_generation_config",
                status: 503,
            });
            return errorResponse(503, "GENERATION_SERVICE_NOT_CONFIGURED", "Cover letter generation is temporarily unavailable");
        }
        captureAppError({
            code: "WEB_COVER_LETTER_GENERATION_PREPARE_FAILED",
            message: "Unexpected error before cover letter generation was reserved",
            error: safeTrackedError("CoverLetterPreparationError", "Cover letter generation preparation failed"),
            area: "cover_letter_generator_api",
            action: "prepare_cover_letter_generation",
        });
        return errorResponse(500, "GENERATION_FAILED", "Failed to generate cover letter");
    }
}

async function parseRequestBody(request: Request): Promise<GenerateCoverLetterBody | NextResponse> {
    let body: Partial<GenerateCoverLetterBody>;
    try {
        body = await request.json() as Partial<GenerateCoverLetterBody>;
    } catch {
        return errorResponse(400, "INVALID_REQUEST", "Invalid JSON body");
    }
    const jobID = typeof body.jobID === "string" ? body.jobID.trim() : "";
    const generationID = typeof body.generationID === "string" ? body.generationID.trim() : "";
    const emphasisNote = typeof body.emphasisNote === "string" ? body.emphasisNote.trim() : "";
    if (!jobID) return errorResponse(400, "INVALID_JOB_ID", "jobID is required");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(generationID)) {
        return errorResponse(400, "INVALID_GENERATION_ID", "generationID must be a UUID");
    }
    if (emphasisNote.length > 800) {
        return errorResponse(400, "INVALID_CANDIDATE_NOTE", "The optional note must not exceed 800 characters");
    }
    return {jobID, generationID, emphasisNote};
}

async function fetchGenerationContext(authHeader: string, jobID: string): Promise<GenerationContext | NextResponse> {
    const base = (process.env.API_URL_PREFIX ?? process.env.NEXT_PUBLIC_API_URL_PREFIX ?? "").replace(/\/$/, "");
    const response = await fetch(`${base}/api/v1/cover-letter-generation-context/${encodeURIComponent(jobID)}`, {
        cache: "no-store",
        headers: {Authorization: authHeader},
    });
    if (!response.ok) {
        if (response.status >= 500) {
            captureAppError({
                code: "WEB_COVER_LETTER_CONTEXT_LOAD_FAILED",
                message: "Failed to load cover letter generation context",
                error: safeTrackedError("CoverLetterContextError", "Cover letter context request failed"),
                area: "cover_letter_generator_api",
                action: "load_generation_context",
                endpoint: "/api/v1/cover-letter-generation-context/:jobId",
                status: response.status,
                statusText: response.statusText,
            });
        }
        return errorResponse(response.status, "GENERATION_CONTEXT_FAILED", "Failed to load the cover letter context");
    }
    const context = await response.json() as GenerationContext;
    if (!context.resumePlaintext || !context.job) {
        captureAppError({
            code: "WEB_COVER_LETTER_CONTEXT_INVALID",
            message: "Cover letter generation context was incomplete",
            error: safeTrackedError("CoverLetterContextValidationError", "Cover letter context was incomplete"),
            area: "cover_letter_generator_api",
            action: "validate_generation_context",
            endpoint: "/api/generate-cover-letter",
            status: 502,
        });
        return errorResponse(502, "INVALID_GENERATION_CONTEXT", "Cover letter context was incomplete");
    }
    return context;
}

function existingAttemptResponse(attempt: CoverLetterAttemptResponse) {
    if (attempt.status === "succeeded") return completedAttemptResponse(attempt);
    if (attempt.status === "refunded") {
        return errorResponse(409, "GENERATION_REFUNDED", "This generation already failed and was refunded. Start a new generation.");
    }
    if (!attempt.created) {
        return NextResponse.json({
            code: "GENERATION_IN_PROGRESS",
            message: "This cover letter is still being generated",
            generation_id: attempt.generation_id,
            usage: attempt.usage,
        }, {status: 202});
    }
    return null;
}

function completedAttemptResponse(attempt: CoverLetterAttemptResponse) {
    if (attempt.template_version !== COVER_LETTER_TEMPLATE_VERSION) {
        throw new GenerationBackendError(502, "INVALID_STORED_COVER_LETTER_TEMPLATE", "Stored cover letter used an unsupported template");
    }
    const parsed = coverLetterSchema.safeParse(attempt.cover_letter);
    if (!parsed.success || coverLetterQualityIssues(parsed.data).length > 0) {
        throw new GenerationBackendError(502, "INVALID_STORED_COVER_LETTER", "Stored cover letter had an invalid format");
    }
    return NextResponse.json({
        generation_id: attempt.generation_id,
        coverLetter: parsed.data,
        templateVersion: attempt.template_version,
        usage: attempt.usage,
    });
}

async function recoverCompletedGeneration(authHeader: string, body: GenerateCoverLetterBody) {
    try {
        const attempt = await reserveCoverLetterGeneration({
            authHeader,
            generationID: body.generationID,
            jobID: body.jobID,
            model: COVER_LETTER_GENERATION_MODEL,
            templateVersion: COVER_LETTER_TEMPLATE_VERSION,
        });
        if (attempt.status === "succeeded") return completedAttemptResponse(attempt);
    } catch (error) {
        captureAppError({
            code: "WEB_COVER_LETTER_GENERATION_RECOVERY_FAILED",
            message: "Could not recover an ambiguous cover letter completion",
            error: safeTrackedError("CoverLetterRecoveryError", "Cover letter recovery failed"),
            area: "cover_letter_generator_api",
            action: "recover_completed_generation",
            status: error instanceof GenerationBackendError ? error.status : undefined,
        });
    }
    return null;
}

async function refundAfterFailure(
    authHeader: string,
    generationID: string,
    failure: CoverLetterGenerationFailure,
) {
    try {
        await refundCoverLetterGeneration({
            authHeader,
            generationID,
            failureCode: failure.code,
            failureDetail: failure.safeDetail,
            tokenUsage: failure.tokenUsage,
            attemptCount: failure.attemptCount,
            repairAttempted: failure.repairAttempted,
        });
        return true;
    } catch {
        captureAppError({
            code: "WEB_COVER_LETTER_GENERATION_REFUND_FAILED",
            message: "Immediate cover letter refund failed; stale reconciliation will retry it",
            error: safeTrackedError("CoverLetterRefundError", "Cover letter refund failed"),
            area: "cover_letter_generator_api",
            action: "refund_failed_generation",
            status: 503,
        });
        return false;
    }
}

function errorResponse(status: number, code: string, message: string) {
    return NextResponse.json({code, message}, {status});
}

function safeTrackedError(name: string, message: string) {
    const error = new Error(message);
    error.name = name;
    return error;
}
