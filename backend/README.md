# Telecom Billing System - Backend

Production-ready Node.js backend for telecom billing with CDR processing, invoice generation, and Stripe payment integration.

## Features
- ✅ **CDR Processing**: Real-time call detail record import and rating
- ✅ **Prepaid Billing**: Customer balance management with real-time deductions
- ✅ **Invoice Generation**: Automated monthly invoicing with PDF export
- ✅ **Payment Integration**: Stripe integration for credit card payments
- ✅ **Rate Cards**: Flexible pricing with version control and effective dates
- ✅ **Admin Dashboard**: Comprehensive analytics and reporting
- ✅ **Scheduled Tasks**: Automated billing, reminders, and health checks
- ✅ **Production Ready**: Docker, Kubernetes, monitoring, and security

## Tech Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL 15+
- **Payment**: Stripe API
- **Logging**: Winston
- **Validation**: Joi
- **Scheduling**: Node.js setInterval
- **Deployment**: Docker, Docker Compose, Kubernetes

## Quick Start

### Local Development

Clone repository:
```bash
git clone <repo>
cd telecom-billing-backend
```

Install dependencies:
```bash
npm install
```

Copy environment:
```bash
cp .env.example .env
```

Start with Docker Compose:
```bash
docker-compose up -d
```

Initialize database:
```bash
docker-compose exec backend npm run init-db
```

Seed demo data:
```bash
docker-compose exec backend npm run seed
```

View logs:
```bash
docker-compose logs -f backend
```

Access API: http://localhost:5000

### Production Deployment

Copy production environment:
```bash
cp .env.example .env.production
```

Configure `.env.production` with secure values, then deploy:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

Initialize database:
```bash
docker-compose -f docker-compose.prod.yml exec backend npm run init-db
```

## API Documentation

See [docs/API.md](docs/API.md) for the complete API reference.

### Key Endpoints

**Customers**
- `POST /api/customers` – Create customer
- `GET /api/customers` – List customers
- `GET /api/customers/:id` – Get customer details
- `POST /api/customers/:id/add-credit` – Add prepaid credit

**Rate Cards**
- `POST /api/rateCards` – Create rate card
- `GET /api/rateCards/customer/:id` – Get customer rate cards
- `POST /api/rateCards/:id/simulate` – Simulate billing

**CDRs**
- `POST /api/cdrs/import` – Import CDR
- `POST /api/cdrs/process/:id` – Bill/rate CDR
- `GET /api/cdrs/customer/:id` – Get customer CDRs

**Invoices**
- `POST /api/billing/:id/generate-invoice` – Generate invoice
- `GET /api/billing/invoice/:id` – Get invoice
- `POST /api/billing/invoice/:id/payment` – Record payment

**Payments**
- `POST /api/stripe/invoice/:id/create-intent` – Create Stripe payment
- `POST /api/stripe/intent/:id/confirm` – Confirm payment

**Admin**
- `GET /api/admin/dashboard/overview` – Dashboard metrics
- `GET /api/admin/analytics/revenue` – Revenue analytics
- `GET /api/admin/system/health` – System health

## Database Schema

Key tables:
- `customers` – Customer accounts
- `rate_cards` – Pricing rules
- `cdrs` – Call detail records
- `invoices` – Billing invoices
- `customer_balance_history` – Transaction log
- `stripe_transactions` – Payment history
- `system_logs` – Application logs

## Configuration

Environment variables in `.env`:
```env
NODE_ENV=production
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=telecom_billing
DB_USER=postgres
DB_PASSWORD=secure_password
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=info
```

## Testing

Run all tests:
```bash
npm test
```

Run unit tests:
```bash
npm run test:unit
```

Run integration tests:
```bash
npm run test:integration
```

Coverage report:
```bash
npm test -- --coverage
```

## Monitoring

- **Logs**: Winston structured logging with ELK integration
- **Metrics**: Application metrics available at `/api/admin/system/health`
- **Backup**: PostgreSQL backups (daily, retention: 30 days)
- **Alerts**: Configure via monitoring service (DataDog, New Relic, etc.)

## Deployment

### Docker Compose
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes
```bash
kubectl apply -f k8s/deployment.yaml
```

### Manual
```bash
npm install
npm run init-db
npm start
```

## Security

- ✅ Input validation with Joi
- ✅ XSS prevention with sanitization
- ✅ SQL injection prevention with parameterized queries
- ✅ Rate limiting (100 req/hour per IP)
- ✅ Security headers (Helmet)
- ✅ HTTPS/TLS enforcement
- ✅ Password hashing (for future auth)
- ✅ Webhook signature verification

## Performance

- Response time: p95 < 500ms
- Throughput: 1000+ requests/minute
- Database: Connection pooling (20 connections)
- Caching: Ready for Redis/Memcached

## Production Checklist

See [docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md)

Before production deployment:
1. Run all tests
2. Security audit
3. Performance testing
4. Backup strategy verified
5. Monitoring configured
6. Team trained

## Support & Troubleshooting

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

Common issues:
- Database connection
- Stripe webhook issues
- Payment failures
- Performance degradation

## License

MIT
