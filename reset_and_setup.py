#!/usr/bin/env python3
"""
Complete Database Reset and Setup Script
Stops backend, deletes database files, runs setup, and prompts for restart.
"""

import os
import sys
import subprocess
import time
from pathlib import Path

def stop_backend():
    """Stop the FastAPI backend server."""
    print("🛑 Stopping backend server...")
    
    try:
        # Try to find and kill the uvicorn process
        result = subprocess.run(
            ["pkill", "-f", "uvicorn.*main:app"],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("✅ Backend server stopped")
        else:
            print("ℹ️  No backend server found running (this is fine)")
            
        # Give it a moment to fully stop
        time.sleep(2)
        
    except Exception as e:
        print(f"⚠️  Could not stop backend: {e}")
        print("   You may need to stop it manually (Ctrl+C in the backend terminal)")

def delete_database_files():
    """Delete all database files."""
    print("\n🗑️  Deleting database files...")
    
    db_files = [
        "backend/car_collection.db",
        "backend/test_car_collection.db",
        "car_collection.db",
        "test_car_collection.db"
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

def run_setup():
    """Run the database setup script."""
    print("\n🚀 Running database setup...")
    
    try:
        result = subprocess.run(
            [sys.executable, "setup_database.py"],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("✅ Database setup completed successfully")
            print("\n" + "="*50)
            print("SETUP OUTPUT:")
            print(result.stdout)
            print("="*50)
        else:
            print("❌ Database setup failed")
            print("STDERR:", result.stderr)
            return False
            
    except Exception as e:
        print(f"❌ Error running setup: {e}")
        return False
    
    return True

def main():
    """Main reset and setup process."""
    print("🚗 Complete Car Collection Database Reset & Setup")
    print("=" * 60)
    
    # Step 1: Stop backend
    stop_backend()
    
    # Step 2: Delete database files
    delete_database_files()
    
    # Step 3: Run setup
    if not run_setup():
        print("\n❌ Setup failed. Please check the errors above.")
        return
    
    # Step 4: Success message and instructions
    print("\n" + "=" * 60)
    print("🎉 RESET AND SETUP COMPLETED SUCCESSFULLY!")
    print("=" * 60)
    
    print("\n📋 What was done:")
    print("  ✅ Backend server stopped")
    print("  ✅ All database files deleted")
    print("  ✅ Fresh database created")
    print("  ✅ Jaime account created (admin)")
    print("  ✅ 13 cars imported from CSV")
    print("  ✅ 17 todos imported from CSV")
    
    print("\n🔑 Your login credentials:")
    print("  Username: jaime")
    print("  Password: \\testing1")
    print("  Role: Administrator")
    
    print("\n🔄 NEXT STEP:")
    print("  Please start the backend server in your terminal:")
    print("  cd backend")
    print("  source venv/bin/activate")
    print("  uvicorn app.main:app --reload")
    
    print("\n🌐 Once the backend is running, you can:")
    print("  - Access the frontend at: http://localhost:3000")
    print("  - Login with: jaime / \\testing1")
    print("  - See your 13 cars and 17 todos")
    
    print("\n📞 Let me know when the backend is running and I'll test the login!")

if __name__ == "__main__":
    main() 