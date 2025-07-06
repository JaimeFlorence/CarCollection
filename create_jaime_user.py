#!/usr/bin/env python3
"""
Manually create Jaime user and test login
"""

import sys
sys.path.append('backend')

from backend.app.database import SessionLocal, engine
from backend.app.models import Base, User
from backend.app.auth import get_password_hash
from datetime import datetime
import requests

def recreate_database():
    """Recreate the database schema."""
    print("🗄️  Recreating database schema...")
    
    # Drop and recreate all tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    print("✅ Database schema recreated")

def create_jaime_user():
    """Create Jaime user manually."""
    print("👤 Creating Jaime user...")
    
    db = SessionLocal()
    try:
        # Create jaime user with different email
        jaime_user = User(
            username="jaime",
            email="jaime.carcollection@example.com",  # Different email
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
        
        print(f"✅ Jaime user created: {jaime_user.username} (Admin: {jaime_user.is_admin})")
        return jaime_user
        
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        db.rollback()
        raise
    finally:
        db.close()

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
    print("🚗 Creating Jaime User and Testing Login")
    print("=" * 40)
    
    # Recreate database
    recreate_database()
    
    # Create user
    try:
        user = create_jaime_user()
    except Exception as e:
        print(f"❌ Failed to create user: {e}")
        return
    
    # Test login
    test_login()

if __name__ == "__main__":
    main() 