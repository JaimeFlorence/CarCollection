"""
Service Interval Research Engine

This module handles automated research of service intervals for vehicles
using various data sources and APIs.
"""

import aiohttp
import asyncio
import json
import re
from typing import List, Dict, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass
from bs4 import BeautifulSoup
import logging
from urllib.parse import quote

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

class ServiceResearchError(Exception):
    """Custom exception for service research errors"""
    pass

class CarMaintenanceDatabase:
    """
    Comprehensive car maintenance database with manufacturer recommendations
    """
    
    def __init__(self):
        self.name = "Manufacturer Database"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    
    async def search_vehicle(self, make: str, model: str, year: int, engine_type: Optional[str] = None) -> List[ServiceInterval]:
        """Get maintenance schedule based on manufacturer recommendations"""
        intervals = []
        
        # Base maintenance items that apply to most vehicles
        base_intervals = self._get_base_intervals(make, model, year)
        
        # Add manufacturer-specific intervals
        make_lower = make.lower()
        if make_lower in ['toyota', 'lexus']:
            intervals.extend(self._get_toyota_intervals(model, year))
        elif make_lower in ['honda', 'acura']:
            intervals.extend(self._get_honda_intervals(model, year))
        elif make_lower == 'ford':
            intervals.extend(self._get_ford_intervals(model, year, engine_type))
        elif make_lower in ['chevrolet', 'gmc', 'buick', 'cadillac']:
            intervals.extend(self._get_gm_intervals(model, year))
        elif make_lower in ['bmw', 'mini']:
            intervals.extend(self._get_bmw_intervals(model, year))
        elif make_lower in ['mercedes-benz', 'mercedes']:
            intervals.extend(self._get_mercedes_intervals(model, year))
        elif make_lower in ['volkswagen', 'vw', 'audi', 'porsche']:
            intervals.extend(self._get_vw_group_intervals(model, year))
        elif make_lower in ['nissan', 'infiniti']:
            intervals.extend(self._get_nissan_intervals(model, year))
        elif make_lower in ['mazda']:
            intervals.extend(self._get_mazda_intervals(model, year))
        elif make_lower in ['subaru']:
            intervals.extend(self._get_subaru_intervals(model, year))
        else:
            # For unknown makes, return comprehensive generic intervals
            intervals.extend(base_intervals)
        
        # If we got manufacturer-specific intervals, add base intervals that aren't duplicates
        if intervals and intervals != base_intervals:
            existing_items = {interval.service_item.lower() for interval in intervals}
            for base_interval in base_intervals:
                if base_interval.service_item.lower() not in existing_items:
                    intervals.append(base_interval)
        
        return intervals
    
    def _get_base_intervals(self, make: str, model: str, year: int) -> List[ServiceInterval]:
        """Get base intervals that apply to most vehicles"""
        return [
            ServiceInterval(
                service_item="Engine Air Filter",
                interval_miles=30000,
                interval_months=36,
                priority="medium",
                cost_estimate_low=25.0,
                cost_estimate_high=50.0,
                source="Industry Standard",
                confidence_score=7,
                notes="Replace more frequently in dusty conditions"
            ),
            ServiceInterval(
                service_item="Cabin Air Filter",
                interval_miles=15000,
                interval_months=12,
                priority="low",
                cost_estimate_low=25.0,
                cost_estimate_high=60.0,
                source="Industry Standard",
                confidence_score=7
            ),
            ServiceInterval(
                service_item="Brake Fluid",
                interval_miles=30000,
                interval_months=36,
                priority="high",
                cost_estimate_low=70.0,
                cost_estimate_high=120.0,
                source="Industry Standard",
                confidence_score=8,
                notes="Critical for brake system performance"
            ),
            ServiceInterval(
                service_item="Coolant/Antifreeze",
                interval_miles=60000,
                interval_months=60,
                priority="high",
                cost_estimate_low=100.0,
                cost_estimate_high=150.0,
                source="Industry Standard",
                confidence_score=7,
                notes="Use manufacturer-specified coolant type"
            ),
            ServiceInterval(
                service_item="Spark Plugs",
                interval_miles=60000 if year < 2010 else 100000,
                interval_months=60 if year < 2010 else 120,
                priority="medium",
                cost_estimate_low=150.0,
                cost_estimate_high=300.0,
                source="Industry Standard",
                confidence_score=7,
                notes="Platinum/Iridium plugs last longer"
            ),
            ServiceInterval(
                service_item="Battery Test",
                interval_miles=None,
                interval_months=12,
                priority="medium",
                cost_estimate_low=0.0,
                cost_estimate_high=20.0,
                source="Industry Standard",
                confidence_score=8,
                notes="Most batteries last 3-5 years"
            ),
            ServiceInterval(
                service_item="Brake Inspection",
                interval_miles=12000,
                interval_months=12,
                priority="high",
                cost_estimate_low=0.0,
                cost_estimate_high=50.0,
                source="Industry Standard",
                confidence_score=8,
                notes="Visual inspection of pads, rotors, and fluid"
            ),
            ServiceInterval(
                service_item="Wheel Alignment Check",
                interval_miles=None,
                interval_months=12,
                priority="medium",
                cost_estimate_low=0.0,
                cost_estimate_high=30.0,
                source="Industry Standard",
                confidence_score=7,
                notes="Check if vehicle pulls or tires wear unevenly"
            )
        ]
    
    def _get_toyota_intervals(self, model: str, year: int) -> List[ServiceInterval]:
        """Toyota/Lexus specific intervals"""
        intervals = [
            ServiceInterval(
                service_item="Engine Oil & Filter",
                interval_miles=5000,
                interval_months=6,
                priority="high",
                cost_estimate_low=30.0,
                cost_estimate_high=70.0,
                source="Toyota Maintenance Guide",
                confidence_score=9,
                notes="0W-20 synthetic oil recommended for most models"
            ),
            ServiceInterval(
                service_item="Tire Rotation",
                interval_miles=5000,
                interval_months=6,
                priority="medium",
                cost_estimate_low=20.0,
                cost_estimate_high=50.0,
                source="Toyota Maintenance Guide",
                confidence_score=9
            ),
            ServiceInterval(
                service_item="Multi-Point Inspection",
                interval_miles=5000,
                interval_months=6,
                priority="medium",
                cost_estimate_low=0.0,
                cost_estimate_high=0.0,
                source="Toyota Maintenance Guide",
                confidence_score=9,
                notes="Comprehensive inspection included with oil change"
            ),
            ServiceInterval(
                service_item="Transmission Fluid",
                interval_miles=60000,
                interval_months=60,
                priority="high",
                cost_estimate_low=150.0,
                cost_estimate_high=250.0,
                source="Toyota Maintenance Guide",
                confidence_score=8,
                notes="WS fluid for most automatic transmissions"
            )
        ]
        
        # Hybrid specific
        if 'prius' in model.lower() or 'hybrid' in model.lower():
            intervals.append(ServiceInterval(
                service_item="Hybrid Coolant",
                interval_miles=100000,
                interval_months=120,
                priority="high",
                cost_estimate_low=150.0,
                cost_estimate_high=250.0,
                source="Toyota Hybrid Guide",
                confidence_score=9,
                notes="Special hybrid system coolant required"
            ))
        
        return intervals
    
    def _get_honda_intervals(self, model: str, year: int) -> List[ServiceInterval]:
        """Honda/Acura specific intervals"""
        return [
            ServiceInterval(
                service_item="Engine Oil & Filter",
                interval_miles=7500,
                interval_months=12,
                priority="high",
                cost_estimate_low=35.0,
                cost_estimate_high=75.0,
                source="Honda Maintenance Minder",
                confidence_score=9,
                notes="Follow oil life monitor (15% or 12 months)"
            ),
            ServiceInterval(
                service_item="Tire Rotation",
                interval_miles=7500,
                interval_months=12,
                priority="medium",
                cost_estimate_low=25.0,
                cost_estimate_high=50.0,
                source="Honda Maintenance Minder",
                confidence_score=9
            ),
            ServiceInterval(
                service_item="Transmission Fluid",
                interval_miles=90000,
                interval_months=None,
                priority="high",
                cost_estimate_low=100.0,
                cost_estimate_high=200.0,
                source="Honda Maintenance Minder",
                confidence_score=8,
                notes="Use only Honda ATF-DW1 fluid"
            ),
            ServiceInterval(
                service_item="Valve Adjustment",
                interval_miles=105000,
                interval_months=None,
                priority="medium",
                cost_estimate_low=150.0,
                cost_estimate_high=300.0,
                source="Honda Maintenance Minder",
                confidence_score=8,
                notes="Important for engine longevity"
            )
        ]
    
    def _get_ford_intervals(self, model: str, year: int, engine_type: Optional[str] = None) -> List[ServiceInterval]:
        """Ford specific intervals"""
        intervals = []
        
        # Check if it's a Super Duty (F-250, F-350) with diesel
        is_super_duty = any(sd in model.lower() for sd in ['f-250', 'f250', 'f-350', 'f350', 'super duty'])
        
        if is_super_duty and engine_type == "diesel":
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
                    notes="15W-40 or 10W-30 diesel oil (13 quarts)"
                ),
                ServiceInterval(
                    service_item="Fuel Filter (Primary & Secondary)",
                    interval_miles=20000,
                    interval_months=24,
                    priority="high",
                    cost_estimate_low=100.0,
                    cost_estimate_high=200.0,
                    source="Ford Power Stroke Manual",
                    confidence_score=9,
                    notes="Replace both filters - critical for injector protection"
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
                    notes="Refill when low - typically every 7,500 miles"
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
                    notes="Prevents carbon buildup and expensive repairs"
                ),
            ])
        else:
            # Gas engine intervals
            oil_interval = 7500 if year >= 2008 else 5000
            
            # F-150 and Super Duty gas engines can go 10k with synthetic
            if ('f-150' in model.lower() or 'f150' in model.lower() or is_super_duty) and year >= 2018:
                oil_interval = 10000
                oil_notes = "Extended interval with synthetic oil"
            else:
                oil_notes = "5W-20 or 5W-30 Motorcraft oil"
            
            intervals.extend([
                ServiceInterval(
                    service_item="Engine Oil & Filter",
                    interval_miles=oil_interval,
                    interval_months=6,
                    priority="high",
                    cost_estimate_low=40.0,
                    cost_estimate_high=80.0,
                    source="Ford Scheduled Maintenance",
                    confidence_score=8,
                    notes=oil_notes
                ),
            ])
        
        # Common intervals for all Ford vehicles
        intervals.extend([
            ServiceInterval(
                service_item="Tire Rotation",
                interval_miles=7500,
                interval_months=6,
                priority="medium",
                cost_estimate_low=30.0,
                cost_estimate_high=60.0,
                source="Ford Scheduled Maintenance",
                confidence_score=8
            )
        ])
        
        # Transmission fluid for trucks
        if any(truck in model.lower() for truck in ['f-150', 'f150', 'f-250', 'f250', 'f-350', 'f350']):
            intervals.append(ServiceInterval(
                service_item="Transmission Fluid",
                interval_miles=150000,
                interval_months=None,
                priority="high",
                cost_estimate_low=200.0,
                cost_estimate_high=400.0,
                source="Ford Truck Manual",
                confidence_score=9,
                notes="Mercon LV fluid required"
            ))
        
        return intervals
    
    def _get_gm_intervals(self, model: str, year: int) -> List[ServiceInterval]:
        """GM specific intervals"""
        return [
            ServiceInterval(
                service_item="Engine Oil & Filter",
                interval_miles=7500,
                interval_months=12,
                priority="high",
                cost_estimate_low=45.0,
                cost_estimate_high=85.0,
                source="GM Oil Life System",
                confidence_score=8,
                notes="Follow Oil Life Monitor (0% or 12 months)"
            ),
            ServiceInterval(
                service_item="Tire Rotation",
                interval_miles=7500,
                interval_months=None,
                priority="medium",
                cost_estimate_low=30.0,
                cost_estimate_high=60.0,
                source="GM Maintenance Schedule",
                confidence_score=8
            ),
            ServiceInterval(
                service_item="Transmission Fluid",
                interval_miles=45000,
                interval_months=None,
                priority="high",
                cost_estimate_low=150.0,
                cost_estimate_high=300.0,
                source="GM Maintenance Schedule",
                confidence_score=7,
                notes="Severe service interval; normal is 97,500 miles"
            )
        ]
    
    def _get_bmw_intervals(self, model: str, year: int) -> List[ServiceInterval]:
        """BMW/MINI specific intervals"""
        return [
            ServiceInterval(
                service_item="Engine Oil & Filter",
                interval_miles=10000,
                interval_months=12,
                priority="high",
                cost_estimate_low=100.0,
                cost_estimate_high=150.0,
                source="BMW Condition Based Service",
                confidence_score=9,
                notes="BMW LL-01 or LL-04 oil specification"
            ),
            ServiceInterval(
                service_item="Microfilter (Cabin)",
                interval_miles=20000,
                interval_months=24,
                priority="low",
                cost_estimate_low=60.0,
                cost_estimate_high=120.0,
                source="BMW CBS",
                confidence_score=8
            ),
            ServiceInterval(
                service_item="Brake Fluid",
                interval_miles=None,
                interval_months=24,
                priority="high",
                cost_estimate_low=120.0,
                cost_estimate_high=200.0,
                source="BMW CBS",
                confidence_score=9,
                notes="DOT 4 fluid required"
            )
        ]
    
    def _get_mercedes_intervals(self, model: str, year: int) -> List[ServiceInterval]:
        """Mercedes-Benz specific intervals"""
        return [
            ServiceInterval(
                service_item="Service A (Oil & Filter)",
                interval_miles=10000,
                interval_months=12,
                priority="high",
                cost_estimate_low=150.0,
                cost_estimate_high=250.0,
                source="Mercedes-Benz ASSYST",
                confidence_score=9,
                notes="MB 229.5 oil specification"
            ),
            ServiceInterval(
                service_item="Service B (Major)",
                interval_miles=20000,
                interval_months=24,
                priority="high",
                cost_estimate_low=400.0,
                cost_estimate_high=600.0,
                source="Mercedes-Benz ASSYST",
                confidence_score=9,
                notes="Includes all filters and comprehensive inspection"
            )
        ]
    
    def _get_vw_group_intervals(self, model: str, year: int) -> List[ServiceInterval]:
        """VW Group (VW, Audi, Porsche) specific intervals"""
        return [
            ServiceInterval(
                service_item="Engine Oil & Filter",
                interval_miles=10000,
                interval_months=12,
                priority="high",
                cost_estimate_low=80.0,
                cost_estimate_high=120.0,
                source="VW/Audi Service Schedule",
                confidence_score=8,
                notes="VW 502.00/505.00 oil specification"
            ),
            ServiceInterval(
                service_item="DSG Transmission Service",
                interval_miles=40000,
                interval_months=None,
                priority="high",
                cost_estimate_low=300.0,
                cost_estimate_high=500.0,
                source="VW/Audi Service Schedule",
                confidence_score=9,
                notes="Critical for DSG transmission longevity"
            )
        ]
    
    def _get_nissan_intervals(self, model: str, year: int) -> List[ServiceInterval]:
        """Nissan/Infiniti specific intervals"""
        return [
            ServiceInterval(
                service_item="Engine Oil & Filter",
                interval_miles=5000,
                interval_months=6,
                priority="high",
                cost_estimate_low=35.0,
                cost_estimate_high=75.0,
                source="Nissan Maintenance Schedule",
                confidence_score=8,
                notes="0W-20 or 5W-30 oil depending on model"
            ),
            ServiceInterval(
                service_item="CVT Fluid",
                interval_miles=60000,
                interval_months=None,
                priority="high",
                cost_estimate_low=150.0,
                cost_estimate_high=250.0,
                source="Nissan Maintenance Schedule",
                confidence_score=8,
                notes="NS-2 or NS-3 CVT fluid only"
            )
        ]
    
    def _get_mazda_intervals(self, model: str, year: int) -> List[ServiceInterval]:
        """Mazda specific intervals"""
        return [
            ServiceInterval(
                service_item="Engine Oil & Filter",
                interval_miles=7500,
                interval_months=12,
                priority="high",
                cost_estimate_low=40.0,
                cost_estimate_high=80.0,
                source="Mazda Maintenance Schedule",
                confidence_score=8,
                notes="0W-20 oil for Skyactiv engines"
            ),
            ServiceInterval(
                service_item="Tire Rotation",
                interval_miles=7500,
                interval_months=None,
                priority="medium",
                cost_estimate_low=25.0,
                cost_estimate_high=50.0,
                source="Mazda Maintenance Schedule",
                confidence_score=8
            )
        ]
    
    def _get_subaru_intervals(self, model: str, year: int) -> List[ServiceInterval]:
        """Subaru specific intervals"""
        return [
            ServiceInterval(
                service_item="Engine Oil & Filter",
                interval_miles=6000,
                interval_months=6,
                priority="high",
                cost_estimate_low=40.0,
                cost_estimate_high=80.0,
                source="Subaru Maintenance Schedule",
                confidence_score=8,
                notes="0W-20 synthetic oil recommended"
            ),
            ServiceInterval(
                service_item="Differential Fluid",
                interval_miles=30000,
                interval_months=None,
                priority="medium",
                cost_estimate_low=100.0,
                cost_estimate_high=200.0,
                source="Subaru Maintenance Schedule",
                confidence_score=8,
                notes="Important for AWD system"
            )
        ]

