import type {ZodType} from "zod";
import {
    getResumeCategoryDefinition,
    resumeCategoryDefinitions,
    type ResumeCategory,
    type ResumeCategoryDefinition,
} from "../categories";
import {type TailoredResume} from "./base-schema";
import {financeAccountingResumeSchema} from "./finance";
import {generalProfessionalResumeSchema} from "./general";
import {humanResourcesAdminOperationsResumeSchema} from "./people-operations";
import {salesMarketingResumeSchema} from "./sales-marketing";
import {hospitalityRetailCustomerServiceResumeSchema} from "./service-hospitality";
import {technologyProductDataResumeSchema} from "./technology";

export type ResumeProfile = ResumeCategoryDefinition & {
    schema: ZodType<TailoredResume>;
    generationGuidance: string;
};

const profileSchemas: Record<ResumeCategory, ZodType<TailoredResume>> = {
    technology_product_data: technologyProductDataResumeSchema,
    finance_accounting: financeAccountingResumeSchema,
    sales_marketing: salesMarketingResumeSchema,
    human_resources_admin_operations: humanResourcesAdminOperationsResumeSchema,
    hospitality_retail_customer_service: hospitalityRetailCustomerServiceResumeSchema,
    general_professional_other: generalProfessionalResumeSchema,
};

const generationGuidance: Record<ResumeCategory, string> = {
    technology_product_data: "Prioritise technical impact, systems, products, tools, delivery outcomes and supported technical projects. Keep the language precise and avoid unsupported claims of proficiency.",
    finance_accounting: "Prioritise financial accuracy, analysis, reporting, controls, compliance, risk awareness and measurable commercial impact. Include projects only when the source clearly describes a relevant finance initiative.",
    sales_marketing: "Prioritise revenue, pipeline, campaigns, audiences, conversion, retention, communication and supported commercial outcomes. Use metrics only when they are present in the master resume.",
    human_resources_admin_operations: "Prioritise recruitment, employee support, policy, coordination, process improvement, stakeholder service and operational reliability. Frame initiatives as projects only when the source explicitly supports them.",
    hospitality_retail_customer_service: "Prioritise customer service, reliability, teamwork, safety, service volume, conflict resolution and relevant licences. Set projects to null because this initial service profile does not use a projects section.",
    general_professional_other: "Prioritise broadly transferable accomplishments, role-relevant skills and clear evidence from the source. Avoid industry-specific assumptions and include projects only when they materially support the target role.",
};

// Keep every released profile/template pairing in this registry. When a category
// moves to v2, add the new version without removing v1 so saved drafts continue
// to export with the exact schema and DOCX skeleton they were generated against.
const releasedProfiles: readonly ResumeProfile[] = resumeCategoryDefinitions.map((definition) => ({
    ...definition,
    schema: profileSchemas[definition.key],
    generationGuidance: generationGuidance[definition.key],
}));

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

export type {TailoredResume} from "./base-schema";
