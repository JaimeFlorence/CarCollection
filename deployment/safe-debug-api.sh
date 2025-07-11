#!/bin/bash

# Safe API debugging without modifying the backend
echo "=== Safe API Debugging ==="
echo "This will help debug without modifying your backend code"
echo ""

# Test basic connectivity
echo "1. Testing backend connectivity..."
curl -s -o /dev/null -w "Backend HTTP status: %{http_code}\n" http://localhost:8000/docs

echo ""
echo "2. Testing login..."
LOGIN_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST http://localhost:8000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username": "Administrator", "password": "Tarzan7Jane"}' 2>&1)

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$LOGIN_RESPONSE" | grep -v "HTTP_STATUS:")

echo "Login HTTP status: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Login successful"
    TOKEN=$(echo "$BODY" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
    if [ -n "$TOKEN" ]; then
        echo "Token obtained (first 20 chars): ${TOKEN:0:20}..."
        
        # Test car creation
        echo ""
        echo "3. Testing car creation..."
        CAR_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST http://localhost:8000/api/cars \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "make": "Test",
                "model": "Debug",
                "year": 2024,
                "vin": "DEBUG123",
                "license_plate": "DEBUG",
                "mileage": 0
            }' 2>&1)
        
        CAR_HTTP=$(echo "$CAR_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
        CAR_BODY=$(echo "$CAR_RESPONSE" | grep -v "HTTP_STATUS:")
        
        echo "Car creation HTTP status: $CAR_HTTP"
        if [ "$CAR_HTTP" = "200" ] || [ "$CAR_HTTP" = "201" ]; then
            echo "✓ Car creation works!"
            CAR_ID=$(echo "$CAR_BODY" | grep -o '"id":[0-9]*' | cut -d: -f2)
            
            # Clean up
            if [ -n "$CAR_ID" ]; then
                curl -s -X DELETE "http://localhost:8000/api/cars/$CAR_ID" \
                    -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1
                echo "Test car cleaned up"
            fi
        else
            echo "✗ Car creation failed"
            echo "Response: $CAR_BODY"
        fi
        
        # Test invitation creation
        echo ""
        echo "4. Testing invitation creation..."
        INVITE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST http://localhost:8000/api/invitations \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "email": "test@example.com",
                "role": "user"
            }' 2>&1)
        
        INVITE_HTTP=$(echo "$INVITE_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
        INVITE_BODY=$(echo "$INVITE_RESPONSE" | grep -v "HTTP_STATUS:")
        
        echo "Invitation creation HTTP status: $INVITE_HTTP"
        if [ "$INVITE_HTTP" = "200" ] || [ "$INVITE_HTTP" = "201" ]; then
            echo "✓ Invitation creation works!"
        else
            echo "✗ Invitation creation failed"
            echo "Response: $INVITE_BODY"
        fi
    fi
else
    echo "✗ Login failed"
    echo "Response: $BODY"
fi

echo ""
echo "5. Checking for common issues..."

# Check CORS configuration
echo -n "CORS configuration: "
grep -o "CORS_ORIGINS.*" /opt/carcollection/backend/.env 2>/dev/null || echo "Not found in .env"

# Check if services are running
echo ""
echo "6. Service status:"
echo -n "Backend: "
systemctl is-active carcollection-backend
echo -n "Frontend: "
systemctl is-active carcollection-frontend
echo -n "Nginx: "
systemctl is-active nginx

# Check for recent errors
echo ""
echo "7. Recent backend errors (last 10):"
journalctl -u carcollection-backend -n 10 --no-pager | grep -E "ERROR|error|Error|Traceback|Exception" || echo "No errors found"

echo ""
echo "8. Testing from external IP (as browser would)..."
EXT_LOGIN=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST http://93.127.194.202/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username": "Administrator", "password": "Tarzan7Jane"}' 2>&1)

EXT_HTTP=$(echo "$EXT_LOGIN" | grep "HTTP_STATUS:" | cut -d: -f2)
echo "External login HTTP status: $EXT_HTTP"

if [ "$EXT_HTTP" != "200" ]; then
    echo "✗ External access issue detected"
    echo "This suggests nginx configuration or CORS issue"
fi

echo ""
echo "=== Debug Summary ==="
if [ "$HTTP_CODE" = "200" ] && [ "$CAR_HTTP" = "200" -o "$CAR_HTTP" = "201" ]; then
    echo "✓ Backend API is working correctly"
    echo "The issue is likely in the frontend or nginx configuration"
else
    echo "✗ Backend API has issues"
    echo "Check the error messages above"
fi