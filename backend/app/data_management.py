"""
Data management endpoints for export, import, and clearing user data.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Dict
import xml.etree.ElementTree as ET
from datetime import datetime
import xml.dom.minidom as minidom

from . import models, schemas, crud
from .database import get_db
from .auth import get_current_active_user

router = APIRouter()


def create_xml_export(user: models.User, db: Session, include_cars: bool = True, 
                     include_todos: bool = True, include_service_intervals: bool = True,
                     include_service_history: bool = True) -> str:
    """Create XML export of selected user data."""
    # Create root element
    root = ET.Element("CarCollectionBackup", version="1.0")
    
    # Add metadata
    metadata = ET.SubElement(root, "Metadata")
    ET.SubElement(metadata, "ExportDate").text = datetime.utcnow().isoformat()
    ET.SubElement(metadata, "AppVersion").text = "2.4"
    
    # Add export configuration
    export_config = ET.SubElement(metadata, "ExportConfig")
    ET.SubElement(export_config, "IncludeCars").text = str(include_cars)
    ET.SubElement(export_config, "IncludeTodos").text = str(include_todos)
    ET.SubElement(export_config, "IncludeServiceIntervals").text = str(include_service_intervals)
    ET.SubElement(export_config, "IncludeServiceHistory").text = str(include_service_history)
    
    # Get data based on selections
    cars = []
    todos = []
    service_intervals = []
    service_history = []
    
    if include_cars:
        cars = db.query(models.Car).filter(models.Car.user_id == user.id).all()
    
    if include_todos:
        todos = db.query(models.ToDo).filter(models.ToDo.user_id == user.id).all()
    
    if include_service_intervals and include_cars:
        service_intervals = db.query(models.ServiceInterval).filter(
            models.ServiceInterval.user_id == user.id
        ).all()
    
    if include_service_history and include_cars:
        service_history = db.query(models.ServiceHistory).filter(
            models.ServiceHistory.user_id == user.id
        ).all()
    
    # Add record counts
    counts = ET.SubElement(metadata, "RecordCounts")
    ET.SubElement(counts, "Cars").text = str(len(cars))
    ET.SubElement(counts, "Todos").text = str(len(todos))
    ET.SubElement(counts, "ServiceIntervals").text = str(len(service_intervals))
    ET.SubElement(counts, "ServiceHistory").text = str(len(service_history))
    
    # Export Cars (only if included)
    if include_cars and cars:
        cars_elem = ET.SubElement(root, "Cars")
        for car in cars:
            car_elem = ET.SubElement(cars_elem, "Car", id=str(car.id))
            ET.SubElement(car_elem, "Make").text = car.make
            ET.SubElement(car_elem, "Model").text = car.model
            ET.SubElement(car_elem, "Year").text = str(car.year)
            if car.vin:
                ET.SubElement(car_elem, "VIN").text = car.vin
            ET.SubElement(car_elem, "Mileage").text = str(car.mileage)
            if car.license_plate:
                ET.SubElement(car_elem, "LicensePlate").text = car.license_plate
            if car.insurance_info:
                ET.SubElement(car_elem, "InsuranceInfo").text = car.insurance_info
            if car.notes:
                ET.SubElement(car_elem, "Notes").text = car.notes
            if car.group_name:
                ET.SubElement(car_elem, "GroupName").text = car.group_name
            
            # Export service intervals for this car (if included)
            if include_service_intervals:
                car_intervals = [si for si in service_intervals if si.car_id == car.id]
                if car_intervals:
                    intervals_elem = ET.SubElement(car_elem, "ServiceIntervals")
                    for interval in car_intervals:
                        interval_elem = ET.SubElement(intervals_elem, "Interval")
                        ET.SubElement(interval_elem, "ServiceItem").text = interval.service_item
                        if interval.interval_miles:
                            ET.SubElement(interval_elem, "IntervalMiles").text = str(interval.interval_miles)
                        if interval.interval_months:
                            ET.SubElement(interval_elem, "IntervalMonths").text = str(interval.interval_months)
                        ET.SubElement(interval_elem, "Priority").text = interval.priority
                        if interval.cost_estimate_low:
                            ET.SubElement(interval_elem, "CostEstimateLow").text = str(interval.cost_estimate_low)
                        if interval.cost_estimate_high:
                            ET.SubElement(interval_elem, "CostEstimateHigh").text = str(interval.cost_estimate_high)
                        if interval.notes:
                            ET.SubElement(interval_elem, "Notes").text = interval.notes
                        if interval.source:
                            ET.SubElement(interval_elem, "Source").text = interval.source
            
            # Export service history for this car (if included)
            if include_service_history:
                car_history = [sh for sh in service_history if sh.car_id == car.id]
                if car_history:
                    history_elem = ET.SubElement(car_elem, "ServiceHistory")
                    for service in car_history:
                        service_elem = ET.SubElement(history_elem, "Service")
                        ET.SubElement(service_elem, "ServiceItem").text = service.service_item
                        ET.SubElement(service_elem, "PerformedDate").text = service.performed_date.isoformat()
                        if service.mileage:
                            ET.SubElement(service_elem, "Mileage").text = str(service.mileage)
                        if service.cost:
                            ET.SubElement(service_elem, "Cost").text = str(service.cost)
                        if service.parts_cost:
                            ET.SubElement(service_elem, "PartsCost").text = str(service.parts_cost)
                        if service.labor_cost:
                            ET.SubElement(service_elem, "LaborCost").text = str(service.labor_cost)
                        if service.tax:
                            ET.SubElement(service_elem, "Tax").text = str(service.tax)
                        if service.shop:
                            ET.SubElement(service_elem, "Shop").text = service.shop
                        if service.invoice_number:
                            ET.SubElement(service_elem, "InvoiceNumber").text = service.invoice_number
                        if service.notes:
                            ET.SubElement(service_elem, "Notes").text = service.notes
    
    # Export Todos (only if included)
    if include_todos and todos:
        todos_elem = ET.SubElement(root, "Todos")
        for todo in todos:
            todo_elem = ET.SubElement(todos_elem, "Todo")
            ET.SubElement(todo_elem, "Title").text = todo.title
            if todo.description:
                ET.SubElement(todo_elem, "Description").text = todo.description
            ET.SubElement(todo_elem, "Priority").text = todo.priority
            ET.SubElement(todo_elem, "Status").text = todo.status
            ET.SubElement(todo_elem, "CarId").text = str(todo.car_id)
            if todo.due_date:
                ET.SubElement(todo_elem, "DueDate").text = todo.due_date.isoformat()
    
    # Convert to pretty-printed XML string
    xml_str = ET.tostring(root, encoding='unicode')
    dom = minidom.parseString(xml_str)
    pretty_xml = dom.toprettyxml(indent="  ")
    
    # Remove extra blank lines
    lines = [line for line in pretty_xml.split('\n') if line.strip()]
    return '\n'.join(lines)


@router.post("/data/export")
async def export_data(
    include_cars: bool = True,
    include_todos: bool = True,
    include_service_intervals: bool = True,
    include_service_history: bool = True,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Export selected user data as XML."""
    try:
        xml_content = create_xml_export(
            current_user, db,
            include_cars=include_cars,
            include_todos=include_todos,
            include_service_intervals=include_service_intervals,
            include_service_history=include_service_history
        )
        
        # Generate filename that indicates what's included
        data_types = []
        if include_cars: data_types.append("cars")
        if include_todos: data_types.append("todos")
        if include_service_intervals: data_types.append("intervals")
        if include_service_history: data_types.append("history")
        
        filename_suffix = "_".join(data_types) if data_types else "empty"
        filename = f"car_collection_{filename_suffix}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xml"
        
        return Response(
            content=xml_content,
            media_type="application/xml",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.delete("/data/clear-all")
async def clear_all_data(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Clear all user data (cars, todos, service history, etc.)."""
    try:
        # Delete in correct order to respect foreign keys
        db.query(models.ServiceHistory).filter_by(user_id=current_user.id).delete()
        db.query(models.ServiceInterval).filter_by(user_id=current_user.id).delete()
        db.query(models.ToDo).filter_by(user_id=current_user.id).delete()
        db.query(models.Car).filter_by(user_id=current_user.id).delete()
        
        db.commit()
        
        return {"message": "All data cleared successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to clear data: {str(e)}")


@router.post("/data/import")
async def import_data(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Import data from XML backup file."""
    try:
        # Read and parse XML file
        content = await file.read()
        root = ET.fromstring(content.decode('utf-8'))
        
        # Validate XML structure
        if root.tag != "CarCollectionBackup":
            raise HTTPException(status_code=400, detail="Invalid backup file format")
        
        # Extract metadata
        metadata = root.find("Metadata")
        if metadata is None:
            raise HTTPException(status_code=400, detail="Missing metadata in backup file")
        
        # Keep track of ID mappings (old ID -> new ID)
        car_id_map = {}
        
        # Import Cars
        cars_elem = root.find("Cars")
        if cars_elem is not None:
            for car_elem in cars_elem.findall("Car"):
                old_car_id = car_elem.get("id")
                
                # Create car
                car_data = {
                    "make": car_elem.find("Make").text,
                    "model": car_elem.find("Model").text,
                    "year": int(car_elem.find("Year").text),
                    "mileage": int(car_elem.find("Mileage").text),
                }
                
                # Optional fields
                if car_elem.find("VIN") is not None:
                    car_data["vin"] = car_elem.find("VIN").text
                if car_elem.find("LicensePlate") is not None:
                    car_data["license_plate"] = car_elem.find("LicensePlate").text
                if car_elem.find("InsuranceInfo") is not None:
                    car_data["insurance_info"] = car_elem.find("InsuranceInfo").text
                if car_elem.find("Notes") is not None:
                    car_data["notes"] = car_elem.find("Notes").text
                if car_elem.find("GroupName") is not None:
                    car_data["group_name"] = car_elem.find("GroupName").text
                
                # Create car in database
                car_create = schemas.CarCreate(**car_data)
                new_car = crud.create_car(db, car_create, current_user.id)
                car_id_map[old_car_id] = new_car.id
                
                # Import service intervals for this car
                intervals_elem = car_elem.find("ServiceIntervals")
                if intervals_elem is not None:
                    for interval_elem in intervals_elem.findall("Interval"):
                        interval_data = {
                            "car_id": new_car.id,
                            "service_item": interval_elem.find("ServiceItem").text,
                            "priority": interval_elem.find("Priority").text,
                        }
                        
                        if interval_elem.find("IntervalMiles") is not None:
                            interval_data["interval_miles"] = int(interval_elem.find("IntervalMiles").text)
                        if interval_elem.find("IntervalMonths") is not None:
                            interval_data["interval_months"] = int(interval_elem.find("IntervalMonths").text)
                        if interval_elem.find("CostEstimateLow") is not None:
                            interval_data["cost_estimate_low"] = float(interval_elem.find("CostEstimateLow").text)
                        if interval_elem.find("CostEstimateHigh") is not None:
                            interval_data["cost_estimate_high"] = float(interval_elem.find("CostEstimateHigh").text)
                        if interval_elem.find("Notes") is not None:
                            interval_data["notes"] = interval_elem.find("Notes").text
                        if interval_elem.find("Source") is not None:
                            interval_data["source"] = interval_elem.find("Source").text
                        
                        interval_create = schemas.ServiceIntervalCreate(**interval_data)
                        crud.create_service_interval(db, interval_create, current_user.id)
                
                # Import service history for this car
                history_elem = car_elem.find("ServiceHistory")
                if history_elem is not None:
                    for service_elem in history_elem.findall("Service"):
                        service_data = {
                            "car_id": new_car.id,
                            "service_item": service_elem.find("ServiceItem").text,
                            "performed_date": datetime.fromisoformat(service_elem.find("PerformedDate").text),
                        }
                        
                        if service_elem.find("Mileage") is not None:
                            service_data["mileage"] = int(service_elem.find("Mileage").text)
                        if service_elem.find("Cost") is not None:
                            service_data["cost"] = float(service_elem.find("Cost").text)
                        if service_elem.find("PartsCost") is not None:
                            service_data["parts_cost"] = float(service_elem.find("PartsCost").text)
                        if service_elem.find("LaborCost") is not None:
                            service_data["labor_cost"] = float(service_elem.find("LaborCost").text)
                        if service_elem.find("Tax") is not None:
                            service_data["tax"] = float(service_elem.find("Tax").text)
                        if service_elem.find("Shop") is not None:
                            service_data["shop"] = service_elem.find("Shop").text
                        if service_elem.find("InvoiceNumber") is not None:
                            service_data["invoice_number"] = service_elem.find("InvoiceNumber").text
                        if service_elem.find("Notes") is not None:
                            service_data["notes"] = service_elem.find("Notes").text
                        
                        service_create = schemas.ServiceHistoryCreate(**service_data)
                        crud.create_service_history(db, service_create, current_user.id)
        
        # Import Todos
        todos_elem = root.find("Todos")
        if todos_elem is not None:
            for todo_elem in todos_elem.findall("Todo"):
                old_car_id = todo_elem.find("CarId").text
                
                # Skip if car wasn't imported
                if old_car_id not in car_id_map:
                    continue
                
                todo_data = {
                    "car_id": car_id_map[old_car_id],
                    "title": todo_elem.find("Title").text,
                    "priority": todo_elem.find("Priority").text,
                    "status": todo_elem.find("Status").text,
                }
                
                if todo_elem.find("Description") is not None:
                    todo_data["description"] = todo_elem.find("Description").text
                if todo_elem.find("DueDate") is not None:
                    todo_data["due_date"] = datetime.fromisoformat(todo_elem.find("DueDate").text)
                
                todo_create = schemas.ToDoCreate(**todo_data)
                crud.create_todo(db, todo_create, current_user.id)
        
        db.commit()
        
        # Return summary
        return {
            "message": "Data imported successfully",
            "imported": {
                "cars": len(car_id_map),
                "todos": len(todos_elem.findall("Todo")) if todos_elem is not None else 0,
            }
        }
        
    except ET.ParseError as e:
        raise HTTPException(status_code=400, detail=f"Invalid XML format: {str(e)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")