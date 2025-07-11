"""
Test admin routes and endpoints to ensure proper routing and access control.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.main import app, get_db
from app.database import Base
from app.auth import get_password_hash
from app.models import User

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_admin_routes.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def test_db():
    """Create a fresh database for each test."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(test_db):
    """Create a test client with database override."""
    def override_get_db():
        try:
            yield test_db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c


@pytest.fixture
def admin_user(test_db: Session):
    """Create an admin user for testing."""
    admin = User(
        username="testadmin",
        email="admin@test.com",
        hashed_password=get_password_hash("adminpass"),
        is_admin=True,
        is_active=True
    )
    test_db.add(admin)
    test_db.commit()
    test_db.refresh(admin)
    return admin


@pytest.fixture
def regular_user(test_db: Session):
    """Create a regular user for testing."""
    user = User(
        username="testuser",
        email="user@test.com",
        hashed_password=get_password_hash("userpass"),
        is_admin=False,
        is_active=True
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def admin_token(client: TestClient, admin_user: User):
    """Get authentication token for admin user."""
    response = client.post(
        "/auth/login",
        json={"username": "testadmin", "password": "adminpass"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture
def user_token(client: TestClient, regular_user: User):
    """Get authentication token for regular user."""
    response = client.post(
        "/auth/login",
        json={"username": "testuser", "password": "userpass"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


class TestAdminRoutes:
    """Test admin-specific routes and access control."""

    def test_admin_users_endpoint_requires_auth(self, client: TestClient):
        """Test that /admin/users/ requires authentication."""
        response = client.get("/admin/users/")
        assert response.status_code == 401
        assert response.json()["detail"] == "Not authenticated"

    def test_admin_users_endpoint_requires_admin(self, client: TestClient, user_token: str):
        """Test that /admin/users/ requires admin privileges."""
        response = client.get(
            "/admin/users/",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 403
        assert response.json()["detail"] == "Not authorized"

    def test_admin_users_endpoint_success(self, client: TestClient, admin_token: str, admin_user: User, regular_user: User):
        """Test successful access to /admin/users/ endpoint."""
        response = client.get(
            "/admin/users/",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        assert len(users) == 2
        usernames = [u["username"] for u in users]
        assert "testadmin" in usernames
        assert "testuser" in usernames

    def test_admin_invitations_endpoint_requires_auth(self, client: TestClient):
        """Test that /admin/invitations/ requires authentication."""
        response = client.get("/admin/invitations/")
        assert response.status_code == 401

    def test_admin_invitations_endpoint_requires_admin(self, client: TestClient, user_token: str):
        """Test that /admin/invitations/ requires admin privileges."""
        response = client.get(
            "/admin/invitations/",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 403

    def test_create_user_by_admin_requires_admin(self, client: TestClient, user_token: str):
        """Test that creating users requires admin privileges."""
        response = client.post(
            "/admin/users/",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "username": "newuser",
                "email": "new@example.com",
                "password": "newpass",
                "is_admin": False
            }
        )
        assert response.status_code == 403

    def test_create_user_by_admin_success(self, client: TestClient, admin_token: str, test_db: Session):
        """Test successful user creation by admin."""
        response = client.post(
            "/admin/users/",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "username": "newuser",
                "email": "new@example.com",
                "password": "newpass",
                "is_admin": False
            }
        )
        assert response.status_code == 200
        user_data = response.json()
        assert user_data["username"] == "newuser"
        assert user_data["email"] == "new@example.com"
        assert user_data["is_admin"] is False

        # Verify user was created in database
        created_user = test_db.query(User).filter(User.username == "newuser").first()
        assert created_user is not None

    def test_update_user_requires_admin(self, client: TestClient, user_token: str, regular_user: User):
        """Test that updating users requires admin privileges."""
        response = client.put(
            f"/admin/users/{regular_user.id}",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"email": "updated@example.com"}
        )
        assert response.status_code == 403

    def test_update_user_success(self, client: TestClient, admin_token: str, regular_user: User):
        """Test successful user update by admin."""
        response = client.put(
            f"/admin/users/{regular_user.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "email": "updated@example.com",
                "is_active": False
            }
        )
        assert response.status_code == 200
        updated_data = response.json()
        assert updated_data["email"] == "updated@example.com"
        assert updated_data["is_active"] is False

    def test_admin_cannot_disable_self(self, client: TestClient, admin_token: str, admin_user: User):
        """Test that admin cannot disable their own account."""
        response = client.put(
            f"/admin/users/{admin_user.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"is_active": False}
        )
        assert response.status_code == 400
        assert "disable your own admin account" in response.json()["detail"]

    def test_update_nonexistent_user(self, client: TestClient, admin_token: str):
        """Test updating a user that doesn't exist."""
        response = client.put(
            "/admin/users/99999",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"email": "test@example.com"}
        )
        assert response.status_code == 404
        assert response.json()["detail"] == "User not found"


class TestAdminPageRouting:
    """Test that admin page routes are NOT handled by the API."""
    
    def test_admin_root_not_handled_by_api(self, client: TestClient):
        """Test that /admin/ is not handled by the API (should be handled by frontend)."""
        response = client.get("/admin/")
        assert response.status_code == 404
        assert response.json()["detail"] == "Not Found"

    def test_admin_without_slash_not_handled_by_api(self, client: TestClient):
        """Test that /admin is not handled by the API."""
        response = client.get("/admin")
        assert response.status_code == 404
        assert response.json()["detail"] == "Not Found"

    def test_specific_admin_api_endpoints_are_handled(self, client: TestClient, admin_token: str):
        """Test that specific admin API endpoints are properly handled."""
        # These should work (with proper auth)
        endpoints = [
            "/admin/users/",
            "/admin/invitations/"
        ]
        
        for endpoint in endpoints:
            response = client.get(
                endpoint,
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            # Should not be 404 - either 200 or another status but not "Not Found"
            assert response.status_code != 404


class TestAdminEndpointSecurity:
    """Test security aspects of admin endpoints."""

    def test_sql_injection_prevention(self, client: TestClient, admin_token: str):
        """Test that SQL injection attempts are prevented."""
        response = client.put(
            "/admin/users/1; DROP TABLE users;--",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"email": "test@example.com"}
        )
        # Should get validation error, not SQL error
        assert response.status_code in [404, 422]

    def test_xss_prevention_in_user_creation(self, client: TestClient, admin_token: str):
        """Test that XSS attempts in user data are handled safely."""
        response = client.post(
            "/admin/users/",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "username": "<script>alert('xss')</script>",
                "email": "xss@example.com",
                "password": "password123",
                "is_admin": False
            }
        )
        if response.status_code == 200:
            # If created, verify the username is stored as-is (not executed)
            user_data = response.json()
            assert user_data["username"] == "<script>alert('xss')</script>"

    def test_password_not_returned_in_responses(self, client: TestClient, admin_token: str):
        """Test that passwords are never returned in API responses."""
        response = client.get(
            "/admin/users/",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        users = response.json()
        for user in users:
            assert "password" not in user
            assert "hashed_password" not in user