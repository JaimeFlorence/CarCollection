#!/usr/bin/env python3
"""
Add shop and invoice_number fields to service_history table
"""

import sqlite3
from pathlib import Path

def migrate_database():
    """Add new fields to service_history table"""
    
    # Database path
    db_path = Path(__file__).parent / "car_collection.db"
    
    if not db_path.exists():
        print(f"❌ Database not found at {db_path}")
        return False
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(service_history)")
        columns = [col[1] for col in cursor.fetchall()]
        
        # Add shop column if it doesn't exist
        if 'shop' not in columns:
            print("Adding 'shop' column to service_history table...")
            cursor.execute("ALTER TABLE service_history ADD COLUMN shop VARCHAR")
            print("✅ Added 'shop' column")
        else:
            print("ℹ️  'shop' column already exists")
        
        # Add invoice_number column if it doesn't exist
        if 'invoice_number' not in columns:
            print("Adding 'invoice_number' column to service_history table...")
            cursor.execute("ALTER TABLE service_history ADD COLUMN invoice_number VARCHAR")
            print("✅ Added 'invoice_number' column")
        else:
            print("ℹ️  'invoice_number' column already exists")
        
        # Commit changes
        conn.commit()
        
        # Verify changes
        cursor.execute("PRAGMA table_info(service_history)")
        columns = [col[1] for col in cursor.fetchall()]
        print(f"\n📋 Current service_history columns: {', '.join(columns)}")
        
        conn.close()
        print("\n✅ Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

if __name__ == "__main__":
    migrate_database()