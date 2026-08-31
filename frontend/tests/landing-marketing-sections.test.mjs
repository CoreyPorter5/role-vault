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
const extensionInstall = readFileSync(
    new URL("../components/Marketing/ExtensionInstallSection.tsx", import.meta.url),
    "utf8",
);
const desktopHandoff = readFileSync(
    new URL("../components/Marketing/DesktopHandoffCard.tsx", import.meta.url),
    "utf8",
);
const header = readFileSync(
    new URL("../components/Header/HeaderComponent.tsx", import.meta.url),
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

test("landing page prompts visitors to install the published Chrome extension", () => {
    assert.match(homePage, /<ExtensionInstallSection\s*\/>/);
    assert.match(extensionInstall, /chromewebstore\.google\.com\/detail\/hicmoallocpdeidjhhhdenhdkhllojpi/);
    assert.match(extensionInstall, /\/brands\/google-chrome\.webp/);
    assert.match(extensionInstall, /Add to Chrome/);
    assert.match(extensionInstall, /target="_blank"/);
    assert.match(extensionInstall, /rel="noopener noreferrer"/);
    assert.match(extensionInstall, /Add to Chrome — Desktop/);
    assert.match(extensionInstall, /Desktop Chrome/);
});

test("mobile visitors receive a clear handoff to the desktop web app", () => {
    assert.match(homePage, /<DesktopHandoffCard\s*\/>/);
    assert.match(homePage, /Desktop web app · Companion Chrome extension/);
    assert.match(desktopHandoff, /Continue on a computer/);
    assert.match(desktopHandoff, /desktop web app with a companion Chrome extension/i);
    assert.match(desktopHandoff, /mailto:/);
    assert.match(desktopHandoff, /Copy website link/);
    assert.match(desktopHandoff, /md:hidden/);
    assert.match(header, /href="\/#desktop-handoff"/);
    assert.match(header, /Add to Chrome — Desktop/);
});
