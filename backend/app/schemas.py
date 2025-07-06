from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

class ToDoBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "open"
    priority: Optional[str] = "medium"
    due_date: Optional[datetime] = None

class ToDoCreate(ToDoBase):
    pass

class ToDoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

class ToDoOut(ToDoBase):
    id: int
    car_id: int
    created_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class CarBase(BaseModel):
    year: int
    make: str
    model: str
    vin: Optional[str] = None
    mileage: Optional[int] = None
    license_plate: Optional[str] = None
    insurance_info: Optional[str] = None
    notes: Optional[str] = None

class CarCreate(CarBase):
    pass

class CarUpdate(BaseModel):
    year: Optional[int] = None
    make: Optional[str] = None
    model: Optional[str] = None
    vin: Optional[str] = None
    mileage: Optional[int] = None
    license_plate: Optional[str] = None
    insurance_info: Optional[str] = None
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class CarOut(CarBase):
    id: int
    created_at: datetime
    updated_at: datetime
    todos: List[ToDoOut] = []

    model_config = ConfigDict(from_attributes=True) 