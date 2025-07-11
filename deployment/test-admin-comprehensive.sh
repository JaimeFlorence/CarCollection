#!/bin/bash

# Comprehensive test for admin routing
STAGING_URL="http://93.127.194.202"

echo "Testing admin routing comprehensively..."
echo "========================================"

# Test 1: Admin page should work
echo -e "\n1. Testing admin pages:"
echo -n "   /admin: "
response=$(wget -S --spider $STAGING_URL/admin 2>&1 | grep "HTTP/" | tail -1 | awk '{print $2}')
if [ "$response" = "200" ]; then
    echo "✓ 200 OK"
else
    echo "✗ $response (expected 200)"
fi

echo -n "   /admin/: "
response=$(wget -S --spider $STAGING_URL/admin/ 2>&1 | grep "HTTP/" | tail -1 | awk '{print $2}')
if [ "$response" = "200" ]; then
    echo "✓ 200 OK"
else
    echo "✗ $response (expected 200)"
fi

# Test 2: Admin API endpoints should go to backend
echo -e "\n2. Testing admin API endpoints (should return 401 without auth):"
echo -n "   /admin/users/: "
response=$(wget -S --spider $STAGING_URL/admin/users/ 2>&1 | grep "HTTP/" | tail -1 | awk '{print $2}')
if [ "$response" = "401" ]; then
    echo "✓ 401 Unauthorized"
else
    echo "✗ $response (expected 401)"
fi

echo -n "   /admin/invitations/: "
response=$(wget -S --spider $STAGING_URL/admin/invitations/ 2>&1 | grep "HTTP/" | tail -1 | awk '{print $2}')
if [ "$response" = "401" ]; then
    echo "✓ 401 Unauthorized"
else
    echo "✗ $response (expected 401)"
fi

# Test 3: Other routes should still work
echo -e "\n3. Testing other frontend routes:"
echo -n "   /login: "
response=$(wget -S --spider $STAGING_URL/login 2>&1 | grep "HTTP/" | tail -1 | awk '{print $2}')
if [ "$response" = "200" ]; then
    echo "✓ 200 OK"
else
    echo "✗ $response (expected 200)"
fi

echo -n "   /dashboard: "
response=$(wget -S --spider $STAGING_URL/dashboard 2>&1 | grep "HTTP/" | tail -1 | awk '{print $2}')
if [ "$response" = "200" ]; then
    echo "✓ 200 OK"
else
    echo "✗ $response (expected 200)"
fi

# Test 4: Backend API endpoints
echo -e "\n4. Testing backend API endpoints:"
echo -n "   /auth/me: "
response=$(wget -S --spider $STAGING_URL/auth/me 2>&1 | grep "HTTP/" | tail -1 | awk '{print $2}')
if [ "$response" = "401" ]; then
    echo "✓ 401 Unauthorized"
else
    echo "✗ $response (expected 401)"
fi

echo -n "   /cars/: "
response=$(wget -S --spider $STAGING_URL/cars/ 2>&1 | grep "HTTP/" | tail -1 | awk '{print $2}')
if [ "$response" = "401" ]; then
    echo "✓ 401 Unauthorized"
else
    echo "✗ $response (expected 401)"
fi

echo -e "\n========================================"
echo "Testing complete!"