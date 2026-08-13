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

export async function POST(request: Request) {
    try {
        const body = await request.json() as {coverLetter?: unknown; templateVersion?: unknown};
        if (body.templateVersion !== COVER_LETTER_TEMPLATE_VERSION) {
            return NextResponse.json({message: "Unsupported cover letter template"}, {status: 400});
        }
        const parsed = coverLetterSchema.safeParse(body.coverLetter);
        if (!parsed.success) {
            return NextResponse.json({message: "Incorrect cover letter format"}, {status: 400});
        }

        const letter = parsed.data;
        const templatePath = path.join(process.cwd(), "public", "templates", "cover_letter_v1.docx");
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
        return NextResponse.json({message: "Failed to export cover letter DOCX"}, {status: 500});
    }
}
