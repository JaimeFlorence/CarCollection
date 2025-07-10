#!/bin/bash
# Quick Setup Script for Car Collection on VPS
# Run this as root on your VPS

set -e

echo "🚀 Car Collection Quick Setup Script"
echo "===================================="
echo ""

# Configuration
VPS_IP="93.127.194.202"
APP_USER="carcollection"
APP_DIR="/opt/carcollection"
REPO_URL="https://github.com/JaimeFlorence/CarCollection.git"  # Update this!

# Step 1: Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Step 2: Install dependencies
echo "🔧 Installing required software..."
apt install -y \
    python3-pip python3-venv python3-dev \
    nodejs npm nginx git \
    build-essential curl \
    certbot python3-certbot-nginx \
    ufw

# Step 3: Create application user
echo "👤 Creating application user..."
if ! id "$APP_USER" &>/dev/null; then
    useradd -m -s /bin/bash $APP_USER
    echo "Please set a password for the $APP_USER user:"
    passwd $APP_USER
fi

# Step 4: Configure firewall
echo "🔒 Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Step 5: Create application directory
echo "📁 Setting up application directory..."
mkdir -p $APP_DIR
chown $APP_USER:$APP_USER $APP_DIR

# Step 6: Clone repository
echo "📥 Cloning repository..."
su - $APP_USER -c "cd $APP_DIR && git clone $REPO_URL ."

# Step 7: Generate secret key
echo "🔐 Generating secret key..."
SECRET_KEY=$(openssl rand -hex 32)
echo ""
echo "IMPORTANT: Save this secret key for your .env file:"
echo "SECRET_KEY=$SECRET_KEY"
echo ""
read -p "Press enter to continue..."

# Step 8: Create initial environment files
echo "📝 Creating environment files..."

# Backend .env
cat > $APP_DIR/backend/.env << EOF
# Database Configuration (using SQLite for now)
DATABASE_URL=sqlite:///./car_collection.db

# Security Configuration
SECRET_KEY=$SECRET_KEY
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=4

# CORS Configuration
CORS_ORIGINS=http://$VPS_IP,https://$VPS_IP

# Application Settings
ENVIRONMENT=production
DEBUG=False

# Invitation Settings
INVITATION_EXPIRY_DAYS=7
ALLOW_REGISTRATION=False

# Frontend URL
FRONTEND_URL=http://$VPS_IP
EOF

# Frontend .env.local
cat > $APP_DIR/car-collection-prototype/.env.local << EOF
# API Configuration
NEXT_PUBLIC_API_URL=http://$VPS_IP/api

# Application Settings
NEXT_PUBLIC_APP_NAME=Car Collection Manager
NEXT_PUBLIC_ENABLE_REGISTRATION=false
NEXT_PUBLIC_ENABLE_INVITATIONS=true
EOF

chown -R $APP_USER:$APP_USER $APP_DIR

# Step 9: Setup backend
echo "🐍 Setting up backend..."
su - $APP_USER -c "cd $APP_DIR/backend && python3 -m venv venv && source venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt && pip install gunicorn && python init_db.py"

# Step 10: Setup frontend
echo "🎨 Setting up frontend..."
su - $APP_USER -c "cd $APP_DIR/car-collection-prototype && npm ci && npm run build"

# Step 11: Create log directory
echo "📋 Creating log directory..."
mkdir -p /var/log/carcollection
chown $APP_USER:$APP_USER /var/log/carcollection

# Step 12: Install systemd services
echo "⚙️ Installing systemd services..."
cp $APP_DIR/deployment/carcollection-backend.service /etc/systemd/system/
cp $APP_DIR/deployment/carcollection-frontend.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable carcollection-backend carcollection-frontend

# Step 13: Configure nginx (basic HTTP for now)
echo "🌐 Configuring nginx..."
cat > /etc/nginx/sites-available/carcollection << EOF
server {
    listen 80;
    server_name $VPS_IP;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Auth endpoints
    location /auth {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    client_max_body_size 10M;
}
EOF

ln -sf /etc/nginx/sites-available/carcollection /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t

# Step 14: Start services
echo "🚀 Starting services..."
systemctl start carcollection-backend carcollection-frontend
systemctl restart nginx

# Step 15: Create initial admin user
echo "👤 Creating admin user..."
echo ""
echo "Please enter admin credentials:"
su - $APP_USER -c "cd $APP_DIR/backend && source venv/bin/activate && python create_admin.py"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Your Car Collection app is now available at:"
echo "http://$VPS_IP"
echo ""
echo "Next steps:"
echo "1. Login with your admin credentials"
echo "2. Go to the Admin panel to create user invitations"
echo "3. Share invitation links with friends/family"
echo "4. Consider setting up a domain name and SSL certificate"
echo ""
echo "To check service status:"
echo "  systemctl status carcollection-backend"
echo "  systemctl status carcollection-frontend"
echo ""
echo "To view logs:"
echo "  journalctl -u carcollection-backend -f"
echo "  journalctl -u carcollection-frontend -f"