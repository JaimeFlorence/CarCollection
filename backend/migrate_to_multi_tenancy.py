"""
Database migration script to add multi-tenancy support.
This script will:
1. Create the users table
2. Add user_id columns to cars and todos tables
3. Create a default admin user
4. Migrate existing data to the default user
"""

import sqlite3
from datetime import datetime, UTC
from pathlib import Path

def migrate_database():
    """Migrate the database to support multi-tenancy."""
    db_path = Path("car_collection.db")
    
    if not db_path.exists():
        print("Database file not found. Creating new database with multi-tenancy support.")
        create_new_database()
        return
    
    print("Starting database migration to multi-tenancy...")
    
    # Connect to the database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if users table already exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if cursor.fetchone():
            print("Users table already exists. Migration may have been run before.")
            return
        
        # Create users table
        print("Creating users table...")
        cursor.execute("""
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR UNIQUE NOT NULL,
                email VARCHAR UNIQUE NOT NULL,
                hashed_password VARCHAR NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                is_admin BOOLEAN DEFAULT 0,
                email_verified BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME
            )
        """)
        
        # Create indexes for users table
        cursor.execute("CREATE INDEX ix_users_username ON users (username)")
        cursor.execute("CREATE INDEX ix_users_email ON users (email)")
        
        # Create default admin user
        print("Creating default admin user...")
        from app.auth import get_password_hash
        default_password = "admin123"  # Change this in production!
        hashed_password = get_password_hash(default_password)
        
        cursor.execute("""
            INSERT INTO users (username, email, hashed_password, is_active, is_admin, email_verified)
            VALUES (?, ?, ?, ?, ?, ?)
        """, ("admin", "admin@carcollection.com", hashed_password, True, True, True))
        
        admin_user_id = cursor.lastrowid
        print(f"Created admin user with ID: {admin_user_id}")
        print(f"Username: admin, Password: {default_password}")
        
        # Add user_id column to cars table
        print("Adding user_id column to cars table...")
        cursor.execute("ALTER TABLE cars ADD COLUMN user_id INTEGER")
        cursor.execute("UPDATE cars SET user_id = ?", (admin_user_id,))
        cursor.execute("CREATE INDEX ix_cars_user_id ON cars (user_id)")
        
        # Add user_id column to todos table
        print("Adding user_id column to todos table...")
        cursor.execute("ALTER TABLE todos ADD COLUMN user_id INTEGER")
        cursor.execute("UPDATE todos SET user_id = ?", (admin_user_id,))
        cursor.execute("CREATE INDEX ix_todos_user_id ON todos (user_id)")
        
        # Commit changes
        conn.commit()
        print("Database migration completed successfully!")
        print(f"Default admin credentials: admin / {default_password}")
        print("Please change the admin password after first login!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

def create_new_database():
    """Create a new database with multi-tenancy support."""
    print("Creating new database with multi-tenancy support...")
    
    # Import and create tables
    from app.database import engine
    from app.models import Base
    
    Base.metadata.create_all(bind=engine)
    
    # Create default admin user
    from app.crud import create_user_by_admin
    from app.schemas import UserCreateByAdmin
    from app.database import SessionLocal
    
    db = SessionLocal()
    try:
        default_user = UserCreateByAdmin(
            username="admin",
            email="admin@carcollection.com",
            password="admin123",  # Change this in production!
            is_admin=True,
            send_invitation=False
        )
        create_user_by_admin(db, default_user)
        print("Created default admin user: admin / admin123")
        print("Please change the admin password after first login!")
    finally:
        db.close()

if __name__ == "__main__":
    migrate_database() 