#!/bin/bash
# Quick fix to create admin user

echo "🔧 Quick fix..."

# Fix the CORS_ORIGINS format in .env
cd /opt/carcollection/backend
sed -i 's/CORS_ORIGINS=.*/CORS_ORIGINS=["http:\/\/93.127.194.202"]/' .env

# Create admin user
source venv/bin/activate
echo ""
echo "📝 Creating admin user..."
echo "Enter username (e.g., admin):"
read username
echo "Enter email:"
read email
echo "Enter password:"
read -s password

python -c "
import sys
sys.path.append('/opt/carcollection/backend')
from app.database import SessionLocal, engine
from app.models import Base
from app.crud import create_user_by_admin
from app.schemas import UserCreateByAdmin

Base.metadata.create_all(bind=engine)
db = SessionLocal()

user = UserCreateByAdmin(
    username='$username',
    email='$email',
    password='$password',
    is_admin=True
)

try:
    created_user = create_user_by_admin(db, user)
    print(f'✅ Admin user {created_user.username} created successfully!')
except Exception as e:
    print(f'❌ Error: {e}')
finally:
    db.close()
"

deactivate

# Restart services
systemctl restart carcollection-backend carcollection-frontend

echo ""
echo "✅ Done! Your app is available at:"
echo "http://93.127.194.202"
echo ""
echo "Login with:"
echo "Username: $username"
echo "Password: (the one you entered)"