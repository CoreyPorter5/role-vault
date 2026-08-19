import assert from "node:assert/strict";
import test from "node:test";

import {
    emailConfirmationRedirectURL,
    isEmailNotConfirmedError,
    requiresEmailConfirmation,
} from "../src/lib/auth/registration.ts";

test("registration distinguishes confirmation-required users from active sessions", () => {
    assert.equal(requiresEmailConfirmation(null), true);
    assert.equal(requiresEmailConfirmation(undefined), true);
    assert.equal(requiresEmailConfirmation({access_token: "token"}), false);
});

test("confirmation emails return to the configured application callback", () => {
    assert.equal(
        emailConfirmationRedirectURL("https://seek-sync-rosy.vercel.app/path"),
        "https://seek-sync-rosy.vercel.app/auth/callback?next=/dashboard",
    );
    assert.equal(emailConfirmationRedirectURL("not a URL"), undefined);
    assert.equal(emailConfirmationRedirectURL(""), undefined);
});

test("unconfirmed email errors receive a specific user-facing path", () => {
    assert.equal(isEmailNotConfirmedError({code: "email_not_confirmed"}), true);
    assert.equal(isEmailNotConfirmedError({message: "Email not confirmed"}), true);
    assert.equal(isEmailNotConfirmedError({message: "Invalid login credentials"}), false);
});
