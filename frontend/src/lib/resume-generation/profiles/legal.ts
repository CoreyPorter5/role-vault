import {createResumeProfileSchema} from "./base-schema.ts";

export const legalResumeSchema = createResumeProfileSchema({
    summaryDescription: "A concise legal profile grounded in supported legal education, admission status, practice exposure and the strongest research, drafting, matter or client-service evidence. Do not use an objective or imply admission, seniority or practice expertise that the source does not establish.",
    summaryMax: 400,
    skillsDescription: "Four to ten supported legal capabilities or practice areas using the target role's language, such as legal research, legal writing, drafting, document review, discovery, due diligence, matter management, client communication or plain-English advice. Do not pad the list with generic traits or unsupported database proficiency.",
    skillsMax: 10,
    experienceDescription: "Reverse-chronological legal and relevant professional experience. Show the type of research, drafting, file or matter support, document review, court or tribunal support, client service and deadline management performed, plus scale or outcomes where supported. Preserve legal professional privilege and confidentiality by anonymising client and matter details.",
    experienceMax: 5,
    projectDescription: "This legal profile intentionally has no projects section. Return null. Put clinics, mooting, journals, research assistance and pro bono work under education details or experience, and never expose confidential client or matter information.",
    projectMax: 0,
    credentialsDescription: "Exact, source-supported admission status and jurisdiction, expected admission date, PLT or GDLP completion, practising certificate and professional memberships. Never infer admission, eligibility, PLT completion or a practising certificate.",
    credentialsMax: 8,
    educationDescription: "Reverse-chronological legal and other qualifications. For early-career candidates, include supported WAM or GPA, honours, academic awards, relevant subjects, mooting, law review or journal work, clinics, pro bono and leadership when they strengthen the application.",
    educationMax: 3,
});
