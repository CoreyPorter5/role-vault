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
        previewPath: initialPreviewPath,
        profileVersion: 1,
        templateVersion: "finance_accounting_v1",
        templateFileName: "finance_accounting_v1.docx",
    },
    {
        key: "sales_marketing",
        label: "Sales & Marketing",
        shortLabel: "Sales & Marketing",
        description: "Sales, growth, communications, content and marketing roles.",
        previewPath: initialPreviewPath,
        profileVersion: 1,
        templateVersion: "sales_marketing_v1",
        templateFileName: "sales_marketing_v1.docx",
    },
    {
        key: "human_resources_admin_operations",
        label: "Human Resources, Administration & Operations",
        shortLabel: "People & Operations",
        description: "People, recruitment, administration, coordination and operations roles.",
        previewPath: initialPreviewPath,
        profileVersion: 1,
        templateVersion: "human_resources_admin_operations_v1",
        templateFileName: "human_resources_admin_operations_v1.docx",
    },
    {
        key: "hospitality_retail_customer_service",
        label: "Hospitality, Retail & Customer Service",
        shortLabel: "Service & Hospitality",
        description: "Hospitality, retail, tourism, customer support and service roles.",
        previewPath: initialPreviewPath,
        profileVersion: 1,
        templateVersion: "hospitality_retail_customer_service_v1",
        templateFileName: "hospitality_retail_customer_service_v1.docx",
    },
    {
        key: "general_professional_other",
        label: "General Professional / Other",
        shortLabel: "General",
        description: "A flexible ATS-friendly option for roles that do not fit another category.",
        previewPath: initialPreviewPath,
        profileVersion: 1,
        templateVersion: "general_professional_other_v1",
        templateFileName: "general_professional_other_v1.docx",
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
