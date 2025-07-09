#!/usr/bin/env python3
"""
Import cars and todos directly using SQLite
"""

import sqlite3
import csv
from datetime import datetime
from pathlib import Path

def create_tables():
    """Create cars and todos tables if they don't exist."""
    print("🗄️  Creating tables...")
    
    conn = sqlite3.connect('backend/car_collection.db')
    cursor = conn.cursor()
    
    try:
        # Create cars table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS cars (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                make VARCHAR(100) NOT NULL,
                model VARCHAR(100) NOT NULL,
                year INTEGER,
                mileage INTEGER,
                license_plate VARCHAR(20),
                insurance_info TEXT,
                notes TEXT,
                group_name VARCHAR(100) DEFAULT 'Daily Drivers',
                created_at DATETIME,
                updated_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        # Create todos table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                car_id INTEGER NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                status VARCHAR(20) DEFAULT 'open',
                priority VARCHAR(20) DEFAULT 'medium',
                due_date DATETIME,
                created_at DATETIME,
                resolved_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (car_id) REFERENCES cars (id)
            )
        """)
        
        conn.commit()
        print("✅ Tables created successfully")
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        conn.rollback()
    finally:
        conn.close()

def get_user_id():
    """Get the user ID for jaime."""
    conn = sqlite3.connect('backend/car_collection.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT id FROM users WHERE username = 'jaime'")
        result = cursor.fetchone()
        if result:
            return result[0]
        else:
            print("❌ User 'jaime' not found")
            return None
    finally:
        conn.close()

def import_cars(user_id):
    """Import cars from CSV."""
    print(f"\n🚗 Importing cars for user {user_id}...")
    
    csv_path = Path("backend/data/cars.csv")
    if not csv_path.exists():
        print(f"❌ Cars CSV file not found: {csv_path}")
        return []
    
    conn = sqlite3.connect('backend/car_collection.db')
    cursor = conn.cursor()
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            cars_imported = 0
            car_ids = []
            
            for row in reader:
                # Skip rows with empty make/model
                if not row.get('make') or not row.get('model'):
                    continue
                
                # Determine group name based on car characteristics
                group_name = 'Daily Drivers'  # Default
                if row.get('group_name') and row['group_name'].strip():
                    group_name = row['group_name'].strip()
                else:
                    # Auto-assign based on car characteristics (year, make, etc.)
                    year = int(row['year']) if row['year'] and row['year'].strip() else 0
                    make = row['make'].lower() if row['make'] else ''
                    
                    # Classic/collector cars (older than 1990 or luxury brands)
                    luxury_brands = ['porsche', 'ferrari', 'lamborghini', 'aston martin', 'bentley', 'rolls-royce', 'mclaren']
                    if year < 1990 or any(brand in make for brand in luxury_brands):
                        group_name = 'Collector Cars'
                
                # Insert car
                cursor.execute("""
                    INSERT INTO cars (user_id, make, model, year, mileage, license_plate, insurance_info, notes, group_name, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    user_id,
                    row['make'],
                    row['model'],
                    int(row['year']) if row['year'] and row['year'].strip() else None,
                    int(row['mileage']) if row['mileage'] and row['mileage'].strip() else None,
                    row['license_plate'] if row['license_plate'] and row['license_plate'].strip() else None,
                    row['insurance_info'] if row['insurance_info'] and row['insurance_info'].strip() else None,
                    row['notes'] if row['notes'] and row['notes'].strip() else None,
                    group_name,
                    datetime.utcnow().isoformat(),
                    datetime.utcnow().isoformat()
                ))
                
                car_id = cursor.lastrowid
                car_ids.append(car_id)
                cars_imported += 1
            
            conn.commit()
            print(f"✅ Imported {cars_imported} cars")
            return car_ids
            
    except Exception as e:
        print(f"❌ Error importing cars: {e}")
        conn.rollback()
        return []
    finally:
        conn.close()

