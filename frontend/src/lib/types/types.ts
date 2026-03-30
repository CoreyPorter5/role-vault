import {z} from 'zod';

export const JobSchema = z.object({
    jobId: z.string().min(5),
    jobTitle: z.string().min(1),

    companyLogo: z.url().nullable(),
    companyName: z.string().min(1),

    jobPay: z.string().nullable().optional(),
    jobDescription: z.string().min(100),

    location: z.string().min(1),
    jobType: z.string().optional(),
    dateSynced: z.date().default(() => new Date()),
    jobStatus: z.enum(["Saved", "Applied", "Interviewing", "Offer", "Rejected", "Accepted"])



})


export type Job = z.infer<typeof JobSchema>