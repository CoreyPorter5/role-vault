import {NextRequest} from "next/server";
import {z} from "zod";

import {readLimitedJsonBody} from "@/lib/http/readLimitedJsonBody";
import {captureAppError} from "@/lib/sentry/captureAppError";
import {
    extensionJSON,
    extensionPreflight,
    fetchExtensionBackend,
    getAuthenticatedExtensionSession,
    rejectUntrustedExtensionRequest,
} from "@/lib/extension/server";

const METHODS = "GET, POST";
const MAX_JOB_BODY_BYTES = 512 * 1024;
const seekJobID = z.string().regex(/^\d{5,20}$/);
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();

const extensionJobInput = z.strictObject({
    jobId: seekJobID,
    jobTitle: z.string().trim().min(1).max(300),
    companyLogo: z.string().url().max(2048).refine((value) => value.startsWith("https://")).nullable(),
    companyName: z.string().trim().min(1).max(300),
    jobPay: optionalText(500),
    jobDescription: z.string().trim().min(100).max(480_000),
    location: z.string().trim().min(1).max(500),
    jobType: optionalText(200),
    dateSynced: z.string().max(100).refine((value) => !Number.isNaN(Date.parse(value))),
});

const backendJob = z.object({
    jobId: seekJobID,
    jobTitle: z.string(),
    companyName: z.string(),
    jobPay: z.string().nullable().optional(),
    location: z.string(),
    jobType: z.string().nullable().optional(),
    dateSynced: z.string(),
});

export function OPTIONS(request: NextRequest) {
    return extensionPreflight(request, METHODS);
}

export async function GET(request: NextRequest) {
    const rejection = rejectUntrustedExtensionRequest(request, METHODS);
    if (rejection) return rejection;

    const session = await getAuthenticatedExtensionSession();
    if (!session) return extensionJSON({error: "Not authenticated"}, 401, METHODS);

    try {
        const response = await fetchExtensionBackend("/api/v1/jobs", session.backendAccessToken);
        if (!response.ok) {
            return extensionJSON({error: "Unable to load jobs"}, response.status, METHODS);
        }

        const parsed = z.array(backendJob).max(2_000).safeParse(await response.json());
        if (!parsed.success) {
            throw new Error("Backend returned an invalid extension job list");
        }

        const jobs = parsed.data.map((job) => ({
            jobId: job.jobId,
            jobTitle: job.jobTitle.slice(0, 300),
            companyName: job.companyName.slice(0, 300),
            jobPay: job.jobPay?.slice(0, 500) ?? null,
            location: job.location.slice(0, 500),
            jobType: job.jobType?.slice(0, 200) ?? null,
            dateSynced: job.dateSynced.slice(0, 100),
        }));
        return extensionJSON({jobs}, 200, METHODS);
    } catch (error) {
        captureProxyError(error, "list");
        return extensionJSON({error: "Unable to load jobs"}, 502, METHODS);
    }
}

export async function POST(request: NextRequest) {
    const rejection = rejectUntrustedExtensionRequest(request, METHODS);
    if (rejection) return rejection;

    const session = await getAuthenticatedExtensionSession();
    if (!session) return extensionJSON({error: "Not authenticated"}, 401, METHODS);

    const body = await readLimitedJsonBody(request, MAX_JOB_BODY_BYTES);
    if (!body.ok) {
        return extensionJSON(
            {error: body.reason === "too_large" ? "Job is too large" : "Invalid job"},
            body.reason === "too_large" ? 413 : 400,
            METHODS,
        );
    }
    const parsed = extensionJobInput.safeParse(body.value);
    if (!parsed.success) return extensionJSON({error: "Invalid job"}, 422, METHODS);

    try {
        const response = await fetchExtensionBackend("/api/v1/jobs", session.backendAccessToken, {
            method: "POST",
            body: JSON.stringify(parsed.data),
        });
        if (!response.ok) {
            return extensionJSON({error: response.status === 409 ? "Job already synced" : "Unable to sync job"}, response.status, METHODS);
        }
        return extensionJSON({success: true}, 201, METHODS);
    } catch (error) {
        captureProxyError(error, "create");
        return extensionJSON({error: "Unable to sync job"}, 502, METHODS);
    }
}

function captureProxyError(error: unknown, action: "list" | "create") {
    captureAppError({
        code: "WEB_EXTENSION_JOB_PROXY_FAILED",
        message: "Extension job proxy failed",
        error,
        area: "extension_api",
        action,
        endpoint: "/api/extension/jobs",
    });
}
