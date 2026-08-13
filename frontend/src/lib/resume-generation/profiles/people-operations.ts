import {createResumeProfileSchema} from "./base-schema.ts";

export const humanResourcesAdminOperationsResumeSchema = createResumeProfileSchema({
    summaryDescription: "A concise people or operations profile grounded in supported scope, stakeholders, systems and outcomes. Distinguish HR, administration, project coordination and operational delivery without inflating seniority.",
    summaryMax: 460,
    skillsDescription: "Four to fourteen supported people, administration and operations capabilities, systems and methods, prioritising job-relevant terms such as recruitment, employee support, policy, rostering, HRIS, reporting, vendors, projects or process improvement.",
    skillsMax: 14,
    experienceDescription: "Reverse-chronological experience showing organisation or project scope where supported, stakeholder groups served, reliable delivery, compliance, adoption, cycle-time, cost, quality and people outcomes.",
    experienceMax: 5,
    projectDescription: "Return null by default. Include at most two items only for a distinct, source-supported people, change, systems or operational initiative that is directly relevant to the target role and cannot be told more clearly under employment.",
    projectMax: 2,
    projectBulletMax: 4,
    credentialsDescription: "Supported HR, project, change, safety, systems or industry credentials and licences. Return null when none are present.",
    credentialsMax: 7,
    educationDescription: "Reverse-chronological education and relevant supported development, with credentials kept in their dedicated section.",
    educationMax: 3,
});
