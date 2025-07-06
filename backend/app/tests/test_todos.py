import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app, get_db
from app.database import Base

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

def test_create_and_get_todo(client):
    # Create a car first
    car_data = {"year": 2021, "make": "BMW", "model": "M3", "vin": "WBS8M9C54J5J12345", "mileage": 10000}
    car_resp = client.post("/cars/", json=car_data)
    car_id = car_resp.json()["id"]

    # Add a todo
    todo_data = {"title": "Change oil", "description": "Use synthetic", "due_date": None}
    todo_resp = client.post(f"/cars/{car_id}/todos/", json=todo_data)
    assert todo_resp.status_code == 201
    todo = todo_resp.json()
    assert todo["title"] == "Change oil"
    todo_id = todo["id"]

    # Get todos for car
    todos_resp = client.get(f"/cars/{car_id}/todos/")
    assert todos_resp.status_code == 200
    todos = todos_resp.json()
    assert len(todos) == 1
    assert todos[0]["title"] == "Change oil"


def test_update_and_delete_todo(client):
    # Create a car and todo
    car_data = {"year": 2022, "make": "Audi", "model": "RS5", "vin": "WAUZZZF57KA123456", "mileage": 5000}
    car_resp = client.post("/cars/", json=car_data)
    car_id = car_resp.json()["id"]
    todo_data = {"title": "Replace brake pads", "description": "Front pads", "due_date": None}
    todo_resp = client.post(f"/cars/{car_id}/todos/", json=todo_data)
    todo_id = todo_resp.json()["id"]

    # Update todo
    update_data = {"status": "resolved"}
    update_resp = client.put(f"/todos/{todo_id}", json=update_data)
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "resolved"

    # Delete todo
    del_resp = client.delete(f"/todos/{todo_id}")
    assert del_resp.status_code == 204
    # Confirm deletion
    todos_resp = client.get(f"/cars/{car_id}/todos/")
    assert todos_resp.status_code == 200
    assert all(t["id"] != todo_id for t in todos_resp.json())

def test_create_todo_with_due_date(client):
    car_data = {"year": 2023, "make": "Toyota", "model": "Corolla", "vin": "JTDBR32E330123456", "mileage": 20000}
    car_resp = client.post("/cars/", json=car_data)
    car_id = car_resp.json()["id"]
    todo_data = {
        "title": "Register car",
        "description": "Annual registration",
        "due_date": "2024-07-01T00:00:00",
        "priority": "high"
    }
    todo_resp = client.post(f"/cars/{car_id}/todos/", json=todo_data)
    assert todo_resp.status_code == 201
    todo = todo_resp.json()
    assert todo["title"] == "Register car"
    assert todo["due_date"].startswith("2024-07-01") 