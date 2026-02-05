# Backend Deployment Guide

**Author:** Tech Lead
**Created:** 2026-01-17
**Last Updated:** 2026-01-17

---

## Table of Contents

1. [Server Requirements](#1-server-requirements)
2. [Initial Server Setup](#2-initial-server-setup)
3. [Deploy Application Code](#3-deploy-application-code)
4. [Environment Configuration](#4-environment-configuration)
5. [Initialize Database](#5-initialize-database)
6. [Create Systemd Service](#6-create-systemd-service)
7. [Configure Nginx](#7-configure-nginx)
8. [Firewall Setup](#8-firewall-setup)
9. [SSL Certificate](#9-ssl-certificate)
10. [Deployment Script](#10-deployment-script)
11. [Verify Deployment](#11-verify-deployment)
12. [Maintenance Commands](#12-maintenance-commands)
13. [Troubleshooting](#13-troubleshooting)
14. [Backup Strategy](#14-backup-strategy)

---

## 1. Server Requirements

### Minimum Specifications

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 4GB | 8GB |
| Storage | 50GB SSD | 100GB SSD |
| Bandwidth | 100Mbps | 1Gbps |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### Required Software

- Python 3.11+
- Nginx 1.24+
- Certbot (for SSL)
- Git

---

## 2. Initial Server Setup

### 2.1 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 2.2 Install Dependencies

```bash
# Install Python 3.11
sudo apt install -y python3.11 python3.11-venv python3.11-dev

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# Install Git and other utilities
sudo apt install -y git curl htop
```

### 2.3 Create Application Directory

```bash
# Create app directory
sudo mkdir -p /var/www/viecz-backend
sudo chown $USER:$USER /var/www/viecz-backend

# Create log directory
sudo mkdir -p /var/log/viecz
sudo chown www-data:www-data /var/log/viecz
```

### 2.4 Create Deploy User (Optional but Recommended)

```bash
# Create a dedicated deploy user
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG sudo deploy

# Set up SSH keys for deploy user
sudo mkdir -p /home/deploy/.ssh
sudo cp ~/.ssh/authorized_keys /home/deploy/.ssh/
sudo chown -R deploy:deploy /home/deploy/.ssh
```

---

## 3. Deploy Application Code

### 3.1 Clone Repository

```bash
cd /var/www/viecz-backend

# Option 1: Clone from Git
git clone <your-repo-url> .

# Option 2: Copy from local (using rsync)
# rsync -avz --exclude '.git' --exclude 'venv' --exclude '__pycache__' \
#   ./backend/ user@server:/var/www/viecz-backend/
```

### 3.2 Set Up Python Virtual Environment

```bash
cd /var/www/viecz-backend

# Create virtual environment
python3.11 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install uv package manager
pip install uv

# Install dependencies
uv sync

# Install gunicorn for production
pip install gunicorn
```

### 3.3 Create Data Directory

```bash
# Create directory for SQLite database
mkdir -p /var/www/viecz-backend/data

# Set permissions
sudo chown -R www-data:www-data /var/www/viecz-backend/data
```

---

## 4. Environment Configuration

### 4.1 Create Environment File

```bash
cp .env.example .env
nano .env
```

### 4.2 Production Environment Variables

```bash
# ===========================================
# Server Configuration
# ===========================================
ENVIRONMENT=production
DEBUG=false
API_URL=https://api.viecz.vn

# ===========================================
# Database (SQLite)
# ===========================================
DATABASE_URL=sqlite:///./data/viecz.db

# ===========================================
# JWT Authentication
# ===========================================
# Generate a strong secret: openssl rand -hex 32
JWT_SECRET=your-super-secret-key-at-least-32-characters-long
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# ===========================================
# Zalo Integration
# ===========================================
ZALO_APP_ID=your-zalo-app-id
ZALO_APP_SECRET=your-zalo-app-secret
ZALO_OAUTH_REDIRECT_URL=https://api.viecz.vn/api/v1/auth/zalo/callback

# ===========================================
# Payment Configuration
# ===========================================
# Set to false for production with real ZaloPay
MOCK_PAYMENT_ENABLED=false

# ZaloPay Production Credentials
ZALOPAY_APP_ID=your-zalopay-app-id
ZALOPAY_KEY1=your-zalopay-key1
ZALOPAY_KEY2=your-zalopay-key2
ZALOPAY_ENDPOINT=https://openapi.zalopay.vn/v2
ZALOPAY_CALLBACK_URL=https://api.viecz.vn/api/v1/payments/callback
ZALOPAY_REDIRECT_URL=https://your-zalo-miniapp-url.com/#/payment/result

# Platform fee percentage
PLATFORM_FEE_PERCENT=10

# ===========================================
# CORS Configuration
# ===========================================
CORS_ORIGINS=["https://your-zalo-miniapp-url.com"]

# ===========================================
# Logging
# ===========================================
LOG_LEVEL=INFO
LOG_DIR=/var/log/viecz
```

### 4.3 Secure the Environment File

```bash
# Restrict permissions
chmod 600 .env

# Change ownership
sudo chown www-data:www-data .env
```

---

## 5. Initialize Database

### 5.1 Run Database Migrations

```bash
cd /var/www/viecz-backend
source venv/bin/activate

# Run Alembic migrations
uv run alembic upgrade head
```

### 5.2 Seed Initial Data

```bash
# Seed categories and initial data
uv run python -m app.seeds
```

### 5.3 Verify Database

```bash
# Check if database file exists
ls -la data/viecz.db

# Quick verification (optional)
sqlite3 data/viecz.db ".tables"
```

---

## 6. Create Systemd Service

### 6.1 Create Service File

```bash
sudo nano /etc/systemd/system/viecz.service
```

### 6.2 Service Configuration

```ini
[Unit]
Description=Viecz FastAPI Application
After=network.target

[Service]
Type=exec
User=www-data
Group=www-data
WorkingDirectory=/var/www/viecz-backend
Environment="PATH=/var/www/viecz-backend/venv/bin"
EnvironmentFile=/var/www/viecz-backend/.env

ExecStart=/var/www/viecz-backend/venv/bin/gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:8000 \
    --access-logfile /var/log/viecz/access.log \
    --error-logfile /var/log/viecz/error.log \
    --capture-output \
    --timeout 120

Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/www/viecz-backend/data /var/log/viecz

[Install]
WantedBy=multi-user.target
```

### 6.3 Set Permissions

```bash
# Set ownership for application directory
sudo chown -R www-data:www-data /var/www/viecz-backend
```

### 6.4 Enable and Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable viecz

# Start the service
sudo systemctl start viecz

# Check status
sudo systemctl status viecz
```

---

## 7. Configure Nginx

### 7.1 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/viecz
```

### 7.2 Nginx Configuration File

```nginx
# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

# Upstream backend
upstream backend {
    server 127.0.0.1:8000;
    keepalive 32;
}

# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name api.viecz.vn;

    # Allow certbot challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.viecz.vn;

    # SSL Configuration (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/api.viecz.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.viecz.vn/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Request size limit
    client_max_body_size 10M;

    # Logging
    access_log /var/log/nginx/viecz-access.log;
    error_log /var/log/nginx/viecz-error.log;

    # Health check endpoint (no rate limiting)
    location /health {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API endpoints
    location /api/ {
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
        limit_req_status 429;

        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket endpoint for chat
    location /ws/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeouts
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # API documentation (optional - disable in production if needed)
    location /docs {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location /redoc {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location /openapi.json {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

### 7.3 Enable Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/viecz /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 8. Firewall Setup

### 8.1 Configure UFW

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### 8.2 Expected Output

```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
22/tcp (v6)                ALLOW       Anywhere (v6)
80/tcp (v6)                ALLOW       Anywhere (v6)
443/tcp (v6)               ALLOW       Anywhere (v6)
```

---

## 9. SSL Certificate

### 9.1 Obtain Certificate with Certbot

```bash
# Obtain SSL certificate
sudo certbot --nginx -d api.viecz.vn

# Follow the prompts:
# - Enter email address
# - Agree to terms
# - Choose whether to redirect HTTP to HTTPS (recommended: Yes)
```

### 9.2 Verify Auto-Renewal

```bash
# Test renewal process
sudo certbot renew --dry-run

# Check renewal timer
sudo systemctl status certbot.timer
```

### 9.3 Manual Renewal (if needed)

```bash
sudo certbot renew
sudo systemctl reload nginx
```

---

## 10. Deployment Script

### 10.1 Create Deployment Script

```bash
nano /var/www/viecz-backend/deploy.sh
```

### 10.2 Script Content

```bash
#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Viecz API Deployment...${NC}"

# Change to app directory
cd /var/www/viecz-backend

# Pull latest code
echo -e "${YELLOW}📥 Pulling latest code...${NC}"
git pull origin main

# Activate virtual environment
echo -e "${YELLOW}🐍 Activating virtual environment...${NC}"
source venv/bin/activate

# Install/update dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
uv sync

# Backup database before migration
echo -e "${YELLOW}💾 Backing up database...${NC}"
if [ -f data/viecz.db ]; then
    cp data/viecz.db data/viecz.db.backup.$(date +%Y%m%d_%H%M%S)
fi

# Run database migrations
echo -e "${YELLOW}🗃️  Running database migrations...${NC}"
uv run alembic upgrade head

# Restart application service
echo -e "${YELLOW}🔄 Restarting service...${NC}"
sudo systemctl restart viecz

# Wait for service to start
sleep 3

# Verify service is running
if sudo systemctl is-active --quiet viecz; then
    echo -e "${GREEN}✅ Service is running${NC}"
else
    echo -e "${RED}❌ Service failed to start${NC}"
    sudo journalctl -u viecz --no-pager -n 20
    exit 1
fi

# Health check
echo -e "${YELLOW}🏥 Running health check...${NC}"
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health)

if [ "$HEALTH_RESPONSE" == "200" ]; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed (HTTP $HEALTH_RESPONSE)${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "API is running at: https://api.viecz.vn"
```

### 10.3 Make Script Executable

```bash
chmod +x /var/www/viecz-backend/deploy.sh
```

### 10.4 Run Deployment

```bash
# Full deployment
./deploy.sh

# Or with sudo for service restart
sudo ./deploy.sh
```

---

## 11. Verify Deployment

### 11.1 Check Service Status

```bash
# Service status
sudo systemctl status viecz

# View recent logs
sudo journalctl -u viecz -n 50 --no-pager
```

### 11.2 Test Endpoints

```bash
# Health check
curl https://api.viecz.vn/health

# API docs (if enabled)
curl -I https://api.viecz.vn/docs

# Categories endpoint (public)
curl https://api.viecz.vn/api/v1/categories
```

### 11.3 Test WebSocket

```bash
# Install websocat if needed
# sudo apt install websocat

# Test WebSocket connection (requires valid JWT)
# websocat "wss://api.viecz.vn/ws/chat/1?token=<jwt_token>"
```

---

## 12. Maintenance Commands

### Quick Reference

| Action | Command |
|--------|---------|
| Start service | `sudo systemctl start viecz` |
| Stop service | `sudo systemctl stop viecz` |
| Restart service | `sudo systemctl restart viecz` |
| View status | `sudo systemctl status viecz` |
| View logs (live) | `sudo journalctl -u viecz -f` |
| View logs (recent) | `sudo journalctl -u viecz -n 100` |
| Reload Nginx | `sudo systemctl reload nginx` |
| Test Nginx config | `sudo nginx -t` |
| Deploy updates | `./deploy.sh` |

### Log Locations

| Log | Location |
|-----|----------|
| Application logs | `/var/log/viecz/` |
| Systemd logs | `journalctl -u viecz` |
| Nginx access | `/var/log/nginx/viecz-access.log` |
| Nginx errors | `/var/log/nginx/viecz-error.log` |

### Database Operations

```bash
# Backup database
cp data/viecz.db data/viecz.db.backup

# Create timestamped backup
cp data/viecz.db "data/viecz.db.$(date +%Y%m%d_%H%M%S)"

# Restore from backup
cp data/viecz.db.backup data/viecz.db
sudo systemctl restart viecz
```

---

## 13. Troubleshooting

### 13.1 Service Won't Start

```bash
# Check logs for errors
sudo journalctl -u viecz -n 50

# Check if port is in use
sudo lsof -i :8000

# Verify permissions
ls -la /var/www/viecz-backend/
ls -la /var/www/viecz-backend/data/

# Fix permissions if needed
sudo chown -R www-data:www-data /var/www/viecz-backend
```

### 13.2 502 Bad Gateway

```bash
# Check if backend is running
curl http://localhost:8000/health

# Check Nginx error logs
sudo tail -f /var/log/nginx/viecz-error.log

# Restart both services
sudo systemctl restart viecz
sudo systemctl restart nginx
```

### 13.3 Database Errors

```bash
# Check database file permissions
ls -la data/viecz.db

# Fix permissions
sudo chown www-data:www-data data/viecz.db
sudo chmod 664 data/viecz.db

# Check database integrity
sqlite3 data/viecz.db "PRAGMA integrity_check;"
```

### 13.4 SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew --force-renewal
sudo systemctl reload nginx

# Check SSL configuration
sudo nginx -t
```

### 13.5 Memory Issues

```bash
# Check memory usage
free -h

# Check process memory
ps aux | grep gunicorn

# Reduce workers if needed (edit systemd service)
# Change --workers 4 to --workers 2
sudo systemctl daemon-reload
sudo systemctl restart viecz
```

---

## 14. Backup Strategy

### 14.1 Automated Daily Backup Script

```bash
sudo nano /etc/cron.daily/viecz-backup
```

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/viecz"
DATE=$(date +%Y%m%d)
RETENTION_DAYS=7

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
cp /var/www/viecz-backend/data/viecz.db "$BACKUP_DIR/viecz-$DATE.db"

# Backup environment file
cp /var/www/viecz-backend/.env "$BACKUP_DIR/env-$DATE"

# Compress backups
gzip -f "$BACKUP_DIR/viecz-$DATE.db"
gzip -f "$BACKUP_DIR/env-$DATE"

# Remove old backups
find $BACKUP_DIR -name "*.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $DATE"
```

```bash
sudo chmod +x /etc/cron.daily/viecz-backup
```

### 14.2 Manual Backup

```bash
# Full backup
tar -czvf viecz-backup-$(date +%Y%m%d).tar.gz \
    /var/www/viecz-backend/data \
    /var/www/viecz-backend/.env
```

### 14.3 Restore from Backup

```bash
# Stop service
sudo systemctl stop viecz

# Restore database
gunzip -c /var/backups/viecz/viecz-YYYYMMDD.db.gz > /var/www/viecz-backend/data/viecz.db

# Fix permissions
sudo chown www-data:www-data /var/www/viecz-backend/data/viecz.db

# Start service
sudo systemctl start viecz
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-17 | Tech Lead | Initial deployment guide |

---

*For questions or issues, refer to the [Architecture Documentation](./ARCHITECTURE.md) or contact the development team.*
