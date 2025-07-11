"""
Service Intervals API Endpoints

This module provides API endpoints for managing service intervals and 
performing service research.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
import json

from . import models, schemas, crud
from .database import get_db
from .auth import get_current_active_user
from .service_research import research_service_intervals

router = APIRouter()

@router.post("/cars/{car_id}/research-intervals", response_model=schemas.ServiceResearchResponse)
async def research_car_intervals(
    car_id: int,
    engine_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Research service intervals for a specific car"""
    
    # Get the car and verify ownership
    car = db.query(models.Car).filter(
        models.Car.id == car_id,
        models.Car.user_id == current_user.id
    ).first()
    
    if not car:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Car not found"
        )
    
    try:
        # Perform research
        intervals, sources_used, confidence_score = await research_service_intervals(
            car.make, car.model, car.year, engine_type
        )
        
        # Convert to response format
        suggested_intervals = [
            schemas.ServiceResearchResult(
                service_item=interval.service_item,
                interval_miles=interval.interval_miles,
                interval_months=interval.interval_months,
                priority=interval.priority,
                cost_estimate_low=interval.cost_estimate_low,
                cost_estimate_high=interval.cost_estimate_high,
                source=interval.source,
                confidence_score=interval.confidence_score,
                notes=interval.notes
            )
            for interval in intervals
        ]
        
        # Log the research attempt
        research_log = models.ServiceResearchLog(
            make=car.make,
            model=car.model,
            year=car.year,
            sources_checked=json.dumps(sources_used),
            intervals_found=len(intervals),
            success_rate=confidence_score * 10.0,  # Convert to percentage
            errors=None
        )
        db.add(research_log)
        db.commit()
        
        return schemas.ServiceResearchResponse(
            car_id=car_id,
            make=car.make,
            model=car.model,
            year=car.year,
            suggested_intervals=suggested_intervals,
            sources_checked=sources_used,
            total_intervals_found=len(intervals),
            research_date=datetime.now()
        )
        
    except Exception as e:
        # Log error
        research_log = models.ServiceResearchLog(
            make=car.make,
            model=car.model,
            year=car.year,
            sources_checked=json.dumps(["error"]),
            intervals_found=0,
            success_rate=0.0,
            errors=json.dumps({"error": str(e)})
        )
        db.add(research_log)
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Research failed: {str(e)}"
        )

