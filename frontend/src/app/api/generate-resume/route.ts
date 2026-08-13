import {NextResponse} from "next/server";
import type {Job} from "@/lib/types/types";
import {captureAppError} from "@/lib/sentry/captureAppError";
import {
    assertGenerationBackendConfigured,
    completeGeneration,
    GenerationBackendError,
    isGenerationBackendContractFailure,
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
import {resumeCategorySchema, type ResumeCategory} from "@/lib/resume-generation/categories";
import {getResumeProfile} from "@/lib/resume-generation/profiles";

type GenerateResumeBody = {
    jobID: string;
    generationID: string;
    resumeCategory: ResumeCategory;
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

        const profile = getResumeProfile(body.resumeCategory);
        const reservation = await reserveGeneration({
            authHeader,
            generationID: body.generationID,
            jobID: body.jobID,
            model: RESUME_GENERATION_MODEL,
            resumeCategory: profile.key,
            profileVersion: profile.profileVersion,
            templateVersion: profile.templateVersion,
        });

        const existingResponse = existingAttemptResponse(reservation);
        if (existingResponse) {
            return existingResponse;
        }

        let generated;
        try {
            generated = await generateResumeWithRepair(contextResponse, profile);
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
                code: "WEB_RESUME_GENERATION_PROVIDER_FAILED",
                message: "Resume generation failed and its credit was refunded",
                error: safeTrackedError("ResumeGenerationFailure", failure.safeDetail),
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
                code: "WEB_RESUME_GENERATION_PERSIST_FAILED",
                message: "Generated resume could not be persisted and its credit was refunded",
                error: safeTrackedError("GenerationPersistenceFailure", "Generated resume persistence failed"),
                area: "resume_generator_api",
                action: "persist_and_refund_resume",
                extra: {
                    upstreamErrorCode: completionError instanceof GenerationBackendError
                        ? completionError.code
                        : undefined,
                },
            });
            return refunded
                ? errorResponse(500, "GENERATION_PERSISTENCE_FAILED", "The resume could not be saved. Your credit has been restored.")
                : errorResponse(503, "GENERATION_REFUND_PENDING", "The resume could not be saved. Your credit refund is still being reconciled.");
        }

        return completedAttemptResponse(completed);
    } catch (error) {
        if (error instanceof GenerationBackendError) {
            const contractFailure = isGenerationBackendContractFailure(error);
            if (error.source !== "response" || contractFailure) {
                captureAppError({
                    code: "WEB_RESUME_GENERATION_BACKEND_FAILED",
                    message: "Resume generation backend request failed",
                    error: safeTrackedError("GenerationBackendError", "Resume generation backend request failed"),
                    area: "resume_generator_api",
                    action: "call_generation_backend",
                    status: error.status,
                    forceCapture: contractFailure,
                    extra: {upstreamErrorCode: error.code},
                });
            }
            return errorResponse(error.status, error.code, error.message);
        }
        if (error instanceof ResumeGenerationFailure && error.code === "generation_not_configured") {
            captureAppError({
                code: "WEB_RESUME_GENERATION_CONFIG_MISSING",
                message: "Resume generation is not configured",
                error: safeTrackedError("ResumeGenerationConfigurationError", "Resume generation is not configured"),
                area: "resume_generator_api",
                action: "validate_generation_config",
                status: 503,
            });
            return errorResponse(503, "GENERATION_SERVICE_NOT_CONFIGURED", "Resume generation is temporarily unavailable");
        }

        captureAppError({
            code: "WEB_RESUME_GENERATION_PREPARE_FAILED",
            message: "Unexpected error before resume generation was reserved",
            error: safeTrackedError("ResumeGenerationPreparationError", "Resume generation preparation failed"),
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
    const categoryResult = resumeCategorySchema.safeParse(body.resumeCategory);
    if (!jobID) {
        return errorResponse(400, "INVALID_JOB_ID", "jobID is required");
    }
    if (!isUUID(generationID)) {
        return errorResponse(400, "INVALID_GENERATION_ID", "generationID must be a UUID");
    }
    if (!categoryResult.success) {
        return errorResponse(400, "INVALID_RESUME_CATEGORY", "resumeCategory is not supported");
    }
    return {jobID, generationID, resumeCategory: categoryResult.data};
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
        captureAppError({
            code: "WEB_RESUME_GENERATION_CONTEXT_INVALID",
            message: "Resume generation context returned an incomplete success response",
            error: safeTrackedError("GenerationContextValidationError", "Resume generation context was incomplete"),
            area: "resume_generator_api",
            action: "validate_generation_context",
            endpoint: "/api/generate-resume",
            status: 502,
        });
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
    const categoryResult = resumeCategorySchema.safeParse(attempt.resume_category);
    if (!categoryResult.success) {
        throw new GenerationBackendError(502, "INVALID_STORED_RESUME_PROFILE", "Stored resume had an invalid category");
    }
    const profile = getResumeProfile(categoryResult.data);
    if (attempt.profile_version !== profile.profileVersion || attempt.template_version !== profile.templateVersion) {
        throw new GenerationBackendError(502, "INVALID_STORED_RESUME_PROFILE", "Stored resume used an unsupported profile version");
    }
    const parsed = profile.schema.safeParse(attempt.resume);
    if (!parsed.success) {
        throw new GenerationBackendError(502, "INVALID_STORED_RESUME", "Stored resume had an invalid format");
    }
    return NextResponse.json({
        generation_id: attempt.generation_id,
        resume: parsed.data,
        resumeCategory: profile.key,
        profileVersion: profile.profileVersion,
        templateVersion: profile.templateVersion,
        usage: attempt.usage,
    });
}

async function recoverCompletedGeneration(authHeader: string, body: GenerateResumeBody): Promise<NextResponse | null> {
    try {
        const profile = getResumeProfile(body.resumeCategory);
        const attempt = await reserveGeneration({
            authHeader,
            generationID: body.generationID,
            jobID: body.jobID,
            model: RESUME_GENERATION_MODEL,
            resumeCategory: profile.key,
            profileVersion: profile.profileVersion,
            templateVersion: profile.templateVersion,
        });
        if (attempt.status === "succeeded") {
            return completedAttemptResponse(attempt);
        }
    } catch (error) {
        if (!(error instanceof GenerationBackendError) || error.source !== "response") {
            captureAppError({
                code: "WEB_RESUME_GENERATION_RECOVERY_FAILED",
                message: "Could not recover generation after an ambiguous completion response",
                error: safeTrackedError("GenerationRecoveryError", "Resume generation recovery failed"),
                area: "resume_generator_api",
                action: "recover_completed_generation",
                status: error instanceof GenerationBackendError ? error.status : undefined,
                extra: {
                    upstreamErrorCode: error instanceof GenerationBackendError ? error.code : undefined,
                },
            });
        }
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
            code: "WEB_RESUME_GENERATION_REFUND_FAILED",
            message: "Immediate resume generation refund failed; stale reconciliation will retry it",
            error: safeTrackedError("GenerationRefundError", "Resume generation refund failed"),
            area: "resume_generator_api",
            action: "refund_failed_generation",
            // This is a local consistency failure even when the internal API
            // answered with a 4xx: the public operation remains unavailable
            // and the reservation may need stale-attempt reconciliation.
            status: 503,
            extra: {
                failureCode: failure.code,
                upstreamErrorCode: refundError instanceof GenerationBackendError ? refundError.code : undefined,
            },
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

function safeTrackedError(name: string, message: string): Error {
    const error = new Error(message);
    error.name = name;
    return error;
}
