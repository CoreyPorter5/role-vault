import {z, type ZodType} from "zod";

const bulletSchema = z.string().max(220);
const emailSchema = z.string().max(120).refine(
    (value) => z.email().safeParse(value).success,
    {message: "Invalid email address"},
);

const experienceSchema = z.object({
    title: z.string().max(100),
    company: z.string().max(100),
    location: z.string().max(100).nullable(),
    dates: z.string().max(40).nullable(),
    bullets: z.array(bulletSchema).min(2).max(6),
});

export const baseTailoredResumeSchema = z.object({
    fullName: z.string().max(80),
    professionalTitle: z.string().max(80),
    contact: z.object({
        location: z.string().max(80).nullable(),
        phone: z.string().max(40).nullable(),
        // Keep email validation local: z.email() emits regex lookarounds that
        // OpenAI's strict structured-output JSON Schema does not support.
        email: emailSchema.nullable(),
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
                bullets: z.array(bulletSchema).min(2).max(5),
            }),
        )
        .max(3)
        .nullable(),
    education: z
        .array(
            z.object({
                institution: z.string().max(100),
                degree: z.string().max(120).nullable(),
                dates: z.string().max(50).nullable(),
                details: z.array(z.string().max(300)).max(5).nullable(),
            }),
        )
        .max(3),
});

export const resumeCredentialSchema = z.object({
    name: z.string().max(120),
    issuer: z.string().max(100).nullable(),
    date: z.string().max(40).nullable(),
});

export type ResumeCredential = z.infer<typeof resumeCredentialSchema>;
export type LegacyTailoredResume = z.infer<typeof baseTailoredResumeSchema>;
export type TailoredResume = LegacyTailoredResume & {
    // v1 resumes predate this section, so it remains optional in the shared
    // application type. Every v2 schema requires an explicit array or null.
    credentials?: ResumeCredential[] | null;
};

type ResumeProfileSchemaOptions = {
    summaryDescription: string;
    summaryMax: number;
    skillsDescription: string;
    skillsMax: number;
    experienceDescription: string;
    experienceMax: number;
    projectDescription: string;
    projectMax: number;
    projectBulletMax?: number;
    credentialsDescription: string;
    credentialsMax: number;
    educationDescription: string;
    educationMax: number;
};

/**
 * Builds the strict v2 contract used by a single discipline. The shared shape
 * keeps editing and persistence predictable, while the descriptions and
 * limits give the model a genuinely category-specific content plan.
 */
export function createResumeProfileSchema(options: ResumeProfileSchemaOptions): ZodType<TailoredResume> {
    const projectsSchema = options.projectMax === 0
        ? z.null().describe(options.projectDescription)
        : z.array(
            z.object({
                name: z.string().max(100),
                technologies: z.array(z.string().max(80)).max(8).nullable(),
                bullets: z.array(bulletSchema).min(2).max(options.projectBulletMax ?? 4),
            }),
        ).max(options.projectMax).nullable().describe(options.projectDescription);

    return z.object({
        fullName: z.string().max(80),
        professionalTitle: z.string().max(80),
        contact: baseTailoredResumeSchema.shape.contact,
        professionalSummary: z.string()
            .max(options.summaryMax)
            .describe(options.summaryDescription),
        skills: z.array(z.string().max(80))
            .max(options.skillsMax)
            .describe(options.skillsDescription),
        experience: z.array(experienceSchema)
            .max(options.experienceMax)
            .describe(options.experienceDescription),
        projects: projectsSchema,
        credentials: z.array(resumeCredentialSchema)
            .max(options.credentialsMax)
            .nullable()
            .describe(options.credentialsDescription),
        education: z.array(baseTailoredResumeSchema.shape.education.element)
            .max(options.educationMax)
            .describe(options.educationDescription),
    }) as ZodType<TailoredResume>;
}

export function createInitialResumeSchema() {
    return baseTailoredResumeSchema.extend({});
}
