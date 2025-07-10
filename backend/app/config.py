"""
Application configuration using environment variables.
"""
import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///./car_collection.db"
    
    # Security
    secret_key: str = "your-secret-key-here-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 4
    
    # CORS
    cors_origins: List[str] = ["http://localhost:3000"]
    
    # Application
    environment: str = "development"
    debug: bool = True
    
    # Email (for future use)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    email_from: str = "CarCollection <noreply@example.com>"
    
    # Invitation
    invitation_expiry_days: int = 7
    allow_registration: bool = True
    
    # Server
    host: str = "127.0.0.1"
    port: int = 8000
    
    # Frontend
    frontend_url: str = "http://localhost:3000"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        
        # Parse CORS origins from comma-separated string
        @classmethod
        def parse_env_var(cls, field_name: str, raw_val: str):
            if field_name == 'cors_origins':
                return raw_val.split(',') if raw_val else []
            return raw_val


# Create global settings instance
settings = Settings()