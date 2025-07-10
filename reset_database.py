#!/usr/bin/env python3
"""
Reset Database Script
Clears all data from the database while preserving structure.
"""

import os
import sys
import sqlite3
from pathlib import Path

def reset_sqlite_database():
    """Reset SQLite database by deleting all data."""
    print("🗑️  Resetting SQLite database...")
    
    db_path = Path("backend/car_collection.db")
    if not db_path.exists():
        print("❌ Database file not found. Nothing to reset.")
        return False
    
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Get all table names
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        # Disable foreign key constraints temporarily
        cursor.execute("PRAGMA foreign_keys = OFF;")
        
        # Clear all tables
        for table in tables:
            table_name = table[0]
            if table_name != 'sqlite_sequence':  # Skip system table
                print(f"  🗑️  Clearing table: {table_name}")
                cursor.execute(f"DELETE FROM {table_name}")
        
        # Reset auto-increment counters
        cursor.execute("DELETE FROM sqlite_sequence")
        
        # Re-enable foreign key constraints
        cursor.execute("PRAGMA foreign_keys = ON;")
        
        conn.commit()
        print("✅ Database reset completed")
        return True
        
    except Exception as e:
        print(f"❌ Error resetting database: {e}")
        return False
    finally:
        conn.close()

def reset_using_models():
    """Reset database using SQLAlchemy models (preserves structure)."""
    print("🗑️  Resetting database using SQLAlchemy models...")
    
    try:
        # Add backend to path for imports
        sys.path.append('backend')
        
        from backend.app.database import engine, SessionLocal
        from backend.app.models import Base, User, Car, ToDo, ServiceInterval, ServiceHistory, ServiceResearchLog
        
        # Drop and recreate all tables
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        
        print("✅ Database reset using models completed")
        return True
        
    except Exception as e:
        print(f"❌ Error resetting database with models: {e}")
        return False

def main():
    """Main reset function."""
    print("🚗 Car Collection Database Reset")
    print("=" * 40)
    
    # Try SQLAlchemy method first (preserves schema)
    if reset_using_models():
        print("\n🎉 Database successfully reset using SQLAlchemy models!")
        print("\n📋 What was done:")
        print("  ✅ All tables dropped and recreated")
        print("  ✅ Database structure preserved")
        print("  ✅ All data cleared")
        
        print("\n🔄 Next steps:")
        print("  1. Run create_user_sqlite.py to create test user")
        print("  2. Run import_data_sqlite.py to import test data")
        print("  3. Or run reset_and_setup.py for complete setup")
        
    elif reset_sqlite_database():
        print("\n🎉 Database successfully reset using SQLite!")
        print("\n📋 What was done:")
        print("  ✅ All data cleared from tables")
        print("  ✅ Auto-increment counters reset")
        
        print("\n🔄 Next steps:")
        print("  1. Run create_user_sqlite.py to create test user")
        print("  2. Run import_data_sqlite.py to import test data")
        print("  3. Or run reset_and_setup.py for complete setup")
        
    else:
        print("\n❌ Database reset failed")
        sys.exit(1)

if __name__ == "__main__":
    main()