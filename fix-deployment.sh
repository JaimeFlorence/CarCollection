#!/bin/bash
# Fix deployment issues and create admin user
# Run this on your VPS as root

echo "🔧 Fixing deployment..."

# Fix the config.py file
cd /opt/carcollection
git pull origin main

# Install pydantic-settings
cd /opt/carcollection/backend
source venv/bin/activate
pip install pydantic-settings==2.1.0

# Create admin user
echo ""
echo "📝 Creating admin user..."
echo "Please enter your admin credentials:"
python create_admin.py

deactivate

# Restart services
echo "🔄 Restarting services..."
systemctl restart carcollection-backend
systemctl restart carcollection-frontend

echo ""
echo "✅ Fixed! Your app should now be available at:"
echo "http://93.127.194.202"
echo ""
echo "Login with the admin credentials you just created."