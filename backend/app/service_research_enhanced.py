"""
Enhanced Service Research with Engine Type Support
"""

from typing import List, Optional, Tuple
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class ServiceInterval:
    """Represents a service interval recommendation"""
    service_item: str
    interval_miles: Optional[int] = None
    interval_months: Optional[int] = None
    priority: str = "medium"
    cost_estimate_low: Optional[float] = None
    cost_estimate_high: Optional[float] = None
    source: str = "unknown"
    confidence_score: int = 5
    notes: Optional[str] = None
    engine_type: Optional[str] = None  # New field for engine type

def get_ford_super_duty_intervals(model: str, year: int, engine_type: str = "gas") -> List[ServiceInterval]:
    """Get intervals for Ford Super Duty trucks with engine type support"""
    intervals = []
    
    if engine_type == "diesel":
        # 6.7L Power Stroke Diesel specific
        intervals.extend([
            ServiceInterval(
                service_item="Engine Oil & Filter",
                interval_miles=10000,
                interval_months=6,
                priority="high",
                cost_estimate_low=80.0,
                cost_estimate_high=150.0,
                source="Ford Power Stroke Manual",
                confidence_score=9,
                notes="15W-40 or 10W-30 diesel oil (13 quarts)",
                engine_type="diesel"
            ),
            ServiceInterval(
                service_item="Fuel Filter (Primary)",
                interval_miles=20000,
                interval_months=24,
                priority="high",
                cost_estimate_low=50.0,
                cost_estimate_high=100.0,
                source="Ford Power Stroke Manual",
                confidence_score=9,
                notes="Replace both primary and secondary filters",
                engine_type="diesel"
            ),
            ServiceInterval(
                service_item="Fuel Filter (Secondary)",
                interval_miles=20000,
                interval_months=24,
                priority="high",
                cost_estimate_low=50.0,
                cost_estimate_high=100.0,
                source="Ford Power Stroke Manual",
                confidence_score=9,
                notes="Critical for injector protection",
                engine_type="diesel"
            ),
            ServiceInterval(
                service_item="DEF (Diesel Exhaust Fluid)",
                interval_miles=7500,
                interval_months=None,
                priority="high",
                cost_estimate_low=15.0,
                cost_estimate_high=30.0,
                source="Ford Power Stroke Manual",
                confidence_score=9,
                notes="Refill when low - approx 2.5 gallons",
                engine_type="diesel"
            ),
            ServiceInterval(
                service_item="EGR Valve Cleaning",
                interval_miles=50000,
                interval_months=None,
                priority="medium",
                cost_estimate_low=200.0,
                cost_estimate_high=400.0,
                source="Ford Diesel Specialist",
                confidence_score=7,
                notes="Prevents carbon buildup and costly repairs",
                engine_type="diesel"
            ),
            ServiceInterval(
                service_item="DPF (Diesel Particulate Filter) Service",
                interval_miles=100000,
                interval_months=None,
                priority="medium",
                cost_estimate_low=300.0,
                cost_estimate_high=600.0,
                source="Ford Power Stroke Manual",
                confidence_score=7,
                notes="Clean or replace based on condition",
                engine_type="diesel"
            ),
        ])
    else:
        # Gas engine (6.2L V8 or 7.3L V8)
        intervals.extend([
            ServiceInterval(
                service_item="Engine Oil & Filter",
                interval_miles=7500,
                interval_months=6,
                priority="high",
                cost_estimate_low=40.0,
                cost_estimate_high=80.0,
                source="Ford Scheduled Maintenance",
                confidence_score=8,
                notes="5W-20 or 5W-30 Motorcraft oil (7-8 quarts)",
                engine_type="gas"
            ),
        ])
    
    # Common intervals for both engine types
    intervals.extend([
        ServiceInterval(
            service_item="Tire Rotation",
            interval_miles=7500,
            interval_months=6,
            priority="medium",
            cost_estimate_low=30.0,
            cost_estimate_high=60.0,
            source="Ford Scheduled Maintenance",
            confidence_score=8,
            engine_type="all"
        ),
        ServiceInterval(
            service_item="Transmission Fluid",
            interval_miles=150000,
            interval_months=None,
            priority="high",
            cost_estimate_low=200.0 if engine_type == "gas" else 250.0,
            cost_estimate_high=400.0 if engine_type == "gas" else 450.0,
            source="Ford Super Duty Manual",
            confidence_score=9,
            notes="TorqShift transmission - Mercon LV fluid",
            engine_type="all"
        ),
        ServiceInterval(
            service_item="Transfer Case Fluid",
            interval_miles=60000,
            interval_months=None,
            priority="medium",
            cost_estimate_low=100.0,
            cost_estimate_high=200.0,
            source="Ford 4WD Maintenance",
            confidence_score=8,
            notes="For 4WD models only",
            engine_type="all"
        ),
        ServiceInterval(
            service_item="Differential Fluid (Front & Rear)",
            interval_miles=60000,
            interval_months=None,
            priority="medium",
            cost_estimate_low=150.0,
            cost_estimate_high=300.0,
            source="Ford Super Duty Manual",
            confidence_score=8,
            notes="Synthetic 75W-140 for heavy towing",
            engine_type="all"
        ),
    ])
    
    return intervals

# Example of how to call the enhanced API
async def research_service_intervals_with_engine_type(
    make: str, 
    model: str, 
    year: int, 
    engine_type: Optional[str] = None
) -> Tuple[List[ServiceInterval], List[str], int]:
    """
    Research service intervals with engine type support
    
    Args:
        make: Vehicle manufacturer
        model: Vehicle model
        year: Model year
        engine_type: Optional engine type (gas, diesel, hybrid, electric)
    
    Returns:
        Tuple of (intervals, sources_used, confidence_score)
    """
    
    # Log the research request
    logger.info(f"Researching {year} {make} {model} with engine type: {engine_type or 'not specified'}")
    
    intervals = []
    sources_used = []
    
    # Check if this is a Ford Super Duty
    if make.lower() == "ford" and any(sd in model.lower() for sd in ["f-250", "f250", "f-350", "f350"]):
        if engine_type:
            intervals = get_ford_super_duty_intervals(model, year, engine_type)
            sources_used.append(f"Ford {engine_type.title()} Manual")
        else:
            # Return both sets if engine type not specified
            gas_intervals = get_ford_super_duty_intervals(model, year, "gas")
            diesel_intervals = get_ford_super_duty_intervals(model, year, "diesel")
            intervals = gas_intervals + diesel_intervals
            sources_used.append("Ford Manual (All Engine Types)")
    
    # Calculate confidence
    confidence_score = 8 if engine_type else 6  # Higher confidence with engine type
    
    return intervals, sources_used, confidence_score