#!/bin/bash

# Test script to verify admin routing is working correctly

STAGING_URL="http://93.127.194.202"

echo "Testing admin routing on staging server..."
echo "========================================"

# Test 1: Admin page should return HTML (Next.js page)
echo -e "\n1. Testing admin page (should return HTML):"
response=$(curl -s -o /dev/null -w "%{http_code}" $STAGING_URL/admin)
if [ "$response" = "200" ]; then
    echo "✓ Admin page returns 200 OK"
else
    echo "✗ Admin page returns $response (expected 200)"
fi

# Test 2: Admin API endpoints should still work
echo -e "\n2. Testing admin API endpoints:"

# Test admin users endpoint (should return 401 without auth)
response=$(curl -s -o /dev/null -w "%{http_code}" $STAGING_URL/admin/users/)
if [ "$response" = "401" ]; then
    echo "✓ /admin/users/ returns 401 Unauthorized (expected without auth)"
else
    echo "✗ /admin/users/ returns $response (expected 401)"
fi

# Test 3: Check that other frontend routes still work
echo -e "\n3. Testing other frontend routes:"

# Test login page
response=$(curl -s -o /dev/null -w "%{http_code}" $STAGING_URL/login)
if [ "$response" = "200" ]; then
    echo "✓ Login page returns 200 OK"
else
    echo "✗ Login page returns $response (expected 200)"
fi

# Test dashboard
response=$(curl -s -o /dev/null -w "%{http_code}" $STAGING_URL/dashboard)
if [ "$response" = "200" ]; then
    echo "✓ Dashboard page returns 200 OK"
else
    echo "✗ Dashboard page returns $response (expected 200)"
fi

# Test 4: Verify API endpoints still work
echo -e "\n4. Testing API endpoints:"

# Test auth endpoint
response=$(curl -s -o /dev/null -w "%{http_code}" $STAGING_URL/auth/me)
if [ "$response" = "401" ]; then
    echo "✓ /auth/me returns 401 Unauthorized (expected without auth)"
else
    echo "✗ /auth/me returns $response (expected 401)"
fi

# Test cars endpoint
response=$(curl -s -o /dev/null -w "%{http_code}" $STAGING_URL/cars/)
if [ "$response" = "401" ]; then
    echo "✓ /cars/ returns 401 Unauthorized (expected without auth)"
else
    echo "✗ /cars/ returns $response (expected 401)"
fi

echo -e "\n========================================"
echo "Testing complete!"