# Queue Setup

The Bull-powered scheduler needs Redis and a handful of environment variables.

1. Install Redis locally or provision a managed instance, then expose the connection string as `REDIS_URL`.
2. Install queue dependencies in the backend: `npm install bull bull-board` (already added to `package.json`).
3. Optional: specify `REDIS_TLS=true` for TLS endpoints; credentials can be encoded directly in the URL.
4. Start the backend; the `/api/scheduler/queues` endpoint returns queue + repeatable-job status, and `/api/scheduler/queues/health` exposes Redis connectivity, paused state, and schedule diagnostics for monitoring.

## Notification Hooks

Scheduler tasks now emit rich notifications via the shared service. Configure transports via env vars:

- Console (always on)
- Email (NodeMailer): set `SMTP_ENABLED=true`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `NOTIFICATION_EMAIL_TO`.
- Slack Webhook: set `SLACK_WEBHOOK_URL`, optional `SLACK_WEBHOOK_USERNAME`.

Events emitted:
- `customer.balance.low`
- `customer.balance.critical`
- `invoice.reminder` (1 day before due date and overdue warning)
- `invoice.overdue`
- `invoice.cancelled.auto`

Combine transports in `notifications/index.js` if additional channels are needed (PagerDuty, OpsGenie, etc.).
