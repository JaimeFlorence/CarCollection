#!/usr/bin/env python3
"""
Export all data from the Car Collection database to CSV files.

This script exports:
- Cars to data/cars.csv
- ToDos to data/todos.csv  
- Service Intervals (schedules) to data/schedules.csv
- Service History to data/history.csv
"""

import sqlite3
import csv
import os
from datetime import datetime

def ensure_data_directory():
    """Create data directory if it doesn't exist."""
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
        print(f"Created directory: {data_dir}")
    return data_dir

def export_cars(conn, data_dir):
    """Export cars table to CSV."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            id, user_id, year, make, model, vin, 
            mileage, license_plate, insurance_info, 
            notes, group_name, created_at, updated_at
        FROM cars
        ORDER BY id
    """)
    
    cars = cursor.fetchall()
    columns = [desc[0] for desc in cursor.description]
    
    csv_path = os.path.join(data_dir, 'cars.csv')
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(columns)
        writer.writerows(cars)
    
    print(f"✓ Exported {len(cars)} cars to {csv_path}")
    return len(cars)

def export_todos(conn, data_dir):
    """Export todos table to CSV."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            id, user_id, car_id, title, description, 
            status, priority, due_date, created_at, resolved_at
        FROM todos
        ORDER BY id
    """)
    
    todos = cursor.fetchall()
    columns = [desc[0] for desc in cursor.description]
    
    csv_path = os.path.join(data_dir, 'todos.csv')
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(columns)
        writer.writerows(todos)
    
    print(f"✓ Exported {len(todos)} todos to {csv_path}")
    return len(todos)

def export_service_intervals(conn, data_dir):
    """Export service intervals (schedules) to CSV."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            id, user_id, car_id, service_item, interval_miles, 
            interval_months, priority, cost_estimate_low, 
            cost_estimate_high, notes, source, is_active, 
            created_at, updated_at
        FROM service_intervals
        ORDER BY car_id, id
    """)
    
    intervals = cursor.fetchall()
    columns = [desc[0] for desc in cursor.description]
    
    csv_path = os.path.join(data_dir, 'schedules.csv')
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(columns)
        writer.writerows(intervals)
    
    print(f"✓ Exported {len(intervals)} service intervals to {csv_path}")
    return len(intervals)

def export_service_history(conn, data_dir):
    """Export service history to CSV."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            id, user_id, car_id, service_item, performed_date,
            mileage, cost, shop, invoice_number, notes,
            next_due_date, next_due_mileage, created_at
        FROM service_history
        ORDER BY car_id, performed_date DESC
    """)
    
    history = cursor.fetchall()
    columns = [desc[0] for desc in cursor.description]
    
    csv_path = os.path.join(data_dir, 'history.csv')
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(columns)
        writer.writerows(history)
    
    print(f"✓ Exported {len(history)} service history records to {csv_path}")
    return len(history)

def main():
    """Main export function."""
    print("Car Collection Data Export")
    print("=" * 50)
    
    # Connect to database
    db_path = os.path.join(os.path.dirname(__file__), 'car_collection.db')
    if not os.path.exists(db_path):
        print(f"ERROR: Database not found at {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    
    # Ensure data directory exists
    data_dir = ensure_data_directory()
    
    # Export all data
    try:
        print(f"\nStarting export at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("-" * 50)
        
        cars_count = export_cars(conn, data_dir)
        todos_count = export_todos(conn, data_dir)
        intervals_count = export_service_intervals(conn, data_dir)
        history_count = export_service_history(conn, data_dir)
        
        print("-" * 50)
        print(f"\nExport Summary:")
        print(f"  Cars:             {cars_count}")
        print(f"  ToDos:            {todos_count}")
        print(f"  Service Intervals: {intervals_count}")
        print(f"  Service History:   {history_count}")
        print(f"\nAll data exported to: {data_dir}/")
        
    except Exception as e:
        print(f"\nERROR during export: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == "__main__":
    main()