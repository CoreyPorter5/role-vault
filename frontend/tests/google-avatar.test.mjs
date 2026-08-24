import assert from "node:assert/strict";
import test from "node:test";

import {getGoogleAvatarUrl} from "../src/lib/auth/google-avatar.ts";

const googleAvatar = "https://lh3.googleusercontent.com/a/example=s96-c";

test("uses the picture from the linked Google identity", () => {
    assert.equal(getGoogleAvatarUrl({
        identities: [{provider: "google", identity_data: {avatar_url: googleAvatar}}],
        app_metadata: {},
        user_metadata: {},
    }), googleAvatar);
});

test("falls back to Google user metadata when identity metadata omits the picture", () => {
    assert.equal(getGoogleAvatarUrl({
        identities: [],
        app_metadata: {providers: ["email", "google"]},
        user_metadata: {picture: googleAvatar},
    }), googleAvatar);
});

test("does not render arbitrary metadata URLs or Google pictures for email-only users", () => {
    assert.equal(getGoogleAvatarUrl({
        identities: [{provider: "google", identity_data: {avatar_url: "https://example.com/avatar.png"}}],
        app_metadata: {provider: "google"},
        user_metadata: {},
    }), null);

    assert.equal(getGoogleAvatarUrl({
        identities: [],
        app_metadata: {provider: "email"},
        user_metadata: {avatar_url: googleAvatar},
    }), null);
});

test("returns no avatar without an authenticated user", () => {
    assert.equal(getGoogleAvatarUrl(null), null);
});
