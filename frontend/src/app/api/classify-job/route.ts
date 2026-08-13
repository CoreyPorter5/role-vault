import {NextResponse} from "next/server";
import {captureAppError} from "@/lib/sentry/captureAppError";
import {
    claimJobResumeCategory,
    completeJobResumeCategory,
    failJobResumeCategory,
    GenerationBackendError,
    isGenerationBackendContractFailure,
    type JobResumeCategoryResponse,
} from "@/lib/resume-generation/backend";
import {
    classifyJobListing,
    assertJobClassificationConfigured,
    JOB_CLASSIFICATION_MODEL,
    JOB_CLASSIFIER_VERSION,
} from "@/lib/resume-generation/classify-job";
import {isJobClassificationConfident} from "@/lib/resume-generation/classification-policy";

export const maxDuration = 30;

export async function POST(request: Request) {
    const authHeader = request.headers.get("authorization") ?? "";
    if (!/^Bearer\s+\S+$/i.test(authHeader)) {
        return errorResponse(401, "UNAUTHENTICATED", "A valid authorization header is required");
    }

    const jobID = await parseJobID(request);
    if (jobID instanceof NextResponse) {
        return jobID;
    }

    try {
        assertJobClassificationConfigured();
        const claim = await claimJobResumeCategory({
            authHeader,
            jobID,
            classifierModel: JOB_CLASSIFICATION_MODEL,
            classifierVersion: JOB_CLASSIFIER_VERSION,
        });

        if (claim.status === "classified" || claim.status === "failed") {
            return categoryResponse(claim);
        }
        if (!claim.claimed) {
            return NextResponse.json({
                ...serializeCategory(claim),
                message: "Job classification is already in progress",
            }, {status: 202});
        }
        if (!claim.job_title || !claim.job_description) {
            const failed = await failJobResumeCategory({
                authHeader,
                jobID,
                failureCode: "incomplete_job_listing",
            });
            return categoryResponse(failed);
        }

        let classification: Awaited<ReturnType<typeof classifyJobListing>>;
        try {
            classification = await classifyJobListing({
                jobTitle: claim.job_title,
                jobDescription: claim.job_description,
            });
        } catch {
            captureAppError({
                code: "WEB_JOB_CLASSIFICATION_PROVIDER_FAILED",
                message: "Job classification failed; manual selection is required",
                error: safeTrackedError("JobClassificationProviderError", "Job classification provider failed"),
                area: "job_resume_category_api",
                action: "classify_job_listing",
                extra: {jobId: jobID},
            });
            const failed = await failJobResumeCategory({
                authHeader,
                jobID,
                failureCode: "classification_failed",
            });
            return categoryResponse(failed);
        }

        if (!isJobClassificationConfident(classification.confidence)) {
            const failed = await failJobResumeCategory({
                authHeader,
                jobID,
                failureCode: "low_confidence",
                confidence: classification.confidence,
            });
            return categoryResponse(failed);
        }

        const completed = await completeJobResumeCategory({
            authHeader,
            jobID,
            category: classification.category,
            confidence: classification.confidence,
        });
        return categoryResponse(completed);
    } catch (error) {
        if (error instanceof GenerationBackendError) {
            const contractFailure = isGenerationBackendContractFailure(error);
            if (error.source !== "response" || contractFailure) {
                captureAppError({
                    code: "WEB_JOB_CLASSIFICATION_BACKEND_FAILED",
                    message: "Job classification backend request failed",
                    error: safeTrackedError("GenerationBackendError", "Job classification backend request failed"),
                    area: "job_resume_category_api",
                    action: "call_classification_backend",
                    status: error.status,
                    forceCapture: contractFailure,
                    extra: {upstreamErrorCode: error.code},
                });
            }
            return errorResponse(error.status, error.code, error.message);
        }
        captureAppError({
            code: "WEB_JOB_CLASSIFICATION_PREPARE_FAILED",
            message: "Could not prepare job classification",
            error: safeTrackedError("JobClassificationPreparationError", "Job classification preparation failed"),
            area: "job_resume_category_api",
            action: "prepare_job_classification",
            extra: {jobId: jobID},
        });
        return errorResponse(503, "JOB_CLASSIFICATION_UNAVAILABLE", "Choose a job type to continue");
    }
}

async function parseJobID(request: Request): Promise<string | NextResponse> {
    try {
        const body = await request.json() as {jobID?: unknown};
        const jobID = typeof body.jobID === "string" ? body.jobID.trim() : "";
        if (!jobID || jobID.length > 200) {
            return errorResponse(400, "INVALID_JOB_ID", "jobID is required");
        }
        return jobID;
    } catch {
        return errorResponse(400, "INVALID_REQUEST", "Invalid JSON body");
    }
}

function categoryResponse(state: JobResumeCategoryResponse) {
    return NextResponse.json(serializeCategory(state));
}

function serializeCategory(state: JobResumeCategoryResponse) {
    return {
        status: state.status,
        category: state.category,
        source: state.source,
        confidence: state.confidence,
        failureCode: state.failure_code ?? null,
        requiresSelection: state.status !== "classified" || !state.category,
    };
}

function errorResponse(status: number, code: string, message: string) {
    return NextResponse.json({code, message}, {status});
}

function safeTrackedError(name: string, message: string): Error {
    const error = new Error(message);
    error.name = name;
    return error;
}
