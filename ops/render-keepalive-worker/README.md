# Render keep-alive Worker

Requests `/api/health/live` every five minutes, around the clock. This keeps the
Java process warm without querying PostgreSQL. Both scheduled and public HTTP
invocations deliberately return `database: "NOT_CHECKED"` and `profile: "NOT_CHECKED"`.
A green keepalive means the process responds, not that database-backed pages work.

Database checks belong to `Production smoke`, scheduled every two hours, or a
manual incident check. Do not use `/api/health` as the frequent keepalive target:
even `SELECT 1` can keep Neon compute active and exhaust its free monthly quota.
Render's platform health-check path must also be `/api/health/live`.

Each request, including its response body, has a 65-second deadline. Scheduled
checks retry network errors, timeouts, HTTP 408/429 and 5xx once after ten seconds.
Permanent HTTP errors and malformed payloads fail immediately. A scheduled
keepalive takes at most about 140 seconds; requests never run in parallel.

## Deployment

1. Open Cloudflare's `travel-globe-render-keepalive` Worker and replace its source
   with `src/index.js`, then deploy. The dashboard entrypoint may be `worker.js`.
2. In Settings > Trigger Events, replace the existing cron with `*/5 * * * *`.
   Keep exactly one trigger. Updates can take up to 15 minutes to propagate.
3. Visit the Worker URL and confirm HTTP 200, `status: "UP"` and
   `database: "NOT_CHECKED"`. Confirm scheduled invocations in Observability.
4. Deploy the manual-only `.github/workflows/keep-awake.yml` to the default branch
   to stop duplicate scheduled GitHub pings. Keep `Production smoke` enabled.
5. Set Render's health-check path to `/api/health/live`. Keep the DB pool minimum
   idle size at zero, idle timeout at 60 seconds, and keepalive time at zero.

The Worker uses no secrets. Five-minute execution means 288 invocations a day.
Worker error logs do not send email by themselves; configure failure notifications
for the GitHub smoke workflow. Run tests with `npm test`.

## Limits

Render free hours are shared by the workspace: 31 days continuously running use
744 of 750 hours. Monitor actual usage and other free services. Pings cannot fix
exhausted quotas, memory exhaustion or provider outages. Neon must still be allowed
to scale to zero, and real user traffic can consume the remaining DB allowance.

On 2026-10-02, investigation of the October 1 restart loop found PostgreSQL error
53000: the account/project quota had been exceeded. DB-backed health checks keep
the database active. The new keepalive separates process monitoring from database
monitoring to reduce this avoidable consumption.
