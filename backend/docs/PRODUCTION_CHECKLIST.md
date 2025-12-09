# Production Deployment Checklist

## Pre-Deployment

### Security & Configuration
- [ ] All environment variables set in `.env.production`
- [ ] DATABASE passwords changed to strong values
- [ ] STRIPE keys verified and set correctly
- [ ] CORS_ORIGIN set to production domain only
- [ ] LOG_LEVEL set to "info" or "warn"
- [ ] NODE_ENV set to "production"
- [ ] SSL certificates obtained and configured
- [ ] API keys rotated and updated
- [ ] Database credentials secure and unique
- [ ] Webhook secret configured correctly

### Database
- [ ] PostgreSQL 15+ installed and configured
- [ ] Database created and initialized
- [ ] Migrations applied successfully
- [ ] Backups configured (daily minimum)
- [ ] Connection pooling optimized
- [ ] Indexes verified for performance
- [ ] Database user created with minimal permissions
- [ ] Connection limits set appropriately

### Application
- [ ] All dependencies installed (`npm ci`)
- [ ] Production dependencies only (`--only=production`)
- [ ] Application starts successfully
- [ ] Health check endpoint working
- [ ] No console errors on startup
- [ ] Logging configured and working
- [ ] Error tracking (if applicable) configured
- [ ] Performance monitoring setup

### Docker & Containers
- [ ] Docker images built with Dockerfile.prod
- [ ] Container size optimized
- [ ] Non-root user configured
- [ ] Health checks configured
- [ ] Resource limits set
- [ ] Image security scanning completed
- [ ] Container registry access verified

### Network & DNS
- [ ] Domain DNS configured
- [ ] SSL certificate valid and installed
- [ ] HTTPS redirect configured
- [ ] Firewall rules configured
- [ ] Rate limiting tested
- [ ] CORS headers verified
- [ ] Security headers present in responses

### API Endpoints
- [ ] All routes tested and working
- [ ] Rate limiting active
- [ ] Error handling tested
- [ ] Input validation working
- [ ] Sanitization active
- [ ] Request logging configured
- [ ] Response compression enabled
- [ ] API documentation up-to-date

### Stripe Integration
- [ ] Stripe keys configured
- [ ] Webhook endpoint registered
- [ ] Webhook signature verification working
- [ ] Payment processing tested
- [ ] Refund handling tested
- [ ] Test mode vs production verified
- [ ] Stripe logging configured

### Scheduling & Background Jobs
- [ ] All scheduled tasks configured
- [ ] Task execution times verified
- [ ] Scheduler running on startup
- [ ] Failed task alerts configured
- [ ] Log retention policy set
- [ ] Task performance monitored

## Deployment Process

### Pre-Deployment Verification
- [ ] Run test suite: `npm test`
- [ ] Check code coverage: `npm test -- --coverage`
- [ ] Run linting: `npm run lint`
- [ ] Build Docker image: `docker build -f Dockerfile.prod .`
- [ ] Verify image size and layers
- [ ] Test container startup

### Database Migration
- [ ] Backup current database
- [ ] Test migrations on staging
- [ ] Plan rollback strategy
- [ ] Estimated downtime documented
- [ ] Migration scripts reviewed
- [ ] Database locks minimized

### Deployment Steps
- [ ] Pull latest code
- [ ] Install dependencies: `npm ci`
- [ ] Build Docker image
- [ ] Push to registry
- [ ] Pull on production server
- [ ] Stop old containers
- [ ] Start new containers
- [ ] Run database migrations
- [ ] Verify application startup
- [ ] Check health endpoint
- [ ] Test API endpoints
- [ ] Monitor logs for errors
- [ ] Verify database connection

### Post-Deployment
- [ ] Verify all services running
- [ ] Check API endpoints responding
- [ ] Monitor error logs
- [ ] Verify scheduled tasks running
- [ ] Check database connectivity
- [ ] Test payment processing
- [ ] Verify customer data integrity
- [ ] Monitor system resources
- [ ] Check backup jobs running
- [ ] Document deployment details

## Monitoring & Observability

### Logging
- [ ] Logs centralized (ELK, CloudWatch, etc.)
- [ ] Log rotation configured
- [ ] Error logs monitored
- [ ] Slow query logs enabled
- [ ] Access logs archived

### Metrics
- [ ] CPU usage monitored
- [ ] Memory usage monitored
- [ ] Disk usage monitored
- [ ] Response times tracked
- [ ] Error rates tracked
- [ ] Request rates tracked
- [ ] Database connection pool monitored

### Alerts
- [ ] High CPU alert configured
- [ ] Memory threshold alert configured
- [ ] Disk space alert configured
- [ ] Error rate alert configured
- [ ] Service down alert configured
- [ ] Database connection alert configured
- [ ] Payment failure alert configured

### Backups
- [ ] Daily database backups
- [ ] Backup retention policy defined
- [ ] Backup verification tested
- [ ] Restore testing documented
- [ ] Off-site backup storage
- [ ] Backup encryption enabled

## Performance Optimization

### Database
- [ ] Slow queries identified
- [ ] Query optimization applied
- [ ] Indexes verified
- [ ] Connection pool tuned
- [ ] Caching strategy implemented

### API
- [ ] Response compression enabled
- [ ] Pagination implemented
- [ ] Rate limiting active
- [ ] Request validation optimized
- [ ] Error responses consistent

### Infrastructure
- [ ] Load balancing configured
- [ ] Auto-scaling policies set
- [ ] CDN configured (if applicable)
- [ ] Database replication setup
- [ ] Connection pooling optimized

## Security Verification

### Application Security
- [ ] Input validation active
- [ ] XSS protection verified
- [ ] SQL injection prevention verified
- [ ] CSRF tokens implemented
- [ ] Rate limiting active
- [ ] Request size limits enforced
- [ ] Security headers present

### Infrastructure Security
- [ ] Firewall rules configured
- [ ] SSL/TLS enforced
- [ ] SSH access restricted
- [ ] Secrets not in code
- [ ] Environment variables secure
- [ ] Database access restricted
- [ ] Container security scanning passed

### API Security
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] API keys rotated
- [ ] Webhooks verified
- [ ] Request authentication working
- [ ] Rate limiting preventing abuse

## Rollback Plan

- [ ] Previous version tagged and available
- [ ] Database backup before deployment
- [ ] Rollback commands documented
- [ ] Estimated rollback time: ____ minutes
- [ ] Communication plan if rollback needed
- [ ] Data consistency checks after rollback

## Sign-Off

- [ ] DevOps/Infrastructure sign-off: _______ (Date: ___)
- [ ] Backend team sign-off: _______ (Date: ___)
- [ ] QA sign-off: _______ (Date: ___)
- [ ] Product/Business sign-off: _______ (Date: ___)
