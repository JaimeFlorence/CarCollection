import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.main import app, get_db
from app.database import Base
from app.models import User
from app.auth import get_password_hash, verify_password

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_password_change.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def test_db():
    Base.metadata.drop_all(bind=engine)
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

@pytest.fixture
def test_user(test_db: Session):
    """Create a test user"""
    user = User(
        username="testuser",
        email="test@example.com",
        hashed_password=get_password_hash("oldpassword123"),
        is_admin=False,
        is_active=True
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user

@pytest.fixture
def auth_headers(client: TestClient, test_user: User):
    """Get auth headers for test user"""
    response = client.post(
        "/auth/login",
        json={"username": "testuser", "password": "oldpassword123"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

class TestPasswordChange:
    def test_change_password_success(self, client: TestClient, test_db: Session, auth_headers: dict, test_user: User):
        """Test successful password change"""
        response = client.put(
            "/auth/change-password",
            json={
                "current_password": "oldpassword123",
                "new_password": "newpassword123"
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200
        user_data = response.json()
        assert user_data["username"] == "testuser"
        
        # Verify password was changed in database
        test_db.refresh(test_user)
        assert verify_password("newpassword123", test_user.hashed_password)
        assert not verify_password("oldpassword123", test_user.hashed_password)
        
        # Verify can login with new password
        login_response = client.post(
            "/auth/login",
            json={"username": "testuser", "password": "newpassword123"}
        )
        assert login_response.status_code == 200

    def test_change_password_wrong_current_password(self, client: TestClient, auth_headers: dict):
        """Test password change with incorrect current password"""
        response = client.put(
            "/auth/change-password",
            json={
                "current_password": "wrongpassword",
                "new_password": "newpassword123"
            },
            headers=auth_headers
        )
        
        assert response.status_code == 400
        assert response.json()["detail"] == "Current password is incorrect"

    def test_change_password_unauthenticated(self, client: TestClient):
        """Test password change without authentication"""
        response = client.put(
            "/auth/change-password",
            json={
                "current_password": "oldpassword123",
                "new_password": "newpassword123"
            }
        )
        
        assert response.status_code == 401
        assert response.json()["detail"] == "Not authenticated"

    def test_change_password_invalid_token(self, client: TestClient):
        """Test password change with invalid token"""
        response = client.put(
            "/auth/change-password",
            json={
                "current_password": "oldpassword123",
                "new_password": "newpassword123"
            },
            headers={"Authorization": "Bearer invalidtoken"}
        )
        
        assert response.status_code == 401
        assert response.json()["detail"] == "Could not validate credentials"

    def test_change_password_inactive_user(self, client: TestClient, test_db: Session, test_user: User):
        """Test password change for inactive user"""
        # First login and get token
        response = client.post(
            "/auth/login",
            json={"username": "testuser", "password": "oldpassword123"}
        )
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Deactivate user
        test_user.is_active = False
        test_db.commit()
        
        # Try to change password
        response = client.put(
            "/auth/change-password",
            json={
                "current_password": "oldpassword123",
                "new_password": "newpassword123"
            },
            headers=headers
        )
        
        assert response.status_code == 400
        assert response.json()["detail"] == "Inactive user"

    def test_change_password_old_password_still_invalid(self, client: TestClient, test_db: Session, auth_headers: dict, test_user: User):
        """Test that old password doesn't work after change"""
        # Change password
        response = client.put(
            "/auth/change-password",
            json={
                "current_password": "oldpassword123",
                "new_password": "newpassword123"
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        
        # Try to login with old password
        login_response = client.post(
            "/auth/login",
            json={"username": "testuser", "password": "oldpassword123"}
        )
        assert login_response.status_code == 401

    def test_change_password_updates_timestamp(self, client: TestClient, test_db: Session, auth_headers: dict, test_user: User):
        """Test that updated_at timestamp is updated"""
        original_updated_at = test_user.updated_at
        
        response = client.put(
            "/auth/change-password",
            json={
                "current_password": "oldpassword123",
                "new_password": "newpassword123"
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200
        test_db.refresh(test_user)
        assert test_user.updated_at > original_updated_at

    def test_change_password_empty_fields(self, client: TestClient, auth_headers: dict):
        """Test password change with empty fields"""
        # Empty current password
        response = client.put(
            "/auth/change-password",
            json={
                "current_password": "",
                "new_password": "newpassword123"
            },
            headers=auth_headers
        )
        assert response.status_code == 400
        
        # Empty new password
        response = client.put(
            "/auth/change-password",
            json={
                "current_password": "oldpassword123",
                "new_password": ""
            },
            headers=auth_headers
        )
        assert response.status_code == 422  # Validation error