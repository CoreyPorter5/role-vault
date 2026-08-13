import {createResumeProfileSchema} from "./base-schema.ts";

export const generalProfessionalResumeSchema = createResumeProfileSchema({
    summaryDescription: "A focused professional summary that connects the candidate's supported function, level and strongest transferable outcomes to the target role without vague self-praise.",
    summaryMax: 430,
    skillsDescription: "Four to twelve job-relevant, explicitly supported capabilities and tools. Prefer specific functional skills over generic traits unless the source demonstrates them.",
    skillsMax: 12,
    experienceDescription: "Reverse-chronological experience using action, context and supported outcome. Prioritise transferable evidence, scope, quality, efficiency, stakeholder and customer impact.",
    experienceMax: 5,
    projectDescription: "This general profile intentionally has no separate projects section. Return null and place relevant evidence under the role where it occurred.",
    projectMax: 0,
    credentialsDescription: "Supported professional certifications, registrations and licences relevant to the target role. Return null when none are present.",
    credentialsMax: 6,
    educationDescription: "Reverse-chronological education with only supported and role-relevant details.",
    educationMax: 3,
});
