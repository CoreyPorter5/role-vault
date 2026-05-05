import {tailoredResumeSchema} from "@/app/api/generate-resume/schema";
import {NextResponse} from "next/server";
import path from "path";
import {readFile} from "node:fs/promises";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

export async function POST(request: Request){
    try{
        const body = await (request.json())
        const isValidResume = tailoredResumeSchema.safeParse(body.resume).success
        if(!isValidResume){
            return NextResponse.json(
                {message: "Incorrect resume format"},
                {status: 400}
            )
        }
        const resume = tailoredResumeSchema.parse(body.resume)
        const templatePath = path.join(process.cwd(), "public", "templates", "ats-classic.docx")
        const templateBuffer = await readFile(templatePath);
        const zip = new PizZip(templateBuffer);

        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        })

        doc.render(resume)

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
            }
        })


    }catch (error){
        console.error(error)
        return NextResponse.json(
            {message: "Failed to export resume DOCX"},
            {status: 500}
        )
    }
}