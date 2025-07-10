#!/bin/bash
# Car Collection Deployment Script
# This script deploys the application from GitHub to your VPS

set -e  # Exit on error

# Configuration
REPO_URL="https://github.com/yourusername/CarCollection.git"
DEPLOY_DIR="/opt/carcollection"
BRANCH="main"
USER="carcollection"

echo "🚀 Starting Car Collection deployment..."

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."
for cmd in git python3 node npm nginx systemctl; do
    if ! command_exists "$cmd"; then
        echo "❌ Error: $cmd is not installed"
        exit 1
    fi
done

# Create deployment directory if it doesn't exist
if [ ! -d "$DEPLOY_DIR" ]; then
    echo "📁 Creating deployment directory..."
    sudo mkdir -p "$DEPLOY_DIR"
    sudo chown "$USER:$USER" "$DEPLOY_DIR"
fi

cd "$DEPLOY_DIR"

# Clone or pull latest code
if [ -d ".git" ]; then
    echo "📥 Pulling latest code..."
    git pull origin "$BRANCH"
else
    echo "📥 Cloning repository..."
    git clone "$REPO_URL" .
    git checkout "$BRANCH"
fi

# Backend deployment
echo "🔧 Deploying backend..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "🐍 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn

# Run database migrations
echo "🗄️ Running database migrations..."
python init_db.py

# Create admin user if first deployment
if [ ! -f ".admin_created" ]; then
    echo "👤 Creating admin user..."
    python create_admin.py
    touch .admin_created
fi

deactivate

# Frontend deployment
echo "🎨 Deploying frontend..."
cd ../car-collection-prototype

# Install dependencies
echo "📦 Installing Node dependencies..."
npm ci

# Build production bundle
echo "🏗️ Building production bundle..."
npm run build

# Copy environment files if they don't exist
echo "📝 Setting up environment files..."
if [ ! -f "../backend/.env" ]; then
    cp ../backend/.env.example ../backend/.env
    echo "⚠️  Please edit /opt/carcollection/backend/.env with your configuration"
fi

if [ ! -f ".env.local" ]; then
    cp .env.example .env.local
    echo "⚠️  Please edit /opt/carcollection/car-collection-prototype/.env.local with your configuration"
fi

# Set up systemd services
echo "⚙️ Setting up systemd services..."
sudo cp ../deployment/carcollection-backend.service /etc/systemd/system/
sudo cp ../deployment/carcollection-frontend.service /etc/systemd/system/
sudo systemctl daemon-reload

# Create log directory
sudo mkdir -p /var/log/carcollection
sudo chown "$USER:$USER" /var/log/carcollection

# Start services
echo "🚀 Starting services..."
sudo systemctl enable carcollection-backend carcollection-frontend
sudo systemctl restart carcollection-backend
sudo systemctl restart carcollection-frontend

# Set up nginx
echo "🌐 Setting up nginx..."
sudo cp ../deployment/nginx.conf /etc/nginx/sites-available/carcollection
sudo ln -sf /etc/nginx/sites-available/carcollection /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Edit configuration files:"
echo "   - /opt/carcollection/backend/.env"
echo "   - /opt/carcollection/car-collection-prototype/.env.local"
echo "2. Update nginx configuration with your domain"
echo "3. Set up SSL with Let's Encrypt"
echo "4. Create your first admin user invitation"
echo ""
echo "Service status:"
sudo systemctl status carcollection-backend --no-pager | head -n 4
sudo systemctl status carcollection-frontend --no-pager | head -n 4