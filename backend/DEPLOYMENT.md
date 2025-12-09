# Deployment Guide

## Local Development

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (if running locally without Docker)
- PostgreSQL 15+ (optional when not using Docker)

### Start with Docker Compose

```bash
# Clone repository
git clone <repo>
cd telecom-billing-backend

# Copy environment file
cp .env.example .env

# Start services
docker-compose up -d

# Initialize database
docker-compose exec backend npm run init-db

# Seed demo data
docker-compose exec backend npm run seed

# View logs
docker-compose logs -f backend
```

Access points:
- API: http://localhost:5000
- pgAdmin: http://localhost:5050 (admin@example.com / admin)
- Health: http://localhost:5000/health

### Local Development (without Docker)

```bash
npm install
createdb telecom_billing
npm run init-db
npm run seed
npm run dev
```

---

## Production Deployment

### Prerequisites
- Docker & Docker Compose
- SSL certificates and domain
- Stripe API keys
- Filled environment variables

### Deploy Steps

```bash
cp .env.example .env.production
# edit .env.production with prod values

docker-compose -f docker-compose.prod.yml up -d

docker-compose -f docker-compose.prod.yml ps

docker-compose -f docker-compose.prod.yml logs -f backend
```

### Health Checks

```bash
curl http://localhost:5000/health

docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U postgres
```

### Backups

```bash
# Backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres telecom_billing > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres telecom_billing < backup_file.sql
```

---

## Kubernetes Deployment

```bash
docker build -f Dockerfile.prod -t your-registry/telecom-billing-backend:latest .
docker push your-registry/telecom-billing-backend:latest

kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

kubectl get deployments
kubectl get pods
kubectl get svc

kubectl logs -f deployment/telecom-billing-backend
```

---

## Monitoring & Troubleshooting

```bash
# Logs
docker-compose logs -f backend

# Status
docker-compose ps

# Restart
docker-compose restart backend

docker-compose down

docker-compose down -v  # remove volumes
```
