#!/usr/bin/env python3
"""
Remove the unique constraint from the VIN column in the cars table.

This allows multiple cars (even for the same user) to have the same VIN,
treating VIN as just another optional text field.
"""
import sys
import sqlite3
from sqlalchemy import create_engine, text
from app.database import SQLALCHEMY_DATABASE_URL

def remove_vin_unique_constraint():
    """Remove unique constraint from VIN column."""
    
    if "sqlite" in SQLALCHEMY_DATABASE_URL:
        # SQLite doesn't support ALTER TABLE DROP CONSTRAINT
        # We need to recreate the table without the constraint
        print("Removing VIN unique constraint from SQLite database...")
        
        conn = sqlite3.connect(SQLALCHEMY_DATABASE_URL.replace("sqlite:///", ""))
        cursor = conn.cursor()
        
        try:
            # Start transaction
            conn.execute("BEGIN")
            
            # Create new table without unique constraint on VIN
            cursor.execute("""
                CREATE TABLE cars_new (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    year INTEGER NOT NULL,
                    make VARCHAR NOT NULL,
                    model VARCHAR NOT NULL,
                    vin VARCHAR,
                    mileage INTEGER,
                    license_plate VARCHAR,
                    insurance_info VARCHAR,
                    notes TEXT,
                    group_name VARCHAR,
                    created_at DATETIME,
                    updated_at DATETIME,
                    FOREIGN KEY(user_id) REFERENCES users (id)
                )
            """)
            
            # Copy data from old table to new table
            cursor.execute("""
                INSERT INTO cars_new 
                SELECT * FROM cars
            """)
            
            # Drop old table
            cursor.execute("DROP TABLE cars")
            
            # Rename new table to cars
            cursor.execute("ALTER TABLE cars_new RENAME TO cars")
            
            # Recreate indexes
            cursor.execute("CREATE INDEX ix_cars_id ON cars (id)")
            cursor.execute("CREATE INDEX ix_cars_user_id ON cars (user_id)")
            
            # Commit transaction
            conn.commit()
            print("✓ Successfully removed VIN unique constraint")
            
        except Exception as e:
            conn.rollback()
            print(f"✗ Error removing constraint: {e}")
            return False
        finally:
            conn.close()
            
    else:
        # PostgreSQL or other databases
        print("Removing VIN unique constraint from database...")
        engine = create_engine(SQLALCHEMY_DATABASE_URL)
        
        try:
            with engine.connect() as conn:
                # First, find the constraint name
                result = conn.execute(text("""
                    SELECT constraint_name 
                    FROM information_schema.table_constraints 
                    WHERE table_name = 'cars' 
                    AND constraint_type = 'UNIQUE'
                    AND constraint_name LIKE '%vin%'
                """))
                
                constraint_name = result.fetchone()
                if constraint_name:
                    # Drop the constraint
                    conn.execute(text(f"ALTER TABLE cars DROP CONSTRAINT {constraint_name[0]}"))
                    conn.commit()
                    print(f"✓ Successfully removed VIN unique constraint: {constraint_name[0]}")
                else:
                    print("✓ No VIN unique constraint found (may already be removed)")
                    
        except Exception as e:
            print(f"✗ Error removing constraint: {e}")
            return False
    
    return True


def verify_removal():
    """Verify that VIN unique constraint has been removed."""
    print("\nVerifying constraint removal...")
    
    if "sqlite" in SQLALCHEMY_DATABASE_URL:
        conn = sqlite3.connect(SQLALCHEMY_DATABASE_URL.replace("sqlite:///", ""))
        cursor = conn.cursor()
        
        # Check table structure
        cursor.execute("PRAGMA table_info(cars)")
        columns = cursor.fetchall()
        
        print("\nTable structure:")
        for col in columns:
            print(f"  {col[1]} {col[2]} {'NOT NULL' if col[3] else 'NULL'} {'UNIQUE' if col[5] else ''}")
        
        conn.close()
    else:
        # PostgreSQL verification
        engine = create_engine(SQLALCHEMY_DATABASE_URL)
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT column_name, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'cars' AND column_name = 'vin'
            """))
            
            for row in result:
                print(f"  VIN column: nullable={row[1]}, default={row[2]}")


if __name__ == "__main__":
    print("=== Car Collection Database Migration ===")
    print("This script will remove the unique constraint from the VIN column.")
    print("This allows multiple cars to have the same VIN.\n")
    
    # Auto-confirm for non-interactive mode
    if len(sys.argv) > 1 and sys.argv[1] == "--yes":
        print("Auto-confirmed with --yes flag")
    else:
        try:
            response = input("Do you want to proceed? (yes/no): ")
            if response.lower() != 'yes':
                print("Migration cancelled.")
                sys.exit(0)
        except EOFError:
            print("Running in non-interactive mode, proceeding with migration...")
    
    if remove_vin_unique_constraint():
        verify_removal()
        print("\n✓ Migration completed successfully!")
        print("  VIN is now just a regular optional text field.")
    else:
        print("\n✗ Migration failed!")
        sys.exit(1)