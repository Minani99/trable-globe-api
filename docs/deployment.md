# Hosting and deployment

The recommended first deployment is:

- **Database:** Neon PostgreSQL
- **Backend:** Render Web Service (`render.yaml` + `Dockerfile`)
- **Frontend:** Vercel, with `frontend/` selected as the project root

This keeps the interactive Next.js frontend close to Vercel, runs the Java container on
Render, and stores durable data in Neon. No credentials belong in this repository. Add every
secret in the provider dashboard.

> The committed `render.yaml` uses the `prod` profile. It never creates sample accounts in a
> database that may hold user records. Use `demo` only with a disposable showcase database.

The current account/CRUD screens include email verification, password reset and account deletion.
Before public registration, use a separate production database, configure the mail provider and
add edge rate limiting.

## 1. Create the PostgreSQL database

Create a Neon project and copy the **direct (unpooled)** connection details. Flyway runs schema
migrations at backend startup, so a direct endpoint avoids transaction-pooler limitations. The
JDBC URL must use this form:

```text
jdbc:postgresql://<endpoint>.neon.tech/<database>?sslmode=require
```

Keep the username and password separate; do not embed them in the URL.

## 2. Deploy the backend to Render

1. Push this repository to GitHub.
2. In Render, choose **New > Blueprint** and select the repository.
3. Render reads `render.yaml`. Enter the variables marked `sync: false`:

| Variable | Value |
| --- | --- |
| `DB_URL` | Neon JDBC URL from step 1 |
| `DB_USERNAME` | Neon database role |
| `DB_PASSWORD` | Neon password |
| `CORS_ALLOWED_ORIGINS` | Final Vercel/custom-domain origin; use the exact HTTPS origin |
| `PUBLIC_SITE_URL` | Final Vercel/custom-domain origin used in account emails |
| `RESEND_API_KEY` | Resend API key used only by the backend |
| `MAIL_FROM` | Verified sender, for example `Travel Globe <hello@example.com>` |

The Blueprint activates `prod`, performs Flyway migrations and validates the resulting schema.
It will not create the `traveler` showcase profile.

After deployment, verify:

```bash
curl https://<render-service>.onrender.com/api/health
curl https://<render-service>.onrender.com/api/profiles/traveler
```

The first request can be slow while a free Render instance wakes up.

## 3. Deploy the frontend to Vercel

1. Import the same GitHub repository in Vercel.
2. Set **Root Directory** to `frontend`. This matters because the repository also contains the
   Spring Boot service at its root.
3. Keep the detected Next.js build settings.
4. Add these environment variables for Production and Preview:

```dotenv
API_BASE_URL=https://<render-service>.onrender.com
SITE_URL=https://<vercel-project>.vercel.app
```

Deploy, then copy the final Vercel origin (for example, `https://travel-globe.vercel.app`) into
Render's `CORS_ALLOWED_ORIGINS` variable and redeploy the backend. When a custom domain is added,
update both `SITE_URL` and the CORS origin.

The browser uses the Next.js same-origin `/api` proxy by default, while Server Components use `API_BASE_URL`. Do not set `NEXT_PUBLIC_API_BASE_URL` unless browsers must call a separately exposed API directly.

## 4. Confirm automatic checks

GitHub Actions now runs backend tests and frontend lint, type checks and production builds for
every pull request and every push to `master`. Wait for the green `CI` check before deploying.

The `Production smoke` workflow checks the site, the same-origin API proxy, backend liveness and
database readiness every 30 minutes. Add these GitHub repository variables before enabling
notifications:

| Repository variable | Example |
| --- | --- |
| `PRODUCTION_SITE_URL` | `https://travel-globe.example.com` |
| `PRODUCTION_API_URL` | `https://travel-globe-api.onrender.com` |

If either variable is absent the scheduled job is intentionally skipped. Configure GitHub Actions
failure notifications for the maintainer account; this probe complements, rather than replaces,
Render's own health check.

