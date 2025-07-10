#!/usr/bin/env python3
"""
Database Migration: Add Service Intervals Tables

This script adds the service intervals, service history, and related tables
to the existing database schema.
"""

import sqlite3
from pathlib import Path
import sys

def add_service_intervals_tables():
    """Add service intervals tables to the database"""
    
    db_path = Path("../backend/car_collection.db")
    if not db_path.exists():
        print("❌ Database file not found. Run the backend server first to create it.")
        return False
    
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        print("🔧 Adding service intervals tables...")
        
        # Create service_intervals table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS service_intervals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                car_id INTEGER NOT NULL,
                service_item VARCHAR(100) NOT NULL,
                interval_miles INTEGER,
                interval_months INTEGER,
                priority VARCHAR(20) DEFAULT 'medium',
                cost_estimate_low DECIMAL(10,2),
                cost_estimate_high DECIMAL(10,2),
                notes TEXT,
                source VARCHAR(100),
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (car_id) REFERENCES cars(id)
            )
        """)
        
        # Create service_history table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS service_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                car_id INTEGER NOT NULL,
                service_item VARCHAR(100) NOT NULL,
                performed_date DATETIME NOT NULL,
                mileage INTEGER,
                cost DECIMAL(10,2),
                notes TEXT,
                next_due_date DATETIME,
                next_due_mileage INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (car_id) REFERENCES cars(id)
            )
        """)
        
        # Create service_interval_templates table (global templates)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS service_interval_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                make VARCHAR(50) NOT NULL,
                model VARCHAR(50) NOT NULL,
                year_start INTEGER,
                year_end INTEGER,
                engine_type VARCHAR(50),
                service_item VARCHAR(100) NOT NULL,
                interval_miles INTEGER,
                interval_months INTEGER,
                priority VARCHAR(20) DEFAULT 'medium',
                cost_estimate_low DECIMAL(10,2),
                cost_estimate_high DECIMAL(10,2),
                source VARCHAR(100),
                confidence_score INTEGER DEFAULT 5,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create service_research_log table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS service_research_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                make VARCHAR(50) NOT NULL,
                model VARCHAR(50) NOT NULL,
                year INTEGER NOT NULL,
                research_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                sources_checked TEXT,
                intervals_found INTEGER DEFAULT 0,
                success_rate DECIMAL(5,2),
                errors TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes for performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_service_intervals_car_id 
            ON service_intervals(car_id)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_service_intervals_user_id 
            ON service_intervals(user_id)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_service_history_car_id 
            ON service_history(car_id)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_service_templates_make_model_year 
            ON service_interval_templates(make, model, year_start, year_end)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_service_research_make_model_year 
            ON service_research_log(make, model, year)
        """)
        
        conn.commit()
        print("✅ Service intervals tables created successfully")
        
        # Show table info
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'service%'")
        tables = cursor.fetchall()
        print(f"\n📊 Service tables created: {len(tables)}")
        for table in tables:
            print(f"  - {table[0]}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False
    finally:
        conn.close()

def main():
    """Main migration function"""
    print("🚗 Car Collection Service Intervals Migration")
    print("=" * 50)
    
    success = add_service_intervals_tables()
    
    if success:
        print("\n✅ Migration completed successfully!")
        print("\n🔄 Next steps:")
        print("  1. Restart the backend server")
        print("  2. Test the new service intervals API endpoints")
        print("  3. Add service research functionality")
    else:
        print("\n❌ Migration failed")
        sys.exit(1)

if __name__ == "__main__":
    main()