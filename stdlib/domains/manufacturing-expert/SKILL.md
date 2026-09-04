---
name: manufacturing-expert
version: 1.1.0
description: >-
  Expert-level manufacturing systems, Industry 4.0, production optimization, quality
  control, and smart factory solutions. Use when the user mentions Industry 4.0,
  production, quality, MES, or PLCs, or when the task involves Manufacturing Systems,
  Standards and Protocols, Production Management, or Quality Management.
category: domains
tags: [manufacturing, industry40, production, quality, mes, plc]
allowed-tools:
  - Read
  - Write
  - Edit
---

# Manufacturing Expert

Expert guidance for manufacturing systems, Industry 4.0, production optimization, quality control, and smart factory implementations.

## Core Concepts

### Manufacturing Systems

- Manufacturing Execution Systems (MES)
- Enterprise Resource Planning (ERP)
- Computer-Aided Manufacturing (CAM)
- Programmable Logic Controllers (PLC)
- Industrial Internet of Things (IIoT)
- Supply Chain Management (SCM)
- Warehouse Management Systems (WMS)

### Industry 4.0

- Smart factories
- Digital twins
- Predictive maintenance
- Autonomous robotics
- Augmented reality for operations
- Edge computing
- Cyber-physical systems

### Standards and Protocols

- OPC UA (Open Platform Communications)
- ISA-95 (Enterprise-Control System Integration)
- MTConnect (manufacturing data exchange)
- MQTT for IIoT
- EtherCAT (real-time Ethernet)
- PROFINET
- ISO 9001 (Quality Management)

## Quality Control System

```python
from scipy import stats
import numpy as np

class StatisticalProcessControl:
    """Statistical Process Control (SPC) for quality management"""

    def __init__(self):
        self.measurement_history = {}

    def calculate_control_limits(self,
                                 measurements: List[float],
                                 sigma_level: float = 3.0) -> dict:
        """Calculate control limits for control charts"""
        mean = np.mean(measurements)
        std_dev = np.std(measurements, ddof=1)

        ucl = mean + (sigma_level * std_dev)  # Upper Control Limit
        lcl = mean - (sigma_level * std_dev)  # Lower Control Limit

        return {
            'mean': mean,
            'std_dev': std_dev,
            'ucl': ucl,
            'lcl': lcl,
            'sigma_level': sigma_level
        }

    def detect_out_of_control(self,
                             measurements: List[float],
                             control_limits: dict) -> dict:
        """Detect out-of-control conditions"""
        violations = []

        # Rule 1: Point beyond control limits
        for i, value in enumerate(measurements):
            if value > control_limits['ucl'] or value < control_limits['lcl']:
                violations.append({
                    'rule': 'beyond_limits',
                    'index': i,
                    'value': value,
                    'severity': 'critical'
                })

        # Rule 2: 2 out of 3 consecutive points beyond 2σ
        sigma_2 = control_limits['std_dev'] * 2
        ucl_2 = control_limits['mean'] + sigma_2
        lcl_2 = control_limits['mean'] - sigma_2

        for i in range(len(measurements) - 2):
            window = measurements[i:i+3]
            beyond_2sigma = sum(1 for v in window if v > ucl_2 or v < lcl_2)
            if beyond_2sigma >= 2:
                violations.append({
                    'rule': '2_of_3_beyond_2sigma',
                    'index': i,
                    'severity': 'warning'
                })

        # Rule 3: 9 consecutive points on same side of mean
        for i in range(len(measurements) - 8):
            window = measurements[i:i+9]
            all_above = all(v > control_limits['mean'] for v in window)
            all_below = all(v < control_limits['mean'] for v in window)

            if all_above or all_below:
                violations.append({
                    'rule': '9_consecutive_same_side',
                    'index': i,
                    'severity': 'warning'
                })

        return {
            'in_control': len(violations) == 0,
            'violations': violations,
            'total_violations': len(violations)
        }

    def calculate_cpk(self,
                     measurements: List[float],
                     lower_spec_limit: float,
                     upper_spec_limit: float) -> dict:
        """Calculate Process Capability Index (Cpk)"""
        mean = np.mean(measurements)
        std_dev = np.std(measurements, ddof=1)

        # Cp: Process Capability
        cp = (upper_spec_limit - lower_spec_limit) / (6 * std_dev)

        # Cpk: Process Capability Index (accounts for centering)
        cpu = (upper_spec_limit - mean) / (3 * std_dev)
        cpl = (mean - lower_spec_limit) / (3 * std_dev)
        cpk = min(cpu, cpl)

        # Interpret Cpk
        if cpk >= 2.0:
            capability = "Excellent"
        elif cpk >= 1.33:
            capability = "Adequate"
        elif cpk >= 1.0:
            capability = "Marginal"
        else:
            capability = "Inadequate"

        return {
            'cp': cp,
            'cpk': cpk,
            'cpu': cpu,
            'cpl': cpl,
            'capability': capability,
            'sigma_level': cpk * 3 if cpk > 0 else 0
        }

    def perform_gage_rr(self,
                       measurements: np.ndarray,
                       n_parts: int,
                       n_operators: int,
                       n_trials: int) -> dict:
        """Perform Gage Repeatability and Reproducibility study"""
        # Reshape data: (parts × operators × trials)
        data = measurements.reshape(n_parts, n_operators, n_trials)

        # Calculate variance components
        part_means = data.mean(axis=(1, 2))
        operator_means = data.mean(axis=(0, 2))
        overall_mean = data.mean()

        # Part variation
        part_variance = np.var(part_means, ddof=1)

        # Repeatability (equipment variation)
        within_operator_variance = np.mean([
            np.var(data[:, op, :], ddof=1)
            for op in range(n_operators)
        ])

        # Reproducibility (operator variation)
        operator_variance = np.var(operator_means, ddof=1)

        # Total variation
        total_variance = np.var(data, ddof=1)

        # Gage R&R
        gage_rr = within_operator_variance + operator_variance
        gage_rr_percentage = (gage_rr / total_variance) * 100

        # Interpretation
        if gage_rr_percentage < 10:
            assessment = "Acceptable"
        elif gage_rr_percentage < 30:
            assessment = "Marginal"
        else:
            assessment = "Unacceptable"

        return {
            'gage_rr_percentage': gage_rr_percentage,
            'repeatability_percentage': (within_operator_variance / total_variance) * 100,
            'reproducibility_percentage': (operator_variance / total_variance) * 100,
            'part_variation_percentage': (part_variance / total_variance) * 100,
            'assessment': assessment
        }
```