def import_todos(user_id, car_ids):
    """Import todos from CSV."""
    print(f"\n📝 Importing todos for user {user_id}...")
    
    csv_path = Path("backend/data/todos.csv")
    if not csv_path.exists():
        print(f"❌ Todos CSV file not found: {csv_path}")
        return
    
    conn = sqlite3.connect('backend/car_collection.db')
    cursor = conn.cursor()
    
    try:
        # Create a mapping from old car_id to new car_id
        # Since we're importing cars in order, we can map 1->1, 2->2, etc.
        car_mapping = {}
        for i, car_id in enumerate(car_ids, 1):
            car_mapping[i] = car_id
        
        with open(csv_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            todos_imported = 0
            
            for row in reader:
                # Skip if no car_id or car doesn't exist
                if not row.get('car_id') or not row.get('title'):
                    continue
                
                old_car_id = int(row['car_id'])
                if old_car_id not in car_mapping:
                    print(f"⚠️  Skipping todo for car_id {old_car_id} (car not found)")
                    continue
                
                new_car_id = car_mapping[old_car_id]
                
                # Parse due_date if present
                due_date = None
                if row.get('due_date'):
                    try:
                        due_date = datetime.fromisoformat(row['due_date'].replace('Z', '+00:00')).isoformat()
                    except:
                        pass
                
                # Parse resolved_at if present
                resolved_at = None
                if row.get('resolved_at'):
                    try:
                        resolved_at = datetime.fromisoformat(row['resolved_at'].replace('Z', '+00:00')).isoformat()
                    except:
                        pass
                
                # Insert todo
                cursor.execute("""
                    INSERT INTO todos (user_id, car_id, title, description, status, priority, due_date, created_at, resolved_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    user_id,
                    new_car_id,
                    row['title'],
                    row['description'] if row['description'] and row['description'].strip() else None,
                    row['status'] if row['status'] and row['status'].strip() else 'open',
                    row['priority'] if row['priority'] and row['priority'].strip() else 'medium',
                    due_date,
                    datetime.utcnow().isoformat(),
                    resolved_at
                ))
                
                todos_imported += 1
            
            conn.commit()
            print(f"✅ Imported {todos_imported} todos")
            
    except Exception as e:
        print(f"❌ Error importing todos: {e}")
        conn.rollback()
    finally:
        conn.close()

def verify_import():
    """Verify the import was successful."""
    print("\n🔍 Verifying import...")
    
    conn = sqlite3.connect('backend/car_collection.db')
    cursor = conn.cursor()
    
    try:
        # Count cars
        cursor.execute("SELECT COUNT(*) FROM cars WHERE user_id = (SELECT id FROM users WHERE username = 'jaime')")
        car_count = cursor.fetchone()[0]
        print(f"✅ Cars in database: {car_count}")
        
        # Count todos
        cursor.execute("SELECT COUNT(*) FROM todos WHERE user_id = (SELECT id FROM users WHERE username = 'jaime')")
        todo_count = cursor.fetchone()[0]
        print(f"✅ Todos in database: {todo_count}")
        
        # Show sample cars with groups
        cursor.execute("""
            SELECT make, model, year, mileage, group_name FROM cars 
            WHERE user_id = (SELECT id FROM users WHERE username = 'jaime')
            LIMIT 5
        """)
        cars = cursor.fetchall()
        print("\n📋 Sample cars:")
        for i, car in enumerate(cars, 1):
            group_name = car[4] or 'Daily Drivers'
            print(f"  {i}. {car[2]} {car[0]} {car[1]} ({car[3]:,} miles) - {group_name}")
            
        # Show group distribution
        cursor.execute("""
            SELECT group_name, COUNT(*) FROM cars 
            WHERE user_id = (SELECT id FROM users WHERE username = 'jaime')
            GROUP BY group_name
        """)
        groups = cursor.fetchall()
        print("\n📊 Cars by group:")
        for group_name, count in groups:
            group_display = group_name or 'Daily Drivers'
            print(f"  {group_display}: {count} cars")
        
        return car_count > 0 and todo_count > 0
        
    except Exception as e:
        print(f"❌ Error verifying import: {e}")
        return False
    finally:
        conn.close()

def main():
    """Main function."""
    print("📦 Importing Cars and Todos with SQLite")
    print("=" * 50)
    
    # Create tables
    create_tables()
    
    # Get user ID
    user_id = get_user_id()
    if not user_id:
        print("❌ Cannot proceed without user ID")
        return
    
    # Import cars
    car_ids = import_cars(user_id)
    if not car_ids:
        print("❌ No cars imported")
        return
    
    # Import todos
    import_todos(user_id, car_ids)
    
    # Verify import
    if verify_import():
        print("\n🎉 SUCCESS! Data import completed!")
        print("\n🔑 You can now login at: http://localhost:3000")
        print("   Username: jaime")
        print("   Password: testing1")
    else:
        print("\n❌ Import verification failed")

if __name__ == "__main__":
    main() 