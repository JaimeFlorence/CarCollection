from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Numeric
from sqlalchemy.orm import relationship
from datetime import datetime, UTC
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    email_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))
    last_login = Column(DateTime, nullable=True)

    # Relationships
    cars = relationship("Car", back_populates="user", cascade="all, delete-orphan")
    todos = relationship("ToDo", back_populates="user", cascade="all, delete-orphan")
    service_intervals = relationship("ServiceInterval", cascade="all, delete-orphan")
    service_history = relationship("ServiceHistory", cascade="all, delete-orphan")

class Car(Base):
    __tablename__ = "cars"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Multi-tenancy
    year = Column(Integer, nullable=False)
    make = Column(String, nullable=False)
    model = Column(String, nullable=False)
    vin = Column(String, nullable=True)  # No unique constraint - just an optional field
    mileage = Column(Integer, nullable=True)
    license_plate = Column(String, nullable=True)
    insurance_info = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    group_name = Column(String, nullable=True, default="Daily Drivers")  # Car grouping
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))

    # Relationships
    user = relationship("User", back_populates="cars")
    todos = relationship("ToDo", back_populates="car", cascade="all, delete-orphan")
    service_intervals = relationship("ServiceInterval", cascade="all, delete-orphan")
    service_history = relationship("ServiceHistory", cascade="all, delete-orphan")

class ToDo(Base):
    __tablename__ = "todos"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Multi-tenancy
    car_id = Column(Integer, ForeignKey("cars.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="open")  # open or resolved
    priority = Column(String, default="medium")  # low, medium, high
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="todos")
    car = relationship("Car", back_populates="todos")

class ServiceInterval(Base):
    __tablename__ = "service_intervals"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    car_id = Column(Integer, ForeignKey("cars.id"), nullable=False)
    service_item = Column(String, nullable=False)
    interval_miles = Column(Integer, nullable=True)
    interval_months = Column(Integer, nullable=True)
    priority = Column(String, default="medium")  # low, medium, high
    cost_estimate_low = Column(Numeric(10, 2), nullable=True)
    cost_estimate_high = Column(Numeric(10, 2), nullable=True)
    notes = Column(Text, nullable=True)
    source = Column(String, nullable=True)  # "researched" or "user_entered"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))

    # Relationships
    user = relationship("User", overlaps="service_intervals")
    car = relationship("Car", overlaps="service_intervals")

class ServiceHistory(Base):
    __tablename__ = "service_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    car_id = Column(Integer, ForeignKey("cars.id"), nullable=False)
    service_item = Column(String, nullable=False)
    performed_date = Column(DateTime, nullable=False)
    mileage = Column(Integer, nullable=True)
    cost = Column(Numeric(10, 2), nullable=True)
    parts_cost = Column(Numeric(10, 2), nullable=True)  # New field for parts breakdown
    labor_cost = Column(Numeric(10, 2), nullable=True)  # New field for labor breakdown
    tax = Column(Numeric(10, 2), nullable=True)  # New field for tax
    shop = Column(String, nullable=True)  # New field for service provider
    invoice_number = Column(String, nullable=True)  # New field for invoice tracking
    notes = Column(Text, nullable=True)
    next_due_date = Column(DateTime, nullable=True)
    next_due_mileage = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))

    # Relationships
    user = relationship("User", overlaps="service_history")
    car = relationship("Car", overlaps="service_history")

class ServiceIntervalTemplate(Base):
    __tablename__ = "service_interval_templates"
    id = Column(Integer, primary_key=True, index=True)
    make = Column(String, nullable=False)
    model = Column(String, nullable=False)
    year_start = Column(Integer, nullable=True)
    year_end = Column(Integer, nullable=True)
    engine_type = Column(String, nullable=True)
    service_item = Column(String, nullable=False)
    interval_miles = Column(Integer, nullable=True)
    interval_months = Column(Integer, nullable=True)
    priority = Column(String, default="medium")
    cost_estimate_low = Column(Numeric(10, 2), nullable=True)
    cost_estimate_high = Column(Numeric(10, 2), nullable=True)
    source = Column(String, nullable=True)
    confidence_score = Column(Integer, default=5)  # 1-10 based on source reliability
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))

class ServiceResearchLog(Base):
    __tablename__ = "service_research_log"
    id = Column(Integer, primary_key=True, index=True)
    make = Column(String, nullable=False)
    model = Column(String, nullable=False)
    year = Column(Integer, nullable=False)
    research_date = Column(DateTime, default=lambda: datetime.now(UTC))
    sources_checked = Column(Text, nullable=True)  # JSON string of sources
    intervals_found = Column(Integer, default=0)
    success_rate = Column(Numeric(5, 2), nullable=True)
    errors = Column(Text, nullable=True)  # JSON string of errors
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))


class UserInvitation(Base):
    __tablename__ = "user_invitations"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, index=True)
    token = Column(String, unique=True, nullable=False, index=True)
    invited_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_admin = Column(Boolean, default=False)
    used = Column(Boolean, default=False)
    used_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    
    # Relationships
    invited_by = relationship("User", foreign_keys=[invited_by_id])
    used_by = relationship("User", foreign_keys=[used_by_id]) 