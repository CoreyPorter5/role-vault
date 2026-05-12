export type ResumeHealthCheck = {
    id: string;
    label: string;
    passed: boolean;
    helper: string;
};

const SECTION_HEADINGS = [
    "summary",
    "professional summary",
    "career summary",
    "profile",
    "objective",

    "skills",
    "key skills",
    "core skills",
    "core strengths",
    "strengths",
    "competencies",
    "core competencies",
    "capabilities",
    "areas of expertise",
    "expertise",
    "technical skills",
    "professional skills",

    "experience",
    "professional experience",
    "work experience",
    "employment",
    "employment history",
    "career history",
    "professional history",

    "education",
    "academic background",
    "qualifications",
    "training",
    "certifications",

    "projects",
    "achievements",
    "leadership",
    "volunteering",
    "extracurricular activities",
    "additional information",
];

const SKILLS_HEADINGS = [
    "skills",
    "key skills",
    "core skills",
    "core strengths",
    "strengths",
    "competencies",
    "core competencies",
    "capabilities",
    "areas of expertise",
    "expertise",
    "technical skills",
    "professional skills",
];

const EXPERIENCE_HEADINGS = [
    "experience",
    "professional experience",
    "work experience",
    "employment",
    "employment history",
    "career history",
    "professional history",
];

const EDUCATION_HEADINGS = [
    "education",
    "academic background",
    "qualifications",
    "training",
    "certifications",
];

function normaliseLine(line: string) {
    return line
        .trim()
        .replace(/:$/, "")
        .replace(/\s+/g, " ")
        .toLowerCase();
}

function isKnownHeading(line: string) {
    const normalised = normaliseLine(line);
    return SECTION_HEADINGS.includes(normalised);
}

function getSectionContent(lines: string[], headings: string[]) {
    const startIndex = lines.findIndex((line) =>
        headings.includes(normaliseLine(line))
    );

    if (startIndex === -1) {
        return [];
    }

    const sectionLines: string[] = [];

    for (let i = startIndex + 1; i < lines.length; i++) {
        if (isKnownHeading(lines[i])) {
            break;
        }

        if (lines[i].trim()) {
            sectionLines.push(lines[i].trim());
        }
    }

    return sectionLines;
}

function countListLikeItems(lines: string[]) {
    let count = 0;

    for (const line of lines) {
        const trimmed = line.trim();

        if (/^[-•–]\s+/.test(trimmed)) {
            count += 1;
            continue;
        }

        if (trimmed.includes("|")) {
            count += trimmed.split("|").map((x) => x.trim()).filter(Boolean).length;
            continue;
        }

        if (trimmed.includes(",")) {
            count += trimmed.split(",").map((x) => x.trim()).filter(Boolean).length;
            continue;
        }

        if (trimmed.includes(":")) {
            const afterColon = trimmed.split(":").slice(1).join(":");
            count += afterColon
                .split(/[,|]/)
                .map((x) => x.trim())
                .filter(Boolean).length;
            continue;
        }

        count += 1;
    }

    return count;
}

export function analyseResumeHealth(
    plaintext?: string | null
): ResumeHealthCheck[] {
    const text = plaintext?.trim() ?? "";

    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    const wordCount = text.split(/\s+/).filter(Boolean).length;

    const hasEmail =
        /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text);

    const hasPhone =
        /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}/.test(
            text
        );

    const hasContactDetails = hasEmail || hasPhone;

    const skillsContent = getSectionContent(lines, SKILLS_HEADINGS);
    const skillItemCount = countListLikeItems(skillsContent);
    const hasSkillsOrCompetencies = skillsContent.length > 0 && skillItemCount >= 3;

    const yearRangePattern =
        /\b(?:19|20)\d{2}\s*(?:-|–|—|to)\s*(?:(?:19|20)\d{2}|present|current|now)\b/i;

    const monthYearRangePattern =
        /\b(?:jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+(?:19|20)\d{2}\s*(?:-|–|—|to)\s*(?:(?:jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+)?(?:(?:19|20)\d{2}|present|current|now)\b/i;

    const standaloneYearCount = lines.filter((line) =>
        /\b(?:19|20)\d{2}\b/.test(line)
    ).length;

    const hasDates =
        yearRangePattern.test(text) ||
        monthYearRangePattern.test(text) ||
        standaloneYearCount >= 2;

    const experienceContent = getSectionContent(lines, EXPERIENCE_HEADINGS);
    const experienceHasBullets = experienceContent.some((line) =>
        /^[-•–]\s+/.test(line)
    );
    const experienceHasDates = experienceContent.some((line) =>
        /\b(?:19|20)\d{2}|present|current|now\b/i.test(line)
    );

    const hasExperienceSection =
        experienceContent.length >= 3 && (experienceHasBullets || experienceHasDates);

    const educationContent = getSectionContent(lines, EDUCATION_HEADINGS);
    const educationText = educationContent.join(" ");

    const hasEducationTerms =
        /\b(university|college|school|tafe|institute|bachelor|master|degree|diploma|certificate|certification|qualification|graduation|course|training)\b/i.test(
            educationText
        );

    const hasEducationSection =
        educationContent.length >= 1 && hasEducationTerms;

    const hasEnoughSourceMaterial = wordCount >= 250;

    return [
        {
            id: "contact",
            label: "Contact details detected",
            passed: hasContactDetails,
            helper: hasContactDetails
                ? "Email or phone number found."
                : "Add an email address or phone number.",
        },
        {
            id: "skills",
            label: "Skills or competencies found",
            passed: hasSkillsOrCompetencies,
            helper: hasSkillsOrCompetencies
                ? `${skillItemCount} skills or competency items detected.`
                : "Add a skills, strengths, competencies, or expertise section with at least 3 items.",
        },
        {
            id: "dates",
            label: "Dates included",
            passed: hasDates,
            helper: hasDates
                ? "Resume dates detected."
                : "Add dates for roles, education, projects, or training.",
        },
        {
            id: "source-material",
            label: "Enough source material",
            passed: hasEnoughSourceMaterial,
            helper: `${wordCount} words detected. ${
                hasEnoughSourceMaterial
                    ? "Enough detail for tailoring."
                    : "Add more detail about experience, education, skills, or achievements."
            }`,
        },
        {
            id: "experience",
            label: "Experience section",
            passed: hasExperienceSection,
            helper: hasExperienceSection
                ? "Experience section with supporting details detected."
                : "Add a clear experience section with role details, dates, or bullet points.",
        },
        {
            id: "education",
            label: "Education section",
            passed: hasEducationSection,
            helper: hasEducationSection
                ? "Education, training, or qualification details detected."
                : "Add an education, qualification, certification, or training section.",
        },
    ];
}