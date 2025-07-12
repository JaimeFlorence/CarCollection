#!/bin/bash

echo "=== Database Restore Script ==="
echo ""

# Navigate to backend directory
cd /home/jaime/MyCode/src/CarCollection/backend

# List available backups
echo "Available database backups:"
echo "1) car_collection.db.backup-20250710-224543 (Yesterday 22:45)"
echo "2) backups/car_collection.db.backup-20250711-000508 (Today 00:05)"
echo ""

# Ask which backup to restore
read -p "Which backup would you like to restore? (1 or 2): " choice

case $choice in
    1)
        BACKUP_FILE="car_collection.db.backup-20250710-224543"
        ;;
    2)
        BACKUP_FILE="backups/car_collection.db.backup-20250711-000508"
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

# Confirm restore
echo ""
echo "You selected: $BACKUP_FILE"
read -p "Are you sure you want to restore this backup? This will overwrite the current database. (y/n): " confirm

if [ "$confirm" != "y" ]; then
    echo "Restore cancelled."
    exit 0
fi

# Create a backup of current database before restoring
if [ -f car_collection.db ]; then
    echo "Creating backup of current database..."
    cp car_collection.db car_collection.db.before-restore-$(date +%Y%m%d-%H%M%S)
fi

# Restore the selected backup
echo "Restoring database from $BACKUP_FILE..."
cp "$BACKUP_FILE" car_collection.db

echo "✓ Database restored successfully!"
echo ""
echo "You may need to restart your backend server to see the changes."
echo "Use: pkill -f 'uvicorn' && cd backend && uvicorn app.main:app --reload"