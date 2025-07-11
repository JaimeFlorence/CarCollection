#!/usr/bin/env python3
"""
Local API test script for car creation
Tests the car creation API endpoint with example data
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
API_BASE_URL = "http://localhost:8000"
USERNAME = "Administrator"
PASSWORD = "Tarzan7Jane"

# Test car data from example_cars.csv
TEST_CARS = [
    {
        "year": 2020,
        "make": "Toyota",
        "model": "Camry",
        "vin": "1HGBH41JXMN109186",
        "mileage": 45000,
        "license_plate": "ABC123",
        "notes": "Well maintained family car"
    },
    {
        "year": 2018,
        "make": "Honda",
        "model": "Civic",
        "vin": "2T1BURHE0JC123456",
        "mileage": 38000,
        "license_plate": "DEF456",
        "notes": "Great fuel economy"
    },
    {
        "year": 2022,
        "make": "Ford",
        "model": "Mustang",
        "vin": "1FATP8UH0K5123456",
        "mileage": 12000,
        "license_plate": "GHI789",
        "notes": "Sports car - weekend driver"
    }
]

def print_result(success, message):
    """Print colored result messages"""
    if success:
        print(f"✓ {message}")
    else:
        print(f"✗ {message}")

def login():
    """Login and get JWT token"""
    print("\n1. Testing Login...")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/auth/login",
            headers={"Content-Type": "application/json"},
            json={"username": USERNAME, "password": PASSWORD}
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            print_result(True, f"Login successful - Token: {token[:30]}...")
            return token
        else:
            print_result(False, f"Login failed - Status: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print_result(False, f"Login error: {str(e)}")
        return None

def test_endpoints(token):
    """Test which car endpoints are available"""
    print("\n2. Testing Available Endpoints...")
    
    headers = {"Authorization": f"Bearer {token}"}
    endpoints = ["/cars/", "/cars", "/api/cars/", "/api/cars"]
    working_endpoint = None
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{API_BASE_URL}{endpoint}", headers=headers)
            if response.status_code == 200:
                print_result(True, f"GET {endpoint} - Status: {response.status_code}")
                working_endpoint = endpoint
                break
            else:
                print_result(False, f"GET {endpoint} - Status: {response.status_code}")
        except Exception as e:
            print_result(False, f"GET {endpoint} - Error: {str(e)}")
    
    return working_endpoint

def get_existing_cars(token, endpoint):
    """Get list of existing cars"""
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{API_BASE_URL}{endpoint}", headers=headers)
        if response.status_code == 200:
            cars = response.json()
            print(f"\n   Existing cars: {len(cars)}")
            for car in cars[:3]:  # Show first 3
                print(f"   - {car.get('year')} {car.get('make')} {car.get('model')} (ID: {car.get('id')})")
            return cars
        else:
            return []
    except:
        return []

def create_car(token, endpoint, car_data, test_name):
    """Create a single car"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    print(f"\n{test_name}:")
    print(f"   Creating: {car_data['year']} {car_data['make']} {car_data['model']}")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}{endpoint}",
            headers=headers,
            json=car_data
        )
        
        if response.status_code in [200, 201]:
            created_car = response.json()
            print_result(True, f"Car created successfully - ID: {created_car.get('id')}")
            return created_car.get('id')
        else:
            print_result(False, f"Failed - Status: {response.status_code}")
            print(f"   Response: {response.text}")
            
            # Try to parse error details
            try:
                error_data = response.json()
                if "detail" in error_data:
                    print(f"   Error detail: {error_data['detail']}")
            except:
                pass
                
            return None
            
    except Exception as e:
        print_result(False, f"Error: {str(e)}")
        return None

def delete_car(token, endpoint, car_id):
    """Delete a car by ID"""
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.delete(
            f"{API_BASE_URL}{endpoint}/{car_id}",
            headers=headers
        )
        
        if response.status_code in [200, 204]:
            print(f"   Deleted test car ID: {car_id}")
            return True
        else:
            print(f"   Failed to delete car ID: {car_id}")
            return False
            
    except Exception as e:
        print(f"   Error deleting car: {str(e)}")
        return False

def main():
    """Main test flow"""
    print("=== Car Creation API Test Script ===")
    print(f"API URL: {API_BASE_URL}")
    print(f"Testing as: {USERNAME}")
    
    # Step 1: Login
    token = login()
    if not token:
        print("\nCannot proceed without authentication")
        sys.exit(1)
    
    # Step 2: Find working endpoint
    endpoint = test_endpoints(token)
    if not endpoint:
        print("\nNo working car endpoint found!")
        print("The API might not be properly configured.")
        sys.exit(1)
    
    print(f"\nUsing endpoint: {endpoint}")
    
    # Step 3: Show existing cars
    existing_cars = get_existing_cars(token, endpoint)
    
    # Step 4: Test car creation
    print("\n3. Testing Car Creation...")
    
    created_ids = []
    
    # Test 1: Minimal data
    minimal_car = {
        "make": "Test",
        "model": "Minimal",
        "year": 2024
    }
    car_id = create_car(token, endpoint, minimal_car, "Test 1: Minimal data")
    if car_id:
        created_ids.append(car_id)
    
    # Test 2: Complete data from example
    for i, car_data in enumerate(TEST_CARS[:2], 1):
        car_id = create_car(token, endpoint, car_data, f"Test {i+1}: Example car {i}")
        if car_id:
            created_ids.append(car_id)
    
    # Test 3: Car with all optional fields
    complete_car = {
        "make": "Tesla",
        "model": "Model 3",
        "year": 2023,
        "vin": "5YJ3E1EA0KF123456",
        "mileage": 5000,
        "license_plate": "TESLA1",
        "color": "Pearl White",
        "purchase_date": "2023-06-15",
        "purchase_price": 45000,
        "current_value": 42000,
        "notes": "Full self-driving capability",
        "group_name": "Electric Vehicles"
    }
    car_id = create_car(token, endpoint, complete_car, "Test 4: All fields")
    if car_id:
        created_ids.append(car_id)
    
    # Step 5: Clean up test data
    if created_ids:
        print("\n4. Cleaning up test data...")
        for car_id in created_ids:
            delete_car(token, endpoint, car_id)
    
    # Summary
    print("\n=== Test Summary ===")
    print(f"Endpoint tested: {endpoint}")
    print(f"Cars created: {len([id for id in created_ids if id])}")
    print(f"Cars failed: {4 - len([id for id in created_ids if id])}")
    
    if any(created_ids):
        print("\n✓ Car creation API is working!")
    else:
        print("\n✗ Car creation API is not working properly")
        print("\nPossible issues:")
        print("- Check if the car_api.py router is properly included")
        print("- Verify database permissions")
        print("- Check for validation errors in the car model")

if __name__ == "__main__":
    main()