import {NextResponse} from "next/server";
import {captureAppError} from "@/lib/sentry/captureAppError";
import {
    claimJobResumeCategory,
    completeJobResumeCategory,
    failJobResumeCategory,
    GenerationBackendError,
    type JobResumeCategoryResponse,
} from "@/lib/resume-generation/backend";
import {
    classifyJobListing,
    assertJobClassificationConfigured,
    JOB_CLASSIFICATION_CONFIDENCE_THRESHOLD,
    JOB_CLASSIFICATION_MODEL,
    JOB_CLASSIFIER_VERSION,
} from "@/lib/resume-generation/classify-job";

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

        try {
            const classification = await classifyJobListing({
                jobTitle: claim.job_title,
                jobDescription: claim.job_description,
            });

            if (classification.confidence < JOB_CLASSIFICATION_CONFIDENCE_THRESHOLD) {
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
            captureAppError({
                message: "Job classification failed; manual selection is required",
                error,
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
    } catch (error) {
        if (error instanceof GenerationBackendError) {
            return errorResponse(error.status, error.code, error.message);
        }
        captureAppError({
            message: "Could not prepare job classification",
            error,
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
        requiresSelection: state.status !== "classified" || !state.category,
    };
}

function errorResponse(status: number, code: string, message: string) {
    return NextResponse.json({code, message}, {status});
}
