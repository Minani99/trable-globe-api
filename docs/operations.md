# Operations runbook

This is the minimum operating procedure for the private beta. Record every rehearsal and incident
in the repository issue tracker without copying credentials or personal data.

## What the probes mean

| Probe | Checks | Use |
| --- | --- | --- |
| `GET /api/health/live` | Java process can answer HTTP | Distinguish a crashed process from a dependency incident |
| `GET /api/health` | Java process plus `select 1` against PostgreSQL | Render readiness and public service monitoring |
| Frontend `GET /api/health` | Vercel route, proxy and backend readiness | End-to-end smoke check |

A readiness failure returns HTTP 503. Responses include `X-Request-ID`; use it to correlate a user
report with backend logs. If Cloudflare is in front, the slow/error log also includes a sanitized
`CF-Ray` value. The API logs requests taking at least `SLOW_REQUEST_MS` (default 1000 ms).

## Database backup policy

Before accepting beta users:

1. Confirm the production Neon project's history-retention window and write the actual duration
   and plan owner in the private operations record.
2. Before every schema migration, create a Neon branch or snapshot at the current production point.
3. Keep the old production branch until the new deployment has passed account, CRUD and image-upload
   smoke tests.
4. Export a periodic encrypted logical backup to storage outside the primary Neon project when the
   service starts holding records that cannot be recreated. Restrict access to the service owner.

A backup is not considered working until it has been restored successfully.

## Monthly restore rehearsal

1. Choose a timestamp inside Neon's history-retention window and create a temporary recovery branch.
2. Point a temporary backend instance at that branch using a read-limited role when possible.
3. Confirm `/api/health` is `UP`, then compare counts for members, travels, places and photos with the
   production snapshot. Do not send account emails from the rehearsal instance.
4. Open one public trip and one owner-only trip through the API to verify relationships and visibility.
5. Record the chosen timestamp, time to recover, checks performed and any discrepancy.
6. Delete the temporary instance and branch after the record is complete.

## Incident order

1. Check Vercel and Render provider status, then compare frontend health, backend readiness and
   backend liveness.
2. Find the affected request using `X-Request-ID` and, when present, `CF-Ray`.
3. If liveness is up but readiness is down, inspect Neon availability and connection limits before
   restarting the application.
4. If a bad deployment caused the incident, roll back the application first. Restore data only when
   there is evidence of data corruption or accidental deletion.
5. After recovery, verify login, one private CRUD flow, one public trip and an image URL. Document the
   timeline and a prevention action.

## Capacity guardrails

- The production connection pool defaults to five connections per backend instance and no forced
  idle connections. Increase it only after measuring wait time and Neon connection usage.
- Graceful shutdown allows in-flight requests up to 20 seconds; Render is allowed 45 seconds before
  terminating the old instance.
- Authentication cleanup runs daily and keeps expired or revoked material for seven days by default.
- Review slow-request logs before increasing server or database resources; repeated slow endpoints
  should first be profiled and given bounded pagination or targeted indexes.
