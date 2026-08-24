import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const homePage = readFileSync(
    new URL("../src/app/(with-header)/page.tsx", import.meta.url),
    "utf8",
);
const integrations = readFileSync(
    new URL("../components/Marketing/IntegrationsSection.tsx", import.meta.url),
    "utf8",
);
const workflow = readFileSync(
    new URL("../components/Marketing/HowItWorksSection.tsx", import.meta.url),
    "utf8",
);

test("landing page includes a static and honest integrations section", () => {
    assert.match(homePage, /<IntegrationsSection\s*\/>/);
    assert.match(integrations, /SEEK/);
    assert.match(integrations, /Indeed/);
    assert.match(integrations, /LinkedIn/);
    assert.match(integrations, /Available now/);
    assert.match(integrations, /Coming soon/);
    assert.doesNotMatch(integrations, /data-reveal/);
});

test("landing page uses the new three-step illustrated workflow", () => {
    assert.match(homePage, /<HowItWorksSection\s*\/>/);
    assert.match(workflow, /Capture the role/);
    assert.match(workflow, /Tailor your documents/);
    assert.match(workflow, /Move it forward/);
    assert.match(workflow, /One role\. Three clear steps\./);
    assert.doesNotMatch(homePage, /Save from SEEK.*Keep every stage.*Tailor both documents/s);
});
