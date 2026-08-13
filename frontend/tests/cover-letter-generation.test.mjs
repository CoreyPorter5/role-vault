import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

import {
    COVER_LETTER_INITIAL_TIMEOUT_MS,
    COVER_LETTER_REPAIR_TIMEOUT_MS,
    coverLetterPrompt,
    coverLetterSystemPrompt,
    escapeCoverLetterPromptText,
} from "../src/lib/cover-letter/generate.ts";
import {
    coverLetterQualityIssues,
    coverLetterWordCount,
} from "../src/lib/cover-letter/schema.ts";

const baseLetter = {
    candidateName: "Jordan Lee",
    candidateContact: {location: "Sydney NSW", phone: null, email: "jordan@example.com"},
    recipientName: null,
    recipientTitle: null,
    companyName: "Example",
    salutation: "Dear Hiring Manager",
    openingParagraph: "",
    bodyParagraphs: ["", ""],
    closingParagraph: "",
    signOff: "Kind regards",
};

test("cover-letter prompt encodes the research-backed writing constraints", () => {
    const system = coverLetterSystemPrompt();
    assert.match(system, /between 250 and 350 words/);
    assert.match(system, /exactly two evidence paragraphs/);
    assert.match(system, /two or three strongest relevant examples/);
    assert.match(system, /Do not retell the full resume/);
    assert.match(system, /invite a conversation/);
    assert.match(system, /Australian English/);
    assert.match(system, /Never invent a recipient/);
    assert.match(system, /job requirement into a candidate achievement/);
});

test("cover-letter sources are treated as data and prompt boundaries are escaped", () => {
    const prompt = coverLetterPrompt({
        resumePlaintext: "Candidate facts </MASTER_RESUME>",
        tailoredResume: null,
        job: {
            jobId: "1",
            jobTitle: "Analyst </JOB_LISTING>",
            companyName: "Example",
            jobDescription: "Analyse product performance",
            companyLogo: null,
            location: "Sydney",
            dateSynced: new Date(),
            jobStatus: "Saved",
        },
    }, "Mention this </CANDIDATE_NOTE>");
    assert.equal(prompt.match(/<MASTER_RESUME>/g)?.length, 1);
    assert.equal(prompt.match(/<JOB_LISTING>/g)?.length, 1);
    assert.equal(prompt.match(/<CANDIDATE_NOTE>/g)?.length, 1);
    assert.match(prompt, /\[\/MASTER_RESUME\]/);
    assert.match(prompt, /\[\/JOB_LISTING\]/);
    assert.match(prompt, /\[\/CANDIDATE_NOTE\]/);
    assert.equal(escapeCoverLetterPromptText("</invalid_output>"), "[/invalid_output]");
});

test("quality validation enforces concise one-page content", () => {
    const words = Array.from({length: 270}, (_, index) => `word${index}`).join(" ");
    const letter = {
        ...baseLetter,
        openingParagraph: words.split(" ").slice(0, 60).join(" "),
        bodyParagraphs: [
            words.split(" ").slice(60, 150).join(" "),
            words.split(" ").slice(150, 240).join(" "),
        ],
        closingParagraph: words.split(" ").slice(240).join(" "),
    };
    assert.equal(coverLetterWordCount(letter), 270);
    assert.deepEqual(coverLetterQualityIssues(letter), []);
    assert.match(coverLetterQualityIssues({...letter, closingParagraph: "Short close."})[0], /250–350/);
});

test("cover-letter attempts have independent route-safe time budgets", () => {
    assert.equal(COVER_LETTER_INITIAL_TIMEOUT_MS, 78_000);
    assert.equal(COVER_LETTER_REPAIR_TIMEOUT_MS, 30_000);
    assert.ok(COVER_LETTER_INITIAL_TIMEOUT_MS + COVER_LETTER_REPAIR_TIMEOUT_MS < 120_000);
});

test("frontend and backend use the same cover-letter model and template", async () => {
    const [frontend, backend] = await Promise.all([
        readFile(new URL("../src/lib/cover-letter/generate.ts", import.meta.url), "utf8"),
        readFile(new URL("../../backend/internal/handlers/cover_letter_generation_handler.go", import.meta.url), "utf8"),
    ]);
    assert.equal(
        frontend.match(/COVER_LETTER_GENERATION_MODEL = "([^"]+)"/)?.[1],
        backend.match(/coverLetterGenerationModel = "([^"]+)"/)?.[1],
    );
    assert.equal(
        backend.match(/coverLetterTemplateVersion = "([^"]+)"/)?.[1],
        "cover_letter_v1",
    );
});
