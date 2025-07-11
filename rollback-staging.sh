#!/bin/bash

# Staging Rollback Script
# Use this to rollback a deployment if issues are found
# Usage: ./rollback-staging.sh [backup_file]

set -e

# Configuration
STAGING_SERVER="93.127.194.202"
STAGING_USER="root"
APP_DIR="/opt/carcollection"
BACKUP_FILE="${1}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔄 Staging Rollback Script${NC}"

if [ -z "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Error: Please provide backup file name${NC}"
    echo "Usage: $0 <backup_file>"
    echo ""
    echo "Available backups on server:"
    ssh $STAGING_USER@$STAGING_SERVER "cd $APP_DIR/backend && ls -la *.backup.*"
    exit 1
fi

echo -e "Backup file: $BACKUP_FILE"
echo -e "${YELLOW}⚠️  This will restore the database and revert code changes.${NC}"
read -p "Are you sure you want to rollback? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Rollback cancelled."
    exit 0
fi

# Function to run commands on remote server
remote_exec() {
    ssh $STAGING_USER@$STAGING_SERVER "$1"
}

# Step 1: Stop services
echo -e "${GREEN}🛑 Stopping services...${NC}"
remote_exec "systemctl stop carcollection-frontend carcollection-backend"

# Step 2: Restore database
echo -e "${GREEN}💾 Restoring database from backup...${NC}"
remote_exec "cd $APP_DIR/backend && cp $BACKUP_FILE car_collection.db"
echo "Database restored from: $BACKUP_FILE"

# Step 3: Get previous commit hash
echo -e "${GREEN}📝 Finding previous stable commit...${NC}"
# Get the commit before the current HEAD
PREVIOUS_COMMIT=$(remote_exec "cd $APP_DIR && git rev-parse HEAD~1")
echo "Rolling back to commit: $PREVIOUS_COMMIT"

# Step 4: Revert code changes
echo -e "${GREEN}🔙 Reverting code changes...${NC}"
remote_exec "cd $APP_DIR && git reset --hard $PREVIOUS_COMMIT"

# Step 5: Rebuild application
echo -e "${GREEN}🔧 Rebuilding application...${NC}"
remote_exec "cd $APP_DIR/backend && source venv/bin/activate && pip install -r requirements.txt"
remote_exec "cd $APP_DIR/car-collection-prototype && npm install"
remote_exec "cd $APP_DIR/car-collection-prototype && export NEXT_TELEMETRY_DISABLED=1 && npm run build"

# Step 6: Set permissions
echo -e "${GREEN}🔐 Setting permissions...${NC}"
remote_exec "chown -R carcollection:carcollection $APP_DIR"

# Step 7: Start services
echo -e "${GREEN}✅ Starting services...${NC}"
remote_exec "systemctl start carcollection-backend"
sleep 5
remote_exec "systemctl start carcollection-frontend"

# Step 8: Verify services
echo -e "${GREEN}📊 Verifying services...${NC}"
if remote_exec "systemctl is-active --quiet carcollection-backend"; then
    echo "✅ Backend is running"
else
    echo -e "${RED}❌ Backend failed to start${NC}"
fi

if remote_exec "systemctl is-active --quiet carcollection-frontend"; then
    echo "✅ Frontend is running"
else
    echo -e "${RED}❌ Frontend failed to start${NC}"
fi

echo ""
echo -e "${GREEN}✅ Rollback complete!${NC}"
echo "The application has been reverted to the previous version."
echo "Database has been restored from: $BACKUP_FILE"