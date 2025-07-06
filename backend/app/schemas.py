from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, List
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserCreateByAdmin(UserBase):
    password: str
    is_admin: bool = False
    send_invitation: bool = True

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None

class UserOut(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    email_verified: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class UserLogin(BaseModel):
    username: str
    password: str

class UserInvitation(BaseModel):
    email: EmailStr
    username: str
    is_admin: bool = False

# Authentication Schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class TokenData(BaseModel):
    username: Optional[str] = None

# ToDo Schemas (Updated for multi-tenancy)
class ToDoBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "open"
    priority: Optional[str] = "medium"
    due_date: Optional[datetime] = None

class ToDoCreate(ToDoBase):
    car_id: int

class ToDoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

class ToDoOut(ToDoBase):
    id: int
    user_id: int
    car_id: int
    created_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# Car Schemas (Updated for multi-tenancy)
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
    user_id: int
    created_at: datetime
    updated_at: datetime
    todos: List[ToDoOut] = []

    model_config = ConfigDict(from_attributes=True) 