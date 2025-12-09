# Troubleshooting Guide

## Database Connection Issues
- Verify `DB_HOST`, `DB_PORT`, `DB_USER`, and `DB_PASSWORD` values in your environment file.
- Confirm the database accepts network connections from the application host.
- Run migrations with `npm run init-db` and review PostgreSQL logs for authentication errors.

## Stripe Webhook Failures
- Ensure the public webhook URL matches the endpoint configured in the Stripe dashboard.
- Verify `STRIPE_WEBHOOK_SECRET` is correct and restart the server after updates.
- Check application logs for signature verification errors and confirm the raw body reaches the controller.

## Payment Failures
- Confirm the invoice exists and is in a payable status before triggering Stripe intents.
- Review Stripe dashboard logs for declined cards or validation errors.
- Inspect server logs for network or credential issues with `STRIPE_SECRET_KEY`.

## Performance Degradation
- Inspect `/api/admin/system/health` for system metrics and recent alerts.
- Check database slow-query logs and ensure indexes are in place for frequent filters.
- Scale horizontally via Docker Compose replicas or Kubernetes HPA when CPU and memory thresholds remain high.
