import { z } from "zod";

const bulletSchema = z.string().max(220);

const experienceSchema = z.object({
    title: z.string().max(100),
    company: z.string().max(100),
    location: z.string().nullable(),
    dates: z.string().max(40).nullable(),
    bullets: z.array(bulletSchema).min(2).max(6),
});

export const tailoredResumeSchema = z.object({
    fullName: z.string().max(80),
    professionalTitle: z.string().max(80),

    contact: z.object({
        location: z.string().max(80).nullable(),
        phone: z.string().max(40).nullable(),
        email: z.email().max(120).nullable(),
        linkedin: z.string().max(120).nullable(),
        github: z.string().max(120).nullable(),
        portfolioSite: z.string().max(120).nullable(),
    }),

    professionalSummary: z.string().max(550),

    skills: z.array(z.string().max(80)).max(15),

    experience: z.array(experienceSchema).max(4),

    projects: z
        .array(
            z.object({
                name: z.string().max(100),
                technologies: z.array(z.string().max(80)).max(8).nullable(),
                bullets: z.array(bulletSchema).min(2).max(3),
            })
        )
        .max(3)
        .nullable(),

    education: z
        .array(
            z.object({
                institution: z.string().max(100),
                degree: z.string().max(120).nullable(),
                dates: z.string().max(50).nullable(),
                details: z.array(z.string().max(160)).max(5).nullable(),
            })
        )
        .max(3),
});

export type TailoredResume = z.infer<typeof tailoredResumeSchema>;