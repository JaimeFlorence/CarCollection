import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app, get_db
from app.database import Base
from app import models, auth
from app.auth import get_password_hash

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_car_collection.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="module")
def client(test_db):
    def override_get_db():
        try:
            yield test_db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="module")
def test_user(test_db):
    """Create a test user"""
    user = models.User(
        username="testuser",
        email="test@example.com",
        hashed_password=get_password_hash("testpass123"),
        is_active=True,
        is_admin=False
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user

@pytest.fixture(scope="module")
def auth_headers(client, test_user):
    """Get authentication headers"""
    response = client.post(
        "/auth/login",
        json={"username": "testuser", "password": "testpass123"}
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_and_get_car(client, auth_headers):
    car_data = {"year": 2020, "make": "Ferrari", "model": "812 Superfast", "vin": "ZFF81YHT0L0250001", "mileage": 3450}
    response = client.post("/cars/", json=car_data, headers=auth_headers)
    assert response.status_code == 201
    car = response.json()
    assert car["make"] == "Ferrari"
    car_id = car["id"]

    # Get car
    response = client.get(f"/cars/{car_id}", headers=auth_headers)
    assert response.status_code == 200
    car = response.json()
    assert car["model"] == "812 Superfast"


def test_update_and_delete_car(client, auth_headers):
    # Create car
    car_data = {"year": 2018, "make": "Porsche", "model": "911 Carrera S", "vin": "WP0AB2A99JS123456", "mileage": 8920}
    response = client.post("/cars/", json=car_data, headers=auth_headers)
    car_id = response.json()["id"]

    # Update car
    update_data = {"mileage": 9000, "make": "Porsche"}
    response = client.put(f"/cars/{car_id}", json=update_data, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["mileage"] == 9000

    # Delete car
    response = client.delete(f"/cars/{car_id}", headers=auth_headers)
    assert response.status_code == 204
    # Confirm deletion
    response = client.get(f"/cars/{car_id}", headers=auth_headers)
    assert response.status_code == 404 