#!/usr/bin/env python3

import sys
import os
sys.path.append('../backend')

from passlib.context import CryptContext
import sqlite3

def reset_password():
    # Create password context
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    # Hash the password "password"
    hashed_password = pwd_context.hash("password")
    
    # Update the database
    conn = sqlite3.connect("../backend/car_collection.db")
    cursor = conn.cursor()
    
    cursor.execute("UPDATE users SET hashed_password = ? WHERE username = ?", 
                   (hashed_password, "jaime"))
    conn.commit()
    
    print(f"✅ Password reset for user 'jaime' to 'password'")
    print(f"   Rows updated: {cursor.rowcount}")
    
    conn.close()

if __name__ == "__main__":
    reset_password()