#!/usr/bin/env python3
"""
Create user directly using SQLite
"""

import sqlite3
import bcrypt
from datetime import datetime

def create_user_sqlite():
    """Create user directly in SQLite database."""
    print("👤 Creating Jaime user with SQLite...")
    
    # Connect to database
    conn = sqlite3.connect('backend/car_collection.db')
    cursor = conn.cursor()
    
    try:
        # Check if users table exists, create if not
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                hashed_password VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                is_admin BOOLEAN DEFAULT FALSE,
                email_verified BOOLEAN DEFAULT FALSE,
                created_at DATETIME,
                updated_at DATETIME,
                last_login DATETIME
            )
        """)
        
        # Hash the password
        password = "testing1"
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        hashed_str = hashed.decode('utf-8')
        
        # Insert user
        cursor.execute("""
            INSERT INTO users (username, email, hashed_password, is_active, is_admin, email_verified, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            'jaime',
            'jaime@example.com',
            hashed_str,
            True,
            True,
            True,
            datetime.utcnow().isoformat(),
            datetime.utcnow().isoformat()
        ))
        
        # Commit the transaction
        conn.commit()
        
        print("✅ User created successfully")
        
        # Verify user was created
        cursor.execute("SELECT id, username, email, is_admin FROM users WHERE username = 'jaime'")
        user = cursor.fetchone()
        if user:
            print(f"✅ User verified: ID={user[0]}, Username={user[1]}, Email={user[2]}, Admin={user[3]}")
        else:
            print("❌ User not found after creation")
            
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        conn.rollback()
    finally:
        conn.close()

def test_login():
    """Test the login."""
    print("\n🔐 Testing login...")
    
    import requests
    
    try:
        response = requests.post(
            'http://localhost:8000/auth/login',
            json={'username': 'jaime', 'password': 'testing1'}
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Login successful!")
            return True
        else:
            print("❌ Login failed")
            return False
            
    except Exception as e:
        print(f"❌ Login test failed: {e}")
        return False

def main():
    """Main function."""
    print("🔧 Creating User with SQLite and Testing Login")
    print("=" * 50)
    
    # Create user
    create_user_sqlite()
    
    # Test login
    if test_login():
        print("\n🎉 SUCCESS! Login is working!")
        print("\n🔑 Login credentials:")
        print("  Username: jaime")
        print("  Password: testing1")
        print("\n🌐 You can now login at: http://localhost:3000")
    else:
        print("\n❌ Login test failed")

if __name__ == "__main__":
    main() 