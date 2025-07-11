#!/usr/bin/env python3
"""
Set up a fresh database with only the Administrator user.
This mimics the staging server setup.
"""

import os
import sys
sys.path.insert(0, '.')

from app.database import SessionLocal, engine
from app.models import Base, User
from app.auth import get_password_hash

def setup_fresh_database():
    """Create a fresh database with only Administrator user."""
    
    # Drop all existing tables
    print("Dropping all existing tables...")
    Base.metadata.drop_all(bind=engine)
    
    # Create all tables fresh
    print("Creating fresh database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Create Administrator user
    print("Creating Administrator user...")
    db = SessionLocal()
    try:
        admin_user = User(
            username="Administrator",
            email="admin@example.com",
            hashed_password=get_password_hash("Tarzan7Jane"),
            is_admin=True
        )
        db.add(admin_user)
        db.commit()
        print("Administrator account created successfully!")
        print("  Username: Administrator")
        print("  Password: Tarzan7Jane")
        print("  Email: admin@example.com")
        print("  Is Admin: True")
    except Exception as e:
        print(f"Error creating Administrator user: {e}")
        db.rollback()
    finally:
        db.close()
    
    print("\nDatabase setup complete! You now have a fresh database with only the Administrator user.")

if __name__ == "__main__":
    response = input("This will DELETE ALL DATA and create a fresh database. Are you sure? (yes/no): ")
    if response.lower() == 'yes':
        setup_fresh_database()
    else:
        print("Operation cancelled.")