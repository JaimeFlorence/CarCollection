from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, schemas, crud, database
from .database import SessionLocal, engine
from typing import List

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Car Collection API")

# Allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Car Endpoints
@app.post("/cars/", response_model=schemas.CarOut, status_code=status.HTTP_201_CREATED)
def create_car(car: schemas.CarCreate, db: Session = Depends(get_db)):
    return crud.create_car(db, car)

@app.get("/cars/", response_model=List[schemas.CarOut])
def read_cars(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_cars(db, skip=skip, limit=limit)

@app.get("/cars/{car_id}", response_model=schemas.CarOut)
def read_car(car_id: int, db: Session = Depends(get_db)):
    car = crud.get_car(db, car_id)
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    return car

@app.put("/cars/{car_id}", response_model=schemas.CarOut)
def update_car(car_id: int, car_update: schemas.CarUpdate, db: Session = Depends(get_db)):
    car = crud.update_car(db, car_id, car_update)
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    return car

@app.delete("/cars/{car_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_car(car_id: int, db: Session = Depends(get_db)):
    if not crud.delete_car(db, car_id):
        raise HTTPException(status_code=404, detail="Car not found")
    return None

# ToDo Endpoints
@app.get("/cars/{car_id}/todos/", response_model=List[schemas.ToDoOut])
def read_todos_for_car(car_id: int, db: Session = Depends(get_db)):
    return crud.get_todos_for_car(db, car_id)

@app.post("/cars/{car_id}/todos/", response_model=schemas.ToDoOut, status_code=status.HTTP_201_CREATED)
def create_todo(car_id: int, todo: schemas.ToDoCreate, db: Session = Depends(get_db)):
    return crud.create_todo(db, car_id, todo)

@app.put("/todos/{todo_id}", response_model=schemas.ToDoOut)
def update_todo(todo_id: int, todo_update: schemas.ToDoUpdate, db: Session = Depends(get_db)):
    todo = crud.update_todo(db, todo_id, todo_update)
    if not todo:
        raise HTTPException(status_code=404, detail="ToDo not found")
    return todo

@app.delete("/todos/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_todo(todo_id: int, db: Session = Depends(get_db)):
    if not crud.delete_todo(db, todo_id):
        raise HTTPException(status_code=404, detail="ToDo not found")
    return None 