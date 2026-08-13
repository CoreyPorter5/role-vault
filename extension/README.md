# SeekSync Chrome extension

## Local development

Copy `.env.example` to `.env.local`, set the public Supabase values, then run:

```powershell
npm install
npm run build:development
```

Load the generated `dist` directory as an unpacked extension in Chrome. The
development build permits localhost for the web app and API.

## Production package

Set `VITE_WEB_APP_URL` to the deployed Vercel origin and `VITE_API_URL` to the
deployed Railway origin. Both must be HTTPS origins without a path, query, or
fragment. `VITE_SENTRY_DSN` is also required. In CI, set `SENTRY_AUTH_TOKEN`,
`SENTRY_ORG`, and `SENTRY_PROJECT`; the build uploads hidden source maps under
the same `VITE_SENTRY_RELEASE` used by the runtime and removes them from the
packaged extension. Then run:

```powershell
npm run build
```

The build generates `dist/manifest.json` with host permissions limited to
those two configured origins, `https://au.seek.com/*`, and the exact Sentry
ingest origin derived from `VITE_SENTRY_DSN`. It rejects localhost or non-HTTPS
production values so a development package cannot be uploaded by mistake.

All `VITE_` variables are compiled into the extension and must be treated as
public. Never place a Supabase service-role key or another secret in them.
`SENTRY_AUTH_TOKEN` is a build secret and must remain CI-only. A local package
verification can explicitly set `SENTRY_SKIP_SOURCE_MAP_UPLOAD=1`; release
builds should not use that escape hatch.

## Verification

```powershell
npm test
npm run lint
npm run test:dist
```

`test:dist` validates the package most recently written to `dist`; run it after
the desired development or production build.
