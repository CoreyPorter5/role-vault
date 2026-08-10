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

export async function POST(request: Request){
    try{
        const body = await request.json() as {
            resume?: unknown;
            resumeCategory?: unknown;
            profileVersion?: unknown;
            templateVersion?: unknown;
        };
        const categoryResult = resumeCategorySchema.safeParse(body.resumeCategory);
        if (!categoryResult.success) {
            return NextResponse.json(
                {message: "Unsupported resume category"},
                {status: 400},
            );
        }
        if (typeof body.profileVersion !== "number" || typeof body.templateVersion !== "string") {
            return NextResponse.json(
                {message: "Unsupported resume profile version"},
                {status: 400},
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
                {status: 400},
            );
        }
        const parsedResume = profile.schema.safeParse(body.resume);
        if(!parsedResume.success){
            return NextResponse.json(
                {message: "Incorrect resume format"},
                {status: 400}
            )
        }
        const resume = parsedResume.data;
        const templatePath = path.join(process.cwd(), "public", "templates", profile.templateFileName)
        const templateBuffer = await readFile(templatePath);
        const zip = new PizZip(templateBuffer);

        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        })

        const cleanedResume = {
            ...resume,
            contactLine: [
                resume.contact.location,
                resume.contact.phone,
                resume.contact.email,
                resume.contact.linkedin,
                resume.contact.github,
                resume.contact.portfolioSite
            ].filter(Boolean).join(" | "),
            projects: (resume.projects ?? []).map(project => ({
                ...project,
                technologiesLine: (project.technologies ?? []).filter(Boolean).join(", "),
                bullets: project.bullets ?? [],
            })),
            education: (resume.education ?? []).map(edu => ({
                ...edu,
                details: edu.details ?? [],
            })),
            skillsLine: (resume.skills ?? []).filter(Boolean).join(" • ")

        }

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
