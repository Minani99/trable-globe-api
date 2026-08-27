# Render keep-alive Worker

This Cloudflare Worker requests the Render readiness endpoint every ten minutes.
It replaces the GitHub Actions keep-awake job once deployed, avoiding private
repository Actions-minute usage.

## Dashboard deployment

1. In Cloudflare, open **Compute > Workers & Pages** and create a Worker named
   `travel-globe-render-keepalive`.
2. Replace the starter code with `src/index.js` and deploy it.
3. Open the Worker's **Settings > Triggers > Cron Triggers** and add
   `*/10 * * * *`.
4. Visit the Worker's `workers.dev` URL once. A successful check returns the
   backend JSON containing `"status":"UP"`.
5. Confirm scheduled invocations in **Observability**, then disable the
   repository's `keep-awake` GitHub Actions workflow to avoid duplicate probes.

The Worker uses no secrets and stays comfortably inside the Workers Free plan
for a single ten-minute cron trigger.
