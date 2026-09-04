---
name: aerospace-expert
version: 1.1.0
description: >-
  Expert-level aerospace systems, flight management, maintenance tracking, aviation safety,
  and aerospace software. Use when the user mentions aviation, flight, maintenance, safety,
  or air traffic control, or when the task involves Aerospace Systems, Aviation
  Technologies, Standards and Regulations, or Flight Operations.
category: domains
tags: [aerospace, aviation, flight, maintenance, safety, atc]
allowed-tools:
  - Read
  - Write
  - Edit
---

# Aerospace Expert

Expert guidance for aerospace systems, flight management, maintenance tracking, aviation safety, air traffic control systems, and aerospace software development.

## Core Concepts

### Aerospace Systems

- Flight Management Systems (FMS)
- Maintenance, Repair, and Overhaul (MRO)
- Air Traffic Control (ATC) systems
- Aircraft Health Monitoring
- Flight Operations Quality Assurance (FOQA)
- Crew resource management
- Ground handling systems

### Aviation Technologies

- Avionics systems
- ACARS (Aircraft Communications Addressing and Reporting System)
- ADS-B (Automatic Dependent Surveillance-Broadcast)
- Flight data recorders (black boxes)
- Weather radar systems
- Autopilot and fly-by-wire
- Satellite communications

### Standards and Regulations

- FAA regulations (Federal Aviation Administration)
- EASA standards (European Union Aviation Safety Agency)
- ICAO standards (International Civil Aviation Organization)
- DO-178C (software airworthiness)
- DO-254 (hardware airworthiness)
- SPEC-42 (maintenance tracking)
- ATA chapters (maintenance organization)

## Aircraft Maintenance System

