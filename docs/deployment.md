# Free-tier deployment

The recommended split is:

- **Database:** Neon PostgreSQL
- **Backend:** Render Web Service (`render.yaml` + `Dockerfile`)
- **Frontend:** Vercel, with `frontend/` selected as the project root

No credentials belong in this repository. Add every secret in the provider dashboard.

## 1. Create the PostgreSQL database

Create a free Neon project and copy its connection details. The JDBC URL must use this form:

```text
jdbc:postgresql://<host>/<database>?sslmode=require
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
| `CORS_ALLOWED_ORIGINS` | Temporary Vercel URL after step 3; use the final exact HTTPS origin |

`TRAVEL_GLOBE_SEED_ENABLED=true` creates the idempotent `traveler` demo profile on an empty database. Set it to `false` after replacing the demo with real data.

After deployment, verify:

```bash
curl https://<render-service>.onrender.com/api/health
curl https://<render-service>.onrender.com/api/profiles/traveler
```

The first request can be slow while a free Render instance wakes up.

## 3. Deploy the frontend to Vercel

1. Import the same GitHub repository in Vercel.
2. Set **Root Directory** to `frontend`.
3. Keep the detected Next.js build settings.
4. Add this environment variable for Production and Preview:

```dotenv
API_BASE_URL=https://<render-service>.onrender.com
```

Deploy, then copy the final Vercel origin (for example, `https://travel-globe.vercel.app`) into the Render `CORS_ALLOWED_ORIGINS` variable and redeploy the backend.

The browser uses the Next.js same-origin `/api` proxy by default, while Server Components use `API_BASE_URL`. Do not set `NEXT_PUBLIC_API_BASE_URL` unless browsers must call a separately exposed API directly.

## 4. Smoke test

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
SPRING_PROFILES_ACTIVE=prod
SERVER_PORT=10000
DB_URL=jdbc:postgresql://<host>/<database>?sslmode=require
DB_USERNAME=<role>
DB_PASSWORD=<secret>
CORS_ALLOWED_ORIGINS=https://<vercel-project>.vercel.app
TRAVEL_GLOBE_SEED_ENABLED=true
```

### Vercel frontend

```dotenv
API_BASE_URL=https://<render-service>.onrender.com
```
