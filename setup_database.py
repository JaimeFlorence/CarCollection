#!/usr/bin/env python3
"""
Database Setup Script for Car Collection
Resets the database and sets up initial data for Jaime.
"""

import os
import sys
import sqlite3
import csv
from datetime import datetime
from pathlib import Path

# Add backend to path for imports
sys.path.append('backend')

from backend.app.database import engine, SessionLocal
from backend.app.models import Base, User, Car, ToDo
from backend.app.auth import get_password_hash

def clear_database():
    """Clear all data from the database."""
    print("🗑️  Clearing database...")
    
    # Drop all tables and recreate them
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    print("✅ Database cleared and recreated")

def create_jaime_account():
    """Create the jaime user account."""
    print("👤 Creating Jaime's account...")
    
    db = SessionLocal()
    try:
        # Check if jaime already exists
        existing_user = db.query(User).filter(User.username == "jaime").first()
        if existing_user:
            print("⚠️  Jaime account already exists, skipping creation")
            return existing_user
        
        # Create jaime user
        jaime_user = User(
            username="jaime",
            email="jaime@example.com",
            hashed_password=get_password_hash("testing1"),
            is_active=True,
            is_admin=True,  # Make jaime an admin
            email_verified=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        print(f"  Creating user with admin status: {jaime_user.is_admin}")
        
        db.add(jaime_user)
        db.commit()
        db.refresh(jaime_user)
        
        print(f"✅ Jaime account created: {jaime_user.username} (Admin: {jaime_user.is_admin})")
        return jaime_user
        
    except Exception as e:
        print(f"❌ Error creating Jaime account: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def import_cars_from_csv(user_id: int):
    """Import cars from CSV file."""
    print("🚗 Importing cars from CSV...")
    
    csv_path = Path("backend/data/cars.csv")
    if not csv_path.exists():
        print(f"❌ Cars CSV file not found: {csv_path}")
        return
    
    db = SessionLocal()
    try:
        with open(csv_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            cars_imported = 0
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
                
                # Create car object
                car = Car(
                    user_id=user_id,
                    make=row['make'],
                    model=row['model'],
                    year=int(row['year']) if row['year'] and row['year'].strip() else None,
                    mileage=int(row['mileage']) if row['mileage'] and row['mileage'].strip() else None,
                    license_plate=row['license_plate'] if row['license_plate'] and row['license_plate'].strip() else None,
                    insurance_info=row['insurance_info'] if row['insurance_info'] and row['insurance_info'].strip() else None,
                    notes=row['notes'] if row['notes'] and row['notes'].strip() else None,
                    group_name=group_name,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                
                db.add(car)
                cars_imported += 1
            
            db.commit()
            print(f"✅ Imported {cars_imported} cars")
            
    except Exception as e:
        print(f"❌ Error importing cars: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def import_todos_from_csv(user_id: int):
    """Import todos from CSV file."""
    print("📝 Importing todos from CSV...")
    
    csv_path = Path("backend/data/todos.csv")
    if not csv_path.exists():
        print(f"❌ Todos CSV file not found: {csv_path}")
        return
    
    db = SessionLocal()
    try:
        # First, get all cars for this user to map car_id
        user_cars = {car.id: car for car in db.query(Car).filter(Car.user_id == user_id).all()}
        
        with open(csv_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            todos_imported = 0
            for row in reader:
                # Skip if no car_id or car doesn't exist
                if not row.get('car_id') or not row.get('title'):
                    continue
                
                car_id = int(row['car_id'])
                if car_id not in user_cars:
                    print(f"⚠️  Skipping todo for car_id {car_id} (car not found)")
                    continue
                
                # Parse due_date if present
                due_date = None
                if row.get('due_date'):
                    try:
                        due_date = datetime.fromisoformat(row['due_date'].replace('Z', '+00:00'))
                    except:
                        pass
                
                # Parse resolved_at if present
                resolved_at = None
                if row.get('resolved_at'):
                    try:
                        resolved_at = datetime.fromisoformat(row['resolved_at'].replace('Z', '+00:00'))
                    except:
                        pass
                
                # Create todo object
                todo = ToDo(
                    user_id=user_id,
                    car_id=car_id,
                    title=row['title'],
                    description=row['description'] if row['description'] else None,
                    status=row['status'] if row['status'] else 'open',
                    priority=row['priority'] if row['priority'] else 'medium',
                    due_date=due_date,
                    created_at=datetime.utcnow(),
                    resolved_at=resolved_at
                )
                
                db.add(todo)
                todos_imported += 1
            
            db.commit()
            print(f"✅ Imported {todos_imported} todos")
            
    except Exception as e:
        print(f"❌ Error importing todos: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def verify_setup():
    """Verify the setup was successful."""
    print("\n🔍 Verifying setup...")
    
    db = SessionLocal()
    try:
        # Check user
        jaime = db.query(User).filter(User.username == "jaime").first()
        if not jaime:
            print("❌ Jaime user not found")
            return False
        print(f"✅ Jaime user verified: {jaime.username} (Admin: {jaime.is_admin})")
        
        # Check cars
        cars_count = db.query(Car).filter(Car.user_id == jaime.id).count()
        print(f"✅ Cars imported: {cars_count}")
        
        # Show group distribution
        from sqlalchemy import func
        groups = db.query(Car.group_name, func.count(Car.id)).filter(
            Car.user_id == jaime.id
        ).group_by(Car.group_name).all()
        
        print("📊 Cars by group:")
        for group_name, count in groups:
            group_display = group_name or 'Daily Drivers'
            print(f"  {group_display}: {count} cars")
        
        # Check todos
        todos_count = db.query(ToDo).filter(ToDo.user_id == jaime.id).count()
        print(f"✅ Todos imported: {todos_count}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error verifying setup: {e}")
        return False
    finally:
        db.close()

def main():
    """Main setup function."""
    print("🚗 Car Collection Database Setup")
    print("=" * 40)
    
    try:
        # Step 1: Clear database
        clear_database()
        
        # Step 2: Create jaime account
        jaime_user = create_jaime_account()
        
        # Step 3: Import cars
        import_cars_from_csv(jaime_user.id)
        
        # Step 4: Import todos
        import_todos_from_csv(jaime_user.id)
        
        # Step 5: Verify setup
        if verify_setup():
            print("\n" + "=" * 40)
            print("🎉 Setup completed successfully!")
            print("\n📋 Summary:")
            print("  ✅ Database cleared and recreated")
            print("  ✅ Jaime account created")
            print("  ✅ Cars imported from CSV")
            print("  ✅ Todos imported from CSV")
            print("\n🔑 Login credentials:")
            print("  Username: jaime")
            print("  Password: testing1")
            print("\n🌐 Access the application at: http://localhost:3000")
        else:
            print("\n❌ Setup verification failed")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 