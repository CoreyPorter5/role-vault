import {z} from "zod";

const bulletSchema = z.string().max(180)

const experienceSchema = z.object({
    title: z.string().max(80),
    company: z.string().max(80),
    location: z.string().max(40).optional(),
    dates: z.string().max(40),
    bullets: z.array(bulletSchema).min(2).max(4),
})

export const tailoredResumeSchema = z.object(
    {
        fullName: z.string().max(80),
        professionalTitle: z.string().max(80),
        contact: z.object({
            location: z.string().max(40).optional(),
            phone: z.string().max(40).optional(),
            email: z.email().max(120).optional(),
            linkedin: z.string().max(120).optional(),
            github: z.string().max(120).optional(),
            portfolioSite: z.string().max(120).optional()
        }),
        professionalSummary: z.string().max(450),
        skills: z.array(z.string().max(40)).max(18),
        experience: z.array(experienceSchema).max(4),
        projects: z.array(
            z.object({
                name: z.string().max(80),
                technologies: z.array(z.string().max(40)).max(8).optional(),
                bullets: z.array(bulletSchema).max(3)
            })
        ).max(3).optional(),
        education: z.array(
            z.object({
                institution: z.string().max(100),
                degree: z.string().max(120).optional(),
                dates: z.string().max(40).optional(),
                details: z.array(z.string().max(120)).max(3).optional()
            })
        ).max(3)

    }
)

export type TailoredResume = z.infer<typeof tailoredResumeSchema>