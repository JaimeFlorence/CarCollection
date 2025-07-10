"""
User invitation system API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, UTC
from typing import List, Optional
import secrets
import string

from .database import get_db
from .models import User, UserInvitation
from .schemas import UserCreate
from .auth import get_current_admin_user, get_current_active_user, get_password_hash
from .config import settings
from . import crud

router = APIRouter()


def generate_invitation_token() -> str:
    """Generate a secure random token for invitation."""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(32))


@router.post("/api/invitations/create")
def create_invitation(
    email: str,
    is_admin: bool = False,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new user invitation (admin only)."""
    # Check if user already exists
    existing_user = crud.get_user_by_email(db, email=email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Check if there's already a pending invitation
    existing_invitation = db.query(UserInvitation).filter(
        UserInvitation.email == email,
        UserInvitation.used == False,
        UserInvitation.expires_at > datetime.now(UTC)
    ).first()
    
    if existing_invitation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An active invitation already exists for this email"
        )
    
    # Create new invitation
    token = generate_invitation_token()
    expires_at = datetime.now(UTC) + timedelta(days=settings.invitation_expiry_days)
    
    invitation = UserInvitation(
        email=email,
        token=token,
        invited_by_id=current_user.id,
        is_admin=is_admin,
        expires_at=expires_at
    )
    
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    
    # Return the invitation link
    invitation_url = f"{settings.frontend_url}/register?token={token}"
    
    return {
        "id": invitation.id,
        "email": email,
        "invitation_url": invitation_url,
        "expires_at": expires_at.isoformat(),
        "is_admin": is_admin
    }


@router.get("/api/invitations")
def list_invitations(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    include_used: bool = False
):
    """List all invitations (admin only)."""
    query = db.query(UserInvitation)
    
    if not include_used:
        query = query.filter(UserInvitation.used == False)
    
    invitations = query.order_by(UserInvitation.created_at.desc()).all()
    
    return [{
        "id": inv.id,
        "email": inv.email,
        "token": inv.token,  # Include token for URL generation
        "invited_by": inv.invited_by.username,
        "is_admin": inv.is_admin,
        "used": inv.used,
        "used_by": inv.used_by.username if inv.used_by else None,
        "expires_at": inv.expires_at.isoformat(),
        "created_at": inv.created_at.isoformat(),
        "is_expired": inv.expires_at < datetime.now(UTC)
    } for inv in invitations]


@router.post("/api/invitations/validate")
def validate_invitation(token: str, db: Session = Depends(get_db)):
    """Validate an invitation token."""
    invitation = db.query(UserInvitation).filter(
        UserInvitation.token == token
    ).first()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid invitation token"
        )
    
    if invitation.used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invitation has already been used"
        )
    
    if invitation.expires_at < datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invitation has expired"
        )
    
    return {
        "valid": True,
        "email": invitation.email,
        "is_admin": invitation.is_admin
    }


@router.post("/api/invitations/register")
def register_with_invitation(
    token: str,
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """Register a new user using an invitation token."""
    # Validate invitation
    invitation = db.query(UserInvitation).filter(
        UserInvitation.token == token
    ).first()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid invitation token"
        )
    
    if invitation.used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invitation has already been used"
        )
    
    if invitation.expires_at < datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invitation has expired"
        )
    
    # Check if email matches invitation
    if user_data.email != invitation.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email does not match invitation"
        )
    
    # Check if username already exists
    if crud.get_user_by_username(db, username=user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        is_admin=invitation.is_admin,
        email_verified=True  # Email is pre-verified via invitation
    )
    
    db.add(db_user)
    db.flush()  # Get the user ID
    
    # Mark invitation as used
    invitation.used = True
    invitation.used_by_id = db_user.id
    
    db.commit()
    db.refresh(db_user)
    
    return {
        "id": db_user.id,
        "username": db_user.username,
        "email": db_user.email,
        "is_admin": db_user.is_admin,
        "is_active": db_user.is_active
    }


@router.delete("/api/invitations/{invitation_id}")
def delete_invitation(
    invitation_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete an invitation (admin only)."""
    invitation = db.query(UserInvitation).filter(
        UserInvitation.id == invitation_id
    ).first()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    if invitation.used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete a used invitation"
        )
    
    db.delete(invitation)
    db.commit()
    
    return {"message": "Invitation deleted successfully"}