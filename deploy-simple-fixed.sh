#!/bin/bash
# Simple deployment script for Car Collection - Fixed version
# Run this on your VPS as root

set -e

echo "🚀 Car Collection Simple Deployment (Fixed)"
echo "========================================="
echo ""

# Configuration
VPS_IP="93.127.194.202"
APP_DIR="/opt/carcollection"

# Step 1: Clean up any previous attempts
echo "🧹 Cleaning up previous installation..."
systemctl stop carcollection-backend carcollection-frontend 2>/dev/null || true
systemctl disable carcollection-backend carcollection-frontend 2>/dev/null || true
rm -rf $APP_DIR
rm -f /etc/systemd/system/carcollection-*.service
rm -f /etc/nginx/sites-enabled/carcollection
rm -f /etc/nginx/sites-available/carcollection

# Step 2: Create user if needed
echo "👤 Setting up application user..."
if ! id carcollection &>/dev/null; then
    useradd -m -s /bin/bash carcollection
fi

# Step 3: Clone repository
echo "📥 Downloading application..."
mkdir -p $APP_DIR
cd $APP_DIR
git clone https://github.com/JaimeFlorence/CarCollection.git .
chown -R carcollection:carcollection $APP_DIR

# Step 4: Setup Backend
echo "🐍 Setting up backend..."
cd $APP_DIR/backend

# Create virtual environment as carcollection user
su - carcollection -c "cd $APP_DIR/backend && python3 -m venv venv"
su - carcollection -c "cd $APP_DIR/backend && source venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt && pip install gunicorn"

# Create .env file
cat > .env << EOF
DATABASE_URL=sqlite:///./car_collection.db
SECRET_KEY=$(openssl rand -hex 32)
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=4
CORS_ORIGINS=http://$VPS_IP
ENVIRONMENT=production
DEBUG=False
INVITATION_EXPIRY_DAYS=7
ALLOW_REGISTRATION=False
FRONTEND_URL=http://$VPS_IP
EOF

chown carcollection:carcollection .env

# Initialize database
su - carcollection -c "cd $APP_DIR/backend && source venv/bin/activate && python init_db.py"

# Step 5: Setup Frontend
echo "🎨 Setting up frontend..."
cd $APP_DIR/car-collection-prototype

# Create .env.local
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://$VPS_IP/api
NEXT_PUBLIC_APP_NAME=Car Collection Manager
NEXT_PUBLIC_ENABLE_REGISTRATION=false
NEXT_PUBLIC_ENABLE_INVITATIONS=true
EOF

# Fix package-lock.json and install dependencies
echo "📦 Installing frontend dependencies..."
rm -f package-lock.json
npm install
npm run build

chown -R carcollection:carcollection $APP_DIR

# Step 6: Create systemd services
echo "⚙️ Creating system services..."

# Backend service
cat > /etc/systemd/system/carcollection-backend.service << EOF
[Unit]
Description=Car Collection Backend
After=network.target

[Service]
Type=exec
User=carcollection
Group=carcollection
WorkingDirectory=$APP_DIR/backend
Environment="PATH=$APP_DIR/backend/venv/bin"
ExecStart=$APP_DIR/backend/venv/bin/gunicorn app.main:app --bind 127.0.0.1:8000 --workers 2 --worker-class uvicorn.workers.UvicornWorker
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Frontend service
cat > /etc/systemd/system/carcollection-frontend.service << EOF
[Unit]
Description=Car Collection Frontend
After=network.target

[Service]
Type=exec
User=carcollection
Group=carcollection
WorkingDirectory=$APP_DIR/car-collection-prototype
Environment="NODE_ENV=production"
Environment="PORT=3000"
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Step 7: Setup nginx
echo "🌐 Setting up web server..."
cat > /etc/nginx/sites-available/carcollection << EOF
server {
    listen 80;
    server_name $VPS_IP;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
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

# Step 8: Create log directory
mkdir -p /var/log/carcollection
chown carcollection:carcollection /var/log/carcollection

# Step 9: Start everything
echo "🚀 Starting services..."
systemctl daemon-reload
systemctl enable carcollection-backend carcollection-frontend nginx
systemctl restart carcollection-backend
sleep 5
systemctl restart carcollection-frontend
systemctl restart nginx

# Step 10: Create admin user
echo ""
echo "👤 Creating admin user..."
echo "Please enter admin credentials:"
su - carcollection -c "cd $APP_DIR/backend && source venv/bin/activate && python create_admin.py"

# Done!
echo ""
echo "✅ Deployment complete!"
echo ""
echo "Your Car Collection app is now available at:"
echo "http://$VPS_IP"
echo ""
echo "To check service status:"
echo "  systemctl status carcollection-backend"
echo "  systemctl status carcollection-frontend"
echo ""
echo "To view logs:"
echo "  journalctl -u carcollection-backend -f"
echo "  journalctl -u carcollection-frontend -f"
echo ""
echo "To create user invitations:"
echo "1. Login as admin at http://$VPS_IP"
echo "2. Go to Admin panel"
echo "3. Create invitations for friends/family"