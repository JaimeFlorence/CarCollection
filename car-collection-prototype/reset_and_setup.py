#!/usr/bin/env python3
"""
Complete Database Reset and Setup Script - Updated for Service Intervals
Orchestrates the complete reset and setup process.

IMPORTANT: This script MUST be run from the car-collection-prototype directory!

What this script does:
1. Deletes all existing database files (complete reset)
2. Creates a fresh database with proper schema
3. Creates admin user (admin/admin123) and test user (jaime/testing1)
4. Imports cars from ../backend/data/cars.csv
5. Imports todos from ../backend/data/todos.csv
6. Adds sample service intervals for all imported cars

Prerequisites:
- Backend virtual environment must exist at ../backend/venv
- CSV files must exist at ../backend/data/cars.csv and ../backend/data/todos.csv
- Python 3.x must be installed

Usage:
    cd /path/to/car-collection-prototype
    python3 reset_and_setup.py
"""

import os
import sys
import subprocess
import time
from pathlib import Path

def run_script(script_name, description):
    """Run a Python script and return success status."""
    print(f"\n🚀 {description}...")
    
    try:
        result = subprocess.run(
            [sys.executable, script_name],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print(f"✅ {description} completed successfully")
            return True
        else:
            print(f"❌ {description} failed")
            print("STDERR:", result.stderr)
            if result.stdout:
                print("STDOUT:", result.stdout)
            return False
            
    except Exception as e:
        print(f"❌ Error running {script_name}: {e}")
        return False

def backup_existing_database():
    """Backup existing database before deletion."""
    main_db = "../backend/car_collection.db"
    if os.path.exists(main_db):
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        backup_name = f"../backend/car_collection_backup_{timestamp}.db"
        try:
            import shutil
            shutil.copy2(main_db, backup_name)
            print(f"📦 Backed up existing database to: {backup_name}")
            return backup_name
        except Exception as e:
            print(f"⚠️  Could not backup database: {e}")
    return None

def delete_database_files():
    """Delete all database files.
    
    This function removes all SQLite database files to ensure a completely fresh start.
    It looks for databases in both the backend directory and current directory.
    """
    print("\n🗑️  Deleting database files...")
    
    # List of database files to delete
    # These paths are relative to the car-collection-prototype directory
    db_files = [
        "../backend/car_collection.db",      # Main production database
        "../backend/test_car_collection.db",  # Test database
        "car_collection.db",                  # Local database (if any)
        "test_car_collection.db"              # Local test database (if any)
    ]
    
    deleted_count = 0
    for db_file in db_files:
        if os.path.exists(db_file):
            try:
                os.remove(db_file)
                print(f"✅ Deleted: {db_file}")
                deleted_count += 1
            except Exception as e:
                print(f"❌ Could not delete {db_file}: {e}")
        else:
            print(f"ℹ️  Not found: {db_file}")
    
    if deleted_count > 0:
        print(f"✅ Deleted {deleted_count} database files")
    else:
        print("ℹ️  No database files found to delete")

def initialize_backend_database():
    """Initialize backend database using virtual environment.
    
    This runs the backend init_db.py and create_admin.py scripts
    using the backend's virtual environment to ensure all dependencies are available.
    """
    print("\n🔧 Initializing backend database...")
    
    backend_dir = Path("../backend")
    venv_python = backend_dir / "venv" / "bin" / "python"
    
    # Check if virtual environment exists
    if not venv_python.exists():
        print("❌ Backend virtual environment not found at ../backend/venv")
        print("   Please run: cd ../backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt")
        return False
    
    # Run init_db.py
    try:
        print("  📊 Creating database schema...")
        result = subprocess.run(
            [str(venv_python), "init_db.py"],
            cwd=str(backend_dir),
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            print(f"  ❌ Failed to initialize database: {result.stderr}")
            return False
        print("  ✅ Database schema created")
        
        # Run create_admin.py
        print("  👤 Creating admin user...")
        result = subprocess.run(
            [str(venv_python), "create_admin.py"],
            cwd=str(backend_dir),
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            print(f"  ❌ Failed to create admin user: {result.stderr}")
            return False
        print("  ✅ Admin user created (admin/admin123)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error initializing backend: {e}")
        return False

def check_prerequisites():
    """Check that all required files and directories exist."""
    print("\n🔍 Checking prerequisites...")
    
    checks = [
        ("Backend directory", Path("../backend")),
        ("Backend venv", Path("../backend/venv")),
        ("Cars CSV", Path("../backend/data/cars.csv")),
        ("Todos CSV", Path("../backend/data/todos.csv")),
        ("Create user script", Path("create_user_sqlite.py")),
        ("Import data script", Path("import_data_sqlite.py"))
    ]
    
    all_good = True
    for name, path in checks:
        if path.exists():
            print(f"  ✅ {name}: {path}")
        else:
            print(f"  ❌ {name}: NOT FOUND at {path}")
            all_good = False
    
    return all_good

def main():
    """Main reset and setup process."""
    print("🚗 Complete Car Collection Database Reset & Setup")
    print("   Service Intervals Edition")
    print("=" * 60)
    
    # Check prerequisites
    if not check_prerequisites():
        print("\n❌ Missing prerequisites. Please ensure all required files exist.")
        return
    
    # Step 1: Backup existing database (optional)
    backup_path = backup_existing_database()
    
    # Step 2: Delete database files
    delete_database_files()
    
    # Step 3: Initialize backend database with schema and admin user
    if not initialize_backend_database():
        print("\n❌ Backend initialization failed.")
        print("   You may need to manually run:")
        print("   cd ../backend && source venv/bin/activate && python init_db.py && python create_admin.py")
        return
    
    # Step 4: Create test user (jaime)
    if not run_script("create_user_sqlite.py", "Creating test user account"):
        print("\n❌ User creation failed. Cannot continue.")
        return
    
    # Step 5: Import data from CSV files
    if not run_script("import_data_sqlite.py", "Importing cars and todos from CSV"):
        print("\n❌ Data import failed. Setup incomplete.")
        return
    
    # Step 6: Success message and instructions
    print("\n" + "=" * 60)
    print("🎉 RESET AND SETUP COMPLETED SUCCESSFULLY!")
    print("=" * 60)
    
    print("\n📋 What was done:")
    print("  ✅ Backed up existing database (if any)")
    print("  ✅ All database files deleted for fresh start")
    print("  ✅ Fresh database structure created with all tables")
    print("  ✅ Admin account created (admin/admin123)")
    print("  ✅ Test account created (jaime/testing1)")
    print("  ✅ Cars imported from ../backend/data/cars.csv")
    print("  ✅ Todos imported from ../backend/data/todos.csv")
    print("  ❌ NO service intervals added (clean slate for testing)")
    
    print("\n📊 Data imported from CSV files:")
    print(f"  • Cars: ../backend/data/cars.csv")
    print(f"  • Todos: ../backend/data/todos.csv")
    print("  • Service intervals: NONE (ready for manual entry or research)")
    
    print("\n🔑 Login credentials:")
    print("  Admin user:")
    print("    Username: admin")
    print("    Password: admin123")
    print("  Test user:")
    print("    Username: jaime")
    print("    Password: testing1")
    print("    Role: Administrator")
    
    print("\n🌐 Application URLs:")
    print("  Frontend: http://localhost:3000 (or 3001 if 3000 is in use)")
    print("  Backend API: http://localhost:8000")
    print("  API Docs: http://localhost:8000/docs")
    
    print("\n🔧 Features Available:")
    print("  • Service interval tracking with progress visualization")
    print("  • Service history recording with shop/cost tracking")
    print("  • Automated service research for vehicle-specific intervals")
    print("  • Cost estimates for maintenance items")
    print("  • Integration between service schedule and history")
    
    print("\n📞 Next steps:")
    print("  1. Start backend: cd ../backend && source venv/bin/activate && uvicorn app.main:app --reload")
    print("  2. Start frontend: npm run dev")
    print("  3. Login with jaime/testing1")
    print("  4. Your cars and todos are ready to use!")
    
    if backup_path:
        print(f"\n💾 Database backup saved at: {backup_path}")

if __name__ == "__main__":
    main()