---
name: automotive-expert
version: 1.1.0
description: >-
  Expert-level automotive systems, connected vehicles, fleet management, telematics, ADAS,
  and automotive software. Use when the user mentions connected car, fleet, telematics,
  ADAS, or vehicle, or when the task involves Automotive Systems, Technologies, Standards
  and Protocols, or Fleet Management.
category: domains
tags: [automotive, connected-car, fleet, telematics, adas, vehicle]
allowed-tools:
  - Read
  - Write
  - Edit
---

# Automotive Expert

Expert guidance for automotive systems, connected vehicles, fleet management, telematics, advanced driver assistance systems (ADAS), and automotive software development.

## Core Concepts

### Automotive Systems

- Telematics and fleet management
- Connected car platforms
- Advanced Driver Assistance Systems (ADAS)
- Electric Vehicle (EV) management
- Vehicle-to-Everything (V2X) communication
- Infotainment systems
- Diagnostic systems (OBD-II)

### Technologies

- CAN bus and automotive networks
- AUTOSAR architecture
- Over-the-air (OTA) updates
- Autonomous driving systems
- Battery management systems
- Computer vision for ADAS
- Edge computing in vehicles

### Standards and Protocols

- ISO 26262 (functional safety)
- AUTOSAR (automotive software architecture)
- J1939 (heavy-duty vehicle communication)
- UDS (Unified Diagnostic Services)
- SOME/IP (service-oriented middleware)
- MQTT for telematics
- CAN, LIN, FlexRay protocols

## Connected Vehicle Platform

