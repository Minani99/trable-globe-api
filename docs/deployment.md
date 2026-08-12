# Hosting and deployment

The recommended first deployment is:

- **Database:** Neon PostgreSQL
- **Backend:** Render Web Service (`render.yaml` + `Dockerfile`)
- **Frontend:** Vercel, with `frontend/` selected as the project root

This keeps the interactive Next.js frontend close to Vercel, runs the Java container on
Render, and stores durable data in Neon. No credentials belong in this repository. Add every
secret in the provider dashboard.

> The committed `render.yaml` uses the `demo` profile so a new showcase immediately contains
> the `traveler` sample. Before storing real user data, change the profile to `prod`. The
> production profile never creates sample records.

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

The Blueprint activates `demo`, which creates the idempotent `traveler` showcase profile. For a
real service, set `SPRING_PROFILES_ACTIVE=prod`; do not rely on a seed override.

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

## Required production variables

### Render backend

```dotenv
SPRING_PROFILES_ACTIVE=demo # showcase only; use prod for real data
SERVER_PORT=10000
DB_URL=jdbc:postgresql://<host>/<database>?sslmode=require
DB_USERNAME=<role>
DB_PASSWORD=<secret>
CORS_ALLOWED_ORIGINS=https://<vercel-project>.vercel.app
```

### Vercel frontend

```dotenv
API_BASE_URL=https://<render-service>.onrender.com
SITE_URL=https://<vercel-project>.vercel.app
```

## Production switch checklist

Before accepting real user records:

1. Change Render's `SPRING_PROFILES_ACTIVE` from `demo` to `prod`.
2. Use a fresh production database rather than reusing the showcase database.
3. Set the final HTTPS frontend origin in `CORS_ALLOWED_ORIGINS`.
4. Set the same frontend origin in Vercel's `SITE_URL`.
5. Redeploy both services and repeat the smoke test.