@router.post("/cars/{car_id}/service-intervals", response_model=schemas.ServiceIntervalOut, status_code=status.HTTP_201_CREATED)
async def create_service_interval(
    car_id: int,
    interval: schemas.ServiceIntervalCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Create a single service interval for a car, updating if it already exists"""
    
    # Verify car ownership
    car = db.query(models.Car).filter(
        models.Car.id == car_id,
        models.Car.user_id == current_user.id
    ).first()
    
    if not car:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Car not found"
        )
    
    # Check if interval already exists (case-insensitive)
    existing_interval = db.query(models.ServiceInterval).filter(
        models.ServiceInterval.car_id == car_id,
        models.ServiceInterval.user_id == current_user.id,
        models.ServiceInterval.is_active == True,
        func.lower(models.ServiceInterval.service_item) == interval.service_item.lower()
    ).first()
    
    if existing_interval:
        # Update existing interval
        existing_interval.interval_miles = interval.interval_miles
        existing_interval.interval_months = interval.interval_months
        existing_interval.priority = interval.priority or existing_interval.priority
        existing_interval.cost_estimate_low = interval.cost_estimate_low
        existing_interval.cost_estimate_high = interval.cost_estimate_high
        existing_interval.notes = interval.notes or existing_interval.notes
        existing_interval.source = interval.source or existing_interval.source
        existing_interval.updated_at = datetime.now()
        
        db.commit()
        db.refresh(existing_interval)
        
        return existing_interval
    else:
        # Create new interval
        db_interval = models.ServiceInterval(
            user_id=current_user.id,
            car_id=car_id,
            service_item=interval.service_item,
            interval_miles=interval.interval_miles,
            interval_months=interval.interval_months,
            priority=interval.priority or "medium",
            cost_estimate_low=interval.cost_estimate_low,
            cost_estimate_high=interval.cost_estimate_high,
            notes=interval.notes,
            source=interval.source or "user_entered"
        )
        
        db.add(db_interval)
        db.commit()
        db.refresh(db_interval)
        
        return db_interval

@router.post("/cars/{car_id}/service-intervals/bulk", response_model=List[schemas.ServiceIntervalOut])
async def create_service_intervals_bulk(
    car_id: int,
    intervals: List[schemas.ServiceIntervalCreate],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Create multiple service intervals for a car, updating existing ones if they already exist"""
    
    # Verify car ownership
    car = db.query(models.Car).filter(
        models.Car.id == car_id,
        models.Car.user_id == current_user.id
    ).first()
    
    if not car:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Car not found"
        )
    
    # Get all existing intervals for this car
    existing_intervals = db.query(models.ServiceInterval).filter(
        models.ServiceInterval.car_id == car_id,
        models.ServiceInterval.user_id == current_user.id,
        models.ServiceInterval.is_active == True
    ).all()
    
    # Create a dictionary of existing intervals by service_item (case-insensitive)
    existing_dict = {interval.service_item.lower(): interval for interval in existing_intervals}
    
    processed_intervals = []
    
    for interval_data in intervals:
        service_item_lower = interval_data.service_item.lower()
        
        # Check if interval already exists (case-insensitive)
        if service_item_lower in existing_dict:
            # Update existing interval
            existing_interval = existing_dict[service_item_lower]
            existing_interval.interval_miles = interval_data.interval_miles
            existing_interval.interval_months = interval_data.interval_months
            existing_interval.priority = interval_data.priority or existing_interval.priority
            existing_interval.cost_estimate_low = interval_data.cost_estimate_low
            existing_interval.cost_estimate_high = interval_data.cost_estimate_high
            existing_interval.notes = interval_data.notes or existing_interval.notes
            existing_interval.source = interval_data.source or existing_interval.source
            existing_interval.updated_at = datetime.now()
            processed_intervals.append(existing_interval)
        else:
            # Create new interval
            db_interval = models.ServiceInterval(
                user_id=current_user.id,
                car_id=car_id,
                service_item=interval_data.service_item,
                interval_miles=interval_data.interval_miles,
                interval_months=interval_data.interval_months,
                priority=interval_data.priority or "medium",
                cost_estimate_low=interval_data.cost_estimate_low,
                cost_estimate_high=interval_data.cost_estimate_high,
                notes=interval_data.notes,
                source=interval_data.source or "user_entered"
            )
            
            db.add(db_interval)
            processed_intervals.append(db_interval)
    
    db.commit()
    
    # Refresh all objects to get updated data
    for interval in processed_intervals:
        db.refresh(interval)
    
    return processed_intervals

@router.get("/cars/{car_id}/service-intervals", response_model=List[schemas.ServiceIntervalOut])
async def get_car_service_intervals(
    car_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get all service intervals for a car"""
    
    # Verify car ownership
    car = db.query(models.Car).filter(
        models.Car.id == car_id,
        models.Car.user_id == current_user.id
    ).first()
    
    if not car:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Car not found"
        )
    
    intervals = db.query(models.ServiceInterval).filter(
        models.ServiceInterval.car_id == car_id,
        models.ServiceInterval.user_id == current_user.id,
        models.ServiceInterval.is_active == True
    ).all()
    
    return intervals

@router.put("/service-intervals/{interval_id}", response_model=schemas.ServiceIntervalOut)
async def update_service_interval(
    interval_id: int,
    interval_update: schemas.ServiceIntervalUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Update a service interval"""
    
    # Get the interval and verify ownership
    interval = db.query(models.ServiceInterval).filter(
        models.ServiceInterval.id == interval_id,
        models.ServiceInterval.user_id == current_user.id
    ).first()
    
    if not interval:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service interval not found"
        )
    
    # Update fields
    update_data = interval_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(interval, field, value)
    
    interval.updated_at = datetime.now()
    
    db.commit()
    db.refresh(interval)
    
    return interval

