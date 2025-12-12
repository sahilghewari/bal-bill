# Telecom Billing System - API Documentation

## Base URL
`http://localhost:5000/api`

## Authentication
Currently not required (internal use only).

---

## Customers

### Create Customer
**POST** `/customers`

Create a new customer account.

**Request Body**
```json
{
  "name": "TechCorp India",
  "email": "billing@techcorp.in",
  "phone": "+91-9876543210",
  "country": "India",
  "currency": "USD",
  "billing_day": 1
}
```

**Response**
```json
{
  "success": true,
  "message": "Customer created successfully",
  "data": {
    "id": "uuid",
    "name": "TechCorp India",
    "email": "billing@techcorp.in",
    "current_balance": 0,
    "status": "active",
    "created_at": "2025-12-04T17:30:00Z"
  }
}
```

**Status Codes**
- 201 Created
- 400 Validation failed
- 409 Email already exists

---

### Get All Customers
**GET** `/customers?page=1&limit=20`

Retrieve paginated list of all customers.

**Response**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Customer Name",
      "email": "email@example.com",
      "country": "USA",
      "currency": "USD",
      "current_balance": 150.5,
      "status": "active"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

---

### Get Customer by ID
**GET** `/customers/:customer_id`

Returns detailed customer info including rate cards and balance history.

**Status Codes**
- 200 OK
- 404 Customer not found

---

### Update Customer
**PUT** `/customers/:customer_id`

Updates name, phone, billing day, or status.

---

### Add Credit to Customer
**POST** `/customers/:customer_id/add-credit`

**Request Body**
```json
{
  "amount": 500,
  "description": "Monthly prepaid recharge"
}
```

**Response**
```json
{
  "success": true,
  "message": "Credit added successfully",
  "data": {
    "balance_before": 100,
    "balance_after": 600,
    "amount_added": 500
  }
}
```

---

### Get Customer Balance
**GET** `/customers/:customer_id/balance`

Returns balance, status, and recommendation.

---

### Get Balance History
**GET** `/customers/:customer_id/balance-history?page=1&limit=50`

Returns paginated transaction list.

---

## Rate Cards

### Create Rate Card
**POST** `/rateCards`

```json
{
  "customer_id": "uuid",
  "service_type": "DID",
  "initial_block_seconds": 60,
  "next_block_seconds": 60,
  "price_per_minute": 0.004,
  "connection_fee_flat": 0,
  "effective_date": "2025-12-01",
  "currency": "USD"
}
```

Status codes: 201 Created, 400 Invalid configuration, 404 Customer not found.

---

### Get Customer Rate Cards
**GET** `/rateCards/customer/:customer_id`

Returns cards grouped by service type.

---

### Get Active Rate Card
**GET** `/rateCards/customer/:customer_id/active?service_type=DID&call_date=2025-12-04`

Requires `service_type` and `call_date` (YYYY-MM-DD).

---

### Simulate Billing
**POST** `/rateCards/:customer_id/simulate`

```json
{
  "duration_seconds": 65,
  "service_type": "DID",
  "call_date": "2025-12-04"
}
```

Returns billable seconds/minutes and impact on balance.

---

## CDRs (Call Detail Records)

### Import CDR
**POST** `/cdrs/import`

```json
{
  "customer_id": "uuid",
  "caller_id": "+1-555-0001",
  "callee_id": "+91-9876543210",
  "destination": "Mumbai",
  "start_time": "2025-12-04T10:00:00Z",
  "end_time": "2025-12-04T10:02:05Z",
  "duration_seconds": 125,
  "service_type": "DID"
}
```

---

### Batch Import CDRs
**POST** `/cdrs/import-batch`

```json
{
  "cdrs": [{}, {}]
}
```

---

### Process CDR
**POST** `/cdrs/process/:cdr_id`

Returns billed charge and new balance.

---

### Get Customer CDRs
**GET** `/cdrs/customer/:customer_id?start_date=2025-12-01&end_date=2025-12-31&billing_status=pending`

Optional query params: `start_date`, `end_date`, `billing_status`, `page`, `limit`.

---

## Invoices

### Generate Invoice
**POST** `/billing/:customer_id/generate-invoice`

Generate a customer invoice for a specified period. Usage data will be gathered from rated CDRs, and optional manual charges can be appended through `line_items` or `usage_charges`.

```json
{
  "billing_period_start": "2025-12-01",
  "billing_period_end": "2025-12-31",
  "due_date": "2026-01-07",
  "usage_charges": 125.5,
  "tax_rate": 18,
  "discount_amount": 25,
  "notes": "December usage true-up",
  "auto_publish": true,
  "line_items": [
    {
      "description": "Premium support",
      "quantity": 1,
      "unit_price": 99
    }
  ]
}
```

*Notes*
- `usage_charges`, manual `line_items`, and rated CDR totals all contribute to the invoice subtotal.
- `tax_rate` is applied to the subtotal (percentage) before subtracting `discount_amount`.
- `auto_publish` skips the draft state and marks the invoice as `issued` after creation.
- Overdue invoices auto-cancel after 30 days past due unless payment is received.
- When omitted, rate cards inherit the customer's currency; sending a 3-letter currency override stores it per card.
- `line_items` entries without a description are ignored; quantities and unit prices default to `0` when invalid.

---

### Get Invoice
**GET** `/billing/invoice/:invoice_id`

Returns invoice + line items.

---

### Get Customer Invoices
**GET** `/billing/:customer_id/invoices?status=issued&page=1&limit=20`

---

### Record Payment
**POST** `/billing/invoice/:invoice_id/payment`

