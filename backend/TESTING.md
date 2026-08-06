# Test foundation

The default test suite is fast, isolated, and safe to run during normal development:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File backend/scripts/test_foundation.ps1
```

Add `-Integration` to exercise the ownership and quota boundaries against the configured Supabase project:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File backend/scripts/test_foundation.ps1 -Integration
```

The integration test reads `backend/.env`, creates two confirmed temporary Supabase users, and removes them after the test. It requires `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_SECRET_API_KEY`. It does not upload objects or call an AI provider.

## Coverage

| Boundary | Fast suite | Integration suite |
| --- | --- | --- |
| Auth | Bearer parsing, JWT signature/expiry/subject checks, internal API secret, protected frontend routes, session refresh/sign-out | Temporary Supabase Auth users satisfy database foreign keys |
| Quotas | Period rollover, remaining-credit clamping, request validation, frontend retry behavior | Atomic reserve, exhausted quota, idempotent reserve/refund, cross-user completion denial |
| Uploads | DOCX type, size, archive, filename, plaintext and unauthenticated-request validation; storage replacement rollback behavior | Master-resume metadata isolation and foreign-job generated-upload denial |
| Job ownership | Auth context requirements | Owner-only reads, updates and deletes; foreign-job generation denial |

The live test is opt-in because it connects to the linked project. Every record is namespaced to temporary users and cleaned up through the Supabase Admin API.
