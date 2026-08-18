import assert from "node:assert/strict";
import test from "node:test";

import {
  isDuplicateProfileError,
  profileNamesFromMetadata,
  safeOAuthNextPath,
  trustedAuthRedirectOrigin,
} from "../src/lib/auth/callback.ts";

test("OAuth next targets remain relative to this application", () => {
  assert.equal(safeOAuthNextPath("/dashboard?tab=library"), "/dashboard?tab=library");
  for (const target of [
    null,
    "",
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
  ]) {
    assert.equal(safeOAuthNextPath(target), "/");
  }
});

test("only a PostgreSQL unique violation is a harmless profile insert race", () => {
  assert.equal(isDuplicateProfileError({code: "23505"}), true);
  assert.equal(isDuplicateProfileError({code: "42501"}), false);
  assert.equal(isDuplicateProfileError(null), false);
});

test("OAuth redirects prefer the configured application origin", () => {
  assert.equal(
    trustedAuthRedirectOrigin("https://untrusted.example", "https://app.example/path"),
    "https://app.example",
  );
  assert.equal(
    trustedAuthRedirectOrigin("http://localhost:3000", "not a URL"),
    "http://localhost:3000",
  );
});

test("OAuth profile names tolerate missing and provider-specific metadata", () => {
  assert.deepEqual(profileNamesFromMetadata({name: "Ada Lovelace"}, "ada@example.com"), {
    firstName: "Ada",
    lastName: "Lovelace",
  });
  assert.deepEqual(profileNamesFromMetadata({}, "person@example.com"), {
    firstName: "person",
    lastName: "",
  });
  assert.deepEqual(profileNamesFromMetadata({given_name: "Grace", family_name: "Hopper"}), {
    firstName: "Grace",
    lastName: "Hopper",
  });
});
