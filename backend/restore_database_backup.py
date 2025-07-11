#!/usr/bin/env python3
"""
Restore database from backup.
"""

import os
import shutil
import sys
from datetime import datetime

def list_backups():
    """List available backups."""
    backup_dir = "backups"
    if not os.path.exists(backup_dir):
        return []
    
    backups = []
    for file in os.listdir(backup_dir):
        if file.startswith("car_collection.db.backup-"):
            backups.append(file)
    
    return sorted(backups, reverse=True)

def restore_backup(backup_file):
    """Restore a specific backup."""
    backup_path = os.path.join("backups", backup_file)
    db_path = "car_collection.db"
    
    if not os.path.exists(backup_path):
        print(f"Backup file not found: {backup_path}")
        return False
    
    # Create a backup of current database before restoring
    if os.path.exists(db_path):
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        current_backup = f"car_collection.db.before-restore-{timestamp}"
        shutil.copy2(db_path, current_backup)
        print(f"Current database backed up to: {current_backup}")
    
    # Restore the backup
    shutil.copy2(backup_path, db_path)
    print(f"Database restored from: {backup_file}")
    return True

def main():
    """Main function."""
    backups = list_backups()
    
    if not backups:
        print("No backups found in the backups/ directory.")
        return
    
    print("Available backups:")
    for i, backup in enumerate(backups, 1):
        print(f"{i}. {backup}")
    
    choice = input("\nEnter the number of the backup to restore (or 'q' to quit): ")
    
    if choice.lower() == 'q':
        print("Operation cancelled.")
        return
    
    try:
        index = int(choice) - 1
        if 0 <= index < len(backups):
            backup_file = backups[index]
            confirm = input(f"\nRestore {backup_file}? This will overwrite the current database. (yes/no): ")
            if confirm.lower() == 'yes':
                if restore_backup(backup_file):
                    print("\nDatabase restored successfully!")
                else:
                    print("\nRestore failed.")
            else:
                print("Operation cancelled.")
        else:
            print("Invalid selection.")
    except ValueError:
        print("Invalid input.")

if __name__ == "__main__":
    main()