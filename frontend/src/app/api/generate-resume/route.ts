"use server"

import {NextResponse} from "next/server";
import {Job} from "@/lib/types/types";
import {generateObject, generateText} from 'ai';
import {createOpenAI} from '@ai-sdk/openai';

type GenerateResumeBody = {
    jobID: string
}


type GenerationContext = {
    resumePlaintext: string;
    job: Job
}

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

        const {text} = await generateText({
            model: openai('gpt-5-nano'),
            system: `You tailor resumes for job applications.
                    Do not invent experience, qualifications, dates, titles, metrics, or achievements.
                    Only rewrite and reorganize what already exists in the user's resume to better match the role.
                    Return clean markdown.`,
            prompt: `MASTER RESUME ${context.resumePlaintext}
                    
                    TARGET JOB ${context.job.jobDescription}
                    
                    TASK
                    Create a tailored resume for this role.
                    Preserve factual accuracy.
                    Strengthen alignment with the job description.
                    Use strong, concise bullet points.`,


        });

        return NextResponse.json(
            {generatedResume: text}
        )


    } catch (error) {
        console.error("generate-resume route error: ", error)
        return NextResponse.json(
            {message: "Failed to generate resume"},
            {status: 500}
        )
    }

}