@router.delete("/service-intervals/{interval_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service_interval(
    interval_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Delete a service interval"""
    
    # Get the interval and verify ownership
    interval = db.query(models.ServiceInterval).filter(
        models.ServiceInterval.id == interval_id,
        models.ServiceInterval.user_id == current_user.id
    ).first()
    
    if not interval:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service interval not found"
        )
    
    db.delete(interval)
    db.commit()
    
    return {"message": "Service interval deleted successfully"}

@router.post("/cars/{car_id}/service-history", response_model=schemas.ServiceHistoryOut, status_code=status.HTTP_201_CREATED)
async def create_service_history(
    car_id: int,
    service_data: schemas.ServiceHistoryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Create a new service history entry"""
    
    # Verify car ownership
    car = db.query(models.Car).filter(
        models.Car.id == car_id,
        models.Car.user_id == current_user.id
    ).first()
    
    if not car:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Car not found"
        )
    
    # Create service history entry
    db_service = models.ServiceHistory(
        user_id=current_user.id,
        car_id=car_id,
        service_item=service_data.service_item,
        performed_date=service_data.performed_date,
        mileage=service_data.mileage,
        cost=service_data.cost,
        parts_cost=service_data.parts_cost,
        labor_cost=service_data.labor_cost,
        tax=service_data.tax,
        shop=service_data.shop,
        invoice_number=service_data.invoice_number,
        notes=service_data.notes,
        next_due_date=service_data.next_due_date,
        next_due_mileage=service_data.next_due_mileage
    )
    
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    
    return db_service

@router.get("/cars/{car_id}/service-history", response_model=List[schemas.ServiceHistoryOut])
async def get_car_service_history(
    car_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get service history for a car"""
    
    # Verify car ownership
    car = db.query(models.Car).filter(
        models.Car.id == car_id,
        models.Car.user_id == current_user.id
    ).first()
    
    if not car:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Car not found"
        )
    
    history = db.query(models.ServiceHistory).filter(
        models.ServiceHistory.car_id == car_id,
        models.ServiceHistory.user_id == current_user.id
    ).order_by(models.ServiceHistory.performed_date.desc()).all()
    
    return history

@router.put("/service-history/{service_id}", response_model=schemas.ServiceHistoryOut)
async def update_service_history(
    service_id: int,
    service_update: schemas.ServiceHistoryUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Update a service history entry"""
    
    # Get the service history entry and verify ownership
    service = db.query(models.ServiceHistory).filter(
        models.ServiceHistory.id == service_id,
        models.ServiceHistory.user_id == current_user.id
    ).first()
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service history entry not found"
        )
    
    # Update fields
    update_data = service_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(service, field, value)
    
    db.commit()
    db.refresh(service)
    
    return service

@router.delete("/service-history/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service_history(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Delete a service history entry"""
    
    # Get the service history entry and verify ownership
    service = db.query(models.ServiceHistory).filter(
        models.ServiceHistory.id == service_id,
        models.ServiceHistory.user_id == current_user.id
    ).first()
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service history entry not found"
        )
    
    db.delete(service)
    db.commit()
    
    return {"message": "Service history entry deleted successfully"}

@router.get("/service-intervals/due", response_model=List[schemas.ServiceIntervalOut])
async def get_due_service_intervals(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get all service intervals that are due or overdue for the user"""
    
    # This would need more complex logic to calculate due dates
    # For now, just return all active intervals
    intervals = db.query(models.ServiceInterval).filter(
        models.ServiceInterval.user_id == current_user.id,
        models.ServiceInterval.is_active == True
    ).all()
    
    return intervals