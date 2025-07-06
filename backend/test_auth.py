"""
Test script for authentication and multi-tenancy endpoints.
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_auth_endpoints():
    """Test the authentication endpoints."""
    print("🧪 Testing Authentication Endpoints")
    print("=" * 50)
    
    # Test 1: Try to access protected endpoint without authentication
    print("\n1. Testing access to protected endpoint without auth...")
    try:
        response = requests.get(f"{BASE_URL}/cars/")
        print(f"   Status: {response.status_code}")
        if response.status_code == 401:
            print("   ✅ Correctly requires authentication")
        else:
            print("   ❌ Should require authentication")
    except requests.exceptions.ConnectionError:
        print("   ❌ Server not running or not accessible")
        return
    
    # Test 2: Login with admin credentials
    print("\n2. Testing admin login...")
    login_data = {
        "username": "admin",
        "password": "admin123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            token_data = response.json()
            access_token = token_data["access_token"]
            print("   ✅ Login successful")
            print(f"   Token: {access_token[:20]}...")
            
            # Test 3: Access protected endpoint with token
            print("\n3. Testing access to protected endpoint with auth...")
            headers = {"Authorization": f"Bearer {access_token}"}
            response = requests.get(f"{BASE_URL}/cars/", headers=headers)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                cars = response.json()
                print(f"   ✅ Successfully accessed cars (found {len(cars)} cars)")
            else:
                print(f"   ❌ Failed to access cars: {response.text}")
            
            # Test 4: Get current user info
            print("\n4. Testing current user endpoint...")
            response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                user_data = response.json()
                print(f"   ✅ User info: {user_data['username']} (Admin: {user_data['is_admin']})")
            else:
                print(f"   ❌ Failed to get user info: {response.text}")
            
            # Test 5: Create a test car
            print("\n5. Testing car creation...")
            car_data = {
                "year": 2020,
                "make": "Toyota",
                "model": "Camry",
                "vin": "TEST123456789",
                "mileage": 50000,
                "license_plate": "TEST123",
                "insurance_info": "Test Insurance",
                "notes": "Test car for multi-tenancy"
            }
            
            response = requests.post(f"{BASE_URL}/cars/", json=car_data, headers=headers)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 201:
                car = response.json()
                print(f"   ✅ Car created successfully (ID: {car['id']})")
                print(f"   User ID: {car['user_id']}")
                
                # Test 6: Create a todo for the car
                print("\n6. Testing todo creation...")
                todo_data = {
                    "title": "Test Todo",
                    "description": "Test todo for multi-tenancy",
                    "priority": "high",
                    "car_id": car['id']
                }
                
                response = requests.post(f"{BASE_URL}/cars/{car['id']}/todos/", json=todo_data, headers=headers)
                print(f"   Status: {response.status_code}")
                
                if response.status_code == 201:
                    todo = response.json()
                    print(f"   ✅ Todo created successfully (ID: {todo['id']})")
                    print(f"   User ID: {todo['user_id']}")
                else:
                    print(f"   ❌ Failed to create todo: {response.text}")
            else:
                print(f"   ❌ Failed to create car: {response.text}")
                
        else:
            print(f"   ❌ Login failed: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Request failed: {e}")

def test_admin_endpoints():
    """Test the admin endpoints."""
    print("\n\n🔐 Testing Admin Endpoints")
    print("=" * 50)
    
    # Login as admin first
    login_data = {"username": "admin", "password": "admin123"}
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if response.status_code != 200:
            print("❌ Cannot test admin endpoints - login failed")
            return
            
        token_data = response.json()
        access_token = token_data["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}
        
        # Test admin users endpoint
        print("\n1. Testing admin users list...")
        response = requests.get(f"{BASE_URL}/admin/users/", headers=headers)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            users = response.json()
            print(f"   ✅ Found {len(users)} users")
            for user in users:
                print(f"      - {user['username']} (Admin: {user['is_admin']})")
        else:
            print(f"   ❌ Failed to get users: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Request failed: {e}")

if __name__ == "__main__":
    print("🚀 Car Collection Multi-Tenancy Test")
    print("=" * 50)
    
    test_auth_endpoints()
    test_admin_endpoints()
    
    print("\n\n✅ Testing completed!")
    print("\n📝 Next steps:")
    print("1. Check the FastAPI docs at http://localhost:8000/docs")
    print("2. Test the frontend integration")
    print("3. Create additional users via admin interface") 