from sqlalchemy.orm import Session
from . import models, schemas
from datetime import datetime, UTC
from typing import List, Optional

def get_car(db: Session, car_id: int) -> Optional[models.Car]:
    return db.query(models.Car).filter(models.Car.id == car_id).first()

def get_cars(db: Session, skip: int = 0, limit: int = 100) -> List[models.Car]:
    return db.query(models.Car).offset(skip).limit(limit).all()

def create_car(db: Session, car: schemas.CarCreate) -> models.Car:
    db_car = models.Car(**car.model_dump())
    db.add(db_car)
    db.commit()
    db.refresh(db_car)
    return db_car

def update_car(db: Session, car_id: int, car_update: schemas.CarUpdate) -> Optional[models.Car]:
    db_car = get_car(db, car_id)
    if not db_car:
        return None
    for field, value in car_update.model_dump(exclude_unset=True).items():
        setattr(db_car, field, value)
    db.commit()
    db.refresh(db_car)
    return db_car

def delete_car(db: Session, car_id: int) -> bool:
    db_car = get_car(db, car_id)
    if not db_car:
        return False
    db.delete(db_car)
    db.commit()
    return True

def get_todos_for_car(db: Session, car_id: int) -> List[models.ToDo]:
    return db.query(models.ToDo).filter(models.ToDo.car_id == car_id).all()

def create_todo(db: Session, car_id: int, todo: schemas.ToDoCreate) -> models.ToDo:
    db_todo = models.ToDo(**todo.model_dump(), car_id=car_id)
    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)
    return db_todo

def update_todo(db: Session, todo_id: int, todo_update: schemas.ToDoUpdate) -> Optional[models.ToDo]:
    db_todo = db.query(models.ToDo).filter(models.ToDo.id == todo_id).first()
    if not db_todo:
        return None
    for field, value in todo_update.model_dump(exclude_unset=True).items():
        setattr(db_todo, field, value)
    if todo_update.status == "resolved":
        db_todo.resolved_at = datetime.now(UTC)
    db.commit()
    db.refresh(db_todo)
    return db_todo

def delete_todo(db: Session, todo_id: int) -> bool:
    db_todo = db.query(models.ToDo).filter(models.ToDo.id == todo_id).first()
    if not db_todo:
        return False
    db.delete(db_todo)
    db.commit()
    return True 