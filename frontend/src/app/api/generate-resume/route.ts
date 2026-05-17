import {NextResponse} from "next/server";
import {Job} from "@/lib/types/types";
import {Output, streamText} from 'ai';
import {createOpenAI} from '@ai-sdk/openai';
import {tailoredResumeSchema} from "@/app/api/generate-resume/schema";

type GenerateResumeBody = {
    jobID: string
}

type GenerationContext = {
    resumePlaintext: string;
    job: Job
}

export const maxDuration = 120;

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get("authorization")
        if (!authHeader) {
            return NextResponse.json(
                {message: "Missing auth header in api request"},
                {status: 401}
            )
        }
        const body = (await request.json()) as GenerateResumeBody
        if (!body.jobID) {
            return NextResponse.json(
                {message: "jobID is required"},
                {status: 400}
            )
        }

        const contextResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL_PREFIX}/api/v1/resume-generation-context/${body.jobID}`, {
            method: "GET",
            cache: "no-store",
            headers: {
                "Authorization": authHeader
            }
        })

        if (!contextResponse.ok) {
            const errorText = await contextResponse.text();
            return NextResponse.json(
                {message: errorText || "Failed to fetch generation context "},
                {status: contextResponse.status}
            )
        }

        const context = (await contextResponse.json()) as GenerationContext

        const openai = createOpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const result = streamText({
            model: openai("gpt-5-nano"),
            output: Output.object({schema: tailoredResumeSchema}),

            onError({error}) {
                console.error("AI Stream Error: ", error);
            },

            system: `
                    You are an expert resume strategist and ATS-focused resume writer.
                    
                    Your job is to transform a user's master resume into a tailored resume object for a specific job application.
                    
                    Non-negotiable rules:
                    - Return only a structured object matching the provided schema.
                    - Do not return markdown, prose outside the object, explanations, comments, or headings.
                    - Do not invent, assume, exaggerate, or fabricate facts.
                    - Do not invent contact details, employers, dates, degrees, technologies, metrics, certifications, or responsibilities.
                    - If a contact field is missing or unclear, return null for that field.
                    - If information is not present in the master resume, do not include it.
                    - Preserve factual accuracy over persuasion.
                    - Do not overstate seniority. If the candidate is a student or early-career, use Graduate, Junior, Entry-Level, Student, or Intern where appropriate.
                    - Only include technologies, tools, and programming languages explicitly mentioned in the master resume.
                    - Do not infer technologies from related frameworks. For example, do not add Node.js or Express just because Next.js is mentioned unless Node.js or Express appears in the master resume.
                    - Bullet points must be plain strings with no bullet symbols, numbering, markdown, or line breaks.
                    - Dates must use this format where possible: "Aug 2014 - May 2020" or "Aug 2014 - Present".
                    - Prioritise relevance to the target job, but never at the expense of truth.
                      `,

            prompt: `
                    MASTER RESUME:
                    ${context.resumePlaintext}
                    
                    TARGET JOB:
                    Title: ${context.job.jobTitle}
                    Company: ${context.job.companyName}
                    Description:
                    ${context.job.jobDescription}
                    
                    TASK:
                    Create a tailored resume object for this job application.
                    
                    Process:
                    1. Identify the most important requirements, skills, tools, responsibilities, and keywords from the target job.
                    2. Compare them against the master resume.
                    3. Select only the candidate's most relevant real experience, projects, education, and skills.
                    4. Rewrite content to emphasise fit for the target role while preserving truth.
                    5. Remove or de-prioritise less relevant details.
                    6. Produce a polished, ATS-friendly, concise resume object.
                    
                    Content requirements:
                    - professionalTitle should align with the target role and the candidate's actual seniority.
                    - professionalSummary should be 2 concise sentences, maximum 450 characters.
                    - skills should contain maximum 15 items.
                    - skills must be short, searchable ATS keywords.
                    - experience should include the most relevant roles only, maximum 3 roles.
                    - each experience role should contain 3–4 bullets.
                    - projects should include maximum 3 projects, only if relevant to the target job.
                    - each project should contain 2–3 bullets.
                    - education.details must always be either an array of strings or null.
                    - Never return education.details as a single string.
                    - education.details should contain maximum 3 string items.
                    - Each education.details item must be maximum 200 characters.
                    - Correct example:
                      "details": [
                        "Expected Graduation: 2026",
                        "Relevant areas: software engineering, databases, web development",
                        "Academic work: full-stack projects with React, Next.js, Go, and PostgreSQL"
                      ]
                    - Incorrect example:
                    "details": "Expected Graduation: 2026; Relevant areas: software engineering, databases, web development"
                    
                    Bullet-writing rules:
                    - Each bullet should be under 25 words.
                    - Start bullets with strong action verbs.
                    - Focus on impact, ownership, systems built, technologies used, collaboration, testing, documentation, performance, reliability, or user/business value.
                    - Include metrics only if they appear in the master resume.
                    - Do not write generic duties if a stronger achievement can be written from the source material.
                    - Do not include bullet symbols. Each bullet must be plain text.
                    
                    Contact rules:
                    - Use only contact details explicitly present in the master resume.
                    - If the master resume contains placeholder contact information, keep it only if it appears to belong to the user.
                    - If a contact field is missing, uncertain, generic, or belongs to another person, return null.
                    
                    Technology rules:
                    - Only include technologies explicitly found in the master resume.
                    - If the job asks for a technology not in the master resume, do not add it as a skill.
                    - You may reflect willingness or exposure in the summary only if supported by the master resume.
                    
                    Quality bar:
                    - The output should read like a strong graduate/early-career resume tailored to the target job.
                    - It should be concise enough to fit a clean 1–2 page resume template.
                    - It should be specific, credible, and professionally worded.
                      `,
        });

        return result.toTextStreamResponse();

    } catch (error) {
        console.error("generate-resume route error: ", error)
        return NextResponse.json(
            {message: "Failed to generate resume"},
            {status: 500}
        )
    }

}