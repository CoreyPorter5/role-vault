import {createResumeProfileSchema} from "./base-schema.ts";

export const financeAccountingResumeSchema = createResumeProfileSchema({
    summaryDescription: "A concise finance profile naming the supported specialism, industry context, systems and strongest commercial or control outcome. Do not claim a credential that is not in the source.",
    summaryMax: 440,
    skillsDescription: "Four to twelve supported finance capabilities and named systems, prioritising the job's language: reporting, analysis, controls, compliance, risk, modelling, ERP or advanced spreadsheet work.",
    skillsMax: 12,
    experienceDescription: "Reverse-chronological finance experience. Surface scale, accuracy, deadlines, controls, process improvement and measurable commercial outcomes wherever the source supports them.",
    experienceMax: 5,
    projectDescription: "Return null by default. Include at most two items only for a distinct, source-supported transaction, audit, reporting transformation, model or finance initiative that is directly relevant to the target role and cannot be told more clearly under employment.",
    projectMax: 2,
    projectBulletMax: 4,
    credentialsDescription: "Supported professional designations, licences and relevant certifications such as CA, CPA, CFA or software credentials. Return null when none are present.",
    credentialsMax: 6,
    educationDescription: "Reverse-chronological qualifications. Include relevant majors, honours or coursework only when explicitly supported and useful for an early-career application.",
    educationMax: 3,
});
