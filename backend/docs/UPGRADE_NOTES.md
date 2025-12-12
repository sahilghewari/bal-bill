# Upgrade Notes

## 2024-12-11

### Scheduler & Queues
- Replaced the custom in-memory scheduler with Bull queues. Jobs now live in the `billing` queue and persist in Redis (`REDIS_URL`, default `redis://127.0.0.1:6379`).
- `/api/scheduler/queues/*` endpoints provide queue metrics, manual triggers, pause/resume, history cleanup, and retry of failed jobs.
- `ENABLE_QUEUE=false` disables queue processing for environments without Redis.
- Introduced a shared notification service; default transport logs events, but you can add email/Slack/webhook transports in `notifications/`. Core billing tasks now emit events:
  - `customer.balance.low`
  - `customer.balance.critical`
  - `invoice.reminder`
  - `invoice.overdue`
  - `invoice.cancelled.auto`

### Actions Required
1. Install the `bull` package (and optionally `bull-board`) wherever the backend runs.
2. Provision Redis and set `REDIS_URL` before starting the service.
3. Wire preferred notification transports when promoting beyond development. The console transport is safe for local/dev, but production should deliver to a durable channel.
4. Update runbooks/monitors to use the new queue endpoints instead of `/scheduler/jobs`, and capture the notification events listed above.
5. Apply migrations `20241209_add_invoice_manual_fields.sql`, `20241210_add_rate_card_currency.sql`, and `20241211_add_stripe_customer_fields.sql`; `migrations/init.sql` now includes the new schema for fresh databases.

## 2024-12-10

### Rate Cards
- New optional `currency` column added to `rate_cards` table via `20241210_add_rate_card_currency.sql`.
- `POST /api/rateCards` accepts a 3-letter currency code; omitting it continues to inherit the customer currency.
- Frontend rate card forms expose currency selection.

### Invoice Generation
- Manual invoice API now mirrors scheduler behaviour: usage charges, manual line items, tax %, discount, and `auto_publish` share a single helper in `Invoice.prepareInvoicePayload`.
- Auto-generated invoices respect these same calculations and request auto-publish by default.
- Admin analytics now report totals per currency. Existing dashboards should surface multi-currency aggregates.

### Actions Required
1. Apply `backend/migrations/20241210_add_rate_card_currency.sql` to each environment database before deploying the updated services.
2. Ensure any API clients or integrations passing rate card payloads can send/handle the new `currency` key.
3. Review dashboards or exports that assume a single currency; totals are now segmented per currency.

- Overdue invoices automatically cancel after a 30-day grace period; ensure downstream systems can handle the new status.

- Scheduler now supports retry backoff, pausing, resuming, and manual triggers; review any external monitors expecting the old interval loop.
