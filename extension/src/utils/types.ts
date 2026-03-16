import {z} from 'zod';

export const ScrapedJobSchema = z.object({
    jobId: z.string().min(5),
    jobTitle: z.string().min(1),
    jobUrl: z.url(),
    applyUrl: z.url(),

    companyLogo: z.url().nullable(),
    companyName: z.string().min(1),

    jobPay: z.string().nullable().optional(),
    jobDescription: z.string().min(100),

    location: z.string().min(1),
    jobType: z.string().optional(),
    dataSynced: z.date().default(() => new Date())



})


export type ScrapedJobData = z.infer<typeof ScrapedJobSchema>