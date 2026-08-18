export type DocumentCreditUsage = {
    balance: number;
    promotional_balance: number;
    purchased_balance: number;
    can_generate: boolean;
    resumes_generated: number;
    cover_letters_generated: number;
};

// Kept as a compatibility alias while the generation UI is split across the
// resume and cover-letter panels.
export type ResumeGenerationUsage = DocumentCreditUsage;
