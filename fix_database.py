#!/usr/bin/env python3
"""
Fix database by creating user directly in the correct location
"""

import os
import sys
import sqlite3
from pathlib import Path

# Add backend to path
sys.path.append('backend')

from backend.app.database import engine, SessionLocal
from backend.app.models import Base, User
from backend.app.auth import get_password_hash
from datetime import datetime
import requests

def ensure_database_exists():
    """Ensure the database file exists and has the correct schema."""
    print("🗄️  Ensuring database exists...")
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    print("✅ Database schema ensured")

def create_user_directly():
    """Create user directly in the database."""
    print("👤 Creating Jaime user directly...")
    
    db = SessionLocal()
    try:
        # Check if user already exists
        existing = db.query(User).filter(User.username == "jaime").first()
        if existing:
            print(f"⚠️  User already exists: {existing.username}")
            return existing
        
        # Create new user
        jaime_user = User(
            username="jaime",
            email="jaime@example.com",
            hashed_password=get_password_hash("testing1"),
            is_active=True,
            is_admin=True,
            email_verified=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(jaime_user)
        db.commit()
        db.refresh(jaime_user)
        
        print(f"✅ User created: {jaime_user.username} (Admin: {jaime_user.is_admin})")
        return jaime_user
        
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def verify_user_in_database():
    """Verify user exists in the database file."""
    print("\n🔍 Verifying user in database...")
    
    db_path = Path("backend/car_collection.db")
    if not db_path.exists():
        print(f"❌ Database file not found: {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, email, is_admin FROM users WHERE username = 'jaime'")
        users = cursor.fetchall()
        conn.close()
        
        if users:
            user = users[0]
            print(f"✅ User found in database: ID={user[0]}, Username={user[1]}, Email={user[2]}, Admin={user[3]}")
            return True
        else:
            print("❌ User not found in database")
            return False
            
    except Exception as e:
        print(f"❌ Error checking database: {e}")
        return False

def test_login():
    """Test the login."""
    print("\n🔐 Testing login...")
    
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
    print("🔧 Fixing Database and Testing Login")
    print("=" * 40)
    
    # Ensure database exists
    ensure_database_exists()
    
    # Create user
    try:
        user = create_user_directly()
    except Exception as e:
        print(f"❌ Failed to create user: {e}")
        return
    
    # Verify user in database
    if not verify_user_in_database():
        print("❌ User verification failed")
        return
    
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