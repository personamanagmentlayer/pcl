# Aerospace Expert — Flight Management System

Reference material for the `aerospace-expert` skill. See [SKILL.md](../SKILL.md).

## Flight Management System

```python
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from decimal import Decimal
from enum import Enum
import numpy as np

class FlightPhase(Enum):
    PRE_FLIGHT = "pre_flight"
    TAXI = "taxi"
    TAKEOFF = "takeoff"
    CLIMB = "climb"
    CRUISE = "cruise"
    DESCENT = "descent"
    APPROACH = "approach"
    LANDING = "landing"
    COMPLETED = "completed"

class FlightStatus(Enum):
    SCHEDULED = "scheduled"
    BOARDING = "boarding"
    DEPARTED = "departed"
    EN_ROUTE = "en_route"
    DELAYED = "delayed"
    ARRIVED = "arrived"
    CANCELLED = "cancelled"

@dataclass
class Waypoint:
    """Navigation waypoint"""
    name: str
    latitude: float
    longitude: float
    altitude_ft: int
    estimated_time: datetime

@dataclass
class Flight:
    """Flight information"""
    flight_number: str
    aircraft_id: str
    aircraft_type: str
    departure_airport: str
    arrival_airport: str
    scheduled_departure: datetime
    scheduled_arrival: datetime
    actual_departure: Optional[datetime]
    actual_arrival: Optional[datetime]
    status: FlightStatus
    route: List[Waypoint]
    crew_members: List[str]
    passenger_count: int
    cargo_weight_kg: float

@dataclass
class FlightPlan:
    """Filed flight plan"""
    flight_plan_id: str
    flight_number: str
    aircraft_id: str
    departure: str
    destination: str
    alternate_airports: List[str]
    route_string: str
    cruise_altitude_ft: int
    cruise_speed_kts: int
    estimated_flight_time: timedelta
    fuel_required_kg: float
    filed_at: datetime

class FlightManagementSystem:
    """Flight planning and management"""

    def __init__(self):
        self.flights = {}
        self.flight_plans = {}
        self.aircraft_positions = {}

    def create_flight_plan(self, flight_data: dict) -> FlightPlan:
        """Create and file flight plan"""
        flight_plan_id = self._generate_flight_plan_id()

        # Calculate route
        route = self._calculate_optimal_route(
            flight_data['departure'],
            flight_data['destination'],
            flight_data['aircraft_type']
        )

        # Calculate fuel requirements
        fuel_required = self._calculate_fuel_requirements(
            route['distance_nm'],
            flight_data['aircraft_type'],
            flight_data.get('passenger_count', 0),
            flight_data.get('cargo_weight_kg', 0)
        )

        flight_plan = FlightPlan(
            flight_plan_id=flight_plan_id,
            flight_number=flight_data['flight_number'],
            aircraft_id=flight_data['aircraft_id'],
            departure=flight_data['departure'],
            destination=flight_data['destination'],
            alternate_airports=flight_data.get('alternates', []),
            route_string=route['route_string'],
            cruise_altitude_ft=route['cruise_altitude'],
            cruise_speed_kts=route['cruise_speed'],
            estimated_flight_time=route['estimated_time'],
            fuel_required_kg=fuel_required,
            filed_at=datetime.now()
        )

        self.flight_plans[flight_plan_id] = flight_plan

        # File with ATC
        self._file_with_atc(flight_plan)

        return flight_plan

    def _calculate_optimal_route(self,
                                 departure: str,
                                 destination: str,
                                 aircraft_type: str) -> dict:
        """Calculate optimal flight route"""
        # Get airport coordinates
        dep_coords = self._get_airport_coordinates(departure)
        dest_coords = self._get_airport_coordinates(destination)

        # Calculate great circle distance
        distance_nm = self._calculate_distance(dep_coords, dest_coords)

        # Determine cruise altitude based on distance and aircraft
        if distance_nm < 500:
            cruise_altitude = 25000  # FL250
        elif distance_nm < 1500:
            cruise_altitude = 35000  # FL350
        else:
            cruise_altitude = 39000  # FL390

        # Determine cruise speed based on aircraft type
        cruise_speeds = {
            'B737': 450,   # knots
            'B777': 490,
            'A320': 450,
            'A350': 490
        }
        cruise_speed = cruise_speeds.get(aircraft_type, 450)

        # Calculate flight time
        flight_time_hours = distance_nm / cruise_speed
        estimated_time = timedelta(hours=flight_time_hours)

        # Generate route string (simplified)
        route_string = f"{departure} DCT {destination}"

        return {
            'distance_nm': distance_nm,
            'cruise_altitude': cruise_altitude,
            'cruise_speed': cruise_speed,
            'estimated_time': estimated_time,
            'route_string': route_string
        }

    def _calculate_fuel_requirements(self,
                                    distance_nm: float,
                                    aircraft_type: str,
                                    passengers: int,
                                    cargo_kg: float) -> float:
        """Calculate required fuel for flight"""
        # Fuel consumption rates (kg per nm)
        fuel_rates = {
            'B737': 3.5,
            'B777': 8.0,
            'A320': 3.2,
            'A350': 7.5
        }

        base_rate = fuel_rates.get(aircraft_type, 4.0)

        # Calculate trip fuel
        trip_fuel = distance_nm * base_rate

        # Add weight penalty (simplified)
        weight_penalty = (passengers * 100 + cargo_kg) / 10000 * trip_fuel * 0.1

        # Reserve fuel (45 minutes at cruise)
        reserve_fuel = base_rate * 45 * 7.5  # 7.5 nm per minute

        # Contingency fuel (5% of trip fuel)
        contingency_fuel = trip_fuel * 0.05

        # Alternate fuel (for diversion)
        alternate_fuel = 100 * base_rate  # 100 nm

        total_fuel = trip_fuel + weight_penalty + reserve_fuel + contingency_fuel + alternate_fuel

        return total_fuel

    def track_flight_progress(self, flight_number: str) -> dict:
        """Track real-time flight progress"""
        flight = self.flights.get(flight_number)
        if not flight:
            return {'error': 'Flight not found'}

        # Get current position
        current_position = self.aircraft_positions.get(flight.aircraft_id)

        if not current_position:
            return {
                'flight_number': flight_number,
                'status': flight.status.value,
                'message': 'No position data available'
            }

        # Calculate progress
        total_distance = self._calculate_distance(
            self._get_airport_coordinates(flight.departure_airport),
            self._get_airport_coordinates(flight.arrival_airport)
        )

        distance_from_origin = self._calculate_distance(
            self._get_airport_coordinates(flight.departure_airport),
            (current_position['latitude'], current_position['longitude'])
        )

        progress_percent = (distance_from_origin / total_distance) * 100

        # Calculate ETA
        if current_position.get('ground_speed', 0) > 0:
            distance_remaining = total_distance - distance_from_origin
            time_remaining_hours = distance_remaining / current_position['ground_speed']
            eta = datetime.now() + timedelta(hours=time_remaining_hours)
        else:
            eta = flight.scheduled_arrival

        return {
            'flight_number': flight_number,
            'status': flight.status.value,
            'current_position': {
                'latitude': current_position['latitude'],
                'longitude': current_position['longitude'],
                'altitude_ft': current_position['altitude_ft'],
                'ground_speed_kts': current_position['ground_speed']
            },
            'progress_percent': progress_percent,
            'distance_remaining_nm': total_distance - distance_from_origin,
            'estimated_arrival': eta.isoformat(),
            'on_time': eta <= flight.scheduled_arrival
        }

    def calculate_landing_performance(self,
                                     aircraft_type: str,
                                     runway_length_ft: int,
                                     wind_speed_kts: int,
                                     wind_direction: int,
                                     runway_heading: int,
                                     temperature_c: float,
                                     altitude_ft: int) -> dict:
        """Calculate landing performance requirements"""
        # Base landing distance for aircraft type
        base_distances = {
            'B737': 5000,  # feet
            'B777': 7000,
            'A320': 4800,
            'A350': 6500
        }

        base_distance = base_distances.get(aircraft_type, 5500)

        # Wind component calculation
        wind_angle = abs(wind_direction - runway_heading)
        headwind = wind_speed_kts * np.cos(np.radians(wind_angle))
        crosswind = wind_speed_kts * np.sin(np.radians(wind_angle))

        # Adjust for headwind/tailwind
        # Headwind: reduce distance by 10% per 10 knots
        # Tailwind: increase distance by 20% per 10 knots
        if headwind > 0:  # Headwind
            distance_adjustment = -0.1 * (headwind / 10)
        else:  # Tailwind
            distance_adjustment = 0.2 * (abs(headwind) / 10)

        # Adjust for temperature (density altitude)
        isa_temp = 15 - (altitude_ft / 1000 * 2)  # ISA standard
        temp_deviation = temperature_c - isa_temp
        temp_adjustment = temp_deviation * 0.01  # 1% per degree

        # Calculate required landing distance
        adjustments = 1 + distance_adjustment + temp_adjustment
        required_distance = base_distance * adjustments

        # Safety margin (typical 1.67 for dry runway)
        safety_factor = 1.67
        required_distance_with_margin = required_distance * safety_factor

        # Check if runway is adequate
        runway_adequate = runway_length_ft >= required_distance_with_margin

        return {
            'aircraft_type': aircraft_type,
            'required_landing_distance_ft': int(required_distance_with_margin),
            'available_runway_ft': runway_length_ft,
            'runway_adequate': runway_adequate,
            'margin_ft': runway_length_ft - required_distance_with_margin,
            'conditions': {
                'headwind_kts': headwind,
                'crosswind_kts': crosswind,
                'temperature_c': temperature_c,
                'altitude_ft': altitude_ft
            }
        }

    def _calculate_distance(self, point1: Tuple[float, float], point2: Tuple[float, float]) -> float:
        """Calculate great circle distance in nautical miles"""
        from math import radians, sin, cos, sqrt, atan2

        lat1, lon1 = radians(point1[0]), radians(point1[1])
        lat2, lon2 = radians(point2[0]), radians(point2[1])

        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))

        distance_km = 6371 * c  # Earth radius in km
        distance_nm = distance_km * 0.539957  # Convert to nautical miles

        return distance_nm

    def _get_airport_coordinates(self, icao_code: str) -> Tuple[float, float]:
        """Get airport coordinates"""
        # Would query airport database
        airports = {
            'KJFK': (40.6413, -73.7781),  # JFK
            'KLAX': (33.9416, -118.4085),  # LAX
            'EGLL': (51.4700, -0.4543),    # Heathrow
            'LFPG': (49.0097, 2.5479)      # Charles de Gaulle
        }
        return airports.get(icao_code, (0.0, 0.0))

    def _file_with_atc(self, flight_plan: FlightPlan):
        """File flight plan with ATC"""
        # Implementation would submit to ATC systems
        pass

    def _generate_flight_plan_id(self) -> str:
        import uuid
        return f"FPL-{uuid.uuid4().hex[:10].upper()}"
```
