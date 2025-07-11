#!/bin/bash

# Comprehensive diagnostic for car creation issues
echo "=== Car Creation Diagnostic Script ==="
echo "This script will trace the entire car creation flow"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}1. Checking Backend Service Status${NC}"
if systemctl is-active --quiet carcollection-backend; then
    echo -e "${GREEN}✓ Backend service is running${NC}"
else
    echo -e "${RED}✗ Backend service is not running${NC}"
    echo "Starting backend service..."
    systemctl start carcollection-backend
    sleep 3
fi

echo ""
echo -e "${YELLOW}2. Checking API Endpoints Available${NC}"
echo "Testing which endpoints exist:"

# Test without auth first
echo -e "${BLUE}Without authentication:${NC}"
for endpoint in "/cars/" "/api/cars/" "/api/cars"; do
    CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "http://localhost:8000${endpoint}")
    echo "  GET ${endpoint}: $CODE"
done

echo ""
echo -e "${YELLOW}3. Testing Authentication${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username": "Administrator", "password": "Tarzan7Jane"}' 2>&1)

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
    echo -e "${GREEN}✓ Login successful${NC}"
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
    echo "Token obtained: ${TOKEN:0:30}..."
else
    echo -e "${RED}✗ Login failed${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo ""
echo -e "${YELLOW}4. Testing Car Endpoints with Authentication${NC}"
echo -e "${BLUE}Testing various endpoint variations:${NC}"

# Test different endpoint variations
for endpoint in "/cars/" "/cars" "/api/cars/" "/api/cars"; do
    echo ""
    echo "Testing endpoint: $endpoint"
    
    # GET request
    GET_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "http://localhost:8000${endpoint}" \
        -H "Authorization: Bearer $TOKEN" 2>&1)
    GET_CODE=$(echo "$GET_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    GET_BODY=$(echo "$GET_RESPONSE" | grep -v "HTTP_CODE:")
    
    echo "  GET $endpoint: HTTP $GET_CODE"
    if [ "$GET_CODE" = "200" ]; then
        echo -e "  ${GREEN}✓ Endpoint works for GET${NC}"
        WORKING_ENDPOINT="$endpoint"
    else
        echo "  Response: $(echo "$GET_BODY" | head -1)"
    fi
done

echo ""
echo -e "${YELLOW}5. Testing Car Creation on Working Endpoint${NC}"

if [ -n "$WORKING_ENDPOINT" ]; then
    echo "Using endpoint: $WORKING_ENDPOINT"
    
    # Create test car with minimal data
    echo ""
    echo -e "${BLUE}Test 1: Minimal car data${NC}"
    CREATE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "http://localhost:8000${WORKING_ENDPOINT}" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "make": "Toyota",
            "model": "Camry",
            "year": 2020
        }' 2>&1)
    
    CREATE_CODE=$(echo "$CREATE_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    CREATE_BODY=$(echo "$CREATE_RESPONSE" | grep -v "HTTP_CODE:")
    
    echo "Response code: $CREATE_CODE"
    if [ "$CREATE_CODE" = "201" ] || [ "$CREATE_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Car created successfully!${NC}"
        echo "Response: $CREATE_BODY"
        
        # Extract car ID and delete it
        CAR_ID=$(echo "$CREATE_BODY" | grep -o '"id":[0-9]*' | cut -d: -f2)
        if [ -n "$CAR_ID" ]; then
            curl -s -X DELETE "http://localhost:8000${WORKING_ENDPOINT}/${CAR_ID}" \
                -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1
            echo "Test car deleted (ID: $CAR_ID)"
        fi
    else
        echo -e "${RED}✗ Car creation failed${NC}"
        echo "Response: $CREATE_BODY"
        
        # Test with more complete data
        echo ""
        echo -e "${BLUE}Test 2: Complete car data${NC}"
        CREATE_RESPONSE2=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "http://localhost:8000${WORKING_ENDPOINT}" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "make": "Toyota",
                "model": "Camry",
                "year": 2020,
                "vin": "1HGBH41JXMN109186",
                "mileage": 45000,
                "license_plate": "ABC123",
                "color": "Silver",
                "purchase_date": "2020-01-15",
                "notes": "Test car from diagnostic"
            }' 2>&1)
        
        CREATE_CODE2=$(echo "$CREATE_RESPONSE2" | grep "HTTP_CODE:" | cut -d: -f2)
        CREATE_BODY2=$(echo "$CREATE_RESPONSE2" | grep -v "HTTP_CODE:")
        
        echo "Response code: $CREATE_CODE2"
        echo "Response: $CREATE_BODY2"
    fi
else
    echo -e "${RED}✗ No working endpoint found${NC}"
fi

echo ""
echo -e "${YELLOW}6. Checking Frontend API Configuration${NC}"
echo "Frontend .env.production:"
cat /opt/carcollection/car-collection-prototype/.env.production 2>/dev/null || echo "File not found"

echo ""
echo "Checking if frontend is using correct API URL:"
grep -r "localhost:8000" /opt/carcollection/car-collection-prototype/.next 2>/dev/null | head -5 && echo "⚠️ Found localhost references in built frontend!"

echo ""
echo -e "${YELLOW}7. Checking CORS Configuration${NC}"
echo "Backend CORS settings:"
grep "CORS_ORIGINS" /opt/carcollection/backend/.env

echo ""
echo -e "${YELLOW}8. Testing from External IP (as browser would)${NC}"
EXT_TOKEN_RESPONSE=$(curl -s -X POST http://93.127.194.202/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username": "Administrator", "password": "Tarzan7Jane"}' 2>&1)

if echo "$EXT_TOKEN_RESPONSE" | grep -q "access_token"; then
    EXT_TOKEN=$(echo "$EXT_TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
    echo -e "${GREEN}✓ External login works${NC}"
    
    # Test car creation from external
    for endpoint in "/api/cars" "/api/cars/"; do
        echo ""
        echo "Testing external POST to $endpoint:"
        EXT_CREATE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "http://93.127.194.202${endpoint}" \
            -H "Authorization: Bearer $EXT_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"make":"Test","model":"External","year":2024}' 2>&1)
        
        EXT_CODE=$(echo "$EXT_CREATE" | grep "HTTP_CODE:" | cut -d: -f2)
        echo "Response code: $EXT_CODE"
        if [ "$EXT_CODE" != "200" ] && [ "$EXT_CODE" != "201" ]; then
            echo "Response: $(echo "$EXT_CREATE" | grep -v "HTTP_CODE:" | head -2)"
        fi
    done
else
    echo -e "${RED}✗ External login failed${NC}"
fi

echo ""
echo -e "${YELLOW}=== Diagnostic Summary ===${NC}"
echo ""
echo "Issues found:"

# Summarize issues
if [ "$GET_CODE" != "200" ]; then
    echo "- API endpoints not accessible at expected paths"
fi

if grep -q "localhost:8000" /opt/carcollection/car-collection-prototype/.next 2>/dev/null; then
    echo "- Frontend has localhost references (needs rebuild)"
fi

echo ""
echo "Next steps:"
echo "1. If endpoints are at /cars/ instead of /api/cars/, run: ./fix-api-routes.sh"
echo "2. If frontend has localhost references, rebuild it"
echo "3. Check browser console for specific error messages"
echo ""
echo "To monitor real-time errors when clicking 'Add New Car':"
echo "sudo journalctl -u carcollection-backend -f"