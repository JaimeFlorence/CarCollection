#!/bin/bash

echo "🚀 Preparing Car Collection for Deployment"
echo "========================================"
echo ""

# This script prepares the application for deployment to a VPS
# It ensures environment-specific configurations are properly set

SERVER_IP="${1:-93.127.194.202}"

echo "Preparing for deployment to: $SERVER_IP"
echo ""

# Step 1: Create deployment environment files
echo "1. Creating deployment environment files..."

# Backend .env for production
cat > deployment/backend.env.production << EOF
# Database Configuration
DATABASE_URL=sqlite:///./car_collection.db

# Security Configuration
SECRET_KEY=your-production-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=4

# CORS Configuration - IMPORTANT: Use proper JSON array format
CORS_ORIGINS=["http://$SERVER_IP"]

# Application Settings
ENVIRONMENT=production
DEBUG=False

# Invitation Settings
INVITATION_EXPIRY_DAYS=7
ALLOW_REGISTRATION=False

# Frontend URL
FRONTEND_URL=http://$SERVER_IP
EOF

# Frontend .env for production
cat > deployment/frontend.env.production << EOF
# API Configuration
NEXT_PUBLIC_API_URL=http://$SERVER_IP

# Application Settings
NEXT_PUBLIC_APP_NAME=Car Collection Manager
NEXT_PUBLIC_ENABLE_REGISTRATION=false
NEXT_PUBLIC_ENABLE_INVITATIONS=true
EOF

# Step 2: Create deployment script
echo ""
echo "2. Creating deployment script..."
cat > deployment/deploy-to-vps.sh << 'EOF'
#!/bin/bash

# This script is run ON THE VPS after code is pulled from GitHub

echo "🚀 Deploying Car Collection Application"
echo "====================================="

cd /opt/carcollection || exit 1

# Copy production environment files
echo "1. Setting up environment files..."
cp deployment/backend.env.production backend/.env
cp deployment/frontend.env.production car-collection-prototype/.env.production

# Backend setup
echo ""
echo "2. Setting up backend..."
cd backend
source venv/bin/activate
pip install -r requirements.txt
pip install pydantic-settings==2.1.0

# Only create database if it doesn't exist
if [ ! -f "car_collection.db" ]; then
    echo "   Creating new database..."
    python init_db.py
    
    # Create Administrator account
    python << 'PYTHON'
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
print("   ✓ Administrator account created")
PYTHON
fi

deactivate
cd ..

# Frontend setup
echo ""
echo "3. Building frontend..."
cd car-collection-prototype
npm install
NODE_ENV=production npm run build
cd ..

# Restart services
echo ""
echo "4. Restarting services..."
sudo systemctl restart carcollection-backend
sudo systemctl restart carcollection-frontend
sudo systemctl reload nginx

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Application available at: http://$SERVER_IP"
echo "Login: Administrator / Tarzan7Jane"
EOF

chmod +x deployment/deploy-to-vps.sh

# Step 3: Create GitHub secrets documentation
echo ""
echo "3. Creating GitHub secrets documentation..."
cat > deployment/GITHUB_SECRETS.md << EOF
# GitHub Secrets Required for Deployment

Add these secrets to your GitHub repository:
Settings → Secrets and variables → Actions → New repository secret

1. **VPS_HOST**: $SERVER_IP
2. **VPS_USER**: root
3. **VPS_SSH_KEY**: Your SSH private key for the VPS

## How to get your SSH private key:
\`\`\`bash
cat ~/.ssh/id_rsa
\`\`\`

Copy the entire output including the BEGIN and END lines.
EOF

echo ""
echo "✅ Deployment preparation complete!"
echo ""
echo "Next steps:"
echo "1. Review the generated files in the deployment/ directory"
echo "2. Commit and push to GitHub"
echo "3. Set up GitHub secrets (see deployment/GITHUB_SECRETS.md)"
echo "4. The deployment will run automatically on push to main branch"
echo ""
echo "To deploy manually from the VPS:"
echo "1. SSH to the server: ssh root@$SERVER_IP"
echo "2. cd /opt/carcollection"
echo "3. git pull origin main"
echo "4. ./deployment/deploy-to-vps.sh"