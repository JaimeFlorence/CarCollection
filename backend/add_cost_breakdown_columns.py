#!/usr/bin/env python3
"""
Migration script to add cost breakdown columns to service_history table.
Run this from the backend directory with the virtual environment activated.
"""

import sqlite3
import sys
from pathlib import Path

def add_cost_breakdown_columns():
    """Add parts_cost, labor_cost, and tax columns to service_history table."""
    
    # Find the database file
    db_path = Path("car_collection.db")
    if not db_path.exists():
        print("Error: car_collection.db not found in current directory")
        print("Please run this script from the backend directory")
        return False
    
    try:
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(service_history)")
        columns = [column[1] for column in cursor.fetchall()]
        
        columns_to_add = []
        if 'parts_cost' not in columns:
            columns_to_add.append("parts_cost")
        if 'labor_cost' not in columns:
            columns_to_add.append("labor_cost")
        if 'tax' not in columns:
            columns_to_add.append("tax")
        
        if not columns_to_add:
            print("All cost breakdown columns already exist in service_history table")
            return True
        
        # Add the missing columns
        for column in columns_to_add:
            print(f"Adding {column} column to service_history table...")
            cursor.execute(f"ALTER TABLE service_history ADD COLUMN {column} NUMERIC(10, 2)")
            print(f"✓ Added {column} column")
        
        # Commit the changes
        conn.commit()
        print("\n✅ Successfully added cost breakdown columns to service_history table")
        
        # Show the updated table structure
        cursor.execute("PRAGMA table_info(service_history)")
        columns_info = cursor.fetchall()
        print("\nUpdated service_history table structure:")
        for col in columns_info:
            print(f"  - {col[1]} ({col[2]})")
        
        return True
        
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    print("Service History Cost Breakdown Migration")
    print("======================================")
    
    if add_cost_breakdown_columns():
        print("\n✅ Migration completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Migration failed!")
        sys.exit(1)