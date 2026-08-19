import assert from "node:assert/strict";
import test from "node:test";

import {
    combineAuthCookieChunks,
    filterAuthCookiesForOrigin,
    isAuthCookieName,
    normalizeAuthCookieName,
    splitAuthCookieValue,
} from "../src/utils/authCookies.ts";

const authCookieName = "sb-abcdefghijklmnopqrst-auth-token";

test("combines only contiguous Supabase auth cookie chunks", () => {
    assert.equal(combineAuthCookieChunks([
        {name: "unrelated", value: "private"},
        {name: `${authCookieName}.1`, value: "two"},
        {name: `${authCookieName}.0`, value: "base64-one"},
    ], authCookieName), "base64-onetwo");
    assert.equal(combineAuthCookieChunks([
        {name: `${authCookieName}.1`, value: "orphan"},
    ], authCookieName), null);
});

test("splits refreshed auth values back into browser-safe cookie chunks", () => {
    const value = `base64-${"a".repeat(6_500)}`;
    const chunks = splitAuthCookieValue(value, authCookieName);
    assert.equal(chunks.length, 3);
    assert.deepEqual(chunks.map(({name}) => name), [
        `${authCookieName}.0`,
        `${authCookieName}.1`,
        `${authCookieName}.2`,
    ]);
    assert.equal(chunks.map(({value: chunk}) => chunk).join(""), value);
});

test("auth cookie names are project-scoped and bounded", () => {
    assert.equal(normalizeAuthCookieName(authCookieName), authCookieName);
    assert.throws(() => normalizeAuthCookieName("session"));
    assert.equal(isAuthCookieName(authCookieName, authCookieName), true);
    assert.equal(isAuthCookieName(`${authCookieName}.0`, authCookieName), true);
    assert.equal(isAuthCookieName("other", authCookieName), false);
});

test("domain fallback accepts only exact unpartitioned web-app auth cookies", () => {
    const cookie = (overrides = {}) => ({
        name: authCookieName,
        value: "base64-session",
        domain: "localhost",
        path: "/",
        secure: false,
        ...overrides,
    });

    const matching = filterAuthCookiesForOrigin([
        cookie(),
        cookie({domain: "example.com"}),
        cookie({name: `${authCookieName}-flows-code-verifier`}),
        cookie({partitionKey: {topLevelSite: "https://example.com"}}),
        cookie({path: "/private"}),
    ], "http://localhost:3000", authCookieName);

    assert.equal(matching.length, 1);
    assert.equal(matching[0].name, authCookieName);
});