```json
{
  "paid_amount": 500.5,
  "payment_date": "2025-12-05"
}
```

---

### Publish Invoice
**POST** `/billing/invoice/:invoice_id/publish`

Moves a draft invoice to `issued`.

**Status Codes**
- 200 Published
- 400 Invalid state
- 404 Invoice not found

---

### Cancel Invoice
**POST** `/billing/invoice/:invoice_id/cancel`

Cancels an unpaid invoice (`draft`, `issued`, or `overdue`). Optional body accepts a `reason`.

```json
{
  "reason": "Customer requested cancellation"
}
```

**Status Codes**
- 200 Cancelled
- 404 Invoice not found
- 409 Invalid state transition

---

## Payments (Stripe)

### Create Payment Intent
**POST** `/stripe/invoice/:invoice_id/create-intent`

```json
{
  "payment_method_id": "pm_card_visa"
}
```

Returns client secret + payment intent data.

- Reuses the Stripe customer associated with the telecom customer or creates one if absent.
- Automatically attaches and persists new payment methods when provided.
- Applies deterministic idempotency keys (`pi_{invoice_id}`) unless a custom `Idempotency-Key` header is supplied.

### Confirm Payment
**POST** `/stripe/intent/:payment_intent_id/confirm`

Confirms payment using payment method.

- Uses idempotency key `pi_confirm_{payment_intent_id}` unless overridden via header.
- Updates the customer's default payment method when a new `payment_method_id` is passed.

### Retry Logic & Status Introspection
- Failed intents retained in `requires_payment_method` state are retried up to three times via scheduler (`/scheduler/queues/billing/jobs/retry-failed-payments`).
- Retry delays are ~24h, doubling on subsequent failures; results are stored in `stripe_transactions.retry_count` + `next_retry_at`.
- Helper `/stripe/transactions/:customer_id` exposes status/error metadata for auditing.

### Consuming Stripe Webhooks
- Webhook idempotency is enforced via in-memory event keys (`event.id-event.type`).
- On `payment_intent.succeeded`, invoices are marked paid and customer balances credited.
- On `payment_intent.payment_failed`, retry scheduling is kicked off with captured error message.
- Keep `STRIPE_WEBHOOK_SECRET` configured in `.env` or these events will be rejected (400).

## Notifications

Scheduler tasks emit events through the notification service. Configure transports via environment variables (Console included by default, Email via `SMTP_*`, Slack via `SLACK_WEBHOOK_URL`).

Events:
- `customer.balance.low`
- `customer.balance.critical`
- `invoice.reminder`
- `invoice.overdue`
- `invoice.cancelled.auto`

---

## Admin Dashboard

### Dashboard Overview
**GET** `/admin/dashboard/overview?period=30`

Returns KPIs for the requested period.

### Revenue Report
**GET** `/admin/analytics/revenue?period=90`

### Payment Analytics
**GET** `/admin/analytics/payments?period=30`

### System Health
**GET** `/admin/system/health`

---

## Error Responses
```json
{
  "error": "Error message",
  "error_id": "ERR_1701790200000_abc123def",
  "details": "Stack trace (development only)"
}
```

Common status codes: 200, 201, 400, 404, 409, 429, 500.

---

## Rate Limiting
100 requests/hour/IP. Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

---

## Pagination
Paginated endpoints accept `page` + `limit` and respond with:
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

## Timestamps
ISO 8601 UTC (e.g., `2025-12-04T17:30:00.000Z`).

---

## Currency Codes
Supported currencies: `USD`, `CAD`, `PHP`.

---

## Status Codes
- Customer: `active`, `inactive`, `suspended`
- Invoice: `draft`, `issued`, `paid`, `overdue`, `cancelled`
- CDR: `pending`, `billed`, `failed`

---

## Example Workflow
1. POST `/api/customers`
2. POST `/api/rateCards`
3. POST `/api/cdrs/import`
4. POST `/api/cdrs/process/:cdr_id`
5. POST `/api/billing/:customer_id/generate-invoice`
6. POST `/api/stripe/invoice/:invoice_id/create-intent`
7. POST `/api/stripe/intent/:payment_intent_id/confirm`

## Scheduler

### Get Scheduler Status
**GET** `/scheduler/status`

Returns queue health and job metadata driven by Bull.

### List Queues
**GET** `/scheduler/queues`

Returns each queue with counts and repeatable job schedules.

### Queue Health Overview
**GET** `/scheduler/queues/health`

Returns a diagnostic snapshot containing:
- Whether Bull/Redis is available (`queue_available`).
- Per-queue job counts, paused state, and Redis client status (`connected` / `error`).
- Repeatable job schedule metadata with next run timestamps.

Use this endpoint for readiness probes or Grafana/Loki checks. A `200` response indicates the route executed even if queues are degraded; inspect the payload for warnings.

### Trigger Job Now
**POST** `/scheduler/queues/:queue_key/jobs/:job_name`

Enqueues a single run of a repeatable job (e.g., `billing` + `process-pending-cdrs`).

### Pause Queue
**POST** `/scheduler/queues/:queue_key/pause`

Stops the queue from processing until resumed.

### Resume Queue
**POST** `/scheduler/queues/:queue_key/resume`

Restarts consumption for the queue.

### Clean Queue History
**POST** `/scheduler/queues/:queue_key/clean`

Removes completed/failed jobs older than `grace_hours` (default 24).

### Retry Failed Jobs
**POST** `/scheduler/queues/:queue_key/retry-failed`

Retries all failed jobs currently in the queue.
