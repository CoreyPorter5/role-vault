import {readFile} from "node:fs/promises";
import path from "node:path";
import Docxtemplater from "docxtemplater";
import {NextResponse} from "next/server";
import PizZip from "pizzip";
import {captureAppError} from "@/lib/sentry/captureAppError";
import {
    COVER_LETTER_TEMPLATE_VERSION,
    coverLetterSchema,
} from "@/lib/cover-letter/schema";
import {hasAuthenticatedApiUser} from "@/lib/auth/apiUser";
import {readLimitedJsonBody} from "@/lib/http/readLimitedJsonBody";

export const runtime = "nodejs";
const DOCX_EXPORT_BODY_LIMIT_BYTES = 512 * 1024;

export async function POST(request: Request) {
    try {
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
        const body = parsedBody.value as {coverLetter?: unknown; templateVersion?: unknown};
        if (body.templateVersion !== COVER_LETTER_TEMPLATE_VERSION) {
            return jsonResponse({message: "Unsupported cover letter template"}, 400);
        }
        const parsed = coverLetterSchema.safeParse(body.coverLetter);
        if (!parsed.success) {
            return jsonResponse({message: "Incorrect cover letter format"}, 400);
        }

        const letter = parsed.data;
        const templatePath = path.join(process.cwd(), "src", "server", "templates", "cover_letter_v1.docx");
        const zip = new PizZip(await readFile(templatePath));
        const document = new Docxtemplater(zip, {paragraphLoop: true, linebreaks: true});
        const recipientBlock = [letter.recipientName, letter.recipientTitle, letter.companyName]
            .filter(Boolean)
            .join("\n");

        document.render({
            ...letter,
            date: new Intl.DateTimeFormat("en-AU", {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "Australia/Sydney",
            }).format(new Date()),
            contactLine: [
                letter.candidateContact.location,
                letter.candidateContact.phone,
                letter.candidateContact.email,
            ].filter(Boolean).join("  •  "),
            recipientBlock,
            bodyParagraphs: letter.bodyParagraphs.map((text) => ({text})),
        });

        const output = document.getZip().generate({type: "nodebuffer", compression: "DEFLATE"});
        const filename = `${letter.candidateName || "cover_letter"}_cover_letter.docx`
            .replaceAll(" ", "_")
            .replace(/[^\w.-]/g, "");
        return new Response(new Uint8Array(output), {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Cache-Control": "private, no-store",
            },
        });
    } catch {
        captureAppError({
            code: "WEB_COVER_LETTER_DOCX_EXPORT_FAILED",
            message: "Failed to export a cover letter as DOCX",
            error: new Error("Cover letter DOCX rendering failed"),
            area: "cover_letter_export",
            action: "render_docx",
            endpoint: "/api/export-cover-letter-docx",
        });
        return jsonResponse({message: "Failed to export cover letter DOCX"}, 500);
    }
}

function jsonResponse(body: {message: string}, status: number) {
    return NextResponse.json(body, {
        status,
        headers: {"Cache-Control": "private, no-store"},
    });
}
