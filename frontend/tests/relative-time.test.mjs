import assert from "node:assert/strict";
import test from "node:test";

import {formatRelativeTime} from "../src/lib/date/relative-time.ts";

const now = new Date("2026-08-06T12:00:00.000Z");

test("times under an hour are Just Now", () => {
    assert.equal(formatRelativeTime("2026-08-06T11:59:00.000Z", now), "Just Now");
});

test("hours stay readable below one day", () => {
    assert.equal(formatRelativeTime("2026-08-06T11:00:00.000Z", now), "1 hour ago");
    assert.equal(formatRelativeTime("2026-08-06T00:00:00.000Z", now), "12 hours ago");
});

test("large hour counts roll into days and larger units", () => {
    assert.equal(formatRelativeTime("2026-08-01T11:00:00.000Z", now), "5 days ago");
    assert.equal(formatRelativeTime("2026-07-23T12:00:00.000Z", now), "2 weeks ago");
});

test("future dates are treated as Just Now and invalid dates are safe", () => {
    assert.equal(formatRelativeTime("2026-08-06T13:00:00.000Z", now), "Just Now");
    assert.equal(formatRelativeTime("not-a-date", now), "Time unavailable");
});