## 5. Smoke test

Verify all public routes:

```bash
curl -I https://<vercel-project>.vercel.app/
curl -I https://<vercel-project>.vercel.app/traveler
curl https://<vercel-project>.vercel.app/api/health
curl https://<vercel-project>.vercel.app/api/profiles/traveler/countries
```

Then open `/traveler` in a WebGL-capable browser and check:

- the globe and country boundaries render;
- wheel input over the sphere zooms the globe;
- wheel input outside the sphere scrolls to the travel board;
- selecting a country filters travel cards;
- a travel card opens its detail page.

Then test the authenticated flow:

- `/register` creates an account and moves to `/studio`;
- a private trip can be created, edited and deleted without appearing on the public profile;
- switching it to public adds it to the profile and makes its detail URL available;
- logout removes access to `/studio` and private APIs.
- a new account can verify its email, request a password reset and close the account.

## Required production variables

### Render backend

```dotenv
SPRING_PROFILES_ACTIVE=prod
SERVER_PORT=10000
DB_URL=jdbc:postgresql://<host>/<database>?sslmode=require
DB_USERNAME=<role>
DB_PASSWORD=<secret>
CORS_ALLOWED_ORIGINS=https://<vercel-project>.vercel.app
PUBLIC_SITE_URL=https://<vercel-project>.vercel.app
RESEND_API_KEY=<secret>
MAIL_FROM=Travel Globe <hello@your-domain.example>
DB_POOL_MAX_SIZE=5
DB_POOL_MIN_IDLE=0
```

### Vercel frontend

```dotenv
API_BASE_URL=https://<render-service>.onrender.com
SITE_URL=https://<vercel-project>.vercel.app
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<r2-api-token-access-key>
R2_SECRET_ACCESS_KEY=<r2-api-token-secret>
R2_BUCKET_NAME=travel-globe-photos
R2_PUBLIC_BASE_URL=https://<public-r2-domain>
```

The five `R2_*` variables are required for profile and travel-photo file uploads. Without
them the app deliberately disables the file picker and only accepts an externally hosted
image URL. Configure the R2 bucket CORS policy to allow `PUT` from the final `SITE_URL`,
with the `Content-Type` request header. After redeploying, confirm that
`GET /api/uploads/presign` returns `data.configured: true` before inviting users.

## Production switch checklist

Before accepting real user records:

1. Confirm Render's `SPRING_PROFILES_ACTIVE` is `prod`.
2. Use a fresh production database rather than reusing the showcase database.
3. Set the final HTTPS frontend origin in `CORS_ALLOWED_ORIGINS`.
4. Set the same frontend origin in Vercel's `SITE_URL`.
5. Confirm the R2 bucket CORS origin matches `SITE_URL` and the upload readiness endpoint is true.
6. Redeploy both services and repeat the smoke test.
7. Confirm Neon history retention and complete the restore rehearsal in [`operations.md`](./operations.md).
8. Verify the Resend sending domain and run the email verification/reset smoke tests.
9. Add rate limits for registration, login and account-link requests at the edge.
10. Add the two production URLs as GitHub repository variables and verify one manual smoke run.

Use [`beta-checklist.md`](./beta-checklist.md) for the first 5–10 user invitation and feedback gate.

## Data and media policy

- PostgreSQL stores accounts, sessions and travel metadata. Neon remains a suitable first
  production database when backups, connection limits and monitoring are configured.
- Do not store image bytes in PostgreSQL or the Render container filesystem. Use object storage
  such as Cloudflare R2 or S3, generate responsive derivatives, and save only URLs in this DB.
- The `world-countries` catalog used by the writer is ODbL data. Keep its attribution and license
  obligations visible when the product moves beyond a private beta.
- The beta location picker uses submitted (not autocomplete) searches through public Nominatim
  and OpenStreetMap tiles with visible attribution. Before a broad or paid launch, configure a
  contracted geocoding and tile provider with an SLA; the public community services are best-effort.
