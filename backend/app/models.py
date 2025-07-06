from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
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

class Car(Base):
    __tablename__ = "cars"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Multi-tenancy
    year = Column(Integer, nullable=False)
    make = Column(String, nullable=False)
    model = Column(String, nullable=False)
    vin = Column(String, unique=True, nullable=True)
    mileage = Column(Integer, nullable=True)
    license_plate = Column(String, nullable=True)
    insurance_info = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))

    # Relationships
    user = relationship("User", back_populates="cars")
    todos = relationship("ToDo", back_populates="car", cascade="all, delete-orphan")

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