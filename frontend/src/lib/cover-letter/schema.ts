import {z} from "zod";

const nullableContactField = z.string().trim().min(1).max(160).nullable();

export const COVER_LETTER_TEMPLATE_VERSION = "cover_letter_v1";

export const coverLetterSchema = z.object({
    candidateName: z.string().trim().min(1).max(80),
    candidateContact: z.object({
        location: nullableContactField,
        phone: nullableContactField,
        email: nullableContactField,
    }),
    recipientName: z.string().trim().min(1).max(100).nullable(),
    recipientTitle: z.string().trim().min(1).max(100).nullable(),
    companyName: z.string().trim().min(1).max(120),
    salutation: z.string().trim().min(1).max(100),
    openingParagraph: z.string().trim().min(1).max(1100),
    bodyParagraphs: z.array(z.string().trim().min(1).max(1100)).min(2).max(3),
    closingParagraph: z.string().trim().min(1).max(1100),
    signOff: z.string().trim().min(1).max(40),
});

export type CoverLetter = z.infer<typeof coverLetterSchema>;

export function coverLetterWordCount(letter: CoverLetter) {
    return [letter.openingParagraph, ...letter.bodyParagraphs, letter.closingParagraph]
        .join(" ")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .length;
}

export function coverLetterQualityIssues(letter: CoverLetter): string[] {
    const issues: string[] = [];
    const wordCount = coverLetterWordCount(letter);
    if (wordCount < 250 || wordCount > 350) {
        issues.push(`The letter body is ${wordCount} words; it must be 250–350 words.`);
    }
    if (!/^Dear\b/i.test(letter.salutation)) {
        issues.push("Use a professional salutation beginning with ‘Dear’.");
    }
    if (letter.bodyParagraphs.length !== 2) {
        issues.push("Use exactly two focused evidence paragraphs.");
    }
    return issues;
}
