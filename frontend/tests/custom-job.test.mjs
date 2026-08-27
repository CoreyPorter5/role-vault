import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

function read(relativePath) {
    return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("dashboard exposes a custom-job form backed by the dedicated API", () => {
    const dashboard = read("../src/app/dashboard/page.tsx");
    const popup = read("../components/Dashboard/CustomJob/CustomJobPopup.tsx");

    assert.match(dashboard, /Add custom job/);
    assert.match(dashboard, /<CustomJobPopup/);
    assert.match(popup, /\/api\/v1\/jobs\/custom/);
    assert.match(popup, /jobDescription\.trim\(\)\.length < 100/);
    assert.match(popup, /resumeCategory === "auto" \? undefined/);
    assert.match(popup, /JobSchema\.safeParse/);
});

test("custom job cards keep RoleVault actions and omit SEEK-only destinations", () => {
    const selectedCard = read("../components/Dashboard/Pipeline/SelectedJobCard.tsx");
    const pipelineCard = read("../components/Dashboard/Pipeline/DraggableJobCard.tsx");

    for (const source of [selectedCard, pipelineCard]) {
        assert.match(source, /isCustomJob/);
    }
    assert.match(selectedCard, /customJob \? "Added" : "Synced"/);
    assert.match(selectedCard, /listingURL \?/);
    assert.match(pipelineCard, /!customJob \?/);
});