## Predictive Maintenance

```python
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import pandas as pd

class PredictiveMaintenanceSystem:
    """Predictive maintenance using machine learning"""

    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=100)
        self.scaler = StandardScaler()
        self.trained = False

    def extract_features(self, sensor_data: dict) -> np.ndarray:
        """Extract features from sensor data"""
        features = [
            sensor_data['vibration_rms'],
            sensor_data['vibration_peak'],
            sensor_data['temperature_c'],
            sensor_data['current_a'],
            sensor_data['pressure_bar'],
            sensor_data['speed_rpm'],
            sensor_data['operating_hours'],
            sensor_data['cycles_completed']
        ]

        return np.array(features).reshape(1, -1)

    def train_model(self, historical_data: pd.DataFrame):
        """Train predictive maintenance model"""
        # Extract features and labels
        X = historical_data.drop(['machine_id', 'timestamp', 'failure'], axis=1)
        y = historical_data['failure']

        # Scale features
        X_scaled = self.scaler.fit_transform(X)

        # Train model
        self.model.fit(X_scaled, y)
        self.trained = True

    def predict_failure(self, sensor_data: dict) -> dict:
        """Predict equipment failure probability"""
        if not self.trained:
            return {'error': 'Model not trained'}

        features = self.extract_features(sensor_data)
        features_scaled = self.scaler.transform(features)

        # Get failure probability
        failure_probability = self.model.predict_proba(features_scaled)[0][1]

        # Calculate remaining useful life (simplified)
        rul_hours = self._estimate_rul(failure_probability)

        # Generate recommendation
        if failure_probability > 0.8:
            recommendation = "Schedule immediate maintenance"
            priority = "critical"
        elif failure_probability > 0.5:
            recommendation = "Schedule maintenance within 1 week"
            priority = "high"
        elif failure_probability > 0.3:
            recommendation = "Monitor closely, schedule maintenance"
            priority = "medium"
        else:
            recommendation = "Continue normal operation"
            priority = "low"

        return {
            'failure_probability': failure_probability,
            'remaining_useful_life_hours': rul_hours,
            'recommendation': recommendation,
            'priority': priority,
            'timestamp': datetime.now().isoformat()
        }

    def _estimate_rul(self, failure_probability: float) -> float:
        """Estimate Remaining Useful Life"""
        # Simplified RUL estimation
        # In production, use more sophisticated models (LSTM, CNN)
        if failure_probability < 0.1:
            return 720.0  # 30 days
        elif failure_probability < 0.3:
            return 360.0  # 15 days
        elif failure_probability < 0.5:
            return 168.0  # 7 days
        elif failure_probability < 0.8:
            return 48.0   # 2 days
        else:
            return 12.0   # 12 hours

    def analyze_failure_modes(self, sensor_data: dict) -> List[dict]:
        """Identify potential failure modes"""
        failure_modes = []

        # Check for bearing failure indicators
        if sensor_data['vibration_rms'] > 10.0:
            failure_modes.append({
                'mode': 'bearing_failure',
                'indicator': 'high_vibration',
                'severity': 'high'
            })

        # Check for overheating
        if sensor_data['temperature_c'] > 80.0:
            failure_modes.append({
                'mode': 'thermal_failure',
                'indicator': 'high_temperature',
                'severity': 'high'
            })

        # Check for electrical issues
        if sensor_data['current_a'] > sensor_data.get('rated_current', 100) * 1.2:
            failure_modes.append({
                'mode': 'electrical_failure',
                'indicator': 'overcurrent',
                'severity': 'medium'
            })

        return failure_modes
```

## Digital Twin Implementation

```python
class DigitalTwin:
    """Digital twin for manufacturing equipment"""

    def __init__(self, physical_asset_id: str):
        self.asset_id = physical_asset_id
        self.virtual_state = {}
        self.historical_data = []
        self.simulation_model = None

    def sync_with_physical(self, sensor_data: dict):
        """Synchronize digital twin with physical asset"""
        self.virtual_state.update({
            'timestamp': datetime.now(),
            'sensors': sensor_data,
            'calculated_metrics': self._calculate_metrics(sensor_data)
        })

        self.historical_data.append(self.virtual_state.copy())

    def _calculate_metrics(self, sensor_data: dict) -> dict:
        """Calculate derived metrics from sensor data"""
        return {
            'efficiency': self._calculate_efficiency(sensor_data),
            'health_score': self._calculate_health_score(sensor_data),
            'energy_consumption': self._calculate_energy(sensor_data)
        }

    def simulate_scenario(self, scenario_params: dict) -> dict:
        """Simulate what-if scenarios"""
        # Simulate different operating conditions
        simulated_state = self.virtual_state.copy()

        # Apply scenario parameters
        for param, value in scenario_params.items():
            if param in simulated_state['sensors']:
                simulated_state['sensors'][param] = value

        # Recalculate metrics
        simulated_state['calculated_metrics'] = self._calculate_metrics(
            simulated_state['sensors']
        )

        return {
            'scenario': scenario_params,
            'predicted_state': simulated_state,
            'impact_analysis': self._analyze_impact(simulated_state)
        }

    def optimize_parameters(self, optimization_goal: str) -> dict:
        """Optimize operating parameters"""
        # Use digital twin to find optimal settings
        # This would use optimization algorithms
        best_params = {}
        best_score = 0

        return {
            'optimization_goal': optimization_goal,
            'recommended_parameters': best_params,
            'expected_improvement': best_score
        }

    def _calculate_efficiency(self, sensor_data: dict) -> float:
        """Calculate equipment efficiency"""
        return 85.0  # Simplified

    def _calculate_health_score(self, sensor_data: dict) -> float:
        """Calculate equipment health score (0-100)"""
        return 90.0  # Simplified

    def _calculate_energy(self, sensor_data: dict) -> float:
        """Calculate energy consumption"""
        return sensor_data.get('current_a', 0) * sensor_data.get('voltage_v', 0)

    def _analyze_impact(self, state: dict) -> dict:
        """Analyze impact of state change"""
        return {'impact': 'positive'}
```

## Best Practices

### Production Management

- Implement real-time monitoring dashboards
- Use automated scheduling algorithms
- Maintain digital work instructions
- Track genealogy and traceability
- Implement kanban or just-in-time systems
- Monitor key performance indicators (KPIs)

### Quality Management

- Implement Statistical Process Control (SPC)
- Use automated inspection systems
- Maintain calibration records
- Conduct regular gage R&R studies
- Implement root cause analysis (RCA)
- Track first pass yield (FPY)

### Maintenance Strategy

- Implement predictive maintenance
- Maintain spare parts inventory
- Use CMMS (Computerized Maintenance Management System)
- Schedule preventive maintenance
- Track Mean Time Between Failures (MTBF)
- Implement condition-based monitoring

### Data Management

- Use time-series databases for sensor data
- Implement data historians
- Maintain data integrity and quality
- Enable real-time analytics
- Support machine learning workloads
- Archive historical data appropriately

## Anti-Patterns

❌ Manual data entry for production records
❌ No preventive maintenance program
❌ Ignoring quality control data
❌ Siloed systems (no integration)
❌ No standard operating procedures
❌ Inadequate operator training
❌ No backup systems for critical equipment
❌ Poor inventory management

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Manufacturing Execution System (MES)](references/MANUFACTURING_EXECUTION_SYSTEM_MES.md)

## Resources

- ISA-95 Standard: https://www.isa.org/standards/isa95
- OPC UA: https://opcfoundation.org/
- MTConnect: https://www.mtconnect.org/
- Industry 4.0: https://www.plattform-i40.de/
- MESA International: https://www.mesa.org/
- SME (Society of Manufacturing Engineers): https://www.sme.org/
- Six Sigma: https://www.isixsigma.com/
