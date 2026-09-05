# Automotive Expert — Fleet Management System

Reference material for the `automotive-expert` skill. See [SKILL.md](../SKILL.md).

## Fleet Management System

```python
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List, Optional
from decimal import Decimal
from enum import Enum
import numpy as np

class VehicleStatus(Enum):
    ACTIVE = "active"
    IDLE = "idle"
    MAINTENANCE = "maintenance"
    OUT_OF_SERVICE = "out_of_service"

class FuelType(Enum):
    GASOLINE = "gasoline"
    DIESEL = "diesel"
    ELECTRIC = "electric"
    HYBRID = "hybrid"
    CNG = "cng"

@dataclass
class Vehicle:
    """Fleet vehicle information"""
    vehicle_id: str
    vin: str  # Vehicle Identification Number
    make: str
    model: str
    year: int
    license_plate: str
    fuel_type: FuelType
    status: VehicleStatus
    odometer_km: int
    last_service_km: int
    next_service_km: int
    assigned_driver_id: Optional[str]
    location: tuple  # (latitude, longitude)
    fuel_level_percent: float

@dataclass
class Trip:
    """Vehicle trip record"""
    trip_id: str
    vehicle_id: str
    driver_id: str
    start_time: datetime
    end_time: Optional[datetime]
    start_location: tuple
    end_location: Optional[tuple]
    distance_km: float
    fuel_consumed_liters: float
    average_speed_kmh: float
    max_speed_kmh: float
    harsh_braking_count: int
    harsh_acceleration_count: int

class FleetManagementSystem:
    """Fleet management and telematics system"""

    def __init__(self):
        self.vehicles = {}
        self.trips = []
        self.maintenance_schedules = []

    def track_vehicle_location(self, vehicle_id: str) -> dict:
        """Track real-time vehicle location"""
        vehicle = self.vehicles.get(vehicle_id)
        if not vehicle:
            return {'error': 'Vehicle not found'}

        # Get GPS data from telematics device
        location = self._get_gps_location(vehicle_id)
        speed = self._get_current_speed(vehicle_id)
        heading = self._get_heading(vehicle_id)

        vehicle.location = location

        return {
            'vehicle_id': vehicle_id,
            'location': {
                'latitude': location[0],
                'longitude': location[1]
            },
            'speed_kmh': speed,
            'heading': heading,
            'timestamp': datetime.now().isoformat(),
            'status': vehicle.status.value
        }

    def start_trip(self, vehicle_id: str, driver_id: str) -> Trip:
        """Start a new trip"""
        vehicle = self.vehicles.get(vehicle_id)
        if not vehicle:
            raise ValueError("Vehicle not found")

        trip = Trip(
            trip_id=self._generate_trip_id(),
            vehicle_id=vehicle_id,
            driver_id=driver_id,
            start_time=datetime.now(),
            end_time=None,
            start_location=vehicle.location,
            end_location=None,
            distance_km=0.0,
            fuel_consumed_liters=0.0,
            average_speed_kmh=0.0,
            max_speed_kmh=0.0,
            harsh_braking_count=0,
            harsh_acceleration_count=0
        )

        vehicle.status = VehicleStatus.ACTIVE
        self.trips.append(trip)

        return trip

    def end_trip(self, trip_id: str) -> dict:
        """End trip and calculate metrics"""
        trip = next((t for t in self.trips if t.trip_id == trip_id), None)
        if not trip:
            return {'error': 'Trip not found'}

        vehicle = self.vehicles.get(trip.vehicle_id)

        trip.end_time = datetime.now()
        trip.end_location = vehicle.location

        # Calculate trip metrics
        duration_hours = (trip.end_time - trip.start_time).total_seconds() / 3600
        trip.average_speed_kmh = trip.distance_km / duration_hours if duration_hours > 0 else 0

        # Calculate fuel efficiency
        fuel_efficiency = trip.distance_km / trip.fuel_consumed_liters if trip.fuel_consumed_liters > 0 else 0

        # Calculate driver score
        driver_score = self._calculate_driver_score(trip)

        vehicle.status = VehicleStatus.IDLE

        return {
            'trip_id': trip_id,
            'duration_hours': duration_hours,
            'distance_km': trip.distance_km,
            'fuel_consumed': trip.fuel_consumed_liters,
            'fuel_efficiency_km_per_liter': fuel_efficiency,
            'average_speed': trip.average_speed_kmh,
            'max_speed': trip.max_speed_kmh,
            'harsh_events': trip.harsh_braking_count + trip.harsh_acceleration_count,
            'driver_score': driver_score
        }

    def _calculate_driver_score(self, trip: Trip) -> float:
        """Calculate driver safety score"""
        score = 100.0

        # Penalize harsh events
        score -= trip.harsh_braking_count * 5
        score -= trip.harsh_acceleration_count * 5

        # Penalize speeding
        if trip.max_speed_kmh > 120:
            score -= (trip.max_speed_kmh - 120) * 0.5

        # Penalize low fuel efficiency
        # Implementation would compare to vehicle baseline

        return max(0.0, min(100.0, score))

    def schedule_maintenance(self, vehicle_id: str) -> dict:
        """Schedule vehicle maintenance"""
        vehicle = self.vehicles.get(vehicle_id)
        if not vehicle:
            return {'error': 'Vehicle not found'}

        # Check if maintenance is due
        km_since_service = vehicle.odometer_km - vehicle.last_service_km
        km_until_service = vehicle.next_service_km - vehicle.odometer_km

        if km_until_service <= 1000:  # Within 1000km of service
            maintenance_type = self._determine_maintenance_type(km_since_service)

            schedule = {
                'vehicle_id': vehicle_id,
                'maintenance_type': maintenance_type,
                'current_odometer': vehicle.odometer_km,
                'recommended_by_odometer': vehicle.next_service_km,
                'urgency': 'high' if km_until_service <= 500 else 'medium',
                'estimated_cost': self._estimate_maintenance_cost(maintenance_type)
            }

            self.maintenance_schedules.append(schedule)

            return schedule

        return {
            'vehicle_id': vehicle_id,
            'maintenance_required': False,
            'km_until_service': km_until_service
        }

    def optimize_routes(self, deliveries: List[dict]) -> dict:
        """Optimize delivery routes for fleet"""
        # Simplified route optimization
        # In production, would use sophisticated algorithms (TSP, VRP)

        available_vehicles = [
            v for v in self.vehicles.values()
            if v.status == VehicleStatus.IDLE
        ]

        if not available_vehicles:
            return {'error': 'No available vehicles'}

        # Assign deliveries to vehicles
        assignments = []
        for i, delivery in enumerate(deliveries):
            vehicle = available_vehicles[i % len(available_vehicles)]

            route = self._calculate_route(
                vehicle.location,
                delivery['destination']
            )

            assignments.append({
                'vehicle_id': vehicle.vehicle_id,
                'delivery_id': delivery['delivery_id'],
                'route': route,
                'estimated_distance_km': route['distance'],
                'estimated_time_minutes': route['duration'],
                'estimated_fuel_cost': self._estimate_fuel_cost(
                    route['distance'],
                    vehicle.fuel_type
                )
            })

        return {
            'total_deliveries': len(deliveries),
            'vehicles_assigned': len(set(a['vehicle_id'] for a in assignments)),
            'assignments': assignments,
            'total_distance_km': sum(a['estimated_distance_km'] for a in assignments),
            'total_estimated_cost': sum(a['estimated_fuel_cost'] for a in assignments)
        }

    def analyze_fleet_utilization(self) -> dict:
        """Analyze fleet utilization and efficiency"""
        total_vehicles = len(self.vehicles)

        active = sum(1 for v in self.vehicles.values() if v.status == VehicleStatus.ACTIVE)
        idle = sum(1 for v in self.vehicles.values() if v.status == VehicleStatus.IDLE)
        maintenance = sum(1 for v in self.vehicles.values() if v.status == VehicleStatus.MAINTENANCE)

        utilization_rate = (active / total_vehicles * 100) if total_vehicles > 0 else 0

        # Calculate average fuel efficiency
        recent_trips = self.trips[-100:]  # Last 100 trips
        if recent_trips:
            avg_fuel_efficiency = np.mean([
                t.distance_km / t.fuel_consumed_liters
                for t in recent_trips
                if t.fuel_consumed_liters > 0
            ])
        else:
            avg_fuel_efficiency = 0

        return {
            'total_vehicles': total_vehicles,
            'status_breakdown': {
                'active': active,
                'idle': idle,
                'maintenance': maintenance,
                'out_of_service': total_vehicles - active - idle - maintenance
            },
            'utilization_rate': utilization_rate,
            'average_fuel_efficiency': avg_fuel_efficiency,
            'recommendation': 'Reduce fleet size' if utilization_rate < 60 else
                           'Expand fleet' if utilization_rate > 90 else
                           'Optimal'
        }

    def _determine_maintenance_type(self, km_since_service: int) -> str:
        """Determine type of maintenance required"""
        if km_since_service >= 100000:
            return "major_service"
        elif km_since_service >= 50000:
            return "intermediate_service"
        else:
            return "routine_service"

    def _estimate_maintenance_cost(self, maintenance_type: str) -> Decimal:
        """Estimate maintenance cost"""
        costs = {
            'routine_service': Decimal('150'),
            'intermediate_service': Decimal('500'),
            'major_service': Decimal('1500')
        }
        return costs.get(maintenance_type, Decimal('200'))

    def _calculate_route(self, start: tuple, end: tuple) -> dict:
        """Calculate route between two points"""
        # Would use routing API (Google Maps, Mapbox, etc.)
        # Simplified calculation
        from math import radians, sin, cos, sqrt, atan2

        lat1, lon1 = radians(start[0]), radians(start[1])
        lat2, lon2 = radians(end[0]), radians(end[1])

        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))

        distance_km = 6371 * c  # Earth radius in km

        return {
            'distance': distance_km,
            'duration': distance_km / 60 * 60  # Assume 60 km/h average, return minutes
        }

    def _estimate_fuel_cost(self, distance_km: float, fuel_type: FuelType) -> Decimal:
        """Estimate fuel cost for trip"""
        fuel_prices = {
            FuelType.GASOLINE: Decimal('1.50'),  # per liter
            FuelType.DIESEL: Decimal('1.40'),
            FuelType.ELECTRIC: Decimal('0.30'),  # per kWh equivalent
            FuelType.HYBRID: Decimal('1.20'),
            FuelType.CNG: Decimal('1.00')
        }

        fuel_efficiency = 8.0  # km per liter (average)
        fuel_needed = distance_km / fuel_efficiency
        fuel_price = fuel_prices.get(fuel_type, Decimal('1.50'))

        return Decimal(str(fuel_needed)) * fuel_price

    def _get_gps_location(self, vehicle_id: str) -> tuple:
        """Get GPS location from telematics device"""
        # Implementation would connect to telematics API
        return (40.7128, -74.0060)  # Placeholder

    def _get_current_speed(self, vehicle_id: str) -> float:
        """Get current vehicle speed"""
        return np.random.uniform(0, 100)  # Placeholder

    def _get_heading(self, vehicle_id: str) -> float:
        """Get vehicle heading in degrees"""
        return np.random.uniform(0, 360)  # Placeholder

    def _generate_trip_id(self) -> str:
        import uuid
        return f"TRIP-{uuid.uuid4().hex[:10].upper()}"
```
