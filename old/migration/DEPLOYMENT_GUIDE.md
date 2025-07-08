# Healthcare Data Migration System - Deployment Guide

## Table of Contents

1. [Overview](#overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Environment Setup](#environment-setup)
4. [Docker Deployment](#docker-deployment)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Cloud Platform Deployment](#cloud-platform-deployment)
7. [CI/CD Pipeline Setup](#cicd-pipeline-setup)
8. [Database Migration and Setup](#database-migration-and-setup)
9. [SSL Certificate Configuration](#ssl-certificate-configuration)
10. [Load Balancer Configuration](#load-balancer-configuration)
11. [Monitoring and Logging Setup](#monitoring-and-logging-setup)
12. [Security Hardening](#security-hardening)
13. [Performance Optimization](#performance-optimization)
14. [Backup and Recovery Setup](#backup-and-recovery-setup)
15. [Post-Deployment Verification](#post-deployment-verification)
16. [Rollback Procedures](#rollback-procedures)

## Overview

This guide provides comprehensive instructions for deploying the healthcare data migration system to production environments. It covers multiple deployment scenarios including Docker containers, Kubernetes clusters, and major cloud platforms while ensuring HIPAA compliance and security best practices.

### Deployment Architecture

The system follows a microservices architecture with the following components:

- **Frontend**: React 19 application served via Nginx
- **Backend API**: Node.js application with Express
- **Database**: PostgreSQL with Supabase
- **Cache**: Redis for session and application caching
- **Message Queue**: Redis for background job processing
- **File Storage**: S3-compatible storage for backups and logs
- **Monitoring**: Prometheus, Grafana, and application monitoring

### Supported Deployment Targets

- **Container Platforms**: Docker, Docker Compose, Kubernetes
- **Cloud Providers**: AWS, Azure, Google Cloud Platform
- **On-Premises**: Physical servers, virtual machines
- **Hybrid**: Multi-cloud and hybrid cloud deployments

## Pre-Deployment Checklist

### Infrastructure Requirements

- [ ] **Compute Resources**
  - [ ] Application servers (minimum 8 cores, 32GB RAM)
  - [ ] Database servers (minimum 16 cores, 64GB RAM)
  - [ ] Load balancers (minimum 4 cores, 16GB RAM)
  - [ ] Monitoring servers (minimum 4 cores, 16GB RAM)

- [ ] **Network Requirements**
  - [ ] Static IP addresses assigned
  - [ ] DNS records configured
  - [ ] Firewall rules configured
  - [ ] SSL certificates obtained
  - [ ] VPN access configured (if required)

- [ ] **Storage Requirements**
  - [ ] Database storage (minimum 2TB SSD)
  - [ ] Application storage (minimum 500GB SSD)
  - [ ] Backup storage (minimum 10TB)
  - [ ] Log storage (minimum 1TB)

### Security Requirements

- [ ] **Certificates and Keys**
  - [ ] SSL/TLS certificates obtained and validated
  - [ ] Application signing certificates
  - [ ] Database encryption keys
  - [ ] API keys and secrets secured

- [ ] **Access Control**
  - [ ] Service accounts created
  - [ ] Role-based access control configured
  - [ ] Multi-factor authentication enabled
  - [ ] Audit logging enabled

### Compliance Requirements

- [ ] **HIPAA Compliance**
  - [ ] Business Associate Agreements (BAAs) signed
  - [ ] Encryption at rest and in transit configured
  - [ ] Access logging and monitoring enabled
  - [ ] Data retention policies implemented

- [ ] **Regulatory Compliance**
  - [ ] SOC 2 Type II compliance verified
  - [ ] GDPR compliance measures implemented
  - [ ] Local healthcare regulations reviewed

### Application Requirements

- [ ] **Configuration**
  - [ ] Environment variables configured
  - [ ] Database connection strings secured
  - [ ] External service integrations tested
  - [ ] Feature flags configured

- [ ] **Dependencies**
  - [ ] All required services available
  - [ ] Third-party integrations tested
  - [ ] Legacy system connectivity verified
  - [ ] Backup systems operational

## Environment Setup

### Production Environment Configuration

```bash
# Create production environment file
cat > .env.production << EOF
# Application Configuration
NODE_ENV=production
PORT=3000
APP_URL=https://migration.yourdomain.com
APP_VERSION=1.0.0

# Supabase Configuration
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-role-key

# Database Configuration
DATABASE_URL=postgresql://username:password@prod-db.com:5432/brius_prod
DIRECT_URL=postgresql://username:password@prod-db.com:5432/brius_prod

# Redis Configuration
REDIS_URL=redis://prod-redis.com:6379
REDIS_PASSWORD=secure-redis-password

# Migration Configuration
MIGRATION_BATCH_SIZE=5000
MIGRATION_MAX_CONCURRENCY=5
MIGRATION_TIMEOUT=600000
MIGRATION_RETRY_ATTEMPTS=3
MIGRATION_RETRY_DELAY=10000

# Security Configuration
JWT_SECRET=your-production-jwt-secret-256-bit
ENCRYPTION_KEY=your-production-encryption-key-256-bit
SESSION_SECRET=your-production-session-secret

# External Services
LEGACY_DB_HOST=legacy-prod-server.com
LEGACY_DB_PORT=1433
LEGACY_DB_NAME=legacy_healthcare_prod
LEGACY_DB_USER=migration_prod_user
LEGACY_DB_PASSWORD=secure-production-password

# Monitoring Configuration
SENTRY_DSN=https://your-production-sentry-dsn
DATADOG_API_KEY=your-production-datadog-key
PROMETHEUS_ENDPOINT=http://prometheus:9090

# SSL Configuration
SSL_CERT_PATH=/etc/ssl/certs/migration.crt
SSL_KEY_PATH=/etc/ssl/private/migration.key
SSL_CA_PATH=/etc/ssl/certs/ca-bundle.crt

# Backup Configuration
BACKUP_S3_BUCKET=your-production-backup-bucket
BACKUP_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# Logging Configuration
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/migration/application.log
LOG_MAX_SIZE=100MB
LOG_MAX_FILES=10
LOG_COMPRESS=true

# Performance Configuration
NODE_OPTIONS=--max-old-space-size=4096
UV_THREADPOOL_SIZE=16
WORKER_PROCESSES=4
EOF
```

### Staging Environment Configuration

```bash
# Create staging environment file
cat > .env.staging << EOF
# Application Configuration
NODE_ENV=staging
PORT=3000
APP_URL=https://migration-staging.yourdomain.com
APP_VERSION=1.0.0-staging

# Supabase Configuration
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-staging-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-staging-service-role-key

# Database Configuration
DATABASE_URL=postgresql://username:password@staging-db.com:5432/brius_staging
DIRECT_URL=postgresql://username:password@staging-db.com:5432/brius_staging

# Redis Configuration
REDIS_URL=redis://staging-redis.com:6379
REDIS_PASSWORD=staging-redis-password

# Migration Configuration
MIGRATION_BATCH_SIZE=1000
MIGRATION_MAX_CONCURRENCY=3
MIGRATION_TIMEOUT=300000
MIGRATION_RETRY_ATTEMPTS=3
MIGRATION_RETRY_DELAY=5000

# Security Configuration
JWT_SECRET=your-staging-jwt-secret
ENCRYPTION_KEY=your-staging-encryption-key
SESSION_SECRET=your-staging-session-secret

# External Services
LEGACY_DB_HOST=legacy-staging-server.com
LEGACY_DB_PORT=1433
LEGACY_DB_NAME=legacy_healthcare_staging
LEGACY_DB_USER=migration_staging_user
LEGACY_DB_PASSWORD=staging-password

# Monitoring Configuration
SENTRY_DSN=https://your-staging-sentry-dsn
DATADOG_API_KEY=your-staging-datadog-key

# Logging Configuration
LOG_LEVEL=debug
LOG_FILE_PATH=/var/log/migration/application.log
EOF
```

## Docker Deployment

### Dockerfile

```dockerfile
# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile --production=false

# Copy source code
COPY . .

# Build application
RUN yarn build

# Production stage
FROM node:18-alpine AS production

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S migration -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install production dependencies only
RUN yarn install --frozen-lockfile --production=true && \
    yarn cache clean

# Copy built application from builder stage
COPY --from=builder --chown=migration:nodejs /app/dist ./dist
COPY --from=builder --chown=migration:nodejs /app/public ./public

# Create necessary directories
RUN mkdir -p /var/log/migration && \
    chown -R migration:nodejs /var/log/migration

# Switch to non-root user
USER migration

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/server.js"]
```

### Docker Compose Configuration

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # Application service
  migration-app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    image: migration-system:latest
    container_name: migration-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    volumes:
      - ./logs:/var/log/migration
      - ./ssl:/etc/ssl/certs:ro
    networks:
      - migration-network
    depends_on:
      - redis
      - postgres
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G

  # Nginx reverse proxy
  nginx:
    image: nginx:alpine
    container_name: migration-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./ssl:/etc/ssl/certs:ro
      - ./logs/nginx:/var/log/nginx
    networks:
      - migration-network
    depends_on:
      - migration-app
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # PostgreSQL database
  postgres:
    image: postgres:15-alpine
    container_name: migration-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: brius_prod
      POSTGRES_USER: migration_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --lc-collate=C --lc-ctype=C"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init:/docker-entrypoint-initdb.d:ro
      - ./backups:/backups
    networks:
      - migration-network
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U migration_user -d brius_prod"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 8G
        reservations:
          cpus: '2.0'
          memory: 4G

  # Redis cache
  redis:
    image: redis:7-alpine
    container_name: migration-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis_data:/data
      - ./redis/redis.conf:/etc/redis/redis.conf:ro
    networks:
      - migration-network
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G

  # Prometheus monitoring
  prometheus:
    image: prom/prometheus:latest
    container_name: migration-prometheus
    restart: unless-stopped
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    networks:
      - migration-network
    ports:
      - "9090:9090"
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:9090/-/healthy"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Grafana dashboard
  grafana:
    image: grafana/grafana:latest
    container_name: migration-grafana
    restart: unless-stopped
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
      GF_INSTALL_PLUGINS: grafana-piechart-panel
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
      - ./grafana/dashboards:/var/lib/grafana/dashboards:ro
    networks:
      - migration-network
    ports:
      - "3001:3000"
    depends_on:
      - prometheus
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  migration-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  prometheus_data:
    driver: local
  grafana_data:
    driver: local
```

### Docker Deployment Commands

```bash
# Build and deploy production environment
#!/bin/bash

# Set environment variables
export POSTGRES_PASSWORD=$(openssl rand -base64 32)
export REDIS_PASSWORD=$(openssl rand -base64 32)
export GRAFANA_PASSWORD=$(openssl rand -base64 32)

# Create necessary directories
mkdir -p logs/nginx ssl backups postgres/init redis grafana/dashboards prometheus

# Build application image
docker build -t migration-system:latest .

# Deploy with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo "Waiting for services to be healthy..."
docker-compose -f docker-compose.prod.yml ps

# Run database migrations
docker-compose -f docker-compose.prod.yml exec migration-app yarn migrate

# Verify deployment
docker-compose -f docker-compose.prod.yml exec migration-app curl -f http://localhost:3000/health

echo "Deployment completed successfully!"
echo "Application URL: https://migration.yourdomain.com"
echo "Grafana URL: http://localhost:3001 (admin/${GRAFANA_PASSWORD})"
echo "Prometheus URL: http://localhost:9090"
```

## Kubernetes Deployment

### Namespace Configuration

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: migration-system
  labels:
    name: migration-system
    environment: production
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: migration-quota
  namespace: migration-system
spec:
  hard:
    requests.cpu: "8"
    requests.memory: 32Gi
    limits.cpu: "16"
    limits.memory: 64Gi
    persistentvolumeclaims: "10"
```

### ConfigMap and Secrets

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: migration-config
  namespace: migration-system
data:
  NODE_ENV: "production"
  PORT: "3000"
  APP_URL: "https://migration.yourdomain.com"
  MIGRATION_BATCH_SIZE: "5000"
  MIGRATION_MAX_CONCURRENCY: "5"
  MIGRATION_TIMEOUT: "600000"
  LOG_LEVEL: "info"
  REDIS_URL: "redis://migration-redis:6379"
---
apiVersion: v1
kind: Secret
metadata:
  name: migration-secrets
  namespace: migration-system
type: Opaque
data:
  # Base64 encoded values
  DATABASE_URL: <base64-encoded-database-url>
  JWT_SECRET: <base64-encoded-jwt-secret>
  ENCRYPTION_KEY: <base64-encoded-encryption-key>
  REDIS_PASSWORD: <base64-encoded-redis-password>
  SUPABASE_SERVICE_ROLE_KEY: <base64-encoded-supabase-key>
```

### Application Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: migration-app
  namespace: migration-system
  labels:
    app: migration-app
    version: v1.0.0
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: migration-app
  template:
    metadata:
      labels:
        app: migration-app
        version: v1.0.0
    spec:
      serviceAccountName: migration-service-account
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
      - name: migration-app
        image: migration-system:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
        envFrom:
        - configMapRef:
            name: migration-config
        - secretRef:
            name: migration-secrets
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        volumeMounts:
        - name: logs
          mountPath: /var/log/migration
        - name: ssl-certs
          mountPath: /etc/ssl/certs
          readOnly: true
      volumes:
      - name: logs
        persistentVolumeClaim:
          claimName: migration-logs-pvc
      - name: ssl-certs
        secret:
          secretName: migration-ssl-certs
      nodeSelector:
        kubernetes.io/os: linux
      tolerations:
      - key: "migration-workload"
        operator: "Equal"
        value: "true"
        effect: "NoSchedule"
---
apiVersion: v1
kind: Service
metadata:
  name: migration-app-service
  namespace: migration-system
  labels:
    app: migration-app
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
    name: http
  selector:
    app: migration-app
```

### PostgreSQL StatefulSet

```yaml
# postgres-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: migration-postgres
  namespace: migration-system
spec:
  serviceName: migration-postgres-service
  replicas: 1
  selector:
    matchLabels:
      app: migration-postgres
  template:
    metadata:
      labels:
        app: migration-postgres
    spec:
      securityContext:
        runAsUser: 999
        runAsGroup: 999
        fsGroup: 999
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_DB
          value: "brius_prod"
        - name: POSTGRES_USER
          value: "migration_user"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: migration-secrets
              key: POSTGRES_PASSWORD
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        resources:
          requests:
            cpu: 1000m
            memory: 4Gi
          limits:
            cpu: 4000m
            memory: 8Gi
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        - name: postgres-config
          mountPath: /etc/postgresql/postgresql.conf
          subPath: postgresql.conf
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - migration_user
            - -d
            - brius_prod
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - migration_user
            - -d
            - brius_prod
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: postgres-config
        configMap:
          name: postgres-config
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 100Gi
---
apiVersion: v1
kind: Service
metadata:
  name: migration-postgres-service
  namespace: migration-system
spec:
  type: ClusterIP
  ports:
  - port: 5432
    targetPort: 5432
    protocol: TCP
    name: postgres
  selector:
    app: migration-postgres
```

### Ingress Configuration

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: migration-ingress
  namespace: migration-system
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - migration.yourdomain.com
    secretName: migration-tls-secret
  rules:
  - host: migration.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: migration-app-service
            port:
              number: 80
```

### Horizontal Pod Autoscaler

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: migration-app-hpa
  namespace: migration-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: migration-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
```

### Kubernetes Deployment Commands

```bash
#!/bin/bash
# deploy-k8s.sh

# Apply namespace and RBAC
kubectl apply -f namespace.yaml
kubectl apply -f rbac.yaml

# Create secrets (replace with actual values)
kubectl create secret generic migration-secrets \
  --from-literal=DATABASE_URL="postgresql://user:pass@host:5432/db" \
  --from-literal=JWT_SECRET="your-jwt-secret" \
  --from-literal=ENCRYPTION_KEY="your-encryption-key" \
  --from-literal=REDIS_PASSWORD="your-redis-password" \
  --from-literal=SUPABASE_SERVICE_ROLE_KEY="your-supabase-key" \
  --namespace=migration-system

# Apply configurations
kubectl apply -f configmap.yaml
kubectl apply -f postgres-statefulset.yaml
kubectl apply -f redis-deployment.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
kubectl apply -f hpa.yaml

# Wait for deployments to be ready
kubectl wait --for=condition=available --timeout=300s deployment/migration-app -n migration-system
kubectl wait --for=condition=ready --timeout=300s pod -l app=migration-postgres -n migration-system

# Run database migrations
kubectl exec -it deployment/migration-app -n migration-system -- yarn migrate

# Verify deployment
kubectl get pods -n migration-system
kubectl get services -n migration-system
kubectl get ingress -n migration-system

echo "Kubernetes deployment completed successfully!"
```

## Cloud Platform Deployment

### AWS Deployment with EKS

#### EKS Cluster Configuration

```yaml
# eks-cluster.yaml
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: migration-cluster
  region: us-east-1
  version: "1.24"

vpc:
  cidr: "10.0.0.0/16"
  nat:
    gateway: Single

iam:
  withOIDC: true
  serviceAccounts:
  - metadata:
      name: migration-service-account
      namespace: migration-system
    attachPolicyARNs:
    - arn:aws:iam::aws:policy/AmazonS3FullAccess
    - arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy

nodeGroups:
- name: migration-workers
  instanceType: m5.xlarge
  desiredCapacity: 3
  minSize: 2
  maxSize: 10
  volumeSize: 100
  volumeType: gp3
  ssh:
    allow: true
    publicKeyName: migration-key
  iam:
    attachPolicyARNs:
    - arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy
    - arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy
    - arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
    - arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy
  labels:
    workload-type: migration
  taints:
  - key: migration-workload
    value: "true"
    effect: NoSchedule

addons:
- name: vpc-cni
  version: latest
- name: coredns
  version: latest
- name: kube-proxy
  version: latest
- name: aws-ebs-csi-driver
  version: latest

cloudWatch:
  clusterLogging:
    enable: ["api", "audit", "authenticator", "controllerManager", "scheduler"]
```

#### RDS Database Setup

```bash
#!/bin/bash
# setup-rds.sh

# Create RDS subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name migration-subnet-group \
  --db-subnet-group-description "Subnet group for migration database" \
  --subnet-ids subnet-12345678 subnet-87654321

# Create RDS parameter group
aws rds create-db-parameter-group \
  --db-parameter-group-name migration-postgres-params \
  --db-parameter-group-family postgres15 \
  --description "Parameter group for migration PostgreSQL"

# Modify parameters for performance
aws rds modify-db-parameter-group \
  --db-parameter-group-name migration-postgres-params \
  --parameters "ParameterName=shared_preload_libraries,ParameterValue=pg_stat_statements,ApplyMethod=pending-reboot"

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier migration-postgres-prod \
  --db-instance-class db.r5.2xlarge \
  --engine postgres \
  --engine-version 15.3 \
  --master-username migration_admin \
  --master-user-password "$(openssl rand -base64 32)" \
  --allocated-storage 500 \
  --storage-type gp3 \
  --storage-encrypted \
  --kms-key-id alias/aws/rds \
  --vpc-security-group-ids sg-12345678 \
  --db-subnet-group-name migration-subnet-group \
  --db-parameter-group-name migration-postgres-params \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00" \
  --