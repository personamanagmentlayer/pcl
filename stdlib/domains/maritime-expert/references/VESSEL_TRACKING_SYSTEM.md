# Maritime Expert — Vessel Tracking System

Reference material for the `maritime-expert` skill. See [SKILL.md](../SKILL.md).

## Vessel Tracking System

```python
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from decimal import Decimal
from enum import Enum
import numpy as np

class VesselType(Enum):
    CONTAINER = "container"
    BULK_CARRIER = "bulk_carrier"
    TANKER = "tanker"
    RO_RO = "ro_ro"
    CRUISE = "cruise"
    CARGO = "general_cargo"

class VesselStatus(Enum):
    UNDERWAY = "underway"
    AT_ANCHOR = "at_anchor"
    MOORED = "moored"
    NOT_UNDER_COMMAND = "not_under_command"
    RESTRICTED_MANEUVERABILITY = "restricted_maneuverability"

@dataclass
class Vessel:
    """Vessel information"""
    imo_number: str  # International Maritime Organization number
    mmsi: str  # Maritime Mobile Service Identity
    vessel_name: str
    vessel_type: VesselType
    flag: str
    call_sign: str
    length_m: float
    beam_m: float
    draft_m: float
    gross_tonnage: int
    deadweight_tonnage: int
    max_speed_kts: float
    current_position: Tuple[float, float]
    heading: float
    speed_kts: float
    status: VesselStatus

@dataclass
class Voyage:
    """Voyage information"""
    voyage_id: str
    vessel_imo: str
    departure_port: str
    destination_port: str
    scheduled_departure: datetime
    scheduled_arrival: datetime
    actual_departure: Optional[datetime]
    actual_arrival: Optional[datetime]
    cargo_manifest: List[dict]
    route_waypoints: List[Tuple[float, float]]
    estimated_fuel_consumption: float

class VesselTrackingSystem:
    """Maritime vessel tracking and monitoring"""

    def __init__(self):
        self.vessels = {}
        self.voyages = {}
        self.ais_messages = []

    def process_ais_message(self, ais_data: dict) -> dict:
        """Process AIS position report"""
        mmsi = ais_data['mmsi']
        vessel = self._get_vessel_by_mmsi(mmsi)

        if not vessel:
            return {'error': 'Vessel not found', 'mmsi': mmsi}

        # Update vessel position
        vessel.current_position = (ais_data['latitude'], ais_data['longitude'])
        vessel.heading = ais_data.get('heading', 0)
        vessel.speed_kts = ais_data.get('speed', 0)
        vessel.status = VesselStatus(ais_data.get('status', 'underway'))

        # Store AIS message
        self.ais_messages.append({
            'timestamp': datetime.now(),
            'mmsi': mmsi,
            'position': vessel.current_position,
            'speed': vessel.speed_kts,
            'heading': vessel.heading
        })

        # Check for anomalies
        anomalies = self._detect_anomalies(vessel, ais_data)

        return {
            'mmsi': mmsi,
            'vessel_name': vessel.vessel_name,
            'position': vessel.current_position,
            'speed_kts': vessel.speed_kts,
            'heading': vessel.heading,
            'status': vessel.status.value,
            'anomalies': anomalies,
            'timestamp': datetime.now().isoformat()
        }

    def _detect_anomalies(self, vessel: Vessel, ais_data: dict) -> List[dict]:
        """Detect unusual vessel behavior"""
        anomalies = []

        # Speed anomaly
        if vessel.speed_kts > vessel.max_speed_kts * 1.1:
            anomalies.append({
                'type': 'excessive_speed',
                'severity': 'medium',
                'message': f'Speed {vessel.speed_kts} kts exceeds maximum'
            })

        # Draft anomaly
        if 'draft' in ais_data and ais_data['draft'] > vessel.draft_m * 1.2:
            anomalies.append({
                'type': 'excessive_draft',
                'severity': 'high',
                'message': 'Draft exceeds vessel specifications'
            })

        # Unexpected stop
        if vessel.status == VesselStatus.AT_ANCHOR and vessel.speed_kts > 0.5:
            anomalies.append({
                'type': 'anchor_drag',
                'severity': 'critical',
                'message': 'Vessel moving while at anchor'
            })

        return anomalies

    def calculate_eta(self, voyage_id: str) -> dict:
        """Calculate estimated time of arrival"""
        voyage = self.voyages.get(voyage_id)
        if not voyage:
            return {'error': 'Voyage not found'}

        vessel = self.vessels.get(voyage.vessel_imo)
        if not vessel:
            return {'error': 'Vessel not found'}

        # Calculate remaining distance
        dest_coords = self._get_port_coordinates(voyage.destination_port)
        remaining_distance_nm = self._calculate_distance(
            vessel.current_position,
            dest_coords
        )

        # Calculate ETA based on current speed
        if vessel.speed_kts > 0:
            hours_remaining = remaining_distance_nm / vessel.speed_kts
            eta = datetime.now() + timedelta(hours=hours_remaining)
        else:
            # Use average speed if vessel is stopped
            avg_speed = vessel.max_speed_kts * 0.7  # Assume 70% of max
            hours_remaining = remaining_distance_nm / avg_speed
            eta = datetime.now() + timedelta(hours=hours_remaining)

        # Calculate delay
        delay_hours = (eta - voyage.scheduled_arrival).total_seconds() / 3600

        return {
            'voyage_id': voyage_id,
            'vessel_name': vessel.vessel_name,
            'destination': voyage.destination_port,
            'current_position': vessel.current_position,
            'remaining_distance_nm': remaining_distance_nm,
            'current_speed_kts': vessel.speed_kts,
            'estimated_arrival': eta.isoformat(),
            'scheduled_arrival': voyage.scheduled_arrival.isoformat(),
            'delay_hours': delay_hours,
            'on_schedule': delay_hours <= 0
        }

    def optimize_route(self,
                      start_position: Tuple[float, float],
                      destination: str,
                      vessel_type: VesselType,
                      departure_time: datetime) -> dict:
        """Optimize vessel route considering weather and fuel"""
        dest_coords = self._get_port_coordinates(destination)

        # Calculate great circle route
        gc_distance = self._calculate_distance(start_position, dest_coords)

        # Get weather forecast
        weather = self._get_weather_forecast(start_position, dest_coords, departure_time)

        # Calculate fuel consumption for different routes
        routes = [
            {
                'name': 'Great Circle',
                'distance_nm': gc_distance,
                'waypoints': self._generate_waypoints(start_position, dest_coords, 10)
            },
            {
                'name': 'Weather Optimized',
                'distance_nm': gc_distance * 1.05,  # 5% longer to avoid weather
                'waypoints': self._generate_weather_route(start_position, dest_coords, weather)
            }
        ]

        # Calculate fuel and time for each route
        for route in routes:
            avg_speed = 18.0  # knots
            transit_time = route['distance_nm'] / avg_speed
            fuel_consumption = self._estimate_fuel_consumption(
                route['distance_nm'],
                vessel_type,
                avg_speed
            )

            route['transit_time_hours'] = transit_time
            route['fuel_consumption_mt'] = fuel_consumption
            route['estimated_fuel_cost'] = fuel_consumption * 500  # $500/MT

        # Recommend optimal route
        recommended = min(routes, key=lambda r: r['estimated_fuel_cost'])

        return {
            'routes': routes,
            'recommended_route': recommended['name'],
            'savings': {
                'fuel_mt': routes[0]['fuel_consumption_mt'] - recommended['fuel_consumption_mt'],
                'cost_usd': routes[0]['estimated_fuel_cost'] - recommended['estimated_fuel_cost']
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

        distance_km = 6371 * c
        distance_nm = distance_km * 0.539957

        return distance_nm

    def _get_vessel_by_mmsi(self, mmsi: str) -> Optional[Vessel]:
        """Get vessel by MMSI"""
        for vessel in self.vessels.values():
            if vessel.mmsi == mmsi:
                return vessel
        return None

    def _get_port_coordinates(self, port_code: str) -> Tuple[float, float]:
        """Get port coordinates"""
        ports = {
            'USNYC': (40.6694, -74.0450),  # New York
            'NLRTM': (51.9244, 4.4777),    # Rotterdam
            'SGSIN': (1.2644, 103.8227),   # Singapore
            'CNSHA': (31.2304, 121.4737)   # Shanghai
        }
        return ports.get(port_code, (0.0, 0.0))

    def _generate_waypoints(self, start: Tuple[float, float], end: Tuple[float, float], count: int) -> List[Tuple[float, float]]:
        """Generate waypoints along great circle route"""
        waypoints = []
        for i in range(count + 1):
            fraction = i / count
            lat = start[0] + (end[0] - start[0]) * fraction
            lon = start[1] + (end[1] - start[1]) * fraction
            waypoints.append((lat, lon))
        return waypoints

    def _get_weather_forecast(self, start: Tuple[float, float], end: Tuple[float, float], time: datetime) -> dict:
        """Get weather forecast for route"""
        # Would integrate with weather API
        return {'wind_speed': 15, 'wave_height': 2.5}

    def _generate_weather_route(self, start: Tuple[float, float], end: Tuple[float, float], weather: dict) -> List[Tuple[float, float]]:
        """Generate weather-optimized route"""
        # Simplified - would use sophisticated weather routing
        return self._generate_waypoints(start, end, 12)

    def _estimate_fuel_consumption(self, distance_nm: float, vessel_type: VesselType, speed_kts: float) -> float:
        """Estimate fuel consumption in metric tons"""
        # Fuel consumption rates (MT per day at cruising speed)
        daily_consumption = {
            VesselType.CONTAINER: 80,
            VesselType.BULK_CARRIER: 30,
            VesselType.TANKER: 50
        }

        base_consumption = daily_consumption.get(vessel_type, 40)

        # Speed factor (fuel increases with cube of speed)
        speed_factor = (speed_kts / 18.0) ** 3

        days_at_sea = (distance_nm / speed_kts) / 24
        total_fuel = base_consumption * days_at_sea * speed_factor

        return total_fuel
```