```python
@dataclass
class VehicleTelemetry:
    """Real-time vehicle telemetry data"""
    vehicle_id: str
    timestamp: datetime
    location: tuple
    speed_kmh: float
    rpm: int
    engine_temp_c: float
    battery_voltage: float
    fuel_level_percent: float
    odometer_km: int
    dtc_codes: List[str]  # Diagnostic Trouble Codes

class ConnectedVehiclePlatform:
    """Connected car platform with OTA updates"""

    def __init__(self):
        self.vehicles = {}
        self.telemetry_buffer = []
        self.ota_updates = {}

    def process_telemetry(self, telemetry: VehicleTelemetry) -> dict:
        """Process incoming telemetry data"""
        self.telemetry_buffer.append(telemetry)

        # Analyze telemetry for anomalies
        alerts = []

        # Check engine temperature
        if telemetry.engine_temp_c > 110:
            alerts.append({
                'type': 'high_engine_temp',
                'severity': 'warning',
                'value': telemetry.engine_temp_c,
                'message': 'Engine temperature above normal'
            })

        # Check battery voltage
        if telemetry.battery_voltage < 12.0:
            alerts.append({
                'type': 'low_battery',
                'severity': 'warning',
                'value': telemetry.battery_voltage,
                'message': 'Battery voltage low'
            })

        # Check for diagnostic trouble codes
        if telemetry.dtc_codes:
            alerts.append({
                'type': 'dtc_codes',
                'severity': 'critical',
                'codes': telemetry.dtc_codes,
                'message': f'{len(telemetry.dtc_codes)} diagnostic code(s) detected'
            })

        # Check for harsh driving
        if len(self.telemetry_buffer) >= 2:
            prev = self.telemetry_buffer[-2]
            if telemetry.vehicle_id == prev.vehicle_id:
                time_diff = (telemetry.timestamp - prev.timestamp).total_seconds()
                if time_diff > 0:
                    acceleration = (telemetry.speed_kmh - prev.speed_kmh) / time_diff

                    if abs(acceleration) > 5:  # > 5 km/h per second
                        alerts.append({
                            'type': 'harsh_driving',
                            'severity': 'info',
                            'acceleration': acceleration,
                            'message': 'Harsh acceleration/braking detected'
                        })

        return {
            'vehicle_id': telemetry.vehicle_id,
            'timestamp': telemetry.timestamp.isoformat(),
            'alerts': alerts,
            'health_score': self._calculate_vehicle_health(telemetry)
        }

    def deploy_ota_update(self,
                         vehicle_ids: List[str],
                         update_package: dict) -> dict:
        """Deploy over-the-air software update"""
        update_id = self._generate_update_id()

        ota_update = {
            'update_id': update_id,
            'version': update_package['version'],
            'description': update_package['description'],
            'package_size_mb': update_package['size_mb'],
            'target_vehicles': vehicle_ids,
            'deployed_at': datetime.now(),
            'status_by_vehicle': {}
        }

        for vehicle_id in vehicle_ids:
            # Schedule update for vehicle
            ota_update['status_by_vehicle'][vehicle_id] = {
                'status': 'scheduled',
                'download_progress': 0,
                'install_progress': 0
            }

        self.ota_updates[update_id] = ota_update

        return {
            'update_id': update_id,
            'vehicles_targeted': len(vehicle_ids),
            'estimated_completion': 'Within 48 hours'
        }

    def diagnose_vehicle(self, vehicle_id: str, dtc_codes: List[str]) -> dict:
        """Diagnose vehicle issues from DTC codes"""
        diagnoses = []

        for code in dtc_codes:
            diagnosis = self._lookup_dtc_code(code)
            diagnoses.append(diagnosis)

        # Calculate severity
        max_severity = max(d['severity'] for d in diagnoses)

        return {
            'vehicle_id': vehicle_id,
            'dtc_codes': dtc_codes,
            'diagnoses': diagnoses,
            'overall_severity': max_severity,
            'service_recommended': max_severity in ['high', 'critical']
        }

    def _calculate_vehicle_health(self, telemetry: VehicleTelemetry) -> float:
        """Calculate overall vehicle health score"""
        score = 100.0

        # Engine temperature
        if telemetry.engine_temp_c > 110:
            score -= 15
        elif telemetry.engine_temp_c > 100:
            score -= 5

        # Battery voltage
        if telemetry.battery_voltage < 11.5:
            score -= 20
        elif telemetry.battery_voltage < 12.0:
            score -= 10

        # DTC codes
        score -= len(telemetry.dtc_codes) * 15

        return max(0.0, score)

    def _lookup_dtc_code(self, code: str) -> dict:
        """Lookup diagnostic trouble code"""
        # Simplified DTC lookup
        # In production, would use comprehensive OBD-II code database

        dtc_database = {
            'P0171': {
                'description': 'System Too Lean (Bank 1)',
                'severity': 'medium',
                'possible_causes': ['Vacuum leak', 'Faulty MAF sensor', 'Fuel filter clogged']
            },
            'P0300': {
                'description': 'Random/Multiple Cylinder Misfire Detected',
                'severity': 'high',
                'possible_causes': ['Faulty spark plugs', 'Ignition coil failure', 'Fuel injector issue']
            }
        }

        return dtc_database.get(code, {
            'description': f'Unknown code: {code}',
            'severity': 'medium',
            'possible_causes': ['Requires diagnostic scan']
        })

    def _generate_update_id(self) -> str:
        import uuid
        return f"OTA-{uuid.uuid4().hex[:8].upper()}"
```

## Electric Vehicle Management

```python
class ElectricVehicleManagement:
    """EV-specific management functions"""

    def __init__(self):
        self.charging_stations = {}
        self.charging_sessions = []

    def calculate_range(self,
                       battery_capacity_kwh: float,
                       battery_soc_percent: float,
                       consumption_kwh_per_km: float) -> dict:
        """Calculate remaining range for EV"""
        available_energy = battery_capacity_kwh * (battery_soc_percent / 100)
        range_km = available_energy / consumption_kwh_per_km

        # Adjust for temperature (simplified)
        # Cold weather reduces range by up to 40%
        temperature_factor = 0.8  # Assume moderate conditions

        adjusted_range = range_km * temperature_factor

        return {
            'nominal_range_km': range_km,
            'adjusted_range_km': adjusted_range,
            'battery_soc_percent': battery_soc_percent,
            'available_energy_kwh': available_energy
        }

    def find_charging_stations(self,
                              current_location: tuple,
                              max_distance_km: float) -> List[dict]:
        """Find nearby charging stations"""
        nearby_stations = []

        for station_id, station in self.charging_stations.items():
            distance = self._calculate_distance(current_location, station['location'])

            if distance <= max_distance_km:
                nearby_stations.append({
                    'station_id': station_id,
                    'name': station['name'],
                    'location': station['location'],
                    'distance_km': distance,
                    'available_chargers': station['available_chargers'],
                    'charging_speed_kw': station['max_power_kw'],
                    'cost_per_kwh': station['cost_per_kwh']
                })

        # Sort by distance
        nearby_stations.sort(key=lambda x: x['distance_km'])

        return nearby_stations

    def optimize_charging_schedule(self,
                                  battery_capacity_kwh: float,
                                  current_soc_percent: float,
                                  target_soc_percent: float,
                                  departure_time: datetime) -> dict:
        """Optimize EV charging schedule based on electricity rates"""
        energy_needed = battery_capacity_kwh * ((target_soc_percent - current_soc_percent) / 100)

        # Get electricity rate schedule
        rate_schedule = self._get_electricity_rates(departure_time)

        # Find lowest rate period
        optimal_period = min(rate_schedule, key=lambda x: x['rate'])

        charging_duration_hours = energy_needed / 7.0  # Assume 7kW home charger

        return {
            'energy_needed_kwh': energy_needed,
            'optimal_start_time': optimal_period['start_time'].isoformat(),
            'charging_duration_hours': charging_duration_hours,
            'estimated_cost': energy_needed * float(optimal_period['rate']),
            'will_complete_by': (optimal_period['start_time'] +
                               timedelta(hours=charging_duration_hours)).isoformat()
        }

    def _calculate_distance(self, point1: tuple, point2: tuple) -> float:
        """Calculate distance between two points"""
        from math import radians, sin, cos, sqrt, atan2

        lat1, lon1 = radians(point1[0]), radians(point1[1])
        lat2, lon2 = radians(point2[0]), radians(point2[1])

        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))

        return 6371 * c  # Earth radius in km

    def _get_electricity_rates(self, date: datetime) -> List[dict]:
        """Get time-of-use electricity rates"""
        # Simplified rate schedule
        # Off-peak: 11 PM - 7 AM
        # Peak: 2 PM - 8 PM
        # Mid-peak: all other times

        return [
            {
                'start_time': date.replace(hour=23, minute=0),
                'end_time': date.replace(hour=7, minute=0) + timedelta(days=1),
                'rate': Decimal('0.08')  # $0.08/kWh
            },
            {
                'start_time': date.replace(hour=14, minute=0),
                'end_time': date.replace(hour=20, minute=0),
                'rate': Decimal('0.25')  # $0.25/kWh
            }
        ]
```

## Best Practices

### Fleet Management

- Track all vehicle metrics in real-time
- Implement predictive maintenance
- Optimize routes for fuel efficiency
- Monitor driver behavior
- Use telematics for theft prevention
- Maintain detailed service records
- Implement fuel management systems

### Connected Vehicles

- Ensure secure V2X communication
- Implement robust cybersecurity
- Use encrypted data transmission
- Support OTA updates
- Monitor vehicle health continuously
- Provide driver assistance features
- Enable remote diagnostics

### EV Management

- Optimize charging schedules
- Monitor battery health
- Provide range prediction
- Support multiple charging networks
- Implement thermal management
- Track total cost of ownership
- Enable smart grid integration

### Safety and Compliance

- Follow ISO 26262 for safety-critical systems
- Implement fail-safe mechanisms
- Conduct regular safety audits
- Maintain compliance with emissions standards
- Support vehicle recall management
- Implement driver identification
- Provide emergency response features

## Anti-Patterns

❌ No telematics or GPS tracking
❌ Reactive maintenance only
❌ Manual route planning
❌ Ignoring driver behavior data
❌ No vehicle diagnostics
❌ Poor fuel management
❌ Inadequate cybersecurity
❌ No OTA update capability
❌ Inefficient EV charging

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Fleet Management System](references/FLEET_MANAGEMENT_SYSTEM.md)

## Resources

- AUTOSAR: https://www.autosar.org/
- ISO 26262: https://www.iso.org/standard/68383.html
- SAE International: https://www.sae.org/
- OBD-II Standards: https://www.obdii.com/
- CAN Bus Specification: https://www.can-cia.org/
- Automotive Edge Computing Consortium: https://aecc.org/
- CharIN (EV Charging): https://www.charin.global/
