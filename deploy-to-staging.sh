#!/bin/bash

# Deployment script for staging server
# Run this from your local machine

STAGING_SERVER="93.127.194.202"
STAGING_USER="root"
BRANCH="feature/user-management-enhancements"

echo "🚀 Deploying branch $BRANCH to staging server $STAGING_SERVER"

# SSH into the server and execute deployment commands
ssh $STAGING_USER@$STAGING_SERVER << 'ENDSSH'
set -e  # Exit on error

echo "📦 Starting deployment..."

# Navigate to the application directory
cd /opt/carcollection

# Stop services
echo "🛑 Stopping services..."
systemctl stop carcollection-frontend carcollection-backend

# Backup current database
echo "💾 Backing up database..."
cp backend/car_collection.db backend/car_collection.db.backup.$(date +%Y%m%d-%H%M%S)

# Fetch latest changes
echo "🔄 Fetching latest code..."
git fetch origin

# Check out the feature branch
echo "🌿 Checking out branch feature/user-management-enhancements..."
git checkout feature/user-management-enhancements
git pull origin feature/user-management-enhancements

# Backend setup
echo "🔧 Setting up backend..."
cd backend
source venv/bin/activate
pip install -r requirements.txt
pip install pydantic-settings==2.1.0  # Ensure this is installed

# Run any database migrations if needed
echo "🗄️ Checking database..."
python -c "from app.database import engine; from app.models import Base; Base.metadata.create_all(bind=engine)"

deactivate
cd ..

# Frontend setup
echo "🎨 Building frontend..."
cd car-collection-prototype

# Install dependencies
npm install

# Build frontend
export NEXT_TELEMETRY_DISABLED=1
npm run build

cd ..

# Set proper permissions
echo "🔐 Setting permissions..."
chown -R carcollection:carcollection /opt/carcollection

# Start services
echo "✅ Starting services..."
systemctl start carcollection-backend
sleep 5  # Give backend time to start
systemctl start carcollection-frontend

# Check service status
echo "📊 Checking service status..."
systemctl status carcollection-backend --no-pager
systemctl status carcollection-frontend --no-pager

echo "🎉 Deployment complete!"
echo "🌐 Application should be available at http://$STAGING_SERVER"

ENDSSH

echo "✅ Deployment script completed"