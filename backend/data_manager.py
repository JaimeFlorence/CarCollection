#!/usr/bin/env python3
"""
Data Export/Import Manager for Car Collection Database

This module provides functionality to:
1. Export database data to CSV files
2. Import data from CSV files back to the database
3. Clear existing data for clean imports
4. Validate data before import

Usage:
    python data_manager.py export    # Export all data to CSV files
    python data_manager.py import    # Import data from CSV files
    python data_manager.py clear     # Clear all data from database
    python data_manager.py validate  # Validate CSV files without importing
"""

import sys
import os
import csv
import json
from datetime import datetime, UTC
from typing import List, Dict, Any, Optional
import argparse

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.database import SessionLocal, engine
from app.models import Car, ToDo
from app.schemas import CarCreate, ToDoCreate
from app import models

# Ensure tables exist
models.Base.metadata.create_all(bind=engine)

class DataManager:
    """Manages data export/import operations for the Car Collection database."""
    
    def __init__(self):
        self.db = SessionLocal()
        self.data_dir = "data"
        self.ensure_data_directory()
    
    def ensure_data_directory(self):
        """Create the data directory if it doesn't exist."""
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)
            print(f"✅ Created data directory: {self.data_dir}")
    
    def export_data(self):
        """Export all data from the database to CSV files."""
        print("🔄 Exporting data from database...")
        
        # Export cars
        cars = self.db.query(Car).all()
        cars_file = os.path.join(self.data_dir, "cars.csv")
        
        with open(cars_file, 'w', newline='', encoding='utf-8') as csvfile:
            if cars:
                fieldnames = [
                    'id', 'year', 'make', 'model', 'vin', 'mileage', 
                    'license_plate', 'insurance_info', 'notes', 
                    'created_at', 'updated_at'
                ]
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                
                for car in cars:
                    writer.writerow({
                        'id': car.id,
                        'year': car.year,
                        'make': car.make,
                        'model': car.model,
                        'vin': car.vin or '',
                        'mileage': car.mileage or 0,
                        'license_plate': car.license_plate or '',
                        'insurance_info': car.insurance_info or '',
                        'notes': car.notes or '',
                        'created_at': car.created_at.isoformat() if car.created_at else '',
                        'updated_at': car.updated_at.isoformat() if car.updated_at else ''
                    })
        
        print(f"✅ Exported {len(cars)} cars to {cars_file}")
        
        # Export todos
        todos = self.db.query(ToDo).all()
        todos_file = os.path.join(self.data_dir, "todos.csv")
        
        with open(todos_file, 'w', newline='', encoding='utf-8') as csvfile:
            if todos:
                fieldnames = [
                    'id', 'car_id', 'title', 'description', 'status', 
                    'priority', 'due_date', 'created_at', 'resolved_at'
                ]
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                
                for todo in todos:
                    writer.writerow({
                        'id': todo.id,
                        'car_id': todo.car_id,
                        'title': todo.title,
                        'description': todo.description or '',
                        'status': todo.status,
                        'priority': todo.priority,
                        'due_date': todo.due_date.isoformat() if todo.due_date else '',
                        'created_at': todo.created_at.isoformat() if todo.created_at else '',
                        'resolved_at': todo.resolved_at.isoformat() if todo.resolved_at else ''
                    })
        
        print(f"✅ Exported {len(todos)} todos to {todos_file}")
        
        # Create metadata file
        metadata = {
            'export_date': datetime.now(UTC).isoformat(),
            'cars_count': len(cars),
            'todos_count': len(todos),
            'schema_version': '1.0',
            'notes': 'Car Collection Database Export'
        }
        
        metadata_file = os.path.join(self.data_dir, "metadata.json")
        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"✅ Created metadata file: {metadata_file}")
        print("🎉 Data export completed successfully!")
    
    def clear_data(self):
        """Clear all data from the database."""
        print("🗑️ Clearing all data from database...")
        
        try:
            # Delete todos first (due to foreign key constraint)
            todos_deleted = self.db.query(ToDo).delete()
            print(f"✅ Deleted {todos_deleted} todos")
            
            # Delete cars
            cars_deleted = self.db.query(Car).delete()
            print(f"✅ Deleted {cars_deleted} cars")
            
            self.db.commit()
            print("🎉 Database cleared successfully!")
            
        except Exception as e:
            self.db.rollback()
            print(f"❌ Error clearing database: {e}")
            raise
    
    def validate_csv_files(self) -> bool:
        """Validate CSV files before import."""
        print("🔍 Validating CSV files...")
        
        cars_file = os.path.join(self.data_dir, "cars.csv")
        todos_file = os.path.join(self.data_dir, "todos.csv")
        
        if not os.path.exists(cars_file):
            print(f"❌ Cars file not found: {cars_file}")
            return False
        
        if not os.path.exists(todos_file):
            print(f"❌ Todos file not found: {todos_file}")
            return False
        
        # Validate cars CSV
        try:
            with open(cars_file, 'r', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                cars_data = list(reader)
                
                required_fields = ['year', 'make', 'model']
                for i, row in enumerate(cars_data, 1):
                    for field in required_fields:
                        if not row.get(field):
                            print(f"❌ Car row {i}: Missing required field '{field}'")
                            return False
                    
                    # Validate year
                    try:
                        year = int(row['year'])
                        if year < 1900 or year > datetime.now().year + 1:
                            print(f"❌ Car row {i}: Invalid year {year}")
                            return False
                    except ValueError:
                        print(f"❌ Car row {i}: Invalid year format")
                        return False
                
                print(f"✅ Validated {len(cars_data)} car records")
        
        except Exception as e:
            print(f"❌ Error validating cars CSV: {e}")
            return False
        
        # Validate todos CSV
        try:
            with open(todos_file, 'r', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                todos_data = list(reader)
                
                required_fields = ['car_id', 'title']
                valid_priorities = ['low', 'medium', 'high']
                valid_statuses = ['open', 'resolved']
                
                for i, row in enumerate(todos_data, 1):
                    for field in required_fields:
                        if not row.get(field):
                            print(f"❌ Todo row {i}: Missing required field '{field}'")
                            return False
                    
                    # Validate car_id
                    try:
                        car_id = int(row['car_id'])
                        if car_id <= 0:
                            print(f"❌ Todo row {i}: Invalid car_id {car_id}")
                            return False
                    except ValueError:
                        print(f"❌ Todo row {i}: Invalid car_id format")
                        return False
                    
                    # Validate priority
                    priority = row.get('priority', 'medium')
                    if priority not in valid_priorities:
                        print(f"❌ Todo row {i}: Invalid priority '{priority}'")
                        return False
                    
                    # Validate status
                    status = row.get('status', 'open')
                    if status not in valid_statuses:
                        print(f"❌ Todo row {i}: Invalid status '{status}'")
                        return False
                
                print(f"✅ Validated {len(todos_data)} todo records")
        
        except Exception as e:
            print(f"❌ Error validating todos CSV: {e}")
            return False
        
        print("🎉 CSV validation completed successfully!")
        return True
    
    def import_data(self, clear_existing: bool = True):
        """Import data from CSV files to the database."""
        print("🔄 Importing data from CSV files...")
        
        # Validate files first
        if not self.validate_csv_files():
            print("❌ CSV validation failed. Aborting import.")
            return False
        
        try:
            # Clear existing data if requested
            if clear_existing:
                self.clear_data()
            
            # Import cars
            cars_file = os.path.join(self.data_dir, "cars.csv")
            cars_imported = 0
            
            with open(cars_file, 'r', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    car_data = {
                        'year': int(row['year']),
                        'make': row['make'],
                        'model': row['model'],
                        'vin': row['vin'] if row['vin'] else None,
                        'mileage': int(row['mileage']) if row['mileage'] else None,
                        'license_plate': row['license_plate'] if row['license_plate'] else None,
                        'insurance_info': row['insurance_info'] if row['insurance_info'] else None,
                        'notes': row['notes'] if row['notes'] else None,
                    }
                    
                    car = Car(**car_data)
                    self.db.add(car)
                    cars_imported += 1
            
            self.db.commit()
            print(f"✅ Imported {cars_imported} cars")
            
            # Import todos
            todos_file = os.path.join(self.data_dir, "todos.csv")
            todos_imported = 0
            
            with open(todos_file, 'r', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    todo_data = {
                        'car_id': int(row['car_id']),
                        'title': row['title'],
                        'description': row['description'] if row['description'] else None,
                        'status': row['status'],
                        'priority': row['priority'],
                        'due_date': datetime.fromisoformat(row['due_date']) if row['due_date'] else None,
                    }
                    
                    todo = ToDo(**todo_data)
                    self.db.add(todo)
                    todos_imported += 1
            
            self.db.commit()
            print(f"✅ Imported {todos_imported} todos")
            
            print("🎉 Data import completed successfully!")
            return True
            
        except Exception as e:
            self.db.rollback()
            print(f"❌ Error importing data: {e}")
            return False
    
    def __del__(self):
        """Clean up database connection."""
        if hasattr(self, 'db'):
            self.db.close()

def main():
    """Main function to handle command line arguments."""
    parser = argparse.ArgumentParser(description='Car Collection Data Manager')
    parser.add_argument('action', choices=['export', 'import', 'clear', 'validate'], 
                       help='Action to perform')
    parser.add_argument('--no-clear', action='store_true', 
                       help='Skip clearing existing data during import')
    
    args = parser.parse_args()
    
    manager = DataManager()
    
    try:
        if args.action == 'export':
            manager.export_data()
        elif args.action == 'import':
            manager.import_data(clear_existing=not args.no_clear)
        elif args.action == 'clear':
            manager.clear_data()
        elif args.action == 'validate':
            manager.validate_csv_files()
    
    except KeyboardInterrupt:
        print("\n⚠️ Operation cancelled by user")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 