```python
from enum import Enum

class MaintenanceType(Enum):
    A_CHECK = "a_check"  # Every 400-600 flight hours
    B_CHECK = "b_check"  # Every 6-8 months
    C_CHECK = "c_check"  # Every 18-24 months
    D_CHECK = "d_check"  # Every 6-10 years
    LINE_MAINTENANCE = "line_maintenance"
    UNSCHEDULED = "unscheduled"

@dataclass
class Aircraft:
    """Aircraft information"""
    aircraft_id: str
    registration: str
    aircraft_type: str
    manufacturer: str
    model: str
    serial_number: str
    manufacture_date: datetime
    total_flight_hours: float
    total_cycles: int  # Takeoff/landing cycles
    last_a_check: datetime
    last_c_check: datetime
    airworthiness_certificate: str
    next_major_inspection: datetime

@dataclass
class MaintenanceRecord:
    """Maintenance work record"""
    record_id: str
    aircraft_id: str
    maintenance_type: MaintenanceType
    work_performed: str
    components_replaced: List[str]
    performed_by: str
    performed_at: datetime
    flight_hours_at_maintenance: float
    cycles_at_maintenance: int
    next_due_hours: Optional[float]
    next_due_date: Optional[datetime]

class AircraftMaintenanceSystem:
    """MRO (Maintenance, Repair, Overhaul) system"""

    def __init__(self):
        self.aircraft = {}
        self.maintenance_records = []
        self.component_tracking = {}

    def check_maintenance_due(self, aircraft_id: str) -> dict:
        """Check if maintenance is due for aircraft"""
        aircraft = self.aircraft.get(aircraft_id)
        if not aircraft:
            return {'error': 'Aircraft not found'}

        due_items = []

        # Check A-check (every 500 hours)
        hours_since_a_check = aircraft.total_flight_hours - self._get_last_check_hours(
            aircraft_id, MaintenanceType.A_CHECK
        )

        if hours_since_a_check >= 500:
            due_items.append({
                'type': 'A-check',
                'urgency': 'high' if hours_since_a_check >= 550 else 'medium',
                'hours_overdue': max(0, hours_since_a_check - 500)
            })

        # Check calendar-based C-check
        days_since_c_check = (datetime.now() - aircraft.last_c_check).days

        if days_since_c_check >= 540:  # 18 months
            due_items.append({
                'type': 'C-check',
                'urgency': 'critical' if days_since_c_check >= 600 else 'high',
                'days_overdue': max(0, days_since_c_check - 540)
            })

        # Check component life limits
        component_items = self._check_component_life_limits(aircraft_id)
        due_items.extend(component_items)

        return {
            'aircraft_id': aircraft_id,
            'registration': aircraft.registration,
            'maintenance_required': len(due_items) > 0,
            'due_items': due_items,
            'airworthy': len([item for item in due_items if item['urgency'] == 'critical']) == 0
        }

    def _get_last_check_hours(self, aircraft_id: str, check_type: MaintenanceType) -> float:
        """Get flight hours at last check"""
        records = [
            r for r in self.maintenance_records
            if r.aircraft_id == aircraft_id and r.maintenance_type == check_type
        ]

        if records:
            latest = max(records, key=lambda r: r.performed_at)
            return latest.flight_hours_at_maintenance

        return 0.0

    def _check_component_life_limits(self, aircraft_id: str) -> List[dict]:
        """Check component life limits"""
        due_items = []

        components = self.component_tracking.get(aircraft_id, {})

        for component_name, component_data in components.items():
            if component_data['life_limit_hours']:
                hours_used = component_data['hours_since_new']
                life_limit = component_data['life_limit_hours']

                if hours_used >= life_limit * 0.9:  # Within 90% of life limit
                    due_items.append({
                        'type': 'component_replacement',
                        'component': component_name,
                        'urgency': 'critical' if hours_used >= life_limit else 'high',
                        'hours_remaining': max(0, life_limit - hours_used)
                    })

        return due_items

    def record_maintenance(self,
                          aircraft_id: str,
                          maintenance_data: dict) -> MaintenanceRecord:
        """Record completed maintenance"""
        aircraft = self.aircraft.get(aircraft_id)
        if not aircraft:
            raise ValueError("Aircraft not found")

        record = MaintenanceRecord(
            record_id=self._generate_record_id(),
            aircraft_id=aircraft_id,
            maintenance_type=MaintenanceType(maintenance_data['type']),
            work_performed=maintenance_data['work_performed'],
            components_replaced=maintenance_data.get('components_replaced', []),
            performed_by=maintenance_data['technician_id'],
            performed_at=datetime.now(),
            flight_hours_at_maintenance=aircraft.total_flight_hours,
            cycles_at_maintenance=aircraft.total_cycles,
            next_due_hours=maintenance_data.get('next_due_hours'),
            next_due_date=maintenance_data.get('next_due_date')
        )

        self.maintenance_records.append(record)

        # Update aircraft maintenance dates
        if record.maintenance_type == MaintenanceType.A_CHECK:
            aircraft.last_a_check = datetime.now()
        elif record.maintenance_type == MaintenanceType.C_CHECK:
            aircraft.last_c_check = datetime.now()

        return record

    def predict_maintenance_cost(self,
                                aircraft_type: str,
                                flight_hours_per_year: float) -> dict:
        """Predict annual maintenance costs"""
        # Base maintenance costs per aircraft type
        base_costs = {
            'B737': {
                'hourly_rate': 800,  # $ per flight hour
                'a_check': 25000,
                'c_check': 500000,
                'd_check': 5000000
            },
            'B777': {
                'hourly_rate': 1500,
                'a_check': 50000,
                'c_check': 1000000,
                'd_check': 10000000
            }
        }

        costs = base_costs.get(aircraft_type, base_costs['B737'])

        # Calculate annual costs
        hourly_maintenance = flight_hours_per_year * costs['hourly_rate']

        # A-checks (assume 2 per year for 1000 hours/year)
        a_checks_per_year = flight_hours_per_year / 500
        a_check_costs = a_checks_per_year * costs['a_check']

        # C-check (amortized over 18 months)
        c_check_annual = costs['c_check'] / 1.5

        # D-check (amortized over 8 years)
        d_check_annual = costs['d_check'] / 8

        total_annual = hourly_maintenance + a_check_costs + c_check_annual + d_check_annual

        return {
            'aircraft_type': aircraft_type,
            'flight_hours_per_year': flight_hours_per_year,
            'maintenance_costs': {
                'hourly_maintenance': hourly_maintenance,
                'a_checks': a_check_costs,
                'c_check_amortized': c_check_annual,
                'd_check_amortized': d_check_annual,
                'total_annual': total_annual
            },
            'cost_per_flight_hour': total_annual / flight_hours_per_year
        }

    def _generate_record_id(self) -> str:
        import uuid
        return f"MX-{uuid.uuid4().hex[:10].upper()}"
```

## Aviation Safety Analysis

```python
class AviationSafetySystem:
    """Flight safety and FOQA analysis"""

    def __init__(self):
        self.safety_reports = []
        self.foqa_events = []

    def analyze_flight_data(self, flight_data: dict) -> dict:
        """Analyze flight data for safety events (FOQA)"""
        events_detected = []

        # Check for hard landings
        if flight_data.get('landing_vertical_speed_fpm', 0) < -600:
            events_detected.append({
                'event_type': 'hard_landing',
                'severity': 'medium',
                'value': flight_data['landing_vertical_speed_fpm'],
                'threshold': -600
            })

        # Check for unstabilized approaches
        if flight_data.get('approach_speed_deviation_kts', 0) > 10:
            events_detected.append({
                'event_type': 'unstabilized_approach',
                'severity': 'high',
                'value': flight_data['approach_speed_deviation_kts'],
                'threshold': 10
            })

        # Check for altitude deviations
        if flight_data.get('altitude_deviation_ft', 0) > 300:
            events_detected.append({
                'event_type': 'altitude_deviation',
                'severity': 'high',
                'value': flight_data['altitude_deviation_ft'],
                'threshold': 300
            })

        # Check for excessive bank angles
        if flight_data.get('max_bank_angle_deg', 0) > 30:
            events_detected.append({
                'event_type': 'excessive_bank',
                'severity': 'medium',
                'value': flight_data['max_bank_angle_deg'],
                'threshold': 30
            })

        # Calculate overall safety score
        safety_score = 100.0 - (len(events_detected) * 10)

        return {
            'flight_number': flight_data['flight_number'],
            'events_detected': events_detected,
            'safety_score': max(0.0, safety_score),
            'requires_review': len(events_detected) > 0
        }

    def calculate_safety_metrics(self, flights_data: List[dict]) -> dict:
        """Calculate safety KPIs"""
        total_flights = len(flights_data)
        total_hours = sum(f.get('flight_hours', 0) for f in flights_data)

        # Count safety events
        safety_events = sum(
            len(self.analyze_flight_data(f)['events_detected'])
            for f in flights_data
        )

        # Event rate per 1000 flights
        event_rate = (safety_events / total_flights * 1000) if total_flights > 0 else 0

        return {
            'total_flights': total_flights,
            'total_flight_hours': total_hours,
            'safety_events': safety_events,
            'event_rate_per_1000_flights': event_rate,
            'safety_rating': 'Excellent' if event_rate < 5 else
                           'Good' if event_rate < 10 else
                           'Needs Improvement'
        }
```

## Best Practices

### Flight Operations

- File complete and accurate flight plans
- Conduct thorough pre-flight checks
- Monitor fuel continuously
- Maintain communication with ATC
- Follow standard operating procedures (SOPs)
- Implement crew resource management
- Use automation appropriately

### Maintenance Management

- Follow manufacturer maintenance schedules
- Track all component life limits
- Maintain detailed maintenance logs
- Use certified parts and technicians
- Implement predictive maintenance
- Conduct regular inspections
- Ensure airworthiness compliance

### Safety Management

- Implement Safety Management System (SMS)
- Encourage safety reporting culture
- Analyze FOQA data regularly
- Conduct regular safety audits
- Maintain emergency procedures
- Train crew on CRM principles
- Track safety KPIs

### Regulatory Compliance

- Maintain current certifications
- Follow DO-178C for software
- Implement quality management systems
- Conduct regular audits
- Maintain proper documentation
- Follow ATA chapter organization
- Ensure ETOPS compliance (if applicable)

## Anti-Patterns

❌ Delaying required maintenance
❌ Poor flight planning
❌ Inadequate fuel reserves
❌ Ignoring weather conditions
❌ Poor crew communication
❌ No safety management system
❌ Inadequate record keeping
❌ Using uncertified parts
❌ Skipping pre-flight checks

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Flight Management System](references/FLIGHT_MANAGEMENT_SYSTEM.md)

## Resources

- FAA: https://www.faa.gov/
- ICAO: https://www.icao.int/
- EASA: https://www.easa.europa.eu/
- IATA: https://www.iata.org/
- Flight Safety Foundation: https://flightsafety.org/
- FAA Airworthiness Directives: https://www.faa.gov/regulations_policies/airworthiness_directives/
- DO-178C Standard: https://www.rtca.org/
