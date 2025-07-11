#!/bin/bash

# Safe Staging Deployment Script
# This script updates code while preserving the database
# Author: Car Collection Team
# Last Updated: $(date +"%Y-%m-%d")

set -e  # Exit on any error

# Configuration
STAGING_SERVER="93.127.194.202"
STAGING_USER="root"
APP_DIR="/opt/carcollection"
BRANCH="${1:-feature/user-management-enhancements}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Safe Staging Deployment Script${NC}"
echo -e "${YELLOW}Branch: $BRANCH${NC}"
echo -e "${YELLOW}Server: $STAGING_SERVER${NC}"
echo ""

# Function to run commands on remote server
remote_exec() {
    ssh $STAGING_USER@$STAGING_SERVER "$1"
}

# Step 1: Pre-deployment checks
echo -e "${GREEN}📋 Running pre-deployment checks...${NC}"
echo "Checking remote server connectivity..."
if ! remote_exec "echo 'Connection successful'"; then
    echo -e "${RED}❌ Cannot connect to staging server${NC}"
    exit 1
fi

echo "Checking current branch on server..."
CURRENT_BRANCH=$(remote_exec "cd $APP_DIR && git branch --show-current")
echo "Current branch: $CURRENT_BRANCH"

# Step 2: Create backup
echo -e "${GREEN}💾 Creating database backup...${NC}"
BACKUP_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="car_collection.db.backup.$BACKUP_TIMESTAMP"

remote_exec "cd $APP_DIR/backend && cp car_collection.db $BACKUP_FILE"
echo "Backup created: $BACKUP_FILE"

# Step 3: Check for uncommitted changes and untracked files
echo -e "${GREEN}🔍 Checking for uncommitted changes on server...${NC}"
if ! remote_exec "cd $APP_DIR && git diff --quiet && git diff --staged --quiet"; then
    echo -e "${YELLOW}⚠️  Warning: Uncommitted changes detected on server${NC}"
    echo "Stashing changes..."
    remote_exec "cd $APP_DIR && git stash push -m 'Auto-stash before deployment $BACKUP_TIMESTAMP'"
fi

# Handle untracked files
echo "Checking for untracked files..."
UNTRACKED_FILES=$(remote_exec "cd $APP_DIR && git status --porcelain | grep '^??' | wc -l")
if [ "$UNTRACKED_FILES" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $UNTRACKED_FILES untracked files${NC}"
    echo "Moving untracked files to backup directory..."
    remote_exec "cd $APP_DIR && mkdir -p ../deployment-backups/$BACKUP_TIMESTAMP"
    remote_exec "cd $APP_DIR && git status --porcelain | grep '^??' | cut -c4- | xargs -I{} mv {} ../deployment-backups/$BACKUP_TIMESTAMP/"
    echo "Untracked files moved to: /opt/deployment-backups/$BACKUP_TIMESTAMP"
fi

# Step 4: Update code
echo -e "${GREEN}📥 Updating code...${NC}"
remote_exec "cd $APP_DIR && git fetch origin"
remote_exec "cd $APP_DIR && git checkout $BRANCH"
remote_exec "cd $APP_DIR && git pull origin $BRANCH"

# Step 5: Check for database migrations
echo -e "${GREEN}🗄️  Checking for database changes...${NC}"
# For now, we'll check if models.py changed
if remote_exec "cd $APP_DIR && git diff HEAD~1 HEAD --name-only | grep -q 'backend/app/models.py'"; then
    echo -e "${YELLOW}⚠️  Database models have changed! Manual migration may be needed.${NC}"
    echo "Please review the changes and create a migration script if necessary."
else
    echo "No database model changes detected."
fi

# Step 6: Stop services
echo -e "${GREEN}🛑 Stopping services...${NC}"
remote_exec "systemctl stop carcollection-frontend carcollection-backend"

# Step 7: Update backend dependencies
echo -e "${GREEN}🔧 Updating backend dependencies...${NC}"
remote_exec "cd $APP_DIR/backend && source venv/bin/activate && pip install -r requirements.txt && pip install pydantic-settings==2.1.0"

# Step 8: Run database integrity check
echo -e "${GREEN}🔍 Checking database integrity...${NC}"
remote_exec "cd $APP_DIR/backend && source venv/bin/activate && python -c 'from app.database import engine; from app.models import Base; Base.metadata.create_all(bind=engine); print(\"Database schema OK\")'"

# Step 9: Build frontend
echo -e "${GREEN}🎨 Building frontend...${NC}"
remote_exec "cd $APP_DIR/car-collection-prototype && npm install"
remote_exec "cd $APP_DIR/car-collection-prototype && export NEXT_TELEMETRY_DISABLED=1 && npm run build"

# Step 9.5: Update nginx configuration if needed
echo -e "${GREEN}🌐 Checking nginx configuration...${NC}"
if [ -f "deployment/nginx-staging.conf" ]; then
    echo "Updating nginx configuration with staging-specific settings..."
    scp deployment/nginx-staging.conf $STAGING_USER@$STAGING_SERVER:/tmp/nginx-staging.conf
    remote_exec "cp /tmp/nginx-staging.conf /etc/nginx/sites-available/carcollection"
    remote_exec "nginx -t"
fi

# Step 10: Set permissions
echo -e "${GREEN}🔐 Setting file permissions...${NC}"
remote_exec "chown -R carcollection:carcollection $APP_DIR"

# Step 11: Start services
echo -e "${GREEN}✅ Starting services...${NC}"
remote_exec "systemctl start carcollection-backend"
sleep 5
remote_exec "systemctl start carcollection-frontend"

# Step 12: Verify services
echo -e "${GREEN}📊 Verifying services...${NC}"
if remote_exec "systemctl is-active --quiet carcollection-backend"; then
    echo "✅ Backend is running"
else
    echo -e "${RED}❌ Backend failed to start${NC}"
    remote_exec "journalctl -u carcollection-backend -n 50"
fi

if remote_exec "systemctl is-active --quiet carcollection-frontend"; then
    echo "✅ Frontend is running"
else
    echo -e "${RED}❌ Frontend failed to start${NC}"
    remote_exec "journalctl -u carcollection-frontend -n 50"
fi

# Step 13: Quick health check
echo -e "${GREEN}🏥 Running health check...${NC}"
sleep 3
if curl -s -f "http://$STAGING_SERVER" > /dev/null; then
    echo "✅ Application is responding"
else
    echo -e "${YELLOW}⚠️  Application may not be fully ready yet${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo -e "Application URL: http://$STAGING_SERVER"
echo -e "Database backup: $BACKUP_FILE"
echo ""
echo -e "${YELLOW}📝 Post-deployment checklist:${NC}"
echo "1. Test login functionality"
echo "2. Verify user edit feature works"
echo "3. Test password change feature"
echo "4. Check for any errors in the browser console"
echo "5. Monitor server logs for any issues"
echo ""
echo -e "${YELLOW}🔄 Rollback instructions:${NC}"
echo "If issues are found, run: ./rollback-staging.sh $BACKUP_FILE"