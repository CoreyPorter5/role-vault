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
            model: openai('gpt-5-nano'),
            output: Output.object({schema: tailoredResumeSchema}),
            onError({error}) {
                console.error("AI Stream Error: ", error)
            },
            system: `
                    You tailor resumes for job applications.                
                    Return only a structured object matching the schema.
                    Do not return markdown.
                    Do not include markdown headings.
                    Do not invent facts.
                    Put bullet points inside bullet arrays.
            `,


            prompt: `
                        MASTER RESUME:
                        ${context.resumePlaintext}
                        
                        TARGET JOB:
                        Title: ${context.job.jobTitle}
                        Company: ${context.job.companyName}
                        Description: ${context.job.jobDescription}
                        
                        TASK:
                        Create a tailored resume object for this role.
                        Strengthen alignment with the job description.
                        Use strong, concise bullet points.
                        Keep the resume concise:
                        - Professional summary: 2–3 sentences.
                        - Skills: maximum 15 concise items.
                        - Experience: maximum 3–4 bullets per role.
                        - Projects: maximum 3 projects, 2–3 bullets each.
                        - Each bullet should be under 25 words.
                        - All dates should be in the format e.g: Aug 2014 - May 2020 or Aug 2014 - Present 
                        - Do not overstate seniority. Use Graduate, Junior, Student, or Entry-Level when appropriate.
                        - Only include technologies explicitly mentioned in the master resume. Do not infer technologies from related frameworks.
                        - Do not invent contact details
                        - For education.details, use maximum 3 items. Combine related areas into comma-separated phrases instead of separate array items.
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