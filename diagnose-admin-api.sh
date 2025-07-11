#!/bin/bash
# Diagnose Admin API issues on staging server

echo "Creating diagnostic script for staging server..."

cat << 'EOF' > /tmp/diagnose-admin.sh
#!/bin/bash
echo "=== Diagnosing Admin API Issues ==="
echo

echo "1. Checking if backend is running..."
systemctl status carcollection-backend --no-pager | grep "Active:"

echo
echo "2. Checking if frontend is running..."
systemctl status carcollection-frontend --no-pager | grep "Active:"

echo
echo "3. Checking backend logs for errors..."
journalctl -u carcollection-backend -n 20 --no-pager | grep -E "ERROR|error|Error|/admin/users"

echo
echo "4. Testing backend API directly..."
echo "Testing login endpoint:"
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "Administrator", "password": "Tarzan7Jane"}' \
  -s | python3 -m json.tool || echo "Login failed"

echo
echo "5. Testing admin users endpoint with token..."
TOKEN=$(curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "Administrator", "password": "Tarzan7Jane"}' \
  -s | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null)

if [ -n "$TOKEN" ]; then
    echo "Got token, testing /admin/users/ endpoint:"
    curl -X GET http://localhost:8000/admin/users/ \
      -H "Authorization: Bearer $TOKEN" \
      -s | python3 -m json.tool || echo "Failed to get users"
else
    echo "Failed to get auth token"
fi

echo
echo "6. Checking nginx configuration..."
grep -A 10 "/admin/" /etc/nginx/sites-available/carcollection || echo "No specific /admin/ route in nginx"

echo
echo "7. Testing through nginx..."
echo "Testing auth through nginx:"
curl -X POST http://93.127.194.202/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "Administrator", "password": "Tarzan7Jane"}' \
  -s | python3 -m json.tool || echo "Login through nginx failed"

echo
echo "8. Checking environment variables in frontend..."
cd /opt/carcollection/car-collection-prototype
if [ -f .env.production ]; then
    echo "Content of .env.production:"
    cat .env.production
else
    echo ".env.production not found"
fi

echo
echo "9. Checking if axiosClient.ts was updated..."
grep -n "NEXT_PUBLIC_API_URL" src/lib/axiosClient.ts || echo "Environment variable not found in axiosClient.ts"

echo
echo "10. Checking database for users..."
cd /opt/carcollection/backend
source venv/bin/activate
python3 << 'PYEOF'
import sys
sys.path.insert(0, '.')
from app.database import SessionLocal
from app.models import User

db = SessionLocal()
users = db.query(User).all()
print(f"Total users in database: {len(users)}")
for user in users:
    print(f"  - {user.username} (admin: {user.is_admin}, active: {user.is_active})")
db.close()
PYEOF

echo
echo "=== Diagnostic Complete ==="
EOF

# Copy and run on staging server
SERVER_IP="93.127.194.202"
SERVER_USER="root"

echo "Copying diagnostic script to staging server..."
scp /tmp/diagnose-admin.sh ${SERVER_USER}@${SERVER_IP}:/tmp/

echo "Running diagnostics on staging server..."
ssh ${SERVER_USER}@${SERVER_IP} "bash /tmp/diagnose-admin.sh"