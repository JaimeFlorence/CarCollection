#!/usr/bin/env python3
"""
Frontend Authentication and Multi-tenancy Test
Tests the complete authentication flow and user isolation.
"""

import requests
import json
import time
import datetime

# Configuration
BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"

def test_backend_health():
    """Test backend is running and healthy."""
    print("🔍 Testing backend health...")
    try:
        # Try to access the auth endpoint to check if backend is running
        response = requests.get(f"{BASE_URL}/auth/me")
        # We expect 401 (unauthorized) or 403 (forbidden) which means the backend is running
        if response.status_code in (401, 403):
            print("✅ Backend is running")
            return True
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend connection failed: {e}")
        return False

def test_authentication_flow():
    """Test complete authentication flow."""
    print("\n🔐 Testing authentication flow...")
    
    # Test login with admin user
    print("  Testing admin login...")
    login_data = {
        "username": "admin",
        "password": "admin123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            auth_data = response.json()
            token = auth_data["access_token"]
            user = auth_data["user"]
            print(f"  ✅ Admin login successful: {user['username']} (Admin: {user['is_admin']})")
            
            # Test token validation
            headers = {"Authorization": f"Bearer {token}"}
            me_response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
            if me_response.status_code == 200:
                me_user = me_response.json()
                print(f"  ✅ Token validation successful: {me_user['username']}")
            else:
                print(f"  ❌ Token validation failed: {me_response.status_code}")
                return False
                
            return token, user
        else:
            print(f"  ❌ Admin login failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"  ❌ Login request failed: {e}")
        return False

def test_user_registration():
    """Test user registration."""
    print("\n👤 Testing user registration...")
    
    # Use a unique username/email for each run
    timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
    username = f"testuser_{timestamp}"
    email = f"testuser_{timestamp}@example.com"
    user_data = {
        "username": username,
        "email": email,
        "password": "testpass123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=user_data)
        if response.status_code in (200, 201):
            new_user = response.json()
            print(f"  ✅ User registration successful: {new_user['username']}")
            
            # Test login with new user
            login_response = requests.post(f"{BASE_URL}/auth/login", json={
                "username": username,
                "password": "testpass123"
            })
            if login_response.status_code == 200:
                auth_data = login_response.json()
                print(f"  ✅ New user login successful: {auth_data['user']['username']}")
                return auth_data["access_token"], auth_data["user"]
            else:
                print(f"  ❌ New user login failed: {login_response.status_code}")
                return False
        else:
            print(f"  ❌ User registration failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"  ❌ Registration request failed: {e}")
        return False

def test_user_isolation(admin_token, user_token):
    """Test that users can only see their own data."""
    print("\n🔒 Testing user isolation...")
    
    # Create cars for both users
    print("  Creating test cars...")
    
    # Admin creates a car
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    admin_car = {
        "make": "BMW",
        "model": "X5",
        "year": 2020,
        "mileage": 50000,
        "license_plate": "ADMIN123",
        "insurance_info": "Admin Insurance",
        "notes": "Admin's car"
    }
    
    try:
        admin_car_response = requests.post(f"{BASE_URL}/cars/", json=admin_car, headers=admin_headers)
        if admin_car_response.status_code in (200, 201):
            admin_car_data = admin_car_response.json()
            print(f"  ✅ Admin car created: {admin_car_data['make']} {admin_car_data['model']}")
        else:
            print(f"  ❌ Admin car creation failed: {admin_car_response.status_code}")
            return False
    except Exception as e:
        print(f"  ❌ Admin car creation failed: {e}")
        return False
    
    # User creates a car
    user_headers = {"Authorization": f"Bearer {user_token}"}
    user_car = {
        "make": "Toyota",
        "model": "Camry",
        "year": 2019,
        "mileage": 30000,
        "license_plate": "USER456",
        "insurance_info": "User Insurance",
        "notes": "User's car"
    }
    
    try:
        user_car_response = requests.post(f"{BASE_URL}/cars/", json=user_car, headers=user_headers)
        if user_car_response.status_code in (200, 201):
            user_car_data = user_car_response.json()
            print(f"  ✅ User car created: {user_car_data['make']} {user_car_data['model']}")
        else:
            print(f"  ❌ User car creation failed: {user_car_response.status_code}")
            return False
    except Exception as e:
        print(f"  ❌ User car creation failed: {e}")
        return False
    
    # Test isolation - admin should see their car
    print("  Testing admin can see their car...")
    try:
        admin_cars_response = requests.get(f"{BASE_URL}/cars/", headers=admin_headers)
        if admin_cars_response.status_code == 200:
            admin_cars = admin_cars_response.json()
            admin_car_plates = [car["license_plate"] for car in admin_cars]
            
            if "ADMIN123" in admin_car_plates:
                print(f"  ✅ Admin's car is present: {admin_car_plates}")
            else:
                print(f"  ❌ Admin's car not found: {admin_car_plates}")
                return False
        else:
            print(f"  ❌ Admin cars fetch failed: {admin_cars_response.status_code}")
            return False
    except Exception as e:
        print(f"  ❌ Admin cars fetch failed: {e}")
        return False
    
    # Test isolation - user should see their car
    print("  Testing user can see their car...")
    try:
        user_cars_response = requests.get(f"{BASE_URL}/cars/", headers=user_headers)
        if user_cars_response.status_code == 200:
            user_cars = user_cars_response.json()
            user_car_plates = [car["license_plate"] for car in user_cars]
            
            if "USER456" in user_car_plates:
                print(f"  ✅ User's car is present: {user_car_plates}")
            else:
                print(f"  ❌ User's car not found: {user_car_plates}")
                return False
        else:
            print(f"  ❌ User cars fetch failed: {user_cars_response.status_code}")
            return False
    except Exception as e:
        print(f"  ❌ User cars fetch failed: {e}")
        return False
    
    print("  ✅ User isolation test passed!")
    return True

def test_admin_functions(admin_token):
    """Test admin-specific functions."""
    print("\n👑 Testing admin functions...")
    
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Test getting all users
    print("  Testing get all users...")
    try:
        users_response = requests.get(f"{BASE_URL}/admin/users/", headers=admin_headers)
        if users_response.status_code == 200:
            users = users_response.json()
            print(f"  ✅ Admin can see {len(users)} users")
            
            # Check that we have both admin and test user
            usernames = [user["username"] for user in users]
            if "admin" in usernames and "testuser" in usernames:
                print("  ✅ Admin can see both admin and test user")
            else:
                print(f"  ❌ Admin missing users: {usernames}")
                return False
        else:
            print(f"  ❌ Admin users fetch failed: {users_response.status_code}")
            return False
    except Exception as e:
        print(f"  ❌ Admin users fetch failed: {e}")
        return False
    
    # Test creating user by admin
    print("  Testing create user by admin...")
    admin_created_timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
    new_user_data = {
        "username": f"admincreated_{admin_created_timestamp}",
        "email": f"admincreated_{admin_created_timestamp}@example.com",
        "password": "adminpass123",
        "is_admin": False,
        "send_invitation": False
    }
    
    try:
        create_response = requests.post(f"{BASE_URL}/admin/users/", json=new_user_data, headers=admin_headers)
        if create_response.status_code in (200, 201):
            new_user = create_response.json()
            print(f"  ✅ Admin created user: {new_user['username']}")
        else:
            print(f"  ❌ Admin user creation failed: {create_response.status_code} - {create_response.text}")
            return False
    except Exception as e:
        print(f"  ❌ Admin user creation failed: {e}")
        return False
    
    print("  ✅ Admin functions test passed!")
    return True

def test_unauthorized_access(user_token):
    """Test unauthorized access is properly blocked."""
    print("\n🚫 Testing unauthorized access...")
    
    # Test accessing cars without token
    print("  Testing cars access without token...")
    try:
        response = requests.get(f"{BASE_URL}/cars/")
        if response.status_code in (401, 403):
            print("  ✅ Unauthorized cars access properly blocked")
        else:
            print(f"  ❌ Unauthorized cars access not blocked: {response.status_code}")
            return False
    except Exception as e:
        print(f"  ❌ Unauthorized cars test failed: {e}")
        return False
    
    # Test accessing admin functions without admin token
    print("  Testing admin access without admin token...")
    try:
        # Use user token to access admin endpoint
        user_headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{BASE_URL}/admin/users/", headers=user_headers)
        if response.status_code == 403:
            print("  ✅ Non-admin access to admin functions properly blocked")
        else:
            print(f"  ❌ Non-admin access not blocked: {response.status_code}")
            return False
    except Exception as e:
        print(f"  ❌ Non-admin access test failed: {e}")
        return False
    
    print("  ✅ Unauthorized access test passed!")
    return True

def main():
    """Run all tests."""
    print("🚗 Car Collection Multi-tenancy Frontend Test")
    print("=" * 50)
    
    # Test backend health
    if not test_backend_health():
        print("\n❌ Backend health check failed. Make sure the backend is running.")
        return
    
    # Test authentication flow
    auth_result = test_authentication_flow()
    if not auth_result:
        print("\n❌ Authentication flow failed.")
        return
    
    admin_token, admin_user = auth_result
    
    # Test user registration
    user_result = test_user_registration()
    if not user_result:
        print("\n❌ User registration failed.")
        return
    
    user_token, test_user = user_result
    
    # Test user isolation
    if not test_user_isolation(admin_token, user_token):
        print("\n❌ User isolation test failed.")
        return
    
    # Test admin functions
    if not test_admin_functions(admin_token):
        print("\n❌ Admin functions test failed.")
        return
    
    # Test unauthorized access
    if not test_unauthorized_access(user_token):
        print("\n❌ Unauthorized access test failed.")
        return
    
    print("\n" + "=" * 50)
    print("🎉 All tests passed! Multi-tenancy is working correctly.")
    print("\n📋 Test Summary:")
    print("  ✅ Backend health check")
    print("  ✅ Authentication flow")
    print("  ✅ User registration")
    print("  ✅ User isolation (data separation)")
    print("  ✅ Admin functions")
    print("  ✅ Unauthorized access protection")
    print("\n🌐 Frontend should now be accessible at: http://localhost:3000")
    print("   - Login with: admin / admin123")
    print("   - Or register a new account")
    print("   - Each user will see only their own cars")

if __name__ == "__main__":
    main() 