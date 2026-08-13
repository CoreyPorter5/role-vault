import {createResumeProfileSchema} from "./base-schema.ts";

export const hospitalityRetailCustomerServiceResumeSchema = createResumeProfileSchema({
    summaryDescription: "A direct service profile grounded in the candidate's supported environment, customer contact, pace, reliability and strongest service, sales, safety or operational outcome.",
    summaryMax: 380,
    skillsDescription: "Four to twelve supported service capabilities, systems and practical skills such as POS, bookings, complaint resolution, cash handling, product knowledge, food safety, stock control, upselling or team coordination.",
    skillsMax: 12,
    experienceDescription: "Reverse-chronological service experience emphasising customer outcomes, service volume, accuracy, speed, teamwork, sales, cleanliness, safety, shift leadership and reliability where supported.",
    experienceMax: 5,
    projectDescription: "This service profile intentionally has no separate projects section. Return null and place relevant initiatives under the role where they occurred.",
    projectMax: 0,
    credentialsDescription: "Supported practical licences, certificates and training such as RSA, RCG, food safety, first aid or barista training, including issuer or date only when known.",
    credentialsMax: 8,
    educationDescription: "Reverse-chronological education and vocational qualifications. Keep the section concise when recent service evidence and required licences are stronger.",
    educationMax: 3,
});
