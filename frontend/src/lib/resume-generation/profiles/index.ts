import type {ZodType} from "zod";
import {
    getResumeCategoryDefinition,
    resumeCategoryDefinitions,
    type ResumeCategory,
    type ResumeCategoryDefinition,
} from "../categories.ts";
import {type TailoredResume} from "./base-schema.ts";
import {createInitialResumeSchema} from "./base-schema.ts";
import {financeAccountingResumeSchema} from "./finance.ts";
import {generalProfessionalResumeSchema} from "./general.ts";
import {humanResourcesAdminOperationsResumeSchema} from "./people-operations.ts";
import {salesMarketingResumeSchema} from "./sales-marketing.ts";
import {hospitalityRetailCustomerServiceResumeSchema} from "./service-hospitality.ts";
import {legalResumeSchema} from "./legal.ts";
import {technologyProductDataResumeSchema} from "./technology.ts";

export type ResumeProfile = ResumeCategoryDefinition & {
    schema: ZodType<TailoredResume>;
    generationGuidance: string;
};

const profileSchemas: Record<ResumeCategory, ZodType<TailoredResume>> = {
    technology_product_data: technologyProductDataResumeSchema,
    finance_accounting: financeAccountingResumeSchema,
    sales_marketing: salesMarketingResumeSchema,
    legal: legalResumeSchema,
    human_resources_admin_operations: humanResourcesAdminOperationsResumeSchema,
    hospitality_retail_customer_service: hospitalityRetailCustomerServiceResumeSchema,
    general_professional_other: generalProfessionalResumeSchema,
};

const generationGuidance: Record<ResumeCategory, string> = {
    technology_product_data: "Prioritise technical impact, systems, products, tools, delivery outcomes and supported technical projects. Keep the language precise and avoid unsupported claims of proficiency.",
    finance_accounting: "Lead with the supported finance specialism, named systems and credentials. In experience, favour accuracy, reporting cadence, portfolio or transaction scale, controls, compliance, risk, forecast/model quality, cycle-time, cost, cash flow and commercial outcomes. Distinguish a system used from a claimed proficiency level. Put certifications in credentials, not skills. Return projects as null by default. Use a separate item only for a distinct transaction, audit, model, implementation or transformation that is directly relevant and cannot be told more clearly under employment.",
    sales_marketing: "Lead with the supported market, audience, sales motion or channel and strongest commercial outcome. Prioritise quota attainment, revenue, deal size, pipeline, win or conversion rate, acquisition, retention, reach, engagement, ROI and sales-cycle evidence. Preserve portfolio links. Return projects as null by default. Use that section only for a distinct, source-supported sales or marketing campaign, launch, portfolio case study or commercial initiative that is directly relevant to the target job and has a clear problem, action and result. Do not include technical, software, academic or personal projects unless the source explicitly demonstrates a target-relevant go-to-market, audience, acquisition, conversion, revenue, brand, sales or customer outcome. Never manufacture metrics or imply ownership of a team result.",
    legal: "Use a conservative legal-resume strategy appropriate to the candidate's actual career stage. Never call a candidate a lawyer, solicitor, admitted practitioner or specialist unless the source proves that status. Do not write an objective. Prioritise supported legal research and writing, drafting, document review, discovery, due diligence, file and matter support, court or tribunal support, client and stakeholder service, plain-English communication, commercial awareness, confidentiality and deadline management. For clerkship and graduate applications, surface supported WAM or GPA, honours, awards, relevant subjects, mooting, law journal or review work, clinics, pro bono and leadership. Include non-legal work only when it supplies relevant evidence such as client service, teamwork, organisation, resilience or managing competing deadlines. Keep client and matter identities anonymous unless the source clearly establishes that disclosure is public and appropriate. Put admission, expected admission, PLT or GDLP, practising certificates and memberships in credentials, but never infer them. Always return projects as null.",
    human_resources_admin_operations: "Lead with the supported people or operations function and scope. Prioritise organisation, workforce, project, vendor, budget, location or stakeholder scope where stated; then show recruitment, employee service, policy, compliance, HRIS, scheduling, reporting, adoption, cycle-time, quality, cost and process outcomes. Keep confidential details anonymous. Return projects as null by default. Use a separate initiative only for distinct change or systems work that is directly relevant and cannot be told more clearly under employment. Put professional credentials in credentials.",
    hospitality_retail_customer_service: "Lead with the supported service environment, customer contact and reliability. Prioritise service volume, customer satisfaction, complaint resolution, sales or upselling, cash/POS accuracy, bookings, stock, waste, wait time, safety, hygiene, shift leadership, training and teamwork. Put RSA, RCG, food safety, first aid and other licences in credentials. Always return projects as null and keep initiatives under the job where they occurred.",
    general_professional_other: "Lead with the candidate's supported function, level and most relevant transferable outcome. Prioritise clear action-context-result evidence, scope, quality, efficiency, stakeholder and customer impact. Use exact, job-relevant skills rather than generic traits. Put verified licences and certifications in credentials. Always return projects as null and place relevant initiatives under the role where they occurred.",
};

// Keep every released profile/template pairing in this registry. When a category
// moves to v2, add the new version without removing v1 so saved drafts continue
// to export with the exact schema and DOCX skeleton they were generated against.
const legacyResumeSchema = createInitialResumeSchema();

const legacyProfiles: ResumeProfile[] = resumeCategoryDefinitions
    .filter((definition) => definition.firstProfileVersion === 1)
    .map((definition) => ({
    ...definition,
    previewPath: "/templates/previews/rolevault_ats_classic_v1.svg",
    profileVersion: 1,
    templateVersion: `${definition.key}_v1`,
    templateFileName: `${definition.key}_v1.docx`,
    schema: definition.key === "technology_product_data"
        ? technologyProductDataResumeSchema
        : legacyResumeSchema,
    generationGuidance: generationGuidance[definition.key],
}));

const currentV2Profiles: ResumeProfile[] = resumeCategoryDefinitions
    .filter((definition) => definition.profileVersion > 1)
    .map((definition) => ({
        ...definition,
        schema: profileSchemas[definition.key],
        generationGuidance: generationGuidance[definition.key],
    }));

const releasedProfiles: readonly ResumeProfile[] = [
    ...legacyProfiles,
    ...currentV2Profiles,
];

export function getResumeProfile(category: ResumeCategory): ResumeProfile {
    const definition = getResumeCategoryDefinition(category);
    return getResumeProfileVersion(
        category,
        definition.profileVersion,
        definition.templateVersion,
    );
}

export function getResumeProfileVersion(
    category: ResumeCategory,
    profileVersion: number,
    templateVersion: string,
): ResumeProfile {
    const profile = releasedProfiles.find((candidate) => (
        candidate.key === category &&
        candidate.profileVersion === profileVersion &&
        candidate.templateVersion === templateVersion
    ));
    if (!profile) {
        throw new Error(
            `Unsupported resume profile version: ${category}/${profileVersion}/${templateVersion}`,
        );
    }
    return profile;
}

export type {TailoredResume} from "./base-schema.ts";
