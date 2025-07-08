# Healthcare Data Migration System - System Requirements and Setup

## Table of Contents

1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [Environment Setup](#environment-setup)
4. [Database Configuration](#database-configuration)
5. [Security Configuration](#security-configuration)
6. [Performance Tuning](#performance-tuning)
7. [Monitoring Setup](#monitoring-setup)
8. [Backup and Recovery Setup](#backup-and-recovery-setup)
9. [Network Configuration](#network-configuration)
10. [Compliance Configuration](#compliance-configuration)
11. [Testing Environment Setup](#testing-environment-setup)
12. [Production Deployment Checklist](#production-deployment-checklist)

## Overview

This document provides comprehensive requirements and setup instructions for the healthcare data migration system. It covers hardware specifications, software dependencies, configuration procedures, and security requirements necessary for production deployment in healthcare environments.

### Architecture Overview

The migration system consists of:
- **Frontend**: React 19 application with TypeScript
- **Backend**: Supabase (PostgreSQL database, authentication, real-time)
- **Migration Engine**: Node.js-based data processing engine
- **Monitoring**: Application and infrastructure monitoring
- **Security**: HIPAA-compliant security controls

## System Requirements

### Minimum Hardware Requirements

#### Production Environment

**Application Server**
- **CPU**: 8 cores (Intel Xeon or AMD EPYC)
- **RAM**: 32 GB DDR4
- **Storage**: 500 GB SSD (NVMe preferred)
- **Network**: 1 Gbps Ethernet
- **Redundancy**: Hot standby recommended

**Database Server**
- **CPU**: 16 cores (Intel Xeon or AMD EPYC)
- **RAM**: 64 GB DDR4
- **Storage**: 2 TB SSD (NVMe) + 10 TB HDD for backups
- **Network**: 10 Gbps Ethernet
- **RAID**: RAID 10 for data, RAID 1 for logs

**Load Balancer**
- **CPU**: 4 cores
- **RAM**: 16 GB
- **Network**: 10 Gbps Ethernet
- **SSL Termination**: Hardware acceleration preferred

#### Development Environment

**Developer Workstation**
- **CPU**: 4 cores (Intel i5/i7 or AMD Ryzen 5/7)
- **RAM**: 16 GB DDR4
- **Storage**: 256 GB SSD
- **Network**: 100 Mbps Ethernet/WiFi

**Development Server**
- **CPU**: 8 cores
- **RAM**: 32 GB
- **Storage**: 1 TB SSD
- **Network**: 1 Gbps Ethernet

### Software Requirements

#### Operating System

**Supported Platforms**
- **Linux**: Ubuntu 20.04 LTS or later, CentOS 8, RHEL 8
- **Container**: Docker 20.10+ with Kubernetes 1.21+
- **Cloud**: AWS, Azure, Google Cloud Platform

**Required System Packages**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y \
  curl \
  wget \
  git \
  build-essential \
  python3 \
  python3-pip \
  postgresql-client \
  redis-tools \
  nginx \
  certbot \
  fail2ban \
  ufw

# CentOS/RHEL
sudo yum update
sudo yum install -y \
  curl \
  wget \
  git \
  gcc \
  gcc-c++ \
  make \
  python3 \
  python3-pip \
  postgresql \
  redis \
  nginx \
  certbot \
  fail2ban \
  firewalld
```

#### Runtime Environment

**Node.js**
- **Version**: 18.x LTS or later
- **Package Manager**: Yarn 1.22+ or npm 8+

```bash
# Install Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Yarn
npm install -g yarn

# Verify installation
node --version  # Should be v18.x.x
yarn --version  # Should be 1.22.x
```

**PostgreSQL**
- **Version**: 13.x or later
- **Extensions**: Required extensions for Supabase compatibility

```bash
# Install PostgreSQL
sudo apt install postgresql-13 postgresql-contrib-13

# Install required extensions
sudo -u postgres psql -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"
sudo -u postgres psql -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
sudo -u postgres psql -c "CREATE EXTENSION IF NOT EXISTS uuid-ossp;"
```

**Redis**
- **Version**: 6.x or later
- **Purpose**: Session storage, caching, job queues

```bash
# Install Redis
sudo apt install redis-server

# Configure Redis for production
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

#### Development Tools

**Required Tools**
```bash
# Install development dependencies
yarn global add \
  typescript \
  @types/node \
  ts-node \
  nodemon \
  prettier \
  eslint

# Install testing tools
yarn global add \
  jest \
  @testing-library/react \
  @testing-library/jest-dom \
  cypress
```

**IDE/Editor Recommendations**
- **Visual Studio Code** with extensions:
  - TypeScript and JavaScript Language Features
  - Prettier - Code formatter
  - ESLint
  - GitLens
  - Docker
  - PostgreSQL

## Environment Setup

### Project Installation

```bash
# Clone the repository
git clone https://github.com/your-org/brius-smile-nexus.git
cd brius-smile-nexus

# Install dependencies
yarn install

# Copy environment configuration
cp .env.example .env.local
cp .env.example .env.production
```

### Environment Variables

#### Development Environment (.env.local)

```bash
# Application Configuration
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/brius_dev
DIRECT_URL=postgresql://username:password@localhost:5432/brius_dev

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Migration Configuration
MIGRATION_BATCH_SIZE=1000
MIGRATION_MAX_CONCURRENCY=3
MIGRATION_TIMEOUT=300000

# Logging Configuration
LOG_LEVEL=debug
LOG_FILE_PATH=./logs/application.log

# Security Configuration
JWT_SECRET=your-jwt-secret-key
ENCRYPTION_KEY=your-encryption-key

# External Services
LEGACY_DB_HOST=legacy-server.com
LEGACY_DB_PORT=1433
LEGACY_DB_NAME=legacy_healthcare
LEGACY_DB_USER=migration_user
LEGACY_DB_PASSWORD=secure-password

# Monitoring Configuration
SENTRY_DSN=https://your-sentry-dsn
DATADOG_API_KEY=your-datadog-key
```

#### Production Environment (.env.production)

```bash
# Application Configuration
NODE_ENV=production
PORT=3000
APP_URL=https://migration.yourdomain.com

# Supabase Configuration
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-role-key

# Database Configuration
DATABASE_URL=postgresql://username:password@prod-db.com:5432/brius_prod
DIRECT_URL=postgresql://username:password@prod-db.com:5432/brius_prod

# Redis Configuration
REDIS_URL=redis://prod-redis.com:6379

# Migration Configuration
MIGRATION_BATCH_SIZE=5000
MIGRATION_MAX_CONCURRENCY=5
MIGRATION_TIMEOUT=600000

# Logging Configuration
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/migration/application.log

# Security Configuration
JWT_SECRET=your-production-jwt-secret
ENCRYPTION_KEY=your-production-encryption-key

# External Services
LEGACY_DB_HOST=legacy-prod-server.com
LEGACY_DB_PORT=1433
LEGACY_DB_NAME=legacy_healthcare_prod
LEGACY_DB_USER=migration_prod_user
LEGACY_DB_PASSWORD=secure-production-password

# Monitoring Configuration
SENTRY_DSN=https://your-production-sentry-dsn
DATADOG_API_KEY=your-production-datadog-key

# SSL Configuration
SSL_CERT_PATH=/etc/ssl/certs/migration.crt
SSL_KEY_PATH=/etc/ssl/private/migration.key

# Backup Configuration
BACKUP_S3_BUCKET=your-backup-bucket
BACKUP_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
```

### Build and Start

```bash
# Development mode
yarn dev

# Production build
yarn build

# Start production server
yarn start

# Run tests
yarn test

# Run linting
yarn lint

# Format code
yarn format
```

## Database Configuration

### Supabase Setup

#### Project Creation

1. **Create Supabase Project**
   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Login to Supabase
   supabase login

   # Initialize project
   supabase init

   # Link to remote project
   supabase link --project-ref your-project-ref
   ```

2. **Database Schema Setup**
   ```sql
   -- Run migration scripts
   supabase db reset

   -- Apply custom migrations
   supabase migration up
   ```

#### Database Configuration

**postgresql.conf Settings**
```ini
# Memory Settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Connection Settings
max_connections = 200
superuser_reserved_connections = 3

# Write Ahead Logging
wal_level = replica
max_wal_size = 1GB
min_wal_size = 80MB
checkpoint_completion_target = 0.9

# Query Planner
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_min_duration_statement = 1000
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on

# Performance Monitoring
shared_preload_libraries = 'pg_stat_statements'
track_activity_query_size = 2048
pg_stat_statements.track = all
```

#### Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view their organization's patients" ON patients
  FOR SELECT USING (
    auth.jwt() ->> 'organization_id' = organization_id::text
  );

CREATE POLICY "Users can insert patients for their organization" ON patients
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'organization_id' = organization_id::text
  );

CREATE POLICY "Users can update their organization's patients" ON patients
  FOR UPDATE USING (
    auth.jwt() ->> 'organization_id' = organization_id::text
  );

-- Migration service policies
CREATE POLICY "Migration service can access all data" ON patients
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'migration_service'
  );
```

### Legacy Database Connection

#### SQL Server Configuration

```typescript
// Legacy database connection configuration
const legacyDbConfig = {
  server: process.env.LEGACY_DB_HOST,
  port: parseInt(process.env.LEGACY_DB_PORT || '1433'),
  database: process.env.LEGACY_DB_NAME,
  user: process.env.LEGACY_DB_USER,
  password: process.env.LEGACY_DB_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true,
    connectionTimeout: 30000,
    requestTimeout: 300000,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  }
};
```

#### Oracle Database Configuration

```typescript
// Oracle database connection configuration
const oracleDbConfig = {
  user: process.env.LEGACY_DB_USER,
  password: process.env.LEGACY_DB_PASSWORD,
  connectString: `${process.env.LEGACY_DB_HOST}:${process.env.LEGACY_DB_PORT}/${process.env.LEGACY_DB_SERVICE}`,
  poolMin: 2,
  poolMax: 10,
  poolIncrement: 1,
  poolTimeout: 60,
  stmtCacheSize: 30,
  edition: 'ORA$BASE',
  events: true,
  externalAuth: false,
  homogeneous: true,
  poolPingInterval: 60,
  poolPingTimeout: 5000
};
```

## Security Configuration

### SSL/TLS Configuration

#### Certificate Setup

```bash
# Generate SSL certificates using Let's Encrypt
sudo certbot certonly --nginx -d migration.yourdomain.com

# Or use custom certificates
sudo mkdir -p /etc/ssl/certs /etc/ssl/private
sudo cp your-certificate.crt /etc/ssl/certs/migration.crt
sudo cp your-private-key.key /etc/ssl/private/migration.key
sudo chmod 644 /etc/ssl/certs/migration.crt
sudo chmod 600 /etc/ssl/private/migration.key
```

#### Nginx SSL Configuration

```nginx
# /etc/nginx/sites-available/migration
server {
    listen 80;
    server_name migration.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name migration.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/migration.crt;
    ssl_certificate_key /etc/ssl/private/migration.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Application Proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static Assets
    location /static/ {
        alias /var/www/migration/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Firewall Configuration

#### UFW (Ubuntu Firewall)

```bash
# Reset firewall rules
sudo ufw --force reset

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change port if needed)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow database connections (restrict to specific IPs)
sudo ufw allow from 10.0.0.0/8 to any port 5432

# Allow Redis connections (restrict to specific IPs)
sudo ufw allow from 10.0.0.0/8 to any port 6379

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

#### Fail2Ban Configuration

```ini
# /etc/fail2ban/jail.local
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10

[postgresql]
enabled = true
filter = postgresql
port = 5432
logpath = /var/log/postgresql/postgresql-*.log
maxretry = 3
```

### Authentication and Authorization

#### JWT Configuration

```typescript
// JWT configuration for authentication
const jwtConfig = {
  secret: process.env.JWT_SECRET,
  expiresIn: '8h',
  issuer: 'brius-migration-system',
  audience: 'brius-users',
  algorithm: 'HS256' as const,
  clockTolerance: 30,
  ignoreExpiration: false,
  ignoreNotBefore: false
};

// Refresh token configuration
const refreshTokenConfig = {
  secret: process.env.REFRESH_TOKEN_SECRET,
  expiresIn: '7d',
  issuer: 'brius-migration-system',
  audience: 'brius-users'
};
```

#### Role-Based Access Control (RBAC)

```typescript
// User roles and permissions
export const UserRoles = {
  SUPER_ADMIN: 'super_admin',
  SYSTEM_ADMIN: 'system_admin',
  MIGRATION_OPERATOR: 'migration_operator',
  DATA_ANALYST: 'data_analyst',
  VIEWER: 'viewer'
} as const;

export const Permissions = {
  // Migration permissions
  MIGRATION_CREATE: 'migration:create',
  MIGRATION_READ: 'migration:read',
  MIGRATION_UPDATE: 'migration:update',
  MIGRATION_DELETE: 'migration:delete',
  MIGRATION_EXECUTE: 'migration:execute',
  
  // System permissions
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_MONITOR: 'system:monitor',
  SYSTEM_BACKUP: 'system:backup',
  
  // User management
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete'
} as const;

// Role-permission mapping
export const RolePermissions = {
  [UserRoles.SUPER_ADMIN]: Object.values(Permissions),
  [UserRoles.SYSTEM_ADMIN]: [
    Permissions.MIGRATION_CREATE,
    Permissions.MIGRATION_READ,
    Permissions.MIGRATION_UPDATE,
    Permissions.MIGRATION_EXECUTE,
    Permissions.SYSTEM_CONFIG,
    Permissions.SYSTEM_MONITOR,
    Permissions.USER_READ,
    Permissions.USER_UPDATE
  ],
  [UserRoles.MIGRATION_OPERATOR]: [
    Permissions.MIGRATION_READ,
    Permissions.MIGRATION_UPDATE,
    Permissions.MIGRATION_EXECUTE,
    Permissions.SYSTEM_MONITOR
  ],
  [UserRoles.DATA_ANALYST]: [
    Permissions.MIGRATION_READ,
    Permissions.SYSTEM_MONITOR
  ],
  [UserRoles.VIEWER]: [
    Permissions.MIGRATION_READ
  ]
};
```

## Performance Tuning

### Application Performance

#### Node.js Optimization

```javascript
// package.json - Production optimization
{
  "scripts": {
    "start": "NODE_ENV=production node --max-old-space-size=4096 dist/server.js",
    "build": "NODE_ENV=production yarn build:client && yarn build:server",
    "build:client": "vite build",
    "build:server": "tsc --project tsconfig.server.json"
  }
}
```

#### Memory Management

```typescript
// Memory monitoring and management
class MemoryManager {
  private memoryThreshold = 0.8; // 80% of available memory
  private gcInterval = 300000; // 5 minutes

  constructor() {
    this.startMemoryMonitoring();
  }

  private startMemoryMonitoring(): void {
    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
      
      if (heapUsedMB / heapTotalMB > this.memoryThreshold) {
        this.triggerGarbageCollection();
      }
    }, this.gcInterval);
  }

  private triggerGarbageCollection(): void {
    if (global.gc) {
      global.gc();
      logger.info('Garbage collection triggered', {
        memoryBefore: process.memoryUsage()
      });
    }
  }
}
```

### Database Performance

#### Connection Pooling

```typescript
// Database connection pool configuration
const poolConfig = {
  // PostgreSQL pool settings
  postgresql: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000,
    evict: 1000,
    handleDisconnects: true
  },
  
  // Redis pool settings
  redis: {
    max: 10,
    min: 2,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200
  }
};
```

#### Query Optimization

```sql
-- Create performance indexes
CREATE INDEX CONCURRENTLY idx_patients_organization_id ON patients(organization_id);
CREATE INDEX CONCURRENTLY idx_patients_created_at ON patients(created_at);
CREATE INDEX CONCURRENTLY idx_patient_visits_patient_id ON patient_visits(patient_id);
CREATE INDEX CONCURRENTLY idx_patient_visits_visit_date ON patient_visits(visit_date);
CREATE INDEX CONCURRENTLY idx_diagnoses_patient_id ON diagnoses(patient_id);
CREATE INDEX CONCURRENTLY idx_diagnoses_diagnosis_code ON diagnoses(diagnosis_code);

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY idx_patients_org_status ON patients(organization_id, status);
CREATE INDEX CONCURRENTLY idx_visits_patient_date ON patient_visits(patient_id, visit_date);

-- Partial indexes for filtered queries
CREATE INDEX CONCURRENTLY idx_patients_active ON patients(organization_id) 
WHERE status = 'active';

-- Text search indexes
CREATE INDEX CONCURRENTLY idx_patients_search ON patients 
USING gin(to_tsvector('english', first_name || ' ' || last_name));
```

### Caching Strategy

#### Redis Configuration

```redis
# /etc/redis/redis.conf

# Memory management
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Network
tcp-keepalive 300
timeout 0

# Security
requirepass your-redis-password
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""

# Performance
tcp-backlog 511
databases 16
```

#### Application Caching

```typescript
// Cache configuration
const cacheConfig = {
  // Redis cache for session data
  session: {
    ttl: 3600, // 1 hour
    prefix: 'session:',
    maxSize: 1000
  },
  
  // Application cache for frequently accessed data
  application: {
    ttl: 1800, // 30 minutes
    prefix: 'app:',
    maxSize: 5000
  },
  
  // Query result cache
  query: {
    ttl: 300, // 5 minutes
    prefix: 'query:',
    maxSize: 10000
  }
};

// Cache implementation
class CacheManager {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      logger.error('Cache set error', { key, error });
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      logger.error('Cache delete error', { key, error });
    }
  }
}
```

## Monitoring Setup

### Application Monitoring

#### Health Check Endpoint

```typescript
// Health check implementation
export class HealthCheckService {
  async getHealthStatus(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkExternalServices(),
      this.checkDiskSpace(),
      this.checkMemoryUsage()
    ]);

    const status: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      uptime: process.uptime(),
      checks: {}
    };

    checks.forEach((check, index) => {
      const checkName = ['database', 'redis', 'external', 'disk', 'memory'][index];
      if (check.status === 'fulfilled') {
        status.checks[checkName] = check.value;
      } else {
        status.checks[checkName] = {
          status: 'unhealthy',
          error: check.reason.message
        };
        status.status = 'unhealthy';
      }
    });

    return status;
  }

  private async checkDatabase(): Promise<CheckResult> {
    try {
      await supabaseClient.from('health_check').select('1').limit(1);
      return { status: 'healthy', responseTime: Date.now() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  private async checkRedis(): Promise<CheckResult> {
    try {
      const start = Date.now();
      await redis.ping();
      return { status: 'healthy', responseTime: Date.now() - start };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}
```

#### Logging Configuration

```typescript
// Winston logging configuration
import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'migration-system',
    version: process.env.APP_VERSION
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // File transport for production
    new winston.transports.File({
      filename: '/var/log/migration/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    
    new winston.transports.File({
      filename: '/var/log/migration/application.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10
    })
  ]
});

// Add Sentry transport for error tracking
if (process.env.SENTRY_DSN) {
  logger.add(new winston.transports.Console({
    level: 'error',
    format: winston.format.combine(
      winston.format.errors({ stack: true }),
      winston.format.json()
    )
  }));
}
```

### Infrastructure Monitoring

#### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "migration_rules.yml"

scrape_configs:
  - job_name: 'migration-app'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'postgresql'
    static_configs:
      - targets: ['localhost:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

#### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Healthcare Migration System",
    "panels": [
      {
        "title": "Migration Throughput",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(migration_records_processed_total[5m])",
            "legendFormat": "Records/sec"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(migration_errors_total[5m])",
            "legendFormat": "Errors/sec"
          