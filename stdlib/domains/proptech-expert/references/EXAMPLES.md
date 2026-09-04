# PropTech Expert — Code Examples

Reference material for the `proptech-expert` skill. See [SKILL.md](../SKILL.md).

## Code Examples

### Smart Building IoT Platform

```python
from enum import Enum
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Callable
from datetime import datetime, timedelta
from decimal import Decimal
import json
import uuid

class DeviceType(Enum):
    THERMOSTAT = "thermostat"
    SMART_LOCK = "smart_lock"
    OCCUPANCY_SENSOR = "occupancy_sensor"
    ENERGY_METER = "energy_meter"
    WATER_LEAK_SENSOR = "water_leak_sensor"
    AIR_QUALITY_MONITOR = "air_quality_monitor"
    LIGHTING = "lighting"
    CAMERA = "camera"

class DeviceStatus(Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    MAINTENANCE = "maintenance"
    ERROR = "error"

@dataclass
class DeviceReading:
    """IoT device sensor reading"""
    timestamp: datetime
    device_id: str
    metric: str
    value: float
    unit: str
    metadata: Dict = field(default_factory=dict)

@dataclass
class IoTDevice:
    """Smart building IoT device"""
    device_id: str
    device_type: DeviceType
    name: str
    location: str  # e.g., "Building A - Unit 301 - Living Room"
    building_id: str
    unit_id: Optional[str] = None

    # Device state
    status: DeviceStatus = DeviceStatus.ONLINE
    battery_level: Optional[int] = None  # Percentage
    firmware_version: str = "1.0.0"
    last_seen: datetime = field(default_factory=datetime.now)

    # Configuration
    settings: Dict = field(default_factory=dict)

    # Readings history
    readings: List[DeviceReading] = field(default_factory=list)

    def is_online(self) -> bool:
        """Check if device is online (seen in last 5 minutes)"""
        threshold = datetime.now() - timedelta(minutes=5)
        return self.last_seen > threshold and self.status == DeviceStatus.ONLINE

    def needs_battery(self) -> bool:
        """Check if battery is low"""
        return self.battery_level is not None and self.battery_level < 20

    def add_reading(self, metric: str, value: float, unit: str, **metadata):
        """Add sensor reading"""
        reading = DeviceReading(
            timestamp=datetime.now(),
            device_id=self.device_id,
            metric=metric,
            value=value,
            unit=unit,
            metadata=metadata
        )
        self.readings.append(reading)
        self.last_seen = datetime.now()
        return reading

class SmartThermostat(IoTDevice):
    """Smart thermostat with HVAC control"""

    def __init__(self, device_id: str, name: str, location: str,
                 building_id: str, unit_id: str):
        super().__init__(
            device_id=device_id,
            device_type=DeviceType.THERMOSTAT,
            name=name,
            location=location,
            building_id=building_id,
            unit_id=unit_id,
            settings={
                'mode': 'auto',  # heat, cool, auto, off
                'target_temp': 72,
                'fan_mode': 'auto',
                'schedule_enabled': True
            }
        )

    def set_temperature(self, target_temp: int) -> Dict:
        """Set target temperature"""
        self.settings['target_temp'] = target_temp

        # Log the change
        self.add_reading('target_temperature', target_temp, 'fahrenheit')

        return {
            'device_id': self.device_id,
            'action': 'set_temperature',
            'target_temp': target_temp,
            'timestamp': datetime.now().isoformat()
        }

    def get_current_reading(self) -> Dict:
        """Get current temperature and humidity"""
        # Most recent readings
        temp_readings = [r for r in self.readings if r.metric == 'temperature']
        humidity_readings = [r for r in self.readings if r.metric == 'humidity']

        current_temp = temp_readings[-1].value if temp_readings else None
        current_humidity = humidity_readings[-1].value if humidity_readings else None

        return {
            'device_id': self.device_id,
            'current_temp': current_temp,
            'target_temp': self.settings['target_temp'],
            'humidity': current_humidity,
            'mode': self.settings['mode'],
            'timestamp': datetime.now().isoformat()
        }

    def optimize_energy(self, occupancy: bool) -> Dict:
        """Optimize HVAC based on occupancy"""
        if not occupancy:
            # Reduce heating/cooling when unoccupied
            if self.settings['mode'] == 'heat':
                self.settings['target_temp'] = max(62, self.settings['target_temp'] - 5)
            elif self.settings['mode'] == 'cool':
                self.settings['target_temp'] = min(78, self.settings['target_temp'] + 5)

            return {
                'optimized': True,
                'reason': 'unoccupied',
                'new_target': self.settings['target_temp']
            }

        return {'optimized': False}

class SmartLock(IoTDevice):
    """Smart lock with access control"""

    def __init__(self, device_id: str, name: str, location: str,
                 building_id: str, unit_id: str):
        super().__init__(
            device_id=device_id,
            device_type=DeviceType.SMART_LOCK,
            name=name,
            location=location,
            building_id=building_id,
            unit_id=unit_id,
            settings={
                'locked': True,
                'auto_lock_delay': 30,  # seconds
                'access_codes': {}
            }
        )
        self.access_log: List[Dict] = []

    def unlock(self, access_code: Optional[str] = None,
               user_id: Optional[str] = None) -> Dict:
        """Unlock the door"""

        # Verify access code if provided
        if access_code and access_code not in self.settings['access_codes']:
            self._log_access('unlock_denied', 'invalid_code', access_code=access_code)
            return {
                'success': False,
                'reason': 'invalid_access_code'
            }

        self.settings['locked'] = False

        self._log_access('unlocked', 'success',
                        access_code=access_code, user_id=user_id)

        return {
            'success': True,
            'device_id': self.device_id,
            'status': 'unlocked',
            'timestamp': datetime.now().isoformat()
        }

    def lock(self) -> Dict:
        """Lock the door"""
        self.settings['locked'] = True
        self._log_access('locked', 'success')

        return {
            'success': True,
            'device_id': self.device_id,
            'status': 'locked',
            'timestamp': datetime.now().isoformat()
        }

    def add_access_code(self, code: str, name: str,
                       expires_at: Optional[datetime] = None) -> Dict:
        """Add temporary or permanent access code"""

        code_id = f"code_{uuid.uuid4().hex[:8]}"

        self.settings['access_codes'][code] = {
            'code_id': code_id,
            'name': name,
            'created_at': datetime.now(),
            'expires_at': expires_at,
            'uses': 0
        }

        return {
            'code_id': code_id,
            'code': code,
            'name': name,
            'expires_at': expires_at.isoformat() if expires_at else None
        }

    def revoke_access_code(self, code: str) -> Dict:
        """Revoke access code"""
        if code in self.settings['access_codes']:
            del self.settings['access_codes'][code]
            return {'success': True, 'revoked': code}
        return {'success': False, 'error': 'code_not_found'}

    def _log_access(self, event: str, result: str, **kwargs):
        """Log access event"""
        self.access_log.append({
            'timestamp': datetime.now(),
            'device_id': self.device_id,
            'event': event,
            'result': result,
            **kwargs
        })

class BuildingManagementSystem:
    """Centralized smart building management"""

    def __init__(self, building_id: str, building_name: str):
        self.building_id = building_id
        self.building_name = building_name
        self.devices: Dict[str, IoTDevice] = {}
        self.automations: List[Dict] = []
        self.alerts: List[Dict] = []

    def register_device(self, device: IoTDevice) -> Dict:
        """Register IoT device with BMS"""
        self.devices[device.device_id] = device

        return {
            'registered': True,
            'device_id': device.device_id,
            'device_type': device.device_type.value,
            'location': device.location
        }

    def get_devices_by_unit(self, unit_id: str) -> List[IoTDevice]:
        """Get all devices in a unit"""
        return [d for d in self.devices.values() if d.unit_id == unit_id]

    def get_devices_by_type(self, device_type: DeviceType) -> List[IoTDevice]:
        """Get all devices of specific type"""
        return [d for d in self.devices.values() if d.device_type == device_type]

    def monitor_energy_usage(self, start_date: datetime,
                           end_date: datetime) -> Dict:
        """Monitor building energy consumption"""

        energy_meters = self.get_devices_by_type(DeviceType.ENERGY_METER)

        total_consumption = Decimal('0')
        unit_consumption = {}

        for meter in energy_meters:
            readings = [
                r for r in meter.readings
                if (r.metric == 'energy' and
                    start_date <= r.timestamp <= end_date)
            ]

            if readings:
                consumption = sum(Decimal(str(r.value)) for r in readings)
                total_consumption += consumption

                if meter.unit_id:
                    unit_consumption[meter.unit_id] = float(consumption)

        return {
            'building_id': self.building_id,
            'period': f"{start_date.date()} to {end_date.date()}",
            'total_kwh': float(total_consumption),
            'unit_breakdown': unit_consumption,
            'average_per_unit': float(total_consumption / len(unit_consumption)) if unit_consumption else 0
        }

    def create_automation(self, name: str, trigger: Dict,
                         action: Dict) -> Dict:
        """Create building automation rule"""

        automation_id = f"auto_{uuid.uuid4().hex}"

        automation = {
            'automation_id': automation_id,
            'name': name,
            'trigger': trigger,
            'action': action,
            'enabled': True,
            'created_at': datetime.now()
        }

        self.automations.append(automation)

        return automation

    def check_automations(self):
        """Check and execute automation rules"""

        for automation in self.automations:
            if not automation['enabled']:
                continue

            # Check trigger condition
            if self._evaluate_trigger(automation['trigger']):
                self._execute_action(automation['action'])

    def _evaluate_trigger(self, trigger: Dict) -> bool:
        """Evaluate automation trigger condition"""

        trigger_type = trigger.get('type')

        if trigger_type == 'occupancy':
            # Example: Trigger when unit becomes unoccupied
            device = self.devices.get(trigger['device_id'])
            if device and device.device_type == DeviceType.OCCUPANCY_SENSOR:
                recent = [r for r in device.readings if r.metric == 'occupancy']
                if recent and recent[-1].value == 0:  # Unoccupied
                    return True

        elif trigger_type == 'time':
            # Example: Trigger at specific time
            now = datetime.now()
            trigger_time = datetime.strptime(trigger['time'], '%H:%M').time()
            if now.time() >= trigger_time:
                return True

        elif trigger_type == 'threshold':
            # Example: Trigger when temperature exceeds threshold
            device = self.devices.get(trigger['device_id'])
            if device:
                recent = [r for r in device.readings if r.metric == trigger['metric']]
                if recent and recent[-1].value > trigger['threshold']:
                    return True

        return False

    def _execute_action(self, action: Dict):
        """Execute automation action"""

        action_type = action.get('type')

        if action_type == 'set_temperature':
            device = self.devices.get(action['device_id'])
            if isinstance(device, SmartThermostat):
                device.set_temperature(action['temperature'])

        elif action_type == 'lock':
            device = self.devices.get(action['device_id'])
            if isinstance(device, SmartLock):
                device.lock()

        elif action_type == 'notification':
            self.alerts.append({
                'type': 'automation',
                'message': action['message'],
                'timestamp': datetime.now()
            })

    def generate_health_report(self) -> Dict:
        """Generate building systems health report"""

        total_devices = len(self.devices)
        online_devices = sum(1 for d in self.devices.values() if d.is_online())
        offline_devices = total_devices - online_devices

        low_battery = [d for d in self.devices.values() if d.needs_battery()]

        recent_alerts = [
            a for a in self.alerts
            if a['timestamp'] > datetime.now() - timedelta(days=7)
        ]

        return {
            'building_id': self.building_id,
            'building_name': self.building_name,
            'report_date': datetime.now().isoformat(),
            'device_health': {
                'total_devices': total_devices,
                'online': online_devices,
                'offline': offline_devices,
                'uptime_percentage': (online_devices / total_devices * 100) if total_devices else 0
            },
            'battery_alerts': len(low_battery),
            'devices_needing_battery': [d.device_id for d in low_battery],
            'recent_alerts': len(recent_alerts),
            'automations_active': sum(1 for a in self.automations if a['enabled'])
        }

@dataclass
class Property:
    """Real estate property"""
    property_id: str
    address: str
    property_type: str  # apartment, house, commercial
    bedrooms: int
    bathrooms: float
    square_feet: int
    rent_amount: Decimal
    available_date: datetime
    amenities: List[str] = field(default_factory=list)
    photos: List[str] = field(default_factory=list)
    virtual_tour_url: Optional[str] = None
    floor_plan_url: Optional[str] = None

@dataclass
class MaintenanceRequest:
    """Tenant maintenance request"""
    request_id: str
    property_id: str
    tenant_id: str
    category: str  # plumbing, electrical, hvac, appliance, other
    priority: str  # low, medium, high, emergency
    description: str
    created_at: datetime
    status: str = "open"  # open, assigned, in_progress, completed, closed
    assigned_to: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    photos: List[str] = field(default_factory=list)
    notes: List[Dict] = field(default_factory=list)

class PropertyManagementPlatform:
    """Comprehensive property management system"""

    def __init__(self):
        self.properties: Dict[str, Property] = {}
        self.maintenance_requests: List[MaintenanceRequest] = []
        self.bms_systems: Dict[str, BuildingManagementSystem] = {}

    def add_property(self, property: Property) -> Dict:
        """Add property to portfolio"""
        self.properties[property.property_id] = property

        return {
            'property_id': property.property_id,
            'address': property.address,
            'status': 'active'
        }

    def create_maintenance_request(self, request: MaintenanceRequest) -> Dict:
        """Create maintenance request"""
        self.maintenance_requests.append(request)

        # Auto-prioritize emergencies
        if request.priority == 'emergency':
            # Notify on-call maintenance staff
            pass

        return {
            'request_id': request.request_id,
            'property_id': request.property_id,
            'priority': request.priority,
            'status': request.status
        }

    def schedule_showing(self, property_id: str, datetime: datetime,
                        prospect_info: Dict) -> Dict:
        """Schedule property showing"""

        showing_id = f"show_{uuid.uuid4().hex}"

        # In production, integrate with calendar and smart lock
        # to generate temporary access code

        return {
            'showing_id': showing_id,
            'property_id': property_id,
            'scheduled_time': datetime.isoformat(),
            'prospect': prospect_info,
            'confirmation_sent': True
        }

# Example usage
def example_smart_building():
    """Example smart building management"""

    # Create BMS for building
    bms = BuildingManagementSystem(
        building_id="BLDG-001",
        building_name="Sunset Apartments"
    )

    # Register smart thermostat
    thermostat = SmartThermostat(
        device_id="THERM-301",
        name="Unit 301 Thermostat",
        location="Building A - Unit 301 - Living Room",
        building_id="BLDG-001",
        unit_id="UNIT-301"
    )
    bms.register_device(thermostat)

    # Simulate temperature readings
    thermostat.add_reading('temperature', 68.5, 'fahrenheit')
    thermostat.add_reading('humidity', 45.0, 'percent')

    # Adjust temperature
    result = thermostat.set_temperature(72)
    print(f"Temperature set: {result}")

    # Register smart lock
    lock = SmartLock(
        device_id="LOCK-301",
        name="Unit 301 Front Door",
        location="Building A - Unit 301 - Entry",
        building_id="BLDG-001",
        unit_id="UNIT-301"
    )
    bms.register_device(lock)

    # Add temporary access code for maintenance
    code_result = lock.add_access_code(
        code="123456",
        name="Maintenance Staff",
        expires_at=datetime.now() + timedelta(hours=4)
    )
    print(f"Access code created: {code_result}")

    # Create automation: Lock door when unoccupied
    automation = bms.create_automation(
        name="Auto-lock when unoccupied",
        trigger={
            'type': 'occupancy',
            'device_id': 'OCC-301',
            'condition': 'unoccupied'
        },
        action={
            'type': 'lock',
            'device_id': lock.device_id
        }
    )
    print(f"Automation created: {automation['automation_id']}")

    # Generate health report
    health = bms.generate_health_report()
    print(f"\nBuilding Health Report:")
    print(f"Total devices: {health['device_health']['total_devices']}")
    print(f"Uptime: {health['device_health']['uptime_percentage']:.1f}%")

if __name__ == "__main__":
    example_smart_building()
```
