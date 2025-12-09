# Monitoring & Alerting Setup

## Application Monitoring

### Log Aggregation (ELK Stack)

**Elasticsearch, Logstash, Kibana setup:**

```
version: '3.9'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:8.0.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    ports:
      - "5000:5000"

  kibana:
    image: docker.elastic.co/kibana/kibana:8.0.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:
```

### Application Performance Monitoring (APM)

For detailed performance insights, use:
- New Relic
- DataDog
- Elastic APM
- Prometheus + Grafana

### Error Tracking

Configure error tracking service:
- Sentry
- Rollbar
- Airbrake

## Key Metrics to Monitor

### System Metrics
- CPU usage: Alert if > 80%
- Memory usage: Alert if > 85%
- Disk usage: Alert if > 90%
- Network I/O: Monitor for spikes

### Application Metrics
- Request rate: Track requests per second
- Response time: Alert if p95 > 500ms
- Error rate: Alert if > 1%
- Unique errors: Track new errors

### Database Metrics
- Connection pool usage: Alert if > 90%
- Query time: Alert if avg > 100ms
- Slow queries: Log queries > 500ms
- Connection count: Alert if > 100

### Business Metrics
- Invoices generated: Track daily count
- Payments processed: Monitor success rate
- CDRs imported: Track daily volume
- Customer signups: Monitor growth

## Alerting Rules

### Critical Alerts (Immediate)
- Service down
- Database connection failed
- High error rate (> 5%)
- Payment processing failed

### Warning Alerts (30 min)
- High CPU (> 80%)
- High memory (> 85%)
- Slow response times
- Disk space > 80%

### Info Alerts (1 hour)
- Daily reports
- Backup completion
- Scheduled task execution

## Dashboard Setup

### Grafana Dashboard

Key panels:
1. Request rate (RPS)
2. Response time (p50, p95, p99)
3. Error rate
4. Active users
5. Database connections
6. CPU/Memory usage
7. Invoice count
8. Payment success rate

### Kibana Dashboard

Key visualizations:
1. Error logs (filtered by level)
2. Request logs (by endpoint)
3. Slow queries
4. Failed payments
5. System alerts

## Backup & Recovery

### Database Backups

**Daily automated backup:**

```
Daily at 2 AM
0 2 * * * /scripts/backup-db.sh
```

**Backup script:**

```
#!/bin/bash
BACKUP_FILE="/backups/db_backup_$(date +%Y%m%d_%H%M%S).sql"
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > $BACKUP_FILE
gzip $BACKUP_FILE

# Keep only last 30 days
find /backups -name "*.gz" -mtime +30 -delete
```

### Backup Retention
- Daily backups: 7 days
- Weekly backups: 4 weeks
- Monthly backups: 12 months
- Off-site backup: Always

## Disaster Recovery

- **RTO (Recovery Time Objective):** 1 hour
- **RPO (Recovery Point Objective):** 1 hour

### Recovery Steps
1. Restore from latest backup
2. Verify data integrity
3. Check application startup
4. Verify critical functions
5. Monitor for errors
