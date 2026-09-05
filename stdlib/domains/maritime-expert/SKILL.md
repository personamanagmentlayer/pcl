---
name: maritime-expert
version: 1.1.0
description: >-
  Expert-level maritime systems, vessel tracking, port operations, cargo management, and
  maritime logistics. Use when the user mentions shipping, logistics, vessel, port, or
  Cargo, or when the task involves Maritime Systems, Maritime Technologies, Standards and
  Protocols, or Vessel Operations.
category: domains
tags: [maritime, shipping, logistics, vessel, port, cargo]
allowed-tools:
  - Read
  - Write
  - Edit
---

# Maritime Expert

Expert guidance for maritime systems, vessel tracking, port operations, cargo management, maritime logistics, and shipping industry software.

## Core Concepts

### Maritime Systems

- Vessel Traffic Services (VTS)
- Port Management Systems
- Cargo Management Systems
- Fleet Management
- Maritime Communication Systems
- Container Terminal Operating Systems (TOS)
- Ship Performance Monitoring

### Maritime Technologies

- AIS (Automatic Identification System)
- ECDIS (Electronic Chart Display and Information System)
- Satellite communication (VSAT)
- Weather routing systems
- Ballast water management
- Engine monitoring systems
- Container tracking (IoT)

### Standards and Protocols

- IMO regulations (International Maritime Organization)
- SOLAS (Safety of Life at Sea)
- MARPOL (Marine Pollution)
- ISM Code (International Safety Management)
- ISPS Code (International Ship and Port Facility Security)
- UN/EDIFACT for EDI
- NMEA protocols

## Port Operations System

```python
@dataclass
class BerthAllocation:
    """Berth allocation for vessel"""
    allocation_id: str
    vessel_imo: str
    berth_id: str
    scheduled_arrival: datetime
    scheduled_departure: datetime
    actual_arrival: Optional[datetime]
    actual_departure: Optional[datetime]
    cargo_operations: List[dict]

class PortOperationsSystem:
    """Port and terminal operations management"""

    def __init__(self):
        self.berths = {}
        self.allocations = []
        self.cargo_operations = []

    def allocate_berth(self, vessel_imo: str, eta: datetime, cargo_type: str) -> dict:
        """Allocate berth for arriving vessel"""
        # Find suitable berth
        suitable_berth = self._find_suitable_berth(cargo_type, eta)

        if not suitable_berth:
            return {'error': 'No suitable berth available'}

        # Estimate time at berth
        time_at_berth = self._estimate_port_time(cargo_type)

        allocation = BerthAllocation(
            allocation_id=self._generate_allocation_id(),
            vessel_imo=vessel_imo,
            berth_id=suitable_berth['berth_id'],
            scheduled_arrival=eta,
            scheduled_departure=eta + timedelta(hours=time_at_berth),
            actual_arrival=None,
            actual_departure=None,
            cargo_operations=[]
        )

        self.allocations.append(allocation)

        return {
            'allocation_id': allocation.allocation_id,
            'berth_id': suitable_berth['berth_id'],
            'scheduled_arrival': eta.isoformat(),
            'scheduled_departure': allocation.scheduled_departure.isoformat(),
            'estimated_hours_at_berth': time_at_berth
        }

    def track_container(self, container_number: str) -> dict:
        """Track container through port"""
        # Container tracking using IoT sensors
        container_data = {
            'container_number': container_number,
            'status': 'in_yard',
            'location': 'Block A, Row 12, Tier 3',
            'last_move': datetime.now() - timedelta(hours=2),
            'vessel_loaded': None,
            'customs_cleared': True,
            'temperature': 5.0  # For reefer containers
        }

        return container_data

    def optimize_yard_operations(self, expected_moves: int) -> dict:
        """Optimize container yard operations"""
        # Simplified yard optimization
        # In production, would use complex algorithms

        return {
            'expected_moves': expected_moves,
            'optimal_sequence': 'calculated',
            'estimated_time_hours': expected_moves * 0.1,  # 6 minutes per move
            'crane_allocation': {
                'crane_1': expected_moves // 2,
                'crane_2': expected_moves // 2
            }
        }

    def _find_suitable_berth(self, cargo_type: str, eta: datetime) -> Optional[dict]:
        """Find suitable berth for vessel"""
        # Check berth availability and suitability
        for berth_id, berth in self.berths.items():
            if cargo_type in berth['cargo_types']:
                # Check if berth is available
                if self._is_berth_available(berth_id, eta):
                    return berth
        return None

    def _is_berth_available(self, berth_id: str, time: datetime) -> bool:
        """Check if berth is available at given time"""
        for allocation in self.allocations:
            if allocation.berth_id == berth_id:
                if allocation.scheduled_arrival <= time <= allocation.scheduled_departure:
                    return False
        return True

    def _estimate_port_time(self, cargo_type: str) -> float:
        """Estimate time vessel will spend in port (hours)"""
        port_times = {
            'container': 24,
            'bulk': 48,
            'tanker': 18,
            'general_cargo': 36
        }
        return port_times.get(cargo_type, 24)

    def _generate_allocation_id(self) -> str:
        import uuid
        return f"BERTH-{uuid.uuid4().hex[:8].upper()}"
```

## Cargo Management

```python
class CargoManagementSystem:
    """Cargo and freight management"""

    def calculate_stowage_plan(self, containers: List[dict], vessel_capacity: dict) -> dict:
        """Calculate optimal container stowage plan"""
        # Simplified stowage planning
        # In production, would use sophisticated algorithms

        # Sort containers by weight (heaviest on bottom)
        sorted_containers = sorted(containers, key=lambda c: c['weight'], reverse=True)

        stowage_plan = {
            'bay_plans': [],
            'total_containers': len(containers),
            'total_weight': sum(c['weight'] for c in containers),
            'utilization': (len(containers) / vessel_capacity['max_containers']) * 100
        }

        return stowage_plan

    def track_bill_of_lading(self, bl_number: str) -> dict:
        """Track shipment by Bill of Lading"""
        # Track cargo shipment
        return {
            'bl_number': bl_number,
            'status': 'in_transit',
            'current_location': 'At Sea',
            'vessel': 'MV EXAMPLE',
            'departure_port': 'CNSHA',
            'destination_port': 'USNYC',
            'eta': (datetime.now() + timedelta(days=18)).isoformat()
        }
```

## Best Practices

### Vessel Operations

- Maintain accurate AIS transmission
- Follow IMO regulations strictly
- Implement fuel optimization
- Conduct regular safety drills
- Maintain proper manning levels
- Use weather routing services
- Implement environmental compliance

### Port Operations

- Optimize berth allocation
- Minimize vessel waiting time
- Implement automated gate systems
- Use container tracking technology
- Optimize yard operations
- Maintain equipment reliability
- Ensure security compliance (ISPS)

### Cargo Management

- Maintain accurate documentation
- Implement proper stowage planning
- Use standardized EDI messages
- Track cargo in real-time
- Ensure proper handling of dangerous goods
- Maintain cold chain for reefers
- Implement quality control

### Safety and Environment

- Follow SOLAS requirements
- Implement ISM Code
- Comply with MARPOL regulations
- Conduct risk assessments
- Maintain pollution prevention
- Implement ballast water management
- Train crew regularly

## Anti-Patterns

❌ Inaccurate AIS data transmission
❌ Poor cargo documentation
❌ Inefficient port operations
❌ No weather routing
❌ Inadequate maintenance
❌ Poor crew training
❌ Ignoring environmental regulations
❌ No cargo tracking
❌ Inefficient fuel management

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Vessel Tracking System](references/VESSEL_TRACKING_SYSTEM.md)

## Resources

- IMO (International Maritime Organization): https://www.imo.org/
- ICS (International Chamber of Shipping): https://www.ics-shipping.org/
- BIMCO: https://www.bimco.org/
- Marine Traffic: https://www.marinetraffic.com/
- Port Technology: https://www.porttechnology.org/
- Maritime and Port Authority: https://www.mpa.gov.sg/
- SOLAS Convention: https://www.imo.org/en/About/Conventions/Pages/SOLAS.aspx
