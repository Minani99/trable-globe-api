# Operations runbook

This is the minimum operating procedure for the private beta. Record every rehearsal and incident
in the repository issue tracker without copying credentials or personal data.

## What the probes mean

| Probe | Checks | Use |
| --- | --- | --- |
| `GET /api/health/live` | Java process can answer HTTP | Render platform health check and five-minute Cloudflare keepalive |
| `GET /api/health` | Java process plus `select 1` against PostgreSQL | Two-hour end-to-end smoke checks and manual DB diagnostics |
| Frontend `GET /api/health` | Vercel route, proxy and backend readiness | End-to-end smoke check |

A readiness failure returns HTTP 503. Liveness can stay green during a DB incident;
it must not be presented as full service availability. Startup Flyway and JPA validation
still require the database before a new application starts. Responses include `X-Request-ID`; use it to correlate a user
report with backend logs. If Cloudflare is in front, the slow/error log also includes a sanitized
`CF-Ray` value. The API logs requests taking at least `SLOW_REQUEST_MS` (default 1000 ms).

## User report queue

The `member_reports` table is the moderation source of truth. During the private beta, an operator
must review `OPEN` reports at least once per day, oldest first, and move each row through
`REVIEWING` to either `RESOLVED` or `DISMISSED`. Never paste the free-text `details` field into logs
or public issues; it can contain personal information. Record only the report id, final status, and
the policy reason in the private incident record.

Blocking is immediate and user-controlled. A block removes follow relationships in both directions,
excludes both accounts from authenticated search and recommendations, and prevents new likes or
comments between them. Unblocking does not restore previous follows. A report does not automatically
block the reported account, so support should explain the separate block control when safety requires
immediate separation.

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
  idle connections, a 60-second idle timeout and background keepalive disabled.
  Increase it only after measuring wait time and Neon connection usage.
- Graceful shutdown allows in-flight requests up to 20 seconds; Render is allowed 45 seconds before
  terminating the old instance.
- Authentication cleanup runs daily and keeps expired or revoked material for seven days by default.
- Review slow-request logs before increasing server or database resources; repeated slow endpoints
  should first be profiled and given bounded pagination or targeted indexes.

## Keeping the free instance awake

A Render free web service sleeps after roughly 15 minutes without traffic, and the
next visitor can wait about a minute for wake-up. An external uptime monitor
requesting `/api/health/live` on a schedule reduces idle spin-downs; it cannot prevent
provider restarts, exhausted quotas or memory-related crashes.

Use `/api/health/live` for frequent pings and Render's platform health checks.
DB-backed `/api/health` checks keep Neon compute awake and can exhaust its quota.
On October 1, 2026, PostgreSQL error 53000 (account/project quota exceeded) caused
a repeated startup failure; the incident was investigated on October 2.

The production beta uses the Cloudflare Cron Worker in
`ops/render-keepalive-worker`. It runs every five minutes around the clock without
consuming private GitHub Actions minutes. It checks only liveness and never the DB
or public profile. Each request has a 65-second
deadline and transient failures get one retry after ten seconds.
`.github/workflows/keep-awake.yml` remains available only as a manual
incident-response fallback.

### Settings

The deployed Worker uses the production URLs in
`ops/render-keepalive-worker/src/index.js`; update and redeploy that file if the
Render service or sample username changes. The fallback GitHub workflow reads
`API_BASE_URL` and `SAMPLE_PROFILE` repository variables and uses the current
production values when they are unset.

Use exactly one Cloudflare trigger (`*/5 * * * *`), replacing the old trigger.
The fallback has no schedule. Push its manual-only configuration after verifying
the Cloudflare schedule to avoid duplicate scheduled pings. Cron updates can take
up to 15 minutes to propagate.

### Monitoring and alarms

The Worker records failures in Cloudflare Observability. It does not itself send
email alerts. The separate `Production smoke` GitHub workflow checks the backend,
profile and frontend every two hours; configure GitHub failure notifications.
The two backend checks cover:

| Check | Catches |
| --- | --- |
| `/api/health` reports `"status":"UP"` | the process being down, or the database unreachable |
| `/api/profiles/{sample}` returns a profile | a deployment that boots but can no longer serve anyone |

The second matters because readiness alone stays green while the API returns
nothing useful. Request failures are logged on Render with a correlation ID.
Use those logs to distinguish a sleeping instance from a DB or application fault.

### The hour budget is the real constraint

The free plan grants a fixed number of instance-hours per month (750 at the time
of writing - confirm on the dashboard, as it changes). Staying awake continuously
costs almost all of it:

```
24h x 31 days = 744h used
                750h granted
                  6h margin
```

One always-on free service fits. A second free service does not, and exhausting
the budget stops the service until the month rolls over - strictly worse than the
cold start we were avoiding. So while this monitor runs, keep exactly one free
service on the account.

Readiness queries can also keep Neon compute active, so review its compute quota
as well. Shorter ping intervals do not reduce Render instance-hour usage.

An optional overnight pause reduces consumption but is not the current schedule.
Six hours off per day (and all other monitors paused too):

```
18h x 31 days = 558h used   (192h margin)
```

### If you pause, mind the cleanup job

`AuthDataCleanupService` deletes expired sessions and one-time tokens on
`AUTH_CLEANUP_CRON`, which is expressed in **UTC**. A sleeping instance runs no
scheduled work at all, so the cron must fall inside the awake window or the
cleanup silently never happens.

The default is `0 17 3 * * *` - and UTC is nine hours behind KST:

| UTC | KST |
| --- | --- |
| 03:17 | **12:17 (midday)** |
| 16:00-22:00 | 01:00-07:00 (overnight) |

So the default already runs at Korean lunchtime, comfortably inside any sensible
awake window. Pausing the monitor from 01:00 to 07:00 KST does not affect it.

Change the schedule only through `AUTH_CLEANUP_CRON`, and convert to UTC first.

### Retiring the monitor

This arrangement trades the free hour budget for uptime; it is a stopgap for the
testing phase, not an operating model. On a paid instance the service no longer
sleeps, so delete the monitor - or keep it purely as an alerting probe, which is
what an uptime monitor is actually for.
