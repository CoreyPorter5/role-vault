import assert from "node:assert/strict";
import {readFile, stat} from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const extensionRoot = path.resolve(import.meta.dirname, "..");
const distRoot = path.join(extensionRoot, "dist");

async function readDist(relativePath) {
    return readFile(path.join(distRoot, relativePath));
}

test("built manifest references complete packaged assets", async () => {
    const manifest = JSON.parse(
        await readDist("manifest.json"),
    );

    const referencedFiles = [
        manifest.action.default_popup,
        manifest.background.service_worker,
        ...Object.values(manifest.icons),
        ...manifest.content_scripts.flatMap((entry) => [
            ...entry.js,
            ...entry.css,
        ]),
    ];

    for (const relativePath of referencedFiles) {
        const file = await stat(path.join(distRoot, relativePath));
        assert.equal(file.isFile(), true, `${relativePath} is missing`);
    }

    assert.equal(manifest.icons["48"], "icons/icon48.png");
    assert.deepEqual(manifest.permissions, ["webNavigation"]);
    assert.deepEqual(
        manifest.content_scripts[0].matches,
        ["https://au.seek.com/*"],
    );
});

test("built background does not contain session response logging", async () => {
    const background = (await readDist("background.js")).toString("utf8");

    assert.doesNotMatch(background, /Extension session response/);
    assert.doesNotMatch(background, /responseText/);
    assert.doesNotMatch(background, /console\.log/);
});

test("built content script contains SPA reconciliation signals", async () => {
    const content = (await readDist("content.js")).toString("utf8");

    assert.match(content, /SEEK_NAVIGATION_CHANGED/);
    assert.match(content, /data-seeksync-job-id/);
    assert.match(content, /CHECK_AUTH/);
});
