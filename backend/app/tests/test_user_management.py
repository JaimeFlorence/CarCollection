import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.main import app, get_db
from app.database import Base
from app.models import User
from app.auth import get_password_hash

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_user_management.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def test_db():
    Base.metadata.drop_all(bind=engine)  # Clear tables before test
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(test_db):
    def override_get_db():
        try:
            yield test_db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def admin_user(test_db: Session):
    """Create an admin user for testing"""
    admin = User(
        username="admin",
        email="admin@example.com",
        hashed_password=get_password_hash("adminpass"),
        is_admin=True,
        is_active=True
    )
    test_db.add(admin)
    test_db.commit()
    test_db.refresh(admin)
    return admin

@pytest.fixture(scope="function")
def regular_user(test_db: Session):
    """Create a regular user for testing"""
    user = User(
        username="testuser",
        email="test@example.com",
        hashed_password=get_password_hash("testpass"),
        is_admin=False,
        is_active=True
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user

@pytest.fixture(scope="function")
def inactive_user(test_db: Session):
    """Create an inactive user for testing"""
    user = User(
        username="inactive",
        email="inactive@example.com",
        hashed_password=get_password_hash("inactivepass"),
        is_admin=False,
        is_active=False
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user

@pytest.fixture(scope="function")
def admin_headers(client: TestClient, admin_user: User):
    """Get auth headers for admin user"""
    response = client.post(
        "/auth/login",
        json={"username": "admin", "password": "adminpass"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="function")
def user_headers(client: TestClient, regular_user: User):
    """Get auth headers for regular user"""
    response = client.post(
        "/auth/login",
        json={"username": "testuser", "password": "testpass"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

class TestUserManagement:
    def test_get_all_users_as_admin(self, client: TestClient, admin_headers: dict, 
                                    admin_user: User, regular_user: User, inactive_user: User):
        """Test that admin can get all users"""
        response = client.get("/admin/users/", headers=admin_headers)
        assert response.status_code == 200
        users = response.json()
        assert len(users) == 3
        assert any(u["username"] == "admin" for u in users)
        assert any(u["username"] == "testuser" for u in users)
        assert any(u["username"] == "inactive" for u in users)

    def test_get_users_as_non_admin_forbidden(self, client: TestClient, user_headers: dict):
        """Test that non-admin cannot get users list"""
        response = client.get("/admin/users/", headers=user_headers)
        assert response.status_code == 403
        assert response.json()["detail"] == "Not enough permissions"

    def test_update_user_basic_info(self, client: TestClient, admin_headers: dict, regular_user: User):
        """Test updating user's basic information"""
        update_data = {
            "username": "updateduser",
            "email": "updated@example.com"
        }
        response = client.put(f"/admin/users/{regular_user.id}", json=update_data, headers=admin_headers)
        assert response.status_code == 200
        updated_user = response.json()
        assert updated_user["username"] == "updateduser"
        assert updated_user["email"] == "updated@example.com"
        assert updated_user["is_active"] == True  # Should remain unchanged
        assert updated_user["is_admin"] == False  # Should remain unchanged

    def test_disable_user_account(self, client: TestClient, admin_headers: dict, regular_user: User):
        """Test disabling a user account"""
        update_data = {"is_active": False}
        response = client.put(f"/admin/users/{regular_user.id}", json=update_data, headers=admin_headers)
        assert response.status_code == 200
        updated_user = response.json()
        assert updated_user["is_active"] == False
        
        # Verify disabled user cannot login
        login_response = client.post(
            "/auth/login",
            json={"username": "testuser", "password": "testpass"}
        )
        assert login_response.status_code == 401
        assert login_response.json()["detail"] == "Incorrect username or password"

    def test_enable_user_account(self, client: TestClient, admin_headers: dict, inactive_user: User):
        """Test re-enabling a user account"""
        update_data = {"is_active": True}
        response = client.put(f"/admin/users/{inactive_user.id}", json=update_data, headers=admin_headers)
        assert response.status_code == 200
        updated_user = response.json()
        assert updated_user["is_active"] == True
        
        # Verify enabled user can now login
        login_response = client.post(
            "/auth/login",
            json={"username": "inactive", "password": "inactivepass"}
        )
        assert login_response.status_code == 200
        assert "access_token" in login_response.json()

    def test_admin_cannot_disable_self(self, client: TestClient, admin_headers: dict, admin_user: User):
        """Test that admin cannot disable their own account"""
        update_data = {"is_active": False}
        response = client.put(f"/admin/users/{admin_user.id}", json=update_data, headers=admin_headers)
        assert response.status_code == 400
        assert response.json()["detail"] == "Cannot disable your own account"

    def test_update_user_password(self, client: TestClient, admin_headers: dict, regular_user: User):
        """Test updating user password"""
        update_data = {"password": "newpassword123"}
        response = client.put(f"/admin/users/{regular_user.id}", json=update_data, headers=admin_headers)
        assert response.status_code == 200
        
        # Verify old password doesn't work
        old_login = client.post(
            "/auth/login",
            json={"username": "testuser", "password": "testpass"}
        )
        assert old_login.status_code == 401
        
        # Verify new password works
        new_login = client.post(
            "/auth/login",
            json={"username": "testuser", "password": "newpassword123"}
        )
        assert new_login.status_code == 200
        assert "access_token" in new_login.json()

    def test_update_user_admin_status(self, client: TestClient, admin_headers: dict, regular_user: User):
        """Test promoting/demoting admin status"""
        # Promote to admin
        update_data = {"is_admin": True}
        response = client.put(f"/admin/users/{regular_user.id}", json=update_data, headers=admin_headers)
        assert response.status_code == 200
        assert response.json()["is_admin"] == True
        
        # Demote from admin
        update_data = {"is_admin": False}
        response = client.put(f"/admin/users/{regular_user.id}", json=update_data, headers=admin_headers)
        assert response.status_code == 200
        assert response.json()["is_admin"] == False

    def test_update_nonexistent_user(self, client: TestClient, admin_headers: dict):
        """Test updating a user that doesn't exist"""
        update_data = {"username": "newname"}
        response = client.put("/admin/users/999", json=update_data, headers=admin_headers)
        assert response.status_code == 404
        assert response.json()["detail"] == "User not found"

    def test_update_with_empty_data(self, client: TestClient, admin_headers: dict, regular_user: User):
        """Test updating user with empty data (should not change anything)"""
        update_data = {}
        response = client.put(f"/admin/users/{regular_user.id}", json=update_data, headers=admin_headers)
        assert response.status_code == 200
        updated_user = response.json()
        assert updated_user["username"] == "testuser"
        assert updated_user["email"] == "test@example.com"
        assert updated_user["is_active"] == True
        assert updated_user["is_admin"] == False

    def test_update_multiple_fields_simultaneously(self, client: TestClient, admin_headers: dict, regular_user: User):
        """Test updating multiple user fields at once"""
        update_data = {
            "username": "completelyupdated",
            "email": "complete@example.com",
            "password": "newpass123",
            "is_admin": True,
            "is_active": False
        }
        response = client.put(f"/admin/users/{regular_user.id}", json=update_data, headers=admin_headers)
        assert response.status_code == 200
        updated_user = response.json()
        assert updated_user["username"] == "completelyupdated"
        assert updated_user["email"] == "complete@example.com"
        assert updated_user["is_admin"] == True
        assert updated_user["is_active"] == False

    def test_disable_already_disabled_user(self, client: TestClient, admin_headers: dict, inactive_user: User):
        """Test disabling an already disabled user (should be idempotent)"""
        update_data = {"is_active": False}
        response = client.put(f"/admin/users/{inactive_user.id}", json=update_data, headers=admin_headers)
        assert response.status_code == 200
        updated_user = response.json()
        assert updated_user["is_active"] == False

    def test_non_admin_cannot_update_users(self, client: TestClient, user_headers: dict, admin_user: User):
        """Test that non-admin cannot update other users"""
        update_data = {"username": "hackedadmin"}
        response = client.put(f"/admin/users/{admin_user.id}", json=update_data, headers=user_headers)
        assert response.status_code == 403
        assert response.json()["detail"] == "Not enough permissions"