import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import test from "node:test";

const routes = [
    "../src/app/api/export-resume-docx/route.ts",
    "../src/app/api/export-cover-letter-docx/route.ts",
];

test("DOCX exports authenticate and read through the bounded JSON helper", () => {
    for (const route of routes) {
        const source = readFileSync(new URL(route, import.meta.url), "utf8");
        assert.match(source, /hasAuthenticatedApiUser\(\)/, `${route} must authenticate`);
        assert.match(source, /readLimitedJsonBody\(/, `${route} must enforce a body limit`);
        assert.doesNotMatch(source, /request\.json\(/, `${route} must not buffer uncapped JSON`);
    }
});

test("DOCX source templates are server-only", () => {
    const publicTemplateNames = [
        "cover_letter_v1.docx",
        "technology_product_data_v1.docx",
        "finance_accounting_v2.docx",
        "sales_marketing_v2.docx",
        "legal_v2.docx",
        "human_resources_admin_operations_v2.docx",
        "hospitality_retail_customer_service_v2.docx",
        "general_professional_other_v2.docx",
    ];

    for (const templateName of publicTemplateNames) {
        assert.equal(existsSync(new URL(`../public/templates/${templateName}`, import.meta.url)), false);
        assert.equal(existsSync(new URL(`../src/server/templates/${templateName}`, import.meta.url)), true);
    }
});
