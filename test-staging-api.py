#!/usr/bin/env python3
"""Test staging server API endpoints"""

import requests
import json

STAGING_URL = "http://93.127.194.202"

print("=== Testing Staging Server API ===\n")

# Test 1: Login
print("1. Testing login...")
login_data = {
    "username": "Administrator",
    "password": "Tarzan7Jane"
}
try:
    response = requests.post(f"{STAGING_URL}/auth/login", json=login_data)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        auth_data = response.json()
        token = auth_data.get("access_token")
        print("✓ Login successful")
        print(f"Token: {token[:20]}..." if token else "No token received")
    else:
        print(f"✗ Login failed: {response.text}")
        exit(1)
except Exception as e:
    print(f"✗ Login error: {e}")
    exit(1)

# Test 2: Get users through admin endpoint
print("\n2. Testing /admin/users/ endpoint...")
headers = {
    "Authorization": f"Bearer {token}"
}
try:
    response = requests.get(f"{STAGING_URL}/admin/users/", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response headers: {dict(response.headers)}")
    if response.status_code == 200:
        users = response.json()
        print(f"✓ Got {len(users)} users:")
        for user in users:
            print(f"  - {user['username']} (admin: {user['is_admin']})")
    else:
        print(f"✗ Failed to get users: {response.text}")
except Exception as e:
    print(f"✗ Error getting users: {e}")

# Test 3: Test API base path
print("\n3. Testing /api/cars/ endpoint...")
try:
    response = requests.get(f"{STAGING_URL}/api/cars/", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        cars = response.json()
        print(f"✓ Got {len(cars)} cars")
    else:
        print(f"✗ Failed to get cars: {response.text}")
except Exception as e:
    print(f"✗ Error getting cars: {e}")

# Test 4: Check what the browser sees
print("\n4. Simulating browser request to /admin/users/...")
browser_headers = {
    "Authorization": f"Bearer {token}",
    "Accept": "application/json",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Origin": STAGING_URL,
    "Referer": f"{STAGING_URL}/admin"
}
try:
    response = requests.get(f"{STAGING_URL}/admin/users/", headers=browser_headers)
    print(f"Status: {response.status_code}")
    print(f"Content-Type: {response.headers.get('content-type')}")
    if response.status_code == 200:
        print("✓ Browser simulation successful")
        print(f"Response: {response.text[:200]}...")
    else:
        print(f"✗ Browser simulation failed: {response.text}")
except Exception as e:
    print(f"✗ Browser simulation error: {e}")

print("\n=== Test Complete ===")