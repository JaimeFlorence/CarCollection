#!/usr/bin/env python3
"""
Create user directly using SQLite - Updated for Service Intervals
"""

import sqlite3
import bcrypt
from datetime import datetime

def create_tables():
    """Create all necessary tables if they don't exist."""
    print("🗄️  Creating tables...")
    
    conn = sqlite3.connect('../backend/car_collection.db')
    cursor = conn.cursor()
    
    try:
        # Create users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                hashed_password VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                is_admin BOOLEAN DEFAULT FALSE,
                email_verified BOOLEAN DEFAULT FALSE,
                created_at DATETIME,
                updated_at DATETIME,
                last_login DATETIME
            )
        """)
        
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
        
        # Create service_intervals table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS service_intervals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                car_id INTEGER NOT NULL,
                service_item VARCHAR(255) NOT NULL,
                interval_miles INTEGER,
                interval_months INTEGER,
                priority VARCHAR(20) DEFAULT 'medium',
                cost_estimate_low REAL,
                cost_estimate_high REAL,
                notes TEXT,
                source VARCHAR(50) DEFAULT 'manual',
                is_active BOOLEAN DEFAULT TRUE,
                created_at DATETIME,
                updated_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (car_id) REFERENCES cars (id)
            )
        """)
        
        # Create service_history table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS service_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                car_id INTEGER NOT NULL,
                service_interval_id INTEGER,
                service_item VARCHAR(255) NOT NULL,
                mileage_at_service INTEGER,
                cost REAL,
                service_date DATE NOT NULL,
                notes TEXT,
                created_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (car_id) REFERENCES cars (id),
                FOREIGN KEY (service_interval_id) REFERENCES service_intervals (id)
            )
        """)
        
        # Create service_research_logs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS service_research_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                car_id INTEGER NOT NULL,
                research_date DATETIME NOT NULL,
                sources_used TEXT,
                intervals_found INTEGER,
                confidence_score INTEGER,
                notes TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (car_id) REFERENCES cars (id)
            )
        """)
        
        conn.commit()
        print("✅ Tables created successfully")
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

def create_user_sqlite():
    """Create user directly in SQLite database."""
    print("👤 Creating Jaime user with SQLite...")
    
    # Connect to database
    conn = sqlite3.connect('../backend/car_collection.db')
    cursor = conn.cursor()
    
    try:
        # Hash the password
        password = "testing1"
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        hashed_str = hashed.decode('utf-8')
        
        # Insert user
        cursor.execute("""
            INSERT INTO users (username, email, hashed_password, is_active, is_admin, email_verified, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            'jaime',
            'jaime.carcollection@example.com',
            hashed_str,
            True,
            True,
            True,
            datetime.utcnow().isoformat(),
            datetime.utcnow().isoformat()
        ))
        
        # Commit the transaction
        conn.commit()
        
        print("✅ User created successfully")
        
        # Verify user was created
        cursor.execute("SELECT id, username, email, is_admin FROM users WHERE username = 'jaime'")
        user = cursor.fetchone()
        if user:
            print(f"✅ User verified: ID={user[0]}, Username={user[1]}, Email={user[2]}, Admin={user[3]}")
        else:
            print("❌ User not found after creation")
            
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

def test_login():
    """Test the login."""
    print("\n🔐 Testing login...")
    
    import requests
    
    try:
        response = requests.post(
            'http://localhost:8000/auth/login',
            json={'username': 'jaime', 'password': 'testing1'}
        )
        
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("✅ Login successful!")
            print(f"   User: {data['user']['username']}")
            print(f"   Admin: {data['user']['is_admin']}")
            return True
        else:
            print(f"❌ Login failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Login test failed: {e}")
        return False

def main():
    """Main function."""
    print("🔧 Creating User with SQLite and Testing Login")
    print("=" * 50)
    
    # Create tables
    create_tables()
    
    # Create user
    create_user_sqlite()
    
    # Test login (only if backend is running)
    print("\n🌐 Testing backend connection...")
    if test_login():
        print("\n🎉 SUCCESS! Login is working!")
        print("\n🔑 Login credentials:")
        print("  Username: jaime")
        print("  Password: testing1")
        print("\n🌐 You can now login at: http://localhost:3001")
    else:
        print("\n⚠️  Backend connection failed (this is OK if backend isn't running)")
        print("\n🔑 User created successfully with credentials:")
        print("  Username: jaime")
        print("  Password: testing1")

if __name__ == "__main__":
    main()