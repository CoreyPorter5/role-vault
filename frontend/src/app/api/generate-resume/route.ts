import {NextResponse} from "next/server";
import {Job} from "@/lib/types/types";
import { Output, streamText} from 'ai';
import {createOpenAI} from '@ai-sdk/openai';
import {tailoredResumeSchema} from "@/app/api/generate-resume/schema";

type GenerateResumeBody = {
    jobID: string
}

type GenerationContext = {
    resumePlaintext: string;
    job: Job
}

export const maxDuration = 60;

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
            onError({error}){
                console.error("AI Stream Error: ", error)
            },


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