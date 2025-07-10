#!/usr/bin/env python3
"""
Add group_name column to cars table for existing databases.
"""

import sqlite3
import sys
from pathlib import Path

def add_group_column():
    """Add group_name column to cars table if it doesn't exist."""
    db_path = Path("car_collection.db")
    
    if not db_path.exists():
        print("Database not found. Please run init_db.py first.")
        return
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(cars)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'group_name' in columns:
            print("Column 'group_name' already exists in cars table.")
            return
        
        # Add the column with a default value
        cursor.execute("""
            ALTER TABLE cars 
            ADD COLUMN group_name VARCHAR DEFAULT 'Daily Drivers'
        """)
        
        conn.commit()
        print("Successfully added 'group_name' column to cars table.")
        
    except sqlite3.Error as e:
        print(f"Error updating database: {e}")
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    add_group_column()