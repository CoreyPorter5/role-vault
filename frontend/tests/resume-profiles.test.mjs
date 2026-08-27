import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {existsSync, readFileSync} from "node:fs";
import test from "node:test";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import {z} from "zod";

import {
    resumeCategoryDefinitions,
    resumeProjectPresentation,
    resumeCategorySchema,
} from "../src/lib/resume-generation/categories.ts";
import {createInitialResumeSchema} from "../src/lib/resume-generation/profiles/base-schema.ts";
import {
    getResumeProfile,
    getResumeProfileVersion,
} from "../src/lib/resume-generation/profiles/index.ts";
import {createResumeTemplateData} from "../src/lib/resume-generation/docx-data.ts";

const currentResume = {
    fullName: "Example Candidate",
    professionalTitle: "Analyst",
    contact: {
        location: "Sydney",
        phone: null,
        email: "candidate@example.com",
        linkedin: null,
        github: null,
        portfolioSite: null,
    },
    professionalSummary: "A factual professional summary.",
    skills: ["Analysis", "Communication"],
    experience: [{
        title: "Analyst",
        company: "Example Company",
        location: "Sydney",
        dates: "2024 - Present",
        bullets: ["Analysed supported business information", "Prepared accurate reports"],
    }],
    projects: null,
    education: [],
};

test("the public category list is fixed, unique, and versioned", () => {
    assert.equal(resumeCategoryDefinitions.length, 7);
    assert.equal(new Set(resumeCategoryDefinitions.map(item => item.key)).size, 7);
    assert.equal(new Set(resumeCategoryDefinitions.map(item => item.templateVersion)).size, 7);

    for (const definition of resumeCategoryDefinitions) {
        assert.equal(resumeCategorySchema.safeParse(definition.key).success, true);
        const expectedVersion = definition.key === "technology_product_data" ? 1 : 2;
        assert.equal(definition.profileVersion, expectedVersion);
        assert.equal(definition.firstProfileVersion, definition.key === "legal" ? 2 : 1);
        assert.equal(definition.templateVersion, `${definition.key}_v${expectedVersion}`);
        assert.equal(definition.templateFileName, `${definition.key}_v${expectedVersion}.docx`);
    }
    assert.equal(resumeCategorySchema.safeParse("custom_job_type").success, false);
});

test("released v1 profiles remain valid while the six current v2 profiles use distinct schemas", () => {
    const currentSchemaJSON = [];
    for (const definition of resumeCategoryDefinitions) {
        if (definition.firstProfileVersion === 1) {
            const legacy = getResumeProfileVersion(definition.key, 1, `${definition.key}_v1`);
            assert.equal(legacy.schema.safeParse(currentResume).success, true);
        }

        const current = getResumeProfile(definition.key);
        if (definition.profileVersion === 1) {
            assert.equal(current.schema.safeParse(currentResume).success, true);
            continue;
        }
        assert.equal(current.schema.safeParse(currentResume).success, false);
        assert.equal(current.schema.safeParse({...currentResume, credentials: null}).success, true);
        currentSchemaJSON.push(JSON.stringify(z.toJSONSchema(current.schema)));
    }
    assert.equal(new Set(currentSchemaJSON).size, 6);

    const serviceProfile = getResumeProfile("hospitality_retail_customer_service");
    assert.equal(serviceProfile.schema.safeParse({
        ...currentResume,
        credentials: null,
        projects: [{name: "Campaign", technologies: null, bullets: ["One", "Two"]}],
    }).success, false);

    const generalProfile = getResumeProfile("general_professional_other");
    assert.equal(generalProfile.schema.safeParse({
        ...currentResume,
        credentials: null,
        projects: [{name: "Project", technologies: null, bullets: ["One", "Two"]}],
    }).success, false);

    const legalProfile = getResumeProfile("legal");
    assert.equal(legalProfile.schema.safeParse({
        ...currentResume,
        credentials: null,
        projects: [{name: "Matter", technologies: null, bullets: ["One", "Two"]}],
    }).success, false);
    assert.match(legalProfile.generationGuidance, /Never call a candidate a lawyer/);
    assert.match(legalProfile.generationGuidance, /Always return projects as null/);

    const salesProfile = getResumeProfile("sales_marketing");
    assert.equal(salesProfile.schema.safeParse({
        ...currentResume,
        credentials: null,
        projects: [
            {name: "Campaign 1", technologies: ["Email"], bullets: ["One", "Two"]},
            {name: "Campaign 2", technologies: ["Paid search"], bullets: ["One", "Two"]},
            {name: "Campaign 3", technologies: ["SEO"], bullets: ["One", "Two"]},
        ],
    }).success, false);

    assert.deepEqual(resumeProjectPresentation.sales_marketing, {
        sectionLabel: "Campaigns & selected work",
        itemLabel: "Campaign or case study",
        supportingLabel: "Channels & platforms",
        supportingHint: "One supported channel or platform per line",
        achievementLabel: "Commercial outcome",
    });
});

