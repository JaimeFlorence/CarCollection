# Deployment Scripts Documentation

This document describes all the deployment and maintenance scripts created for the Car Collection application.

## Table of Contents
1. [Local Development Scripts](#local-development-scripts)
2. [Deployment Preparation Scripts](#deployment-preparation-scripts)
3. [Server Maintenance Scripts](#server-maintenance-scripts)
4. [Troubleshooting Scripts](#troubleshooting-scripts)
5. [Emergency Fix Scripts](#emergency-fix-scripts)

---

## Local Development Scripts

### `setup-local-dev.sh`
**Purpose**: Sets up your local development environment
**Location**: Project root

**What it does**:
- Creates Python virtual environment for backend
- Installs all backend dependencies
- Creates `backend/.env` with local development settings (CORS allows localhost:3000)
- Initializes SQLite database
- Creates local admin user (admin/admin123)
- Installs frontend dependencies
- Creates `car-collection-prototype/.env.local` pointing to localhost:8000

**Usage**:
```bash
./setup-local-dev.sh
```

### `test-local-setup.sh`
**Purpose**: Verifies your local development environment is correctly configured
**Location**: Project root

**What it does**:
- Checks if virtual environment exists
- Verifies .env files are present
- Checks database exists
- Verifies frontend node_modules installed
- Confirms API is using environment variables (not hardcoded)

**Usage**:
```bash
./test-local-setup.sh
```

---

## Deployment Preparation Scripts

### `deployment/prepare-for-deployment.sh`
**Purpose**: Prepares deployment configuration files for your VPS
**Location**: `deployment/` directory

**What it does**:
- Creates `backend.env.production` with server-specific settings
- Creates `frontend.env.production` with server API URL
- Generates `deploy-to-vps.sh` script for the server
- Creates GitHub secrets documentation

**Usage**:
```bash
./deployment/prepare-for-deployment.sh YOUR_SERVER_IP
# Example: ./deployment/prepare-for-deployment.sh 93.127.194.202
```

---

## Server Maintenance Scripts

### `fresh-server-setup.sh`
**Purpose**: Creates a completely fresh database on the server
**Location**: Deploy to `/opt/carcollection` on server

**What it does**:
- Stops backend and frontend services
- Backs up existing database (to `backups/` directory)
- Deletes old database
- Creates new empty database
- Creates only Administrator account (Administrator/Tarzan7Jane)
- Restarts all services
- Tests login functionality

**Usage**:
```bash
# On the server
./fresh-server-setup.sh --confirm
```
**Note**: Requires `--confirm` flag to prevent accidental data deletion

### `prepare-deployment.sh`
**Purpose**: Complete deployment preparation with fresh database
**Location**: Deploy to `/opt/carcollection` on server

**What it does**:
- Stops all services
- Backs up existing database
- Creates fresh database with Administrator account
- Sets up proper environment files
- Verifies no localhost references in code
- Rebuilds frontend
- Updates nginx configuration
- Restarts all services
- Verifies deployment

**Usage**:
```bash
# On the server
./prepare-deployment.sh
```

---

## Troubleshooting Scripts

### `diagnose-login.sh`
**Purpose**: Comprehensive diagnostic for login issues
**Location**: Deploy to server when needed

**What it does**:
- Checks all service statuses
- Verifies ports are listening
- Tests backend and frontend configurations
- Checks nginx routing
- Tests API endpoints directly
- Shows recent error logs
- Provides diagnostic summary

**Usage**:
```bash
# On the server
./diagnose-login.sh > diagnosis.txt
cat diagnosis.txt
```

### `fix-database-permissions.sh`
**Purpose**: Fixes database read-only errors
**Location**: Deploy to server when needed

**What it does**:
- Shows current database permissions
- Changes ownership to `carcollection` user
- Sets correct permissions (664)
- Fixes backend directory ownership
- Restarts backend service
- Tests login functionality

**Usage**:
```bash
# On the server
./fix-database-permissions.sh
```

### `fix-server-now.sh`
**Purpose**: Quick diagnostic and fix for server issues
**Location**: Deploy to server when needed

**What it does**:
- Checks recent backend errors
- Shows all users in database
- Tests login endpoint directly
- Displays detailed error messages
- Restarts backend if needed

**Usage**:
```bash
# On the server
./fix-server-now.sh
```

---

## Emergency Fix Scripts

These scripts were created during troubleshooting and should generally not be needed:

### `fix-api-url.sh`
**Purpose**: Fixes hardcoded localhost URLs in frontend
**What it did**: Replaced localhost:8000 with server IP in source files

### `fix-backend-routes.sh`
**Purpose**: Fixes backend routing and auth endpoints
**What it did**: Updated nginx configuration for proper auth routing

### `fix-email-validation.sh`
**Purpose**: Fixes email validation errors with .local domains
**What it did**: Updated user emails to use .com instead of .local

### `fix-admin-user.sh`
**Purpose**: Creates or resets admin user account
**What it did**: Ensured admin user exists with correct password

### `nuclear-fix.sh`
**Purpose**: Aggressive fix for localhost references
**What it did**: Replaced all localhost:8000 references and rebuilt everything

---

## Common Workflows

### Setting Up Fresh Local Development
```bash
git clone https://github.com/yourusername/CarCollection.git
cd CarCollection
./setup-local-dev.sh
# Start backend: cd backend && source venv/bin/activate && uvicorn app.main:app --reload
# Start frontend: cd car-collection-prototype && npm run dev
```

### Deploying to Production
```bash
# One-time setup
./deployment/prepare-for-deployment.sh 93.127.194.202
# Set up GitHub secrets
# Push to main branch - auto deploys

# Or manual deployment on server:
ssh root@93.127.194.202
cd /opt/carcollection
git pull origin main
./deployment/deploy-to-vps.sh
```

### Creating Fresh Database on Server
```bash
ssh root@93.127.194.202
cd /opt/carcollection
./fresh-server-setup.sh --confirm
# If permissions error:
./fix-database-permissions.sh
```

### Troubleshooting Login Issues
```bash
ssh root@93.127.194.202
cd /opt/carcollection
./diagnose-login.sh
# Based on results, run appropriate fix script
```

---

## Key Lessons Learned

1. **Database Permissions**: Always ensure the database file is owned by the service user (`carcollection`), not root
2. **Environment Variables**: Never hardcode URLs - always use environment variables
3. **CORS Format**: Must be JSON array format: `["http://server-ip"]`
4. **Email Validation**: Use standard TLDs (.com) not .local
5. **Browser Caching**: Always clear cache after deployment changes
6. **Service User**: Backend runs as `carcollection` user, not root

---

## Script Best Practices

1. **Always backup** before destructive operations
2. **Use confirmation flags** for dangerous operations
3. **Test locally first** before deploying
4. **Log everything** for troubleshooting
5. **Check permissions** after creating files
6. **Restart services** after configuration changes

---

Last Updated: January 11, 2025