from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, schemas, crud, database
from .database import SessionLocal, engine, get_db
from .auth import (
    authenticate_user, create_access_token, get_current_active_user,
    get_current_admin_user, update_last_login
)
from .service_api import router as service_router
from typing import List
from datetime import timedelta

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Car Collection API")

# Include service API routes
app.include_router(service_router, prefix="/api")

# Allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# get_db function is now imported from database.py

# Authentication Endpoints
@app.post("/auth/login", response_model=schemas.Token)
def login(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, user_credentials.username, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login
    update_last_login(db, user)
    
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@app.post("/auth/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if username already exists
    db_user = crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Check if email already exists
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    return crud.create_user(db, user)

@app.get("/auth/me", response_model=schemas.UserOut)
def read_users_me(current_user: models.User = Depends(get_current_active_user)):
    return current_user

# Admin Endpoints
@app.post("/admin/users/", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def create_user_by_admin(
    user: schemas.UserCreateByAdmin,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin_user)
):
    # Check if username already exists
    db_user = crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Check if email already exists
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    return crud.create_user_by_admin(db, user)

@app.get("/admin/users/", response_model=List[schemas.UserOut])
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin_user)
):
    return crud.get_users(db, skip=skip, limit=limit)

# Car Endpoints (Updated for multi-tenancy)
@app.post("/cars/", response_model=schemas.CarOut, status_code=status.HTTP_201_CREATED)
def create_car(
    car: schemas.CarCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    return crud.create_car(db, car, current_user.id)

@app.get("/cars/", response_model=List[schemas.CarOut])
def read_cars(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    return crud.get_cars(db, current_user.id, skip=skip, limit=limit)

@app.get("/cars/{car_id}", response_model=schemas.CarOut)
def read_car(
    car_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    car = crud.get_car(db, car_id, current_user.id)
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    return car

@app.put("/cars/{car_id}", response_model=schemas.CarOut)
def update_car(
    car_id: int,
    car_update: schemas.CarUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    car = crud.update_car(db, car_id, car_update, current_user.id)
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    return car

@app.delete("/cars/{car_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_car(
    car_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if not crud.delete_car(db, car_id, current_user.id):
        raise HTTPException(status_code=404, detail="Car not found")
    return None

# Group Endpoints
@app.get("/cars/groups/", response_model=List[str])
def get_car_groups(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get all unique group names for the current user's cars"""
    return crud.get_user_car_groups(db, current_user.id)

# ToDo Endpoints (Updated for multi-tenancy)
@app.get("/cars/{car_id}/todos/", response_model=List[schemas.ToDoOut])
def read_todos_for_car(
    car_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # Verify the car belongs to the user
    car = crud.get_car(db, car_id, current_user.id)
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    return crud.get_todos_for_car(db, car_id, current_user.id)

@app.post("/cars/{car_id}/todos/", response_model=schemas.ToDoOut, status_code=status.HTTP_201_CREATED)
def create_todo(
    car_id: int,
    todo: schemas.ToDoCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # Verify the car belongs to the user
    car = crud.get_car(db, car_id, current_user.id)
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    return crud.create_todo(db, todo, current_user.id)

@app.put("/todos/{todo_id}", response_model=schemas.ToDoOut)
def update_todo(
    todo_id: int,
    todo_update: schemas.ToDoUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    todo = crud.update_todo(db, todo_id, todo_update, current_user.id)
    if not todo:
        raise HTTPException(status_code=404, detail="ToDo not found")
    return todo

@app.delete("/todos/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_todo(
    todo_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if not crud.delete_todo(db, todo_id, current_user.id):
        raise HTTPException(status_code=404, detail="ToDo not found")
    return None 