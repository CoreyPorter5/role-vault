import {NextResponse} from "next/server";
import path from "path";
import {readFile} from "node:fs/promises";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import {resumeCategorySchema} from "@/lib/resume-generation/categories";
import {
    getResumeProfileVersion,
    type ResumeProfile,
} from "@/lib/resume-generation/profiles";
import {captureAppError} from "@/lib/sentry/captureAppError";
import {createResumeTemplateData} from "@/lib/resume-generation/docx-data";
import {hasAuthenticatedApiUser} from "@/lib/auth/apiUser";
import {readLimitedJsonBody} from "@/lib/http/readLimitedJsonBody";

export const runtime = "nodejs";
const DOCX_EXPORT_BODY_LIMIT_BYTES = 512 * 1024;

export async function POST(request: Request){
    try{
        if (!await hasAuthenticatedApiUser()) {
            return jsonResponse({message: "Authentication required"}, 401);
        }
        const parsedBody = await readLimitedJsonBody(request, DOCX_EXPORT_BODY_LIMIT_BYTES);
        if (!parsedBody.ok) {
            return parsedBody.reason === "too_large"
                ? jsonResponse({message: "Request body must not exceed 512 KiB"}, 413)
                : jsonResponse({message: "Invalid JSON body"}, 400);
        }
        if (!parsedBody.value || typeof parsedBody.value !== "object" || Array.isArray(parsedBody.value)) {
            return jsonResponse({message: "JSON body must be an object"}, 400);
        }
        const body = parsedBody.value as {
            resume?: unknown;
            resumeCategory?: unknown;
            profileVersion?: unknown;
            templateVersion?: unknown;
        };
        const categoryResult = resumeCategorySchema.safeParse(body.resumeCategory);
        if (!categoryResult.success) {
            return NextResponse.json(
                {message: "Unsupported resume category"},
                {status: 400, headers: {"Cache-Control": "private, no-store"}},
            );
        }
        if (typeof body.profileVersion !== "number" || typeof body.templateVersion !== "string") {
            return NextResponse.json(
                {message: "Unsupported resume profile version"},
                {status: 400, headers: {"Cache-Control": "private, no-store"}},
            );
        }
        let profile: ResumeProfile;
        try {
            profile = getResumeProfileVersion(
                categoryResult.data,
                body.profileVersion,
                body.templateVersion,
            );
        } catch {
            return NextResponse.json(
                {message: "Unsupported resume profile version"},
                {status: 400, headers: {"Cache-Control": "private, no-store"}},
            );
        }
        const parsedResume = profile.schema.safeParse(body.resume);
        if(!parsedResume.success){
            return NextResponse.json(
                {message: "Incorrect resume format"},
                {status: 400, headers: {"Cache-Control": "private, no-store"}}
            )
        }
        const resume = parsedResume.data;
        const templatePath = path.join(process.cwd(), "src", "server", "templates", profile.templateFileName)
        const templateBuffer = await readFile(templatePath);
        const zip = new PizZip(templateBuffer);

        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        })

        const cleanedResume = createResumeTemplateData(resume);

        doc.render(cleanedResume)

        const outputBuffer = doc.getZip().generate({
            type: "nodebuffer",
            compression: "DEFLATE"
        });

        const filename = `${resume.fullName || "tailored_resume"}_resume.docx`
            .replaceAll(" ", "_")
            .replace(/[^\w.-]/g, "");

        return new Response(new Uint8Array(outputBuffer), {
            headers: {
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Cache-Control": "private, no-store",
            }
        })


    }catch {
        captureAppError({
            code: "WEB_DOCX_EXPORT_FAILED",
            message: "Failed to export a resume as DOCX",
            error: new Error("DOCX rendering failed"),
            area: "resume_export",
            action: "render_docx",
            endpoint: "/api/export-resume-docx",
        });
        return NextResponse.json(
            {message: "Failed to export resume DOCX"},
            {status: 500, headers: {"Cache-Control": "private, no-store"}}
        )
    }
}

function jsonResponse(body: {message: string}, status: number) {
    return NextResponse.json(body, {
        status,
        headers: {"Cache-Control": "private, no-store"},
    });
}
