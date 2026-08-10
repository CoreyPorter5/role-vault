import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

import {
    resumeCategoryDefinitions,
    resumeCategorySchema,
} from "../src/lib/resume-generation/categories.ts";
import {createInitialResumeSchema} from "../src/lib/resume-generation/profiles/base-schema.ts";

test("the public category list is fixed, unique, and versioned", () => {
    assert.equal(resumeCategoryDefinitions.length, 6);
    assert.equal(new Set(resumeCategoryDefinitions.map(item => item.key)).size, 6);
    assert.equal(new Set(resumeCategoryDefinitions.map(item => item.templateVersion)).size, 6);

    for (const definition of resumeCategoryDefinitions) {
        assert.equal(resumeCategorySchema.safeParse(definition.key).success, true);
        assert.equal(definition.profileVersion, 1);
        assert.equal(definition.templateVersion, `${definition.key}_v1`);
        assert.equal(definition.templateFileName, `${definition.key}_v1.docx`);
    }
    assert.equal(resumeCategorySchema.safeParse("custom_job_type").success, false);
});

test("all six initial profiles accept the existing resume object contract", () => {
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

    const profileFiles = [
        "technology.ts",
        "finance.ts",
        "sales-marketing.ts",
        "people-operations.ts",
        "service-hospitality.ts",
        "general.ts",
    ];
    for (const profileFile of profileFiles) {
        const source = readFileSync(new URL(`../src/lib/resume-generation/profiles/${profileFile}`, import.meta.url), "utf8");
        assert.match(source, /createInitialResumeSchema\(\)/);
    }

    const schemas = profileFiles.map(() => createInitialResumeSchema());
    for (const schema of schemas) {
        assert.equal(schema.safeParse(currentResume).success, true);
    }
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
