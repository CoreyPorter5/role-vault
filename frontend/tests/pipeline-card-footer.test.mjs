import assert from "node:assert/strict";
import test from "node:test";

import {getPipelineCardFooter} from "../src/lib/pipeline/card-footer.ts";

test("pipeline card footer follows the stage and document availability", () => {
    assert.equal(getPipelineCardFooter("Saved", false), "saved-actions");
    assert.equal(getPipelineCardFooter("Saved", true), "saved-actions");
    assert.equal(getPipelineCardFooter("Applied", true), "view-documents");
    assert.equal(getPipelineCardFooter("Interviewing", true), "view-documents");
    assert.equal(getPipelineCardFooter("Applied", false), null);
    assert.equal(getPipelineCardFooter("Interviewing", false), null);
    assert.equal(getPipelineCardFooter("Offer", true), null);
    assert.equal(getPipelineCardFooter("Accepted", true), null);
    assert.equal(getPipelineCardFooter("Rejected", true), null);
});
