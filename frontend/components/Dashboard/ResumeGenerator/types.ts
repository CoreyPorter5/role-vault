export type ResumeGenerationUsage = {
    used: number,
    limit: number,
    remaining: number,
    can_generate: boolean,
    period_start: string,
    period_end: string
}