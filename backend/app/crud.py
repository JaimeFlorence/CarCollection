from sqlalchemy.orm import Session
from . import models, schemas
from datetime import datetime, UTC
from typing import List, Optional

# User CRUD operations
def get_user(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.username == username).first()

def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[models.User]:
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    from .auth import get_password_hash
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def create_user_by_admin(db: Session, user: schemas.UserCreateByAdmin) -> models.User:
    from .auth import get_password_hash
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        is_admin=user.is_admin
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user_update: schemas.UserUpdate) -> Optional[models.User]:
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    for field, value in user_update.model_dump(exclude_unset=True).items():
        setattr(db_user, field, value)
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int) -> bool:
    db_user = get_user(db, user_id)
    if not db_user:
        return False
    db.delete(db_user)
    db.commit()
    return True

# Car CRUD operations (Updated for multi-tenancy)
def get_car(db: Session, car_id: int, user_id: int) -> Optional[models.Car]:
    return db.query(models.Car).filter(
        models.Car.id == car_id,
        models.Car.user_id == user_id
    ).first()

def get_cars(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[models.Car]:
    return db.query(models.Car).filter(
        models.Car.user_id == user_id
    ).offset(skip).limit(limit).all()

def create_car(db: Session, car: schemas.CarCreate, user_id: int) -> models.Car:
    db_car = models.Car(**car.model_dump(), user_id=user_id)
    db.add(db_car)
    db.commit()
    db.refresh(db_car)
    return db_car

def update_car(db: Session, car_id: int, car_update: schemas.CarUpdate, user_id: int) -> Optional[models.Car]:
    db_car = get_car(db, car_id, user_id)
    if not db_car:
        return None
    for field, value in car_update.model_dump(exclude_unset=True).items():
        setattr(db_car, field, value)
    db.commit()
    db.refresh(db_car)
    return db_car

def delete_car(db: Session, car_id: int, user_id: int) -> bool:
    db_car = get_car(db, car_id, user_id)
    if not db_car:
        return False
    db.delete(db_car)
    db.commit()
    return True

# ToDo CRUD operations (Updated for multi-tenancy)
def get_todos_for_car(db: Session, car_id: int, user_id: int) -> List[models.ToDo]:
    return db.query(models.ToDo).filter(
        models.ToDo.car_id == car_id,
        models.ToDo.user_id == user_id
    ).all()

def get_todo(db: Session, todo_id: int, user_id: int) -> Optional[models.ToDo]:
    return db.query(models.ToDo).filter(
        models.ToDo.id == todo_id,
        models.ToDo.user_id == user_id
    ).first()

def create_todo(db: Session, todo: schemas.ToDoCreate, user_id: int) -> models.ToDo:
    db_todo = models.ToDo(**todo.model_dump(), user_id=user_id)
    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)
    return db_todo

def update_todo(db: Session, todo_id: int, todo_update: schemas.ToDoUpdate, user_id: int) -> Optional[models.ToDo]:
    db_todo = get_todo(db, todo_id, user_id)
    if not db_todo:
        return None
    for field, value in todo_update.model_dump(exclude_unset=True).items():
        setattr(db_todo, field, value)
    if todo_update.status == "resolved":
        db_todo.resolved_at = datetime.now(UTC)
    db.commit()
    db.refresh(db_todo)
    return db_todo

def delete_todo(db: Session, todo_id: int, user_id: int) -> bool:
    db_todo = get_todo(db, todo_id, user_id)
    if not db_todo:
        return False
    db.delete(db_todo)
    db.commit()
    return True 