# Car Collection Deployment Guide

This guide will help you deploy the Car Collection Management Application to your VPS.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [VPS Initial Setup](#vps-initial-setup)
3. [Security Configuration](#security-configuration)
4. [Application Deployment](#application-deployment)
5. [SSL/HTTPS Setup](#sslhttps-setup)
6. [User Management](#user-management)
7. [Maintenance](#maintenance)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### VPS Requirements
- Ubuntu 22.04 LTS or newer
- Minimum 2GB RAM (4GB recommended)
- 20GB storage
- Public IP address (93.127.194.202)

### Required Software
- Python 3.10+
- Node.js 18+
- PostgreSQL 14+ (optional, for production)
- Nginx
- Git

## VPS Initial Setup

### 1. Connect to Your VPS
```bash
ssh root@93.127.194.202
```

### 2. Update System Packages
```bash
apt update && apt upgrade -y
```

### 3. Create Application User
```bash
# Create a dedicated user for the application
useradd -m -s /bin/bash carcollection
usermod -aG sudo carcollection

# Set password for the user
passwd carcollection
```

### 4. Install Required Software
```bash
# Install system dependencies
apt install -y python3-pip python3-venv python3-dev \
    nodejs npm nginx git postgresql postgresql-contrib \
    build-essential libpq-dev curl

# Install certbot for SSL
apt install -y certbot python3-certbot-nginx

# Verify installations
python3 --version
node --version
npm --version
nginx -v
```

### 5. Configure Firewall
```bash
# Allow SSH, HTTP, and HTTPS
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

## Security Configuration

### 1. Generate Secret Key
```bash
# Generate a secure secret key for JWT
openssl rand -hex 32
# Save this key - you'll need it for the .env file
```

### 2. Set Up PostgreSQL (Recommended for Production)
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE carcollection_db;
CREATE USER carcollection WITH ENCRYPTED PASSWORD 'your-strong-password';
GRANT ALL PRIVILEGES ON DATABASE carcollection_db TO carcollection;
\q
```

### 3. Configure Environment Variables
Create `/opt/carcollection/backend/.env`:
```bash
# Database Configuration
DATABASE_URL=postgresql://carcollection:your-password@localhost/carcollection_db

# Security Configuration
SECRET_KEY=your-generated-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=4

# CORS Configuration (update with your domain)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Application Settings
ENVIRONMENT=production
DEBUG=False

# Invitation Settings
INVITATION_EXPIRY_DAYS=7
ALLOW_REGISTRATION=False

# Frontend URL (update with your domain)
FRONTEND_URL=https://yourdomain.com
```

Create `/opt/carcollection/car-collection-prototype/.env.local`:
```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://yourdomain.com/api

# Application Settings
NEXT_PUBLIC_APP_NAME=Car Collection Manager
NEXT_PUBLIC_ENABLE_REGISTRATION=false
NEXT_PUBLIC_ENABLE_INVITATIONS=true
```

## Application Deployment

### 1. Clone Repository
```bash
# As the carcollection user
su - carcollection
cd /opt
sudo mkdir -p carcollection
sudo chown carcollection:carcollection carcollection
cd carcollection

# Clone your repository
git clone https://github.com/yourusername/CarCollection.git .
```

### 2. Run Deployment Script
```bash
# Make sure you're in /opt/carcollection
cd /opt/carcollection
chmod +x deployment/deploy.sh
./deployment/deploy.sh
```

### 3. Manual Deployment (if script fails)

#### Backend Setup
```bash
cd /opt/carcollection/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn

# Initialize database
python init_db.py

# Create admin user
python create_admin.py

deactivate
```

#### Frontend Setup
```bash
cd /opt/carcollection/car-collection-prototype

# Install dependencies
npm ci

# Build for production
npm run build

# Install PM2 (alternative to systemd for Node.js)
npm install -g pm2
```

### 4. Set Up Services

#### Using systemd (Recommended)
```bash
# Copy service files
sudo cp /opt/carcollection/deployment/carcollection-backend.service /etc/systemd/system/
sudo cp /opt/carcollection/deployment/carcollection-frontend.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Start and enable services
sudo systemctl enable carcollection-backend carcollection-frontend
sudo systemctl start carcollection-backend carcollection-frontend

# Check status
sudo systemctl status carcollection-backend
sudo systemctl status carcollection-frontend
```

#### Using PM2 (Alternative for Frontend)
```bash
cd /opt/carcollection/car-collection-prototype
pm2 start npm --name "carcollection-frontend" -- start
pm2 save
pm2 startup
```

### 5. Configure Nginx
```bash
# Update nginx config with your domain
sudo nano /opt/carcollection/deployment/nginx.conf
# Replace 'yourdomain.com' with your actual domain

# Copy to nginx
sudo cp /opt/carcollection/deployment/nginx.conf /etc/nginx/sites-available/carcollection
sudo ln -sf /etc/nginx/sites-available/carcollection /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## SSL/HTTPS Setup

### 1. Point Your Domain to the VPS
Update your domain's DNS A records to point to 93.127.194.202

### 2. Install SSL Certificate
```bash
# Replace yourdomain.com with your actual domain
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts to complete SSL setup
# Choose to redirect HTTP to HTTPS when asked
```

### 3. Auto-Renewal
```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot automatically sets up a cron job for renewal
```

## User Management

### 1. Create Admin Invitation
```bash
# First, get an admin token
curl -X POST https://yourdomain.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Use the token to create an invitation
curl -X POST https://yourdomain.com/api/invitations/create \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"email": "friend@email.com", "is_admin": false}'
```

### 2. Send Invitation Link
The API will return an invitation URL like:
```
https://yourdomain.com/register?token=INVITATION_TOKEN
```

Send this link to your friends/family. They can use it to create their account.

### 3. Managing Users via Admin Panel
- Login as admin at https://yourdomain.com/login
- Navigate to Admin panel
- Create and manage invitations
- View user list
- Manage user permissions

## Maintenance

### 1. View Logs
```bash
# Backend logs
sudo journalctl -u carcollection-backend -f

# Frontend logs
sudo journalctl -u carcollection-frontend -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 2. Backup Database
```bash
# Create backup script
cat > /opt/carcollection/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/carcollection/backups"
mkdir -p "$BACKUP_DIR"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup PostgreSQL
pg_dump carcollection_db > "$BACKUP_DIR/db_backup_$DATE.sql"

# Or backup SQLite
# cp /opt/carcollection/backend/car_collection.db "$BACKUP_DIR/db_backup_$DATE.db"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "db_backup_*" -mtime +7 -delete
EOF

chmod +x /opt/carcollection/backup.sh

# Add to crontab for daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/carcollection/backup.sh") | crontab -
```

### 3. Update Application
```bash
cd /opt/carcollection
git pull origin main

# Rebuild backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
deactivate

# Rebuild frontend
cd ../car-collection-prototype
npm ci
npm run build

# Restart services
sudo systemctl restart carcollection-backend carcollection-frontend
```

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**
   - Check if backend is running: `sudo systemctl status carcollection-backend`
   - Check backend logs: `sudo journalctl -u carcollection-backend -n 50`

2. **Frontend not loading**
   - Check if frontend is running: `sudo systemctl status carcollection-frontend`
   - Check frontend logs: `sudo journalctl -u carcollection-frontend -n 50`

3. **Database connection errors**
   - Verify PostgreSQL is running: `sudo systemctl status postgresql`
   - Check database credentials in .env file
   - Test connection: `psql -U carcollection -d carcollection_db`

4. **Permission errors**
   - Ensure correct ownership: `sudo chown -R carcollection:carcollection /opt/carcollection`
   - Check log directory: `sudo chown carcollection:carcollection /var/log/carcollection`

### Health Checks
```bash
# Check all services
sudo systemctl status carcollection-backend carcollection-frontend nginx postgresql

# Test API endpoint
curl https://yourdomain.com/api/docs

# Check disk space
df -h

# Check memory usage
free -m

# Check active connections
ss -tulpn
```

## Security Best Practices

1. **Regular Updates**
   ```bash
   # System updates
   sudo apt update && sudo apt upgrade -y
   
   # Python package updates
   cd /opt/carcollection/backend
   source venv/bin/activate
   pip list --outdated
   deactivate
   ```

2. **Monitor Access**
   - Set up fail2ban for SSH protection
   - Monitor nginx access logs
   - Review authentication logs regularly

3. **Secure Backups**
   - Encrypt backup files
   - Store backups off-site
   - Test restore procedures

4. **Regular Security Audits**
   - Review user accounts
   - Check for unused open ports
   - Monitor system resources

## Support

For issues or questions:
1. Check application logs first
2. Review this deployment guide
3. Check the project's GitHub issues
4. Contact the system administrator

Remember to:
- Keep your admin password secure
- Regularly backup your data
- Monitor system resources
- Keep the application updated