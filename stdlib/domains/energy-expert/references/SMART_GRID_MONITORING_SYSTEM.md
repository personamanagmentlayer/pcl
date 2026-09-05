# Energy Expert — Smart Grid Monitoring System

Reference material for the `energy-expert` skill. See [SKILL.md](../SKILL.md).

## Smart Grid Monitoring System

```python
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional
import numpy as np

@dataclass
class GridNode:
    """Represents a node in the power grid"""
    node_id: str
    node_type: str  # 'substation', 'transformer', 'meter'
    location: tuple  # (latitude, longitude)
    voltage_rating: float  # kV
    current_load: float  # MW
    capacity: float  # MW
    status: str  # 'online', 'offline', 'maintenance'
    last_updated: datetime

@dataclass
class PowerReading:
    """Real-time power measurement"""
    meter_id: str
    timestamp: datetime
    voltage: float  # Volts
    current: float  # Amperes
    power_factor: float
    active_power: float  # kW
    reactive_power: float  # kVAR
    frequency: float  # Hz

class SmartGridMonitor:
    """Smart grid monitoring and control system"""

    def __init__(self):
        self.nodes = {}
        self.alert_thresholds = {
            'voltage_deviation': 0.05,  # 5% deviation
            'overload': 0.95,  # 95% capacity
            'frequency_deviation': 0.5  # Hz
        }

    def process_meter_reading(self, reading: PowerReading) -> dict:
        """Process AMI meter reading"""
        alerts = []

        # Voltage quality check
        nominal_voltage = 240.0  # Volts
        voltage_deviation = abs(reading.voltage - nominal_voltage) / nominal_voltage

        if voltage_deviation > self.alert_thresholds['voltage_deviation']:
            alerts.append({
                'type': 'voltage_deviation',
                'severity': 'warning',
                'value': voltage_deviation,
                'message': f'Voltage deviation: {voltage_deviation:.2%}'
            })

        # Frequency check
        nominal_frequency = 60.0  # Hz (US) or 50.0 (Europe)
        freq_deviation = abs(reading.frequency - nominal_frequency)

        if freq_deviation > self.alert_thresholds['frequency_deviation']:
            alerts.append({
                'type': 'frequency_deviation',
                'severity': 'critical',
                'value': freq_deviation,
                'message': f'Frequency deviation: {freq_deviation:.2f} Hz'
            })

        # Power factor check
        if reading.power_factor < 0.9:
            alerts.append({
                'type': 'poor_power_factor',
                'severity': 'info',
                'value': reading.power_factor,
                'message': f'Low power factor: {reading.power_factor:.2f}'
            })

        return {
            'meter_id': reading.meter_id,
            'timestamp': reading.timestamp,
            'metrics': {
                'voltage': reading.voltage,
                'current': reading.current,
                'power': reading.active_power,
                'power_factor': reading.power_factor
            },
            'alerts': alerts
        }

    def calculate_grid_load(self, node_id: str) -> dict:
        """Calculate load metrics for grid node"""
        node = self.nodes.get(node_id)
        if not node:
            return {'error': 'Node not found'}

        load_percentage = (node.current_load / node.capacity) * 100
        available_capacity = node.capacity - node.current_load

        status = 'normal'
        if load_percentage > 95:
            status = 'critical'
        elif load_percentage > 80:
            status = 'warning'

        return {
            'node_id': node_id,
            'current_load_mw': node.current_load,
            'capacity_mw': node.capacity,
            'load_percentage': load_percentage,
            'available_capacity_mw': available_capacity,
            'status': status
        }

    def predict_demand(self, historical_data: List[float], hours_ahead: int = 24) -> np.ndarray:
        """Predict energy demand using time series analysis"""
        # Simple moving average prediction
        # In production, use LSTM or ARIMA models
        window_size = 168  # 1 week of hourly data

        if len(historical_data) < window_size:
            return np.array([np.mean(historical_data)] * hours_ahead)

        recent_data = np.array(historical_data[-window_size:])

        # Calculate seasonal pattern (24-hour cycle)
        hourly_pattern = np.zeros(24)
        for i in range(24):
            hourly_indices = list(range(i, len(recent_data), 24))
            hourly_pattern[i] = np.mean(recent_data[hourly_indices])

        # Generate predictions
        predictions = []
        for hour in range(hours_ahead):
            hour_of_day = hour % 24
            predictions.append(hourly_pattern[hour_of_day])

        return np.array(predictions)
```