test("resume email validation remains compatible with OpenAI structured outputs", () => {
    const schema = createInitialResumeSchema();
    const emailSchema = schema.shape.contact.shape.email;

    assert.equal(emailSchema.safeParse("candidate@example.com").success, true);
    assert.equal(emailSchema.safeParse("not-an-email").success, false);

    const providerSchema = JSON.stringify(z.toJSONSchema(schema));
    assert.doesNotMatch(providerSchema, /\(\?[=!<]/);
});

test("export resolves the exact released profile metadata instead of only the current profile", () => {
    const profileRegistry = readFileSync(
        new URL("../src/lib/resume-generation/profiles/index.ts", import.meta.url),
        "utf8",
    );
    const exportRoute = readFileSync(
        new URL("../src/app/api/export-resume-docx/route.ts", import.meta.url),
        "utf8",
    );

    assert.match(profileRegistry, /const releasedProfiles:/);
    assert.match(profileRegistry, /candidate\.profileVersion === profileVersion/);
    assert.match(profileRegistry, /candidate\.templateVersion === templateVersion/);
    assert.match(exportRoute, /getResumeProfileVersion/);
});

test("all v2 DOCX files are unique, ATS-safe, and render their strict profile contract", () => {
    const v2Definitions = resumeCategoryDefinitions.filter(item => item.profileVersion === 2);
    const hashes = new Set();

    for (const definition of v2Definitions) {
        const templateURL = new URL(`../src/server/templates/${definition.templateFileName}`, import.meta.url);
        const previewURL = new URL(`../public${definition.previewPath}`, import.meta.url);
        assert.equal(existsSync(templateURL), true);
        assert.equal(existsSync(previewURL), true);

        const template = readFileSync(templateURL);
        hashes.add(createHash("sha256").update(template).digest("hex"));
        const zip = new PizZip(template);
        const sourceXML = zip.file("word/document.xml").asText();
        assert.doesNotMatch(sourceXML, /<w:(?:tbl|drawing|pict|txbxContent)\b/);
        assert.match(sourceXML, /\{fullName\}/);
        assert.match(sourceXML, /\{professionalSummary\}/);
        assert.match(sourceXML, /\{#experience\}/);
        assert.match(sourceXML, /\{#credentials\}/);
        assert.match(sourceXML, /\{#education\}/);
        if ([
            "general_professional_other",
            "legal",
        ].includes(definition.key)) {
            assert.doesNotMatch(sourceXML, /\{#projects\}/);
            assert.doesNotMatch(sourceXML, /\{#hasProjects\}/);
        }

        const resume = {...currentResume, credentials: null};
        const profile = getResumeProfile(definition.key);
        const parsed = profile.schema.parse(resume);
        const rendered = new Docxtemplater(zip, {paragraphLoop: true, linebreaks: true});
        rendered.render(createResumeTemplateData(parsed));
        const renderedXML = rendered.getZip().file("word/document.xml").asText();
        assert.doesNotMatch(renderedXML, /\{[#/.]?\w+/);
    }

    assert.equal(hashes.size, 6);
});

test("all released v1 templates still render historical drafts", () => {
    for (const definition of resumeCategoryDefinitions) {
        if (definition.firstProfileVersion !== 1) {
            continue;
        }
        const legacy = getResumeProfileVersion(definition.key, 1, `${definition.key}_v1`);
        const template = readFileSync(new URL(
            `../src/server/templates/${definition.key}_v1.docx`,
            import.meta.url,
        ));
        const rendered = new Docxtemplater(new PizZip(template), {
            paragraphLoop: true,
            linebreaks: true,
        });
        rendered.render(createResumeTemplateData(legacy.schema.parse(currentResume)));
        const renderedXML = rendered.getZip().file("word/document.xml").asText();
        assert.doesNotMatch(renderedXML, /\{[#/.]?\w+/);
    }
});
