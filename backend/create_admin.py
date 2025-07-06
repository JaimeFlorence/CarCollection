"""
Create a default admin user for the Car Collection application.
"""

from app.database import SessionLocal
from app.crud import create_user_by_admin
from app.schemas import UserCreateByAdmin

def create_default_admin():
    """Create a default admin user."""
    db = SessionLocal()
    try:
        # Check if admin user already exists
        from app.crud import get_user_by_username
        existing_admin = get_user_by_username(db, "admin")
        if existing_admin:
            print("Admin user already exists!")
            return
        
        # Create default admin user
        admin_user = UserCreateByAdmin(
            username="admin",
            email="admin@carcollection.com",
            password="admin123",  # Change this in production!
            is_admin=True,
            send_invitation=False
        )
        
        created_user = create_user_by_admin(db, admin_user)
        print(f"Created admin user: {created_user.username}")
        print(f"Email: {created_user.email}")
        print("Password: admin123")
        print("Please change the password after first login!")
        
    finally:
        db.close()

if __name__ == "__main__":
    create_default_admin() 