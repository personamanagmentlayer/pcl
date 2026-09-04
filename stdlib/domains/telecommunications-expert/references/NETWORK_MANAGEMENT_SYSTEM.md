# Telecommunications Expert — Network Management System

Reference material for the `telecommunications-expert` skill. See [SKILL.md](../SKILL.md).

## Network Management System

```python
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional, Dict
from enum import Enum
import numpy as np

class NetworkElementType(Enum):
    BASE_STATION = "base_station"
    ROUTER = "router"
    SWITCH = "switch"
    FIBER_NODE = "fiber_node"
    GATEWAY = "gateway"
    FIREWALL = "firewall"

class AlarmSeverity(Enum):
    CRITICAL = "critical"
    MAJOR = "major"
    MINOR = "minor"
    WARNING = "warning"
    CLEARED = "cleared"

@dataclass
class NetworkElement:
    """Network infrastructure element"""
    element_id: str
    element_type: NetworkElementType
    name: str
    location: dict
    ip_address: str
    status: str  # 'active', 'inactive', 'maintenance'
    vendor: str
    model: str
    software_version: str
    capacity: dict
    utilization: dict

@dataclass
class NetworkAlarm:
    """Network alarm/event"""
    alarm_id: str
    element_id: str
    severity: AlarmSeverity
    alarm_type: str
    description: str
    timestamp: datetime
    acknowledged: bool
    cleared: bool
    clear_timestamp: Optional[datetime]

@dataclass
class PerformanceMetric:
    """Network performance metric"""
    element_id: str
    metric_name: str
    value: float
    unit: str
    timestamp: datetime
    threshold_warning: float
    threshold_critical: float

class NetworkManagementSystem:
    """Telecom network management and monitoring"""

    def __init__(self):
        self.network_elements = {}
        self.alarms = []
        self.performance_data = []

    def monitor_network_element(self, element_id: str) -> dict:
        """Monitor network element health and performance"""
        element = self.network_elements.get(element_id)
        if not element:
            return {'error': 'Network element not found'}

        # Collect performance metrics via SNMP
        metrics = self._collect_snmp_metrics(element)

        # Check thresholds
        violations = []
        for metric in metrics:
            if metric.value >= metric.threshold_critical:
                violations.append({
                    'metric': metric.metric_name,
                    'value': metric.value,
                    'threshold': metric.threshold_critical,
                    'severity': 'critical'
                })
                self._raise_alarm(element_id, AlarmSeverity.CRITICAL,
                                f"{metric.metric_name} exceeded critical threshold")

            elif metric.value >= metric.threshold_warning:
                violations.append({
                    'metric': metric.metric_name,
                    'value': metric.value,
                    'threshold': metric.threshold_warning,
                    'severity': 'warning'
                })

        return {
            'element_id': element_id,
            'status': element.status,
            'metrics': [
                {
                    'name': m.metric_name,
                    'value': m.value,
                    'unit': m.unit
                }
                for m in metrics
            ],
            'violations': violations,
            'health_score': self._calculate_health_score(element, metrics)
        }

    def _collect_snmp_metrics(self, element: NetworkElement) -> List[PerformanceMetric]:
        """Collect metrics via SNMP"""
        metrics = []
        timestamp = datetime.now()

        # CPU utilization
        cpu_util = self._get_cpu_utilization(element)
        metrics.append(PerformanceMetric(
            element_id=element.element_id,
            metric_name='cpu_utilization',
            value=cpu_util,
            unit='percent',
            timestamp=timestamp,
            threshold_warning=70.0,
            threshold_critical=90.0
        ))

        # Memory utilization
        mem_util = self._get_memory_utilization(element)
        metrics.append(PerformanceMetric(
            element_id=element.element_id,
            metric_name='memory_utilization',
            value=mem_util,
            unit='percent',
            timestamp=timestamp,
            threshold_warning=80.0,
            threshold_critical=95.0
        ))

        # Interface traffic
        for interface in ['eth0', 'eth1']:
            traffic = self._get_interface_traffic(element, interface)
            metrics.append(PerformanceMetric(
                element_id=element.element_id,
                metric_name=f'{interface}_traffic',
                value=traffic,
                unit='mbps',
                timestamp=timestamp,
                threshold_warning=800.0,
                threshold_critical=950.0
            ))

        return metrics

    def _calculate_health_score(self,
                                element: NetworkElement,
                                metrics: List[PerformanceMetric]) -> float:
        """Calculate overall health score for network element"""
        if element.status != 'active':
            return 0.0

        score = 100.0

        for metric in metrics:
            if metric.value >= metric.threshold_critical:
                score -= 20
            elif metric.value >= metric.threshold_warning:
                score -= 10

        return max(0.0, score)

    def _raise_alarm(self, element_id: str, severity: AlarmSeverity, description: str):
        """Raise network alarm"""
        alarm = NetworkAlarm(
            alarm_id=self._generate_alarm_id(),
            element_id=element_id,
            severity=severity,
            alarm_type='performance',
            description=description,
            timestamp=datetime.now(),
            acknowledged=False,
            cleared=False,
            clear_timestamp=None
        )

        self.alarms.append(alarm)

        # Send notifications for critical alarms
        if severity == AlarmSeverity.CRITICAL:
            self._send_alarm_notification(alarm)

    def analyze_network_capacity(self, region: str) -> dict:
        """Analyze network capacity and utilization"""
        # Get all elements in region
        region_elements = [
            e for e in self.network_elements.values()
            if e.location.get('region') == region
        ]

        if not region_elements:
            return {'error': 'No network elements in region'}

        # Calculate aggregate capacity and utilization
        total_capacity = 0
        total_used = 0

        for element in region_elements:
            capacity = element.capacity.get('bandwidth_gbps', 0)
            utilization = element.utilization.get('bandwidth_percent', 0)

            total_capacity += capacity
            total_used += capacity * (utilization / 100)

        utilization_percent = (total_used / total_capacity * 100) if total_capacity > 0 else 0

        # Predict capacity needs
        growth_rate = 0.15  # 15% annual growth
        months_until_full = self._predict_capacity_exhaustion(
            total_capacity,
            total_used,
            growth_rate
        )

        return {
            'region': region,
            'total_capacity_gbps': total_capacity,
            'used_capacity_gbps': total_used,
            'available_capacity_gbps': total_capacity - total_used,
            'utilization_percent': utilization_percent,
            'predicted_full_in_months': months_until_full,
            'expansion_recommended': months_until_full < 12
        }

    def _predict_capacity_exhaustion(self,
                                    total_capacity: float,
                                    current_usage: float,
                                    growth_rate: float) -> float:
        """Predict when capacity will be exhausted"""
        if current_usage >= total_capacity:
            return 0.0

        available = total_capacity - current_usage
        monthly_growth_rate = growth_rate / 12

        # Calculate months until 90% capacity
        target_usage = total_capacity * 0.9
        usage_needed = target_usage - current_usage

        if usage_needed <= 0:
            return 0.0

        months = np.log(1 + (usage_needed / current_usage)) / np.log(1 + monthly_growth_rate)

        return months

    def _get_cpu_utilization(self, element: NetworkElement) -> float:
        """Get CPU utilization via SNMP"""
        # Implementation would use SNMP library
        return np.random.uniform(30, 70)  # Placeholder

    def _get_memory_utilization(self, element: NetworkElement) -> float:
        """Get memory utilization via SNMP"""
        return np.random.uniform(40, 80)  # Placeholder

    def _get_interface_traffic(self, element: NetworkElement, interface: str) -> float:
        """Get interface traffic via SNMP"""
        return np.random.uniform(100, 800)  # Placeholder

    def _send_alarm_notification(self, alarm: NetworkAlarm):
        """Send alarm notification"""
        # Implementation would send SMS/email/page
        pass

    def _generate_alarm_id(self) -> str:
        import uuid
        return f"ALM-{uuid.uuid4().hex[:10].upper()}"
```