class ServiceIntervalResearcher:
    """Main service interval research engine"""
    
    def __init__(self):
        self.sources = [
            CarMaintenanceDatabase()
        ]
        self.sources_used = []
        self.confidence_score = 0
    
    async def research_vehicle(self, make: str, model: str, year: int, engine_type: Optional[str] = None) -> List[ServiceInterval]:
        """Research service intervals for a specific vehicle"""
        logger.info(f"Starting research for {year} {make} {model} (engine: {engine_type or 'not specified'})")
        
        all_intervals = []
        self.sources_used = []
        
        # Research from all sources
        for source in self.sources:
            try:
                logger.info(f"Researching from {source.name}")
                intervals = await source.search_vehicle(make, model, year, engine_type)
                
                if intervals:
                    all_intervals.extend(intervals)
                    self.sources_used.append(source.name)
                    logger.info(f"Found {len(intervals)} intervals from {source.name}")
                else:
                    logger.info(f"No intervals found from {source.name}")
                    
            except Exception as e:
                logger.error(f"Error with source {source.name}: {e}")
        
        # Merge and deduplicate results
        merged_intervals = self._merge_intervals(all_intervals)
        
        # Calculate overall confidence
        self.confidence_score = self._calculate_confidence(merged_intervals)
        
        logger.info(f"Research complete: {len(merged_intervals)} unique intervals found")
        return merged_intervals
    
    def _merge_intervals(self, intervals: List[ServiceInterval]) -> List[ServiceInterval]:
        """Merge intervals from multiple sources, handling duplicates"""
        if not intervals:
            # Return industry standard defaults when no manufacturer-specific data is found
            return self._get_industry_standard_intervals()
        
        # For now, since we only have one source, just return the intervals
        # In the future with multiple sources, we would merge duplicates here
        return intervals
    
    def _get_industry_standard_intervals(self) -> List[ServiceInterval]:
        """Get industry standard intervals when no manufacturer data is available"""
        return [
            ServiceInterval(
                service_item="Engine Oil & Filter",
                interval_miles=5000,
                interval_months=6,
                priority="high",
                cost_estimate_low=30.0,
                cost_estimate_high=75.0,
                source="Industry Standards",
                confidence_score=7,
                notes="Check owner's manual for specific oil type"
            ),
            ServiceInterval(
                service_item="Tire Rotation",
                interval_miles=5000,
                interval_months=6,
                priority="medium",
                cost_estimate_low=20.0,
                cost_estimate_high=50.0,
                source="Industry Standards",
                confidence_score=7,
                notes="Helps ensure even tire wear"
            ),
            ServiceInterval(
                service_item="Engine Air Filter",
                interval_miles=30000,
                interval_months=36,
                priority="medium",
                cost_estimate_low=25.0,
                cost_estimate_high=50.0,
                source="Industry Standards",
                confidence_score=7,
                notes="Replace more frequently in dusty conditions"
            ),
            ServiceInterval(
                service_item="Cabin Air Filter",
                interval_miles=15000,
                interval_months=12,
                priority="low",
                cost_estimate_low=25.0,
                cost_estimate_high=60.0,
                source="Industry Standards",
                confidence_score=7
            ),
            ServiceInterval(
                service_item="Brake Fluid",
                interval_miles=30000,
                interval_months=36,
                priority="high",
                cost_estimate_low=70.0,
                cost_estimate_high=120.0,
                source="Industry Standards",
                confidence_score=7,
                notes="Critical for brake system performance"
            ),
            ServiceInterval(
                service_item="Transmission Fluid",
                interval_miles=60000,
                interval_months=60,
                priority="high",
                cost_estimate_low=150.0,
                cost_estimate_high=300.0,
                source="Industry Standards",
                confidence_score=7,
                notes="Check owner's manual - some are lifetime fill"
            ),
            ServiceInterval(
                service_item="Coolant/Antifreeze",
                interval_miles=60000,
                interval_months=60,
                priority="high",
                cost_estimate_low=100.0,
                cost_estimate_high=150.0,
                source="Industry Standards",
                confidence_score=7,
                notes="Use manufacturer-specified coolant type"
            ),
            ServiceInterval(
                service_item="Spark Plugs",
                interval_miles=100000,
                interval_months=120,
                priority="medium",
                cost_estimate_low=150.0,
                cost_estimate_high=300.0,
                source="Industry Standards",
                confidence_score=7,
                notes="Platinum/Iridium plugs last longer"
            ),
            ServiceInterval(
                service_item="Battery Test",
                interval_miles=None,
                interval_months=12,
                priority="medium",
                cost_estimate_low=0.0,
                cost_estimate_high=20.0,
                source="Industry Standards",
                confidence_score=7,
                notes="Most batteries last 3-5 years"
            ),
            ServiceInterval(
                service_item="Brake Inspection",
                interval_miles=12000,
                interval_months=12,
                priority="high",
                cost_estimate_low=0.0,
                cost_estimate_high=50.0,
                source="Industry Standards",
                confidence_score=7,
                notes="Visual inspection of pads, rotors, and fluid"
            ),
            ServiceInterval(
                service_item="Multi-Point Inspection",
                interval_miles=5000,
                interval_months=6,
                priority="medium",
                cost_estimate_low=0.0,
                cost_estimate_high=0.0,
                source="Industry Standards",
                confidence_score=7,
                notes="Comprehensive check of vehicle systems"
            ),
            ServiceInterval(
                service_item="Wheel Alignment Check",
                interval_miles=None,
                interval_months=12,
                priority="medium",
                cost_estimate_low=0.0,
                cost_estimate_high=30.0,
                source="Industry Standards",
                confidence_score=7,
                notes="Check if vehicle pulls or tires wear unevenly"
            )
        ]
    
    def _calculate_confidence(self, intervals: List[ServiceInterval]) -> int:
        """Calculate overall confidence score"""
        if not intervals:
            return 0
        
        total_confidence = sum(interval.confidence_score for interval in intervals)
        avg_confidence = total_confidence / len(intervals)
        
        return int(avg_confidence)

# Factory function for easy integration
async def research_service_intervals(make: str, model: str, year: int, engine_type: Optional[str] = None) -> Tuple[List[ServiceInterval], List[str], int]:
    """
    Research service intervals for a vehicle
    
    Args:
        make: Vehicle manufacturer
        model: Vehicle model
        year: Model year
        engine_type: Optional engine type (gas, diesel, hybrid, electric)
    
    Returns:
        Tuple of (intervals, sources_used, confidence_score)
    """
    researcher = ServiceIntervalResearcher()
    intervals = await researcher.research_vehicle(make, model, year, engine_type)
    
    return intervals, researcher.sources_used, researcher.confidence_score