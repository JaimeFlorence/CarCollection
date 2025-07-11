#!/bin/bash

# Test script for staging API endpoints
SERVER="http://93.127.194.202"

echo "🧪 Testing Staging API Endpoints"
echo "================================"

# Test 1: Login
echo -e "\n1. Testing login endpoint..."
LOGIN_RESPONSE=$(curl -s -X POST $SERVER/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "Administrator", "password": "Tarzan7Jane"}')

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
  echo "✅ Login successful"
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
  echo "Token obtained (first 20 chars): ${TOKEN:0:20}..."
else
  echo "❌ Login failed"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

# Test 2: Auth check
echo -e "\n2. Testing auth/me endpoint..."
ME_RESPONSE=$(curl -s $SERVER/auth/me \
  -H "Authorization: Bearer $TOKEN")

if echo "$ME_RESPONSE" | grep -q "Administrator"; then
  echo "✅ Auth/me successful"
else
  echo "❌ Auth/me failed"
  echo "Response: $ME_RESPONSE"
fi

# Test 3: Cars endpoint
echo -e "\n3. Testing /cars/ endpoint..."
CARS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" $SERVER/cars/ \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$CARS_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$CARS_RESPONSE" | grep -v "HTTP_CODE:")

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Cars endpoint working (HTTP $HTTP_CODE)"
  echo "Cars found: $(echo "$BODY" | grep -o '"id"' | wc -l)"
else
  echo "❌ Cars endpoint failed (HTTP $HTTP_CODE)"
  echo "Response: $BODY"
fi

# Test 4: Cars groups endpoint
echo -e "\n4. Testing /cars/groups/ endpoint..."
GROUPS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" $SERVER/cars/groups/ \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$GROUPS_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$GROUPS_RESPONSE" | grep -v "HTTP_CODE:")

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Cars groups endpoint working (HTTP $HTTP_CODE)"
else
  echo "❌ Cars groups endpoint failed (HTTP $HTTP_CODE)"
  echo "Response: $BODY"
fi

# Test 5: Admin users endpoint
echo -e "\n5. Testing /admin/users/ endpoint..."
ADMIN_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" $SERVER/admin/users/ \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$ADMIN_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$ADMIN_RESPONSE" | grep -v "HTTP_CODE:")

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Admin users endpoint working (HTTP $HTTP_CODE)"
  echo "Users found: $(echo "$BODY" | grep -o '"id"' | wc -l)"
else
  echo "❌ Admin users endpoint failed (HTTP $HTTP_CODE)"
  echo "Response: $BODY"
fi

# Test 6: API invitations endpoint
echo -e "\n6. Testing /api/invitations endpoint..."
INVITATIONS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" $SERVER/api/invitations \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$INVITATIONS_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$INVITATIONS_RESPONSE" | grep -v "HTTP_CODE:")

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Invitations endpoint working (HTTP $HTTP_CODE)"
else
  echo "❌ Invitations endpoint failed (HTTP $HTTP_CODE)"
  echo "Response: $BODY"
fi

echo -e "\n================================"
echo "Test completed!"