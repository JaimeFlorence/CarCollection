#!/usr/bin/env python3
"""
Test Jaime's Login and Data Access
Verifies that the setup was successful and Jaime can access their data.
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"

def test_jaime_login():
    """Test Jaime's login credentials."""
    print("🔐 Testing Jaime's login...")
    
    login_data = {
        "username": "jaime",
        "password": "testing1"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            auth_data = response.json()
            token = auth_data["access_token"]
            user = auth_data["user"]
            print(f"✅ Login successful: {user['username']} (Admin: {user['is_admin']})")
            return token, user
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return None, None
    except Exception as e:
        print(f"❌ Login request failed: {e}")
        return None, None

def test_car_access(token):
    """Test access to Jaime's cars."""
    print("\n🚗 Testing car access...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/cars/", headers=headers)
        if response.status_code == 200:
            cars = response.json()
            print(f"✅ Successfully retrieved {len(cars)} cars")
            
            # Show first few cars with groups
            print("\n📋 Sample cars:")
            for i, car in enumerate(cars[:5]):
                group = car.get('group_name', 'Daily Drivers')
                print(f"  {i+1}. {car['year']} {car['make']} {car['model']} ({car['mileage']:,} miles) - {group}")
            
            if len(cars) > 5:
                print(f"  ... and {len(cars) - 5} more cars")
                
            # Show group distribution
            groups = {}
            for car in cars:
                group = car.get('group_name', 'Daily Drivers')
                groups[group] = groups.get(group, 0) + 1
            
            print("\n📊 Cars by group:")
            for group, count in groups.items():
                print(f"  {group}: {count} cars")
            
            return cars
        else:
            print(f"❌ Car access failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Car access request failed: {e}")
        return None

def test_todo_access(token, cars):
    """Test access to Jaime's todos."""
    print("\n📝 Testing todo access...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        # Get todos for the first car
        if cars:
            first_car = cars[0]
            car_id = first_car['id']
            
            response = requests.get(f"{BASE_URL}/cars/{car_id}/todos/", headers=headers)
            if response.status_code == 200:
                todos = response.json()
                print(f"✅ Successfully retrieved {len(todos)} todos for {first_car['make']} {first_car['model']}")
                
                # Show todos
                print("\n📋 Todos:")
                for i, todo in enumerate(todos[:3]):
                    priority_emoji = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(todo['priority'], "⚪")
                    status_emoji = "✅" if todo['status'] == 'resolved' else "⏳"
                    print(f"  {i+1}. {priority_emoji} {status_emoji} {todo['title']}")
                
                if len(todos) > 3:
                    print(f"  ... and {len(todos) - 3} more todos")
                
                return todos
            else:
                print(f"❌ Todo access failed: {response.status_code}")
                return None
        else:
            print("❌ No cars available to test todos")
            return None
    except Exception as e:
        print(f"❌ Todo access request failed: {e}")
        return None

def test_groups_access(token):
    """Test groups functionality."""
    print("\n📊 Testing groups access...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/cars/groups/", headers=headers)
        if response.status_code == 200:
            groups = response.json()
            print(f"✅ Groups access successful - found {len(groups)} groups")
            
            # Show groups
            print("\n📂 Available groups:")
            for group in groups:
                print(f"  📁 {group}")
            
            return groups
        else:
            print(f"❌ Groups access failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Groups access request failed: {e}")
        return None

def test_admin_access(token):
    """Test admin functionality."""
    print("\n👑 Testing admin access...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/admin/users/", headers=headers)
        if response.status_code == 200:
            users = response.json()
            print(f"✅ Admin access successful - can see {len(users)} users")
            
            # Show users
            print("\n👥 Users:")
            for user in users:
                role = "👑 Admin" if user['is_admin'] else "👤 User"
                status = "🟢 Active" if user['is_active'] else "🔴 Inactive"
                print(f"  {role} {status}: {user['username']} ({user['email']})")
            
            return users
        else:
            print(f"❌ Admin access failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Admin access request failed: {e}")
        return None

def main():
    """Run all tests."""
    print("🚗 Testing Jaime's Car Collection Access")
    print("=" * 50)
    
    # Test login
    token, user = test_jaime_login()
    if not token:
        print("\n❌ Login failed - cannot proceed with other tests")
        return
    
    # Test car access
    cars = test_car_access(token)
    if not cars:
        print("\n❌ Car access failed")
        return
    
    # Test todo access
    todos = test_todo_access(token, cars)
    
    # Test groups access
    groups = test_groups_access(token)
    
    # Test admin access
    users = test_admin_access(token)
    
    print("\n" + "=" * 50)
    print("🎉 All tests completed!")
    print("\n📊 Summary:")
    if user:
        print(f"  ✅ Login: {user['username']} (Admin: {user['is_admin']})")
    if cars:
        print(f"  ✅ Cars: {len(cars)} cars in collection")
    if groups:
        print(f"  ✅ Groups: {len(groups)} groups available")
    if todos:
        print(f"  ✅ Todos: {len(todos)} todos for first car")
    if users:
        print(f"  ✅ Admin: Access to {len(users)} users")
    
    print("\n🌐 You can now access the application at: http://localhost:3000")
    print("   Login with: jaime / \\testing1")

if __name__ == "__main__":
    main() 