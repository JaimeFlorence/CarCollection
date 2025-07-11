# Car Collection Deployment Guide

This guide provides the complete, working deployment process for the Car Collection Management Application to a VPS.

**Last Updated**: January 10, 2025  
**Status**: ✅ Successfully deployed to http://93.127.194.202

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [VPS Initial Setup](#vps-initial-setup)
3. [Security Configuration](#security-configuration)
4. [Application Deployment](#application-deployment)
5. [SSL/HTTPS Setup](#sslhttps-setup)
6. [User Management](#user-management)
7. [Maintenance](#maintenance)
8. [Troubleshooting](#troubleshooting)
9. [Critical Lessons Learned](#critical-lessons-learned)

## Prerequisites

### VPS Requirements
- Ubuntu 22.04 LTS or newer
- Minimum 2GB RAM (4GB recommended)
- 20GB storage
- Public IP address (e.g., 93.127.194.202)

### Required Software
- Python 3.10+
- Node.js 18+ and npm
- SQLite (default) or PostgreSQL 14+ (optional)
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

### 2. Administrator Account
**IMPORTANT**: The application uses a single administrator account:
- **Username**: `Administrator`
- **Password**: `Tarzan7Jane`
- **Email**: `admin@example.com`

This account is created during deployment and should be the ONLY account initially.

### 3. Configure Environment Variables

#### Backend Configuration (`/opt/carcollection/backend/.env`)
```bash
# Database Configuration
DATABASE_URL=sqlite:///./car_collection.db

# Security Configuration
SECRET_KEY=1d247327682c9061e369ed897a62970e350bf63a53304e6b407feacba202d635
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=4

# CORS Configuration - IMPORTANT: Use proper JSON array format
CORS_ORIGINS=["http://93.127.194.202"]

# Application Settings
ENVIRONMENT=production
DEBUG=False

# Invitation Settings
INVITATION_EXPIRY_DAYS=7
ALLOW_REGISTRATION=False

# Frontend URL
FRONTEND_URL=http://93.127.194.202
```

#### Frontend Configuration (`/opt/carcollection/car-collection-prototype/.env.production`)
```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://93.127.194.202

# Application Settings
NEXT_PUBLIC_APP_NAME=Car Collection Manager
NEXT_PUBLIC_ENABLE_REGISTRATION=false
NEXT_PUBLIC_ENABLE_INVITATIONS=true
```

## Application Deployment

### Clean Deployment Script (Recommended)

Use the `prepare-deployment.sh` script for a clean deployment:

```bash
# Copy and run the deployment preparation script
cd /opt/carcollection
chmod +x prepare-deployment.sh
./prepare-deployment.sh
```

This script will:
1. Stop all services
2. Backup existing database
3. Create a fresh database with only Administrator account
4. Set up proper environment files
5. Ensure no localhost references in code
6. Rebuild frontend
7. Update nginx configuration
8. Restart all services
9. Verify deployment

### Manual Deployment Steps

#### 1. Clone Repository
```bash
cd /opt
git clone https://github.com/yourusername/CarCollection.git carcollection
cd carcollection
```

#### 2. Backend Setup
```bash
cd /opt/carcollection/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn pydantic-settings==2.1.0

# Initialize database
python init_db.py

# Create Administrator account
python << 'EOF'
import sys
sys.path.insert(0, '.')
from app.database import SessionLocal
from app.models import User
from app.auth import get_password_hash

db = SessionLocal()
admin_user = User(
    username="Administrator",
    email="admin@example.com",
    hashed_password=get_password_hash("Tarzan7Jane"),
    is_admin=True
)
db.add(admin_user)
db.commit()
db.close()
print("Administrator account created")
EOF

deactivate
```

#### 3. Frontend Setup
```bash
cd /opt/carcollection/car-collection-prototype

# Install dependencies
npm install

# Create production environment file
cat > .env.production << EOF
NEXT_PUBLIC_API_URL=http://93.127.194.202
EOF

# Build for production
export NEXT_TELEMETRY_DISABLED=1
npm run build
```

#### 4. Set Up Services

Create systemd service files:

**Backend Service** (`/etc/systemd/system/carcollection-backend.service`):
```ini
[Unit]
Description=Car Collection Backend
After=network.target

[Service]
Type=notify
User=carcollection
WorkingDirectory=/opt/carcollection/backend
Environment="PATH=/opt/carcollection/backend/venv/bin"
ExecStart=/opt/carcollection/backend/venv/bin/gunicorn app.main:app --bind 127.0.0.1:8000 --workers 2 --worker-class uvicorn.workers.UvicornWorker
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Frontend Service** (`/etc/systemd/system/carcollection-frontend.service`):
```ini
[Unit]
Description=Car Collection Frontend
After=network.target

[Service]
Type=simple
User=carcollection
WorkingDirectory=/opt/carcollection/car-collection-prototype
Environment="NODE_ENV=production"
Environment="PORT=3001"
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start services:
```bash
sudo systemctl daemon-reload
sudo systemctl enable carcollection-backend carcollection-frontend
sudo systemctl start carcollection-backend carcollection-frontend
```

#### 5. Configure Nginx

Create nginx configuration (`/etc/nginx/sites-available/carcollection`):
```nginx
server {
    listen 80;
    server_name 93.127.194.202;

    # Frontend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Auth endpoints
    location /auth/ {
        proxy_pass http://localhost:8000/auth/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API endpoints
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -sf /etc/nginx/sites-available/carcollection /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## Critical Lessons Learned

### 1. Frontend API URL Configuration
**Problem**: Frontend was hardcoded to use `localhost:8000` instead of the server IP.

**Solution**: 
- Always use environment variables: `process.env.NEXT_PUBLIC_API_URL`
- Never hardcode localhost URLs in production code
- The `api.ts` file should use:
  ```typescript
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  ```

### 2. CORS Configuration Format
**Problem**: CORS_ORIGINS must be a JSON array, not a string.

**Correct Format**:
```
CORS_ORIGINS=["http://93.127.194.202"]
```

**Incorrect Format**:
```
CORS_ORIGINS=http://93.127.194.202
```

### 3. Email Validation
**Problem**: Pydantic email validation rejects `.local` domains.

**Solution**: Use standard TLDs like `.com` for email addresses:
```python
email="admin@example.com"  # Good
email="admin@carcollection.local"  # Will fail validation
```

### 4. Frontend Port Configuration
**Problem**: Mismatch between nginx proxy (expecting 3001) and frontend service (running on 3000).

**Solution**: Ensure frontend service uses PORT=3001 in systemd configuration.

### 5. Browser Caching Issues
**Problem**: Browser caches old JavaScript with localhost references.

**Solution**: 
- Always clear browser cache after deployment updates
- Use incognito/private mode for testing
- Consider implementing cache-busting in production

### 6. Database State Management
**Problem**: Database accumulates test data and multiple admin accounts during troubleshooting.

**Solution**: Always start fresh deployments with a clean database containing only the Administrator account.

## User Management

### Initial Login
After deployment, login with:
- **URL**: http://93.127.194.202
- **Username**: Administrator
- **Password**: Tarzan7Jane

### Creating Additional Users
1. Login as Administrator
2. Navigate to Admin panel
3. Create invitations for new users
4. Send invitation links to users

## Maintenance

### View Logs
```bash
# Backend logs
sudo journalctl -u carcollection-backend -f

# Frontend logs
sudo journalctl -u carcollection-frontend -f

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Backup Database
```bash
# For SQLite
cp /opt/carcollection/backend/car_collection.db /opt/carcollection/backups/db_$(date +%Y%m%d).db
```

### Update Application
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
npm install
npm run build

# Restart services
sudo systemctl restart carcollection-backend carcollection-frontend
```

## Troubleshooting

### Common Issues

1. **Login Spinning/Not Working**
   - Check browser console for localhost:8000 references
   - Clear browser cache completely
   - Verify frontend is using correct API URL
   - Check nginx is properly routing /auth/ endpoints

2. **502 Bad Gateway**
   - Backend service not running
   - Check: `sudo systemctl status carcollection-backend`
   - Check logs: `sudo journalctl -u carcollection-backend -n 50`

3. **Internal Server Error on Login**
   - Check for email validation errors
   - Verify database has correct user data
   - Check backend logs for detailed error messages

4. **Frontend Not Loading**
   - Verify frontend service is running on port 3001
   - Check: `sudo systemctl status carcollection-frontend`
   - Verify nginx configuration

### Health Check Commands
```bash
# Check all services
sudo systemctl status carcollection-backend carcollection-frontend nginx

# Check listening ports
sudo ss -tlnp | grep -E '3001|8000|80'

# Test backend directly
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "Administrator", "password": "Tarzan7Jane"}'

# Test through nginx
curl -X POST http://93.127.194.202/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "Administrator", "password": "Tarzan7Jane"}'
```

## Security Best Practices

1. **Change Default Credentials**: After first login, consider changing the Administrator password
2. **Use HTTPS**: Set up SSL certificates with Let's Encrypt when domain is available
3. **Regular Updates**: Keep system and application dependencies updated
4. **Backup Regularly**: Implement automated daily backups
5. **Monitor Access**: Review logs regularly for unauthorized access attempts

## Deployment Scripts

For detailed information about all deployment and maintenance scripts, see [DEPLOYMENT_SCRIPTS.md](DEPLOYMENT_SCRIPTS.md).

Key scripts include:
- `setup-local-dev.sh` - Set up local development environment
- `fresh-server-setup.sh` - Create fresh database on server
- `fix-database-permissions.sh` - Fix database permission issues
- `diagnose-login.sh` - Comprehensive login troubleshooting

## Support

For deployment issues:
1. Check all logs (backend, frontend, nginx)
2. Verify all services are running
3. Ensure no localhost references in production code
4. Clear browser cache and test in incognito mode
5. Review this deployment guide thoroughly
6. Run diagnostic scripts from DEPLOYMENT_SCRIPTS.md

Remember:
- Always use environment variables for configuration
- Never hardcode localhost URLs
- Keep the Administrator credentials secure
- Test thoroughly after each deployment
- Ensure database is owned by `carcollection` user, not root

## Empty Database Robustness Update (January 11, 2025)

### Issue Resolved
The application previously crashed when accessing with an empty database (no cars). This has been fixed.

### Deployment Process for Empty Database Fixes

1. **Create backup before applying fixes**:
   ```bash
   BACKUP_DIR="/opt/carcollection/backups/$(date +%Y%m%d-%H%M%S)"
   mkdir -p "$BACKUP_DIR"
   cp -r car-collection-prototype "$BACKUP_DIR/"
   ```

2. **Apply the fixes** (if not using Git):
   ```bash
   cd /opt/carcollection/car-collection-prototype
   
   # Dashboard fixes
   sed -i 's/{totalMileage\.toLocaleString()}/{(totalMileage || 0).toLocaleString()}/g' src/app/dashboard/page.tsx
   sed -i 's/{avgMileage\.toLocaleString()}/{(avgMileage || 0).toLocaleString()}/g' src/app/dashboard/page.tsx
   sed -i 's/sum + car\.mileage/sum + (car.mileage || 0)/g' src/app/dashboard/page.tsx
   
   # Car card fixes  
   sed -i 's/{car\.mileage\.toLocaleString()}/{(car.mileage || 0).toLocaleString()}/g' src/components/CarCardEnhanced.tsx
   sed -i 's/{car\.mileage\.toLocaleString()}/{(car.mileage || 0).toLocaleString()}/g' src/components/CarCard.tsx
   ```

3. **Rebuild and restart**:
   ```bash
   npm run build
   systemctl restart carcollection-frontend
   ```

### Testing Empty Database Scenarios

Always test new deployments with:
1. Fresh database (only Administrator account)
2. Dashboard should show all zeros for statistics
3. No JavaScript errors in browser console
4. Adding first car should work normally

### Git Branch Strategy

For significant fixes like empty database robustness:
1. Create a feature branch: `git checkout -b fix-empty-database`
2. Test thoroughly on branch
3. Create backup tag: `git tag backup-before-fixes`
4. Deploy to staging first
5. Merge to main only after verification

**Current Status**: Empty database fixes deployed and verified on staging (93.127.194.202)