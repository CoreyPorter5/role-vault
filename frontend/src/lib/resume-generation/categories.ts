import {z} from "zod";

export const resumeCategoryValues = [
    "technology_product_data",
    "finance_accounting",
    "sales_marketing",
    "human_resources_admin_operations",
    "hospitality_retail_customer_service",
    "general_professional_other",
] as const;

export const resumeCategorySchema = z.enum(resumeCategoryValues);

export type ResumeCategory = z.infer<typeof resumeCategorySchema>;

export type ResumeCategoryDefinition = {
    key: ResumeCategory;
    label: string;
    shortLabel: string;
    description: string;
    previewPath: string;
    profileVersion: number;
    templateVersion: string;
    templateFileName: string;
};

export type ResumeProjectPresentation = {
    sectionLabel: string;
    itemLabel: string;
    supportingLabel: string;
    supportingHint: string;
    achievementLabel: string;
};

export const resumeEditorLimits: Record<ResumeCategory, {summaryMax: number; skillsMax: number}> = {
    technology_product_data: {summaryMax: 550, skillsMax: 15},
    finance_accounting: {summaryMax: 440, skillsMax: 12},
    sales_marketing: {summaryMax: 440, skillsMax: 12},
    human_resources_admin_operations: {summaryMax: 460, skillsMax: 14},
    hospitality_retail_customer_service: {summaryMax: 380, skillsMax: 12},
    general_professional_other: {summaryMax: 430, skillsMax: 12},
};

export const resumeProjectPresentation: Record<ResumeCategory, ResumeProjectPresentation> = {
    technology_product_data: {
        sectionLabel: "Projects",
        itemLabel: "Project",
        supportingLabel: "Technologies",
        supportingHint: "One technology per line",
        achievementLabel: "Project achievement",
    },
    finance_accounting: {
        sectionLabel: "Transactions & projects",
        itemLabel: "Transaction or project",
        supportingLabel: "Systems & methods",
        supportingHint: "One supported system or method per line",
        achievementLabel: "Outcome",
    },
    sales_marketing: {
        sectionLabel: "Campaigns & selected work",
        itemLabel: "Campaign or case study",
        supportingLabel: "Channels & platforms",
        supportingHint: "One supported channel or platform per line",
        achievementLabel: "Commercial outcome",
    },
    human_resources_admin_operations: {
        sectionLabel: "Initiatives",
        itemLabel: "Initiative",
        supportingLabel: "Systems & methods",
        supportingHint: "One supported system or method per line",
        achievementLabel: "Initiative outcome",
    },
    hospitality_retail_customer_service: {
        sectionLabel: "Initiatives",
        itemLabel: "Initiative",
        supportingLabel: "Systems & methods",
        supportingHint: "One supported system or method per line",
        achievementLabel: "Outcome",
    },
    general_professional_other: {
        sectionLabel: "Selected projects",
        itemLabel: "Project",
        supportingLabel: "Tools & methods",
        supportingHint: "One supported tool or method per line",
        achievementLabel: "Project outcome",
    },
};

const initialPreviewPath = "/templates/previews/seeksync_ats_classic_v1.svg";

export const resumeCategoryDefinitions: readonly ResumeCategoryDefinition[] = [
    {
        key: "technology_product_data",
        label: "Technology, Product & Data",
        shortLabel: "Technology",
        description: "Engineering, IT, product, design, analytics and data roles.",
        previewPath: initialPreviewPath,
        profileVersion: 1,
        templateVersion: "technology_product_data_v1",
        templateFileName: "technology_product_data_v1.docx",
    },
    {
        key: "finance_accounting",
        label: "Finance & Accounting",
        shortLabel: "Finance",
        description: "Accounting, banking, financial analysis, audit and risk roles.",
        previewPath: "/templates/previews/finance_accounting_v2.svg",
        profileVersion: 2,
        templateVersion: "finance_accounting_v2",
        templateFileName: "finance_accounting_v2.docx",
    },
    {
        key: "sales_marketing",
        label: "Sales & Marketing",
        shortLabel: "Sales & Marketing",
        description: "Sales, growth, communications, content and marketing roles.",
        previewPath: "/templates/previews/sales_marketing_v2.svg",
        profileVersion: 2,
        templateVersion: "sales_marketing_v2",
        templateFileName: "sales_marketing_v2.docx",
    },
    {
        key: "human_resources_admin_operations",
        label: "Human Resources, Administration & Operations",
        shortLabel: "People & Operations",
        description: "People, recruitment, administration, coordination and operations roles.",
        previewPath: "/templates/previews/human_resources_admin_operations_v2.svg",
        profileVersion: 2,
        templateVersion: "human_resources_admin_operations_v2",
        templateFileName: "human_resources_admin_operations_v2.docx",
    },
    {
        key: "hospitality_retail_customer_service",
        label: "Hospitality, Retail & Customer Service",
        shortLabel: "Service & Hospitality",
        description: "Hospitality, retail, tourism, customer support and service roles.",
        previewPath: "/templates/previews/hospitality_retail_customer_service_v2.svg",
        profileVersion: 2,
        templateVersion: "hospitality_retail_customer_service_v2",
        templateFileName: "hospitality_retail_customer_service_v2.docx",
    },
    {
        key: "general_professional_other",
        label: "General Professional / Other",
        shortLabel: "General",
        description: "A flexible ATS-friendly option for roles that do not fit another category.",
        previewPath: "/templates/previews/general_professional_other_v2.svg",
        profileVersion: 2,
        templateVersion: "general_professional_other_v2",
        templateFileName: "general_professional_other_v2.docx",
    },
] as const;

const definitionByCategory = new Map(
    resumeCategoryDefinitions.map((definition) => [definition.key, definition]),
);

export function getResumeCategoryDefinition(category: ResumeCategory): ResumeCategoryDefinition {
    const definition = definitionByCategory.get(category);
    if (!definition) {
        throw new Error(`Unsupported resume category: ${category}`);
    }
    return definition;
}
