from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

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
    password: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

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
    group_name: Optional[str] = "Daily Drivers"

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
    group_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class CarOut(CarBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    todos: List[ToDoOut] = []

    model_config = ConfigDict(from_attributes=True)

# Service Interval Schemas
class ServiceIntervalBase(BaseModel):
    service_item: str
    interval_miles: Optional[int] = None
    interval_months: Optional[int] = None
    priority: Optional[str] = "medium"
    cost_estimate_low: Optional[Decimal] = None
    cost_estimate_high: Optional[Decimal] = None
    notes: Optional[str] = None
    source: Optional[str] = None

class ServiceIntervalCreate(ServiceIntervalBase):
    car_id: int

class ServiceIntervalUpdate(BaseModel):
    service_item: Optional[str] = None
    interval_miles: Optional[int] = None
    interval_months: Optional[int] = None
    priority: Optional[str] = None
    cost_estimate_low: Optional[Decimal] = None
    cost_estimate_high: Optional[Decimal] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class ServiceIntervalOut(ServiceIntervalBase):
    id: int
    user_id: int
    car_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Service History Schemas
class ServiceHistoryBase(BaseModel):
    service_item: str
    performed_date: datetime
    mileage: Optional[int] = None
    cost: Optional[Decimal] = None
    parts_cost: Optional[Decimal] = None  # New field for parts breakdown
    labor_cost: Optional[Decimal] = None  # New field for labor breakdown
    tax: Optional[Decimal] = None  # New field for tax
    shop: Optional[str] = None  # New field
    invoice_number: Optional[str] = None  # New field
    notes: Optional[str] = None
    next_due_date: Optional[datetime] = None
    next_due_mileage: Optional[int] = None

class ServiceHistoryCreate(ServiceHistoryBase):
    car_id: int

class ServiceHistoryUpdate(BaseModel):
    service_item: Optional[str] = None
    performed_date: Optional[datetime] = None
    mileage: Optional[int] = None
    cost: Optional[Decimal] = None
    parts_cost: Optional[Decimal] = None
    labor_cost: Optional[Decimal] = None
    tax: Optional[Decimal] = None
    shop: Optional[str] = None
    invoice_number: Optional[str] = None
    notes: Optional[str] = None
    next_due_date: Optional[datetime] = None
    next_due_mileage: Optional[int] = None

class ServiceHistoryOut(ServiceHistoryBase):
    id: int
    user_id: int
    car_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Service Research Schemas
class ServiceResearchRequest(BaseModel):
    car_id: int

class ServiceResearchResult(BaseModel):
    service_item: str
    interval_miles: Optional[int] = None
    interval_months: Optional[int] = None
    priority: str = "medium"
    cost_estimate_low: Optional[Decimal] = None
    cost_estimate_high: Optional[Decimal] = None
    source: str
    confidence_score: int = 5
    notes: Optional[str] = None

class ServiceResearchResponse(BaseModel):
    car_id: int
    make: str
    model: str
    year: int
    suggested_intervals: List[ServiceResearchResult]
    sources_checked: List[str]
    total_intervals_found: int
    research_date: datetime

class ServiceIntervalBulkCreate(BaseModel):
    car_id: int
    intervals: List[ServiceIntervalCreate] 