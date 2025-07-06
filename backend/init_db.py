#!/usr/bin/env python3
"""
Database initialization script for Car Collection API.
This script ensures the database is created with the correct schema.
"""

import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.database import engine
from app.models import Base

def init_database():
    """Initialize the database with all tables."""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")

if __name__ == "__main__":
    init_database() 