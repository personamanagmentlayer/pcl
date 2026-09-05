# HealthTech Expert — Code Examples

Reference material for the `healthtech-expert` skill. See [SKILL.md](../SKILL.md).

## Code Examples

### Remote Patient Monitoring Platform

```python
from enum import Enum
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from decimal import Decimal
import uuid

class VitalType(Enum):
    BLOOD_PRESSURE = "blood_pressure"
    HEART_RATE = "heart_rate"
    TEMPERATURE = "temperature"
    WEIGHT = "weight"
    BLOOD_GLUCOSE = "blood_glucose"
    OXYGEN_SATURATION = "oxygen_saturation"
    RESPIRATORY_RATE = "respiratory_rate"

class AlertSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"

class PatientStatus(Enum):
    STABLE = "stable"
    MONITORING = "monitoring"
    AT_RISK = "at_risk"
    CRITICAL = "critical"

@dataclass
class Patient:
    """Patient enrolled in RPM program"""
    patient_id: str
    mrn: str  # Medical Record Number
    first_name: str
    last_name: str
    date_of_birth: datetime
    phone: str
    email: str

    # Clinical information
    primary_diagnosis: str
    comorbidities: List[str] = field(default_factory=list)
    medications: List[Dict] = field(default_factory=list)
    allergies: List[str] = field(default_factory=list)

    # Care team
    primary_physician_id: str = ""
    care_team_ids: List[str] = field(default_factory=list)

    # RPM program
    enrollment_date: datetime = field(default_factory=datetime.now)
    program_type: str = "general"  # CHF, COPD, diabetes, hypertension
    monitoring_frequency: str = "daily"
    status: PatientStatus = PatientStatus.STABLE

    # Device assignments
    assigned_devices: List[str] = field(default_factory=list)

    def age(self) -> int:
        """Calculate patient age"""
        today = datetime.now()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )

@dataclass
class VitalReading:
    """Vital sign measurement"""
    reading_id: str
    patient_id: str
    vital_type: VitalType
    timestamp: datetime
    device_id: str

    # Value depends on vital type
    systolic: Optional[int] = None  # Blood pressure
    diastolic: Optional[int] = None  # Blood pressure
    heart_rate: Optional[int] = None  # bpm
    temperature: Optional[float] = None  # Fahrenheit
    weight: Optional[float] = None  # pounds
    glucose: Optional[int] = None  # mg/dL
    oxygen_saturation: Optional[int] = None  # SpO2 %
    respiratory_rate: Optional[int] = None  # breaths/min

    # Metadata
    notes: str = ""
    symptoms: List[str] = field(default_factory=list)
    measurement_location: str = ""  # e.g., "left_arm" for BP

@dataclass
class ClinicalAlert:
    """Clinical alert for abnormal readings"""
    alert_id: str
    patient_id: str
    severity: AlertSeverity
    vital_type: VitalType
    reading_id: str
    timestamp: datetime
    alert_message: str
    threshold_violated: str

    # Alert management
    status: str = "open"  # open, acknowledged, resolved, escalated
    assigned_to: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    resolution_notes: str = ""

@dataclass
class ClinicalThresholds:
    """Patient-specific alert thresholds"""
    patient_id: str

    # Blood pressure thresholds
    systolic_high: int = 180
    systolic_low: int = 90
    diastolic_high: int = 110
    diastolic_low: int = 60

    # Heart rate thresholds (bpm)
    heart_rate_high: int = 120
    heart_rate_low: int = 50

    # Temperature thresholds (Fahrenheit)
    temperature_high: float = 100.4
    temperature_low: float = 95.0

    # Weight change threshold (pounds)
    weight_change_threshold: float = 3.0  # Daily change
    weight_change_period_days: int = 1

    # Blood glucose thresholds (mg/dL)
    glucose_high: int = 250
    glucose_low: int = 70

    # Oxygen saturation threshold (%)
    spo2_low: int = 90

    # Respiratory rate thresholds (breaths/min)
    respiratory_rate_high: int = 25
    respiratory_rate_low: int = 10

class RemotePatientMonitoringSystem:
    """Comprehensive RPM platform"""

    def __init__(self):
        self.patients: Dict[str, Patient] = {}
        self.vital_readings: List[VitalReading] = []
        self.alerts: List[ClinicalAlert] = []
        self.thresholds: Dict[str, ClinicalThresholds] = {}

    def enroll_patient(self, patient: Patient,
                      custom_thresholds: Optional[ClinicalThresholds] = None) -> Dict:
        """Enroll patient in RPM program"""

        self.patients[patient.patient_id] = patient

        # Set thresholds (custom or default)
        if custom_thresholds:
            self.thresholds[patient.patient_id] = custom_thresholds
        else:
            self.thresholds[patient.patient_id] = ClinicalThresholds(patient_id=patient.patient_id)

        return {
            'patient_id': patient.patient_id,
            'mrn': patient.mrn,
            'enrollment_date': patient.enrollment_date.isoformat(),
            'program_type': patient.program_type,
            'status': 'enrolled'
        }

    def record_vital_reading(self, reading: VitalReading) -> Dict:
        """Record vital sign reading and check for alerts"""

        self.vital_readings.append(reading)

        # Get patient and thresholds
        patient = self.patients.get(reading.patient_id)
        thresholds = self.thresholds.get(reading.patient_id)

        if not patient or not thresholds:
            return {'error': 'Patient not found'}

        # Check thresholds and generate alerts
        alerts_generated = []

        if reading.vital_type == VitalType.BLOOD_PRESSURE:
            if reading.systolic >= thresholds.systolic_high:
                alert = self._create_alert(
                    reading, AlertSeverity.CRITICAL,
                    f"Systolic BP critically high: {reading.systolic} mmHg",
                    f"Systolic >= {thresholds.systolic_high}"
                )
                alerts_generated.append(alert)

            elif reading.systolic <= thresholds.systolic_low:
                alert = self._create_alert(
                    reading, AlertSeverity.WARNING,
                    f"Systolic BP low: {reading.systolic} mmHg",
                    f"Systolic <= {thresholds.systolic_low}"
                )
                alerts_generated.append(alert)

            if reading.diastolic >= thresholds.diastolic_high:
                alert = self._create_alert(
                    reading, AlertSeverity.CRITICAL,
                    f"Diastolic BP critically high: {reading.diastolic} mmHg",
                    f"Diastolic >= {thresholds.diastolic_high}"
                )
                alerts_generated.append(alert)

        elif reading.vital_type == VitalType.HEART_RATE:
            if reading.heart_rate >= thresholds.heart_rate_high:
                alert = self._create_alert(
                    reading, AlertSeverity.WARNING,
                    f"Heart rate elevated: {reading.heart_rate} bpm",
                    f"HR >= {thresholds.heart_rate_high}"
                )
                alerts_generated.append(alert)

            elif reading.heart_rate <= thresholds.heart_rate_low:
                alert = self._create_alert(
                    reading, AlertSeverity.WARNING,
                    f"Heart rate low: {reading.heart_rate} bpm",
                    f"HR <= {thresholds.heart_rate_low}"
                )
                alerts_generated.append(alert)

        elif reading.vital_type == VitalType.TEMPERATURE:
            if reading.temperature >= thresholds.temperature_high:
                alert = self._create_alert(
                    reading, AlertSeverity.WARNING,
                    f"Fever detected: {reading.temperature}°F",
                    f"Temp >= {thresholds.temperature_high}"
                )
                alerts_generated.append(alert)

        elif reading.vital_type == VitalType.WEIGHT:
            # Check for rapid weight change
            rapid_change = self._check_weight_change(
                reading.patient_id,
                reading.weight,
                thresholds.weight_change_threshold,
                thresholds.weight_change_period_days
            )

            if rapid_change:
                alert = self._create_alert(
                    reading, AlertSeverity.WARNING,
                    f"Rapid weight change: {rapid_change['change_lbs']:+.1f} lbs in {rapid_change['days']} days",
                    f"Weight change > {thresholds.weight_change_threshold} lbs"
                )
                alerts_generated.append(alert)

        elif reading.vital_type == VitalType.BLOOD_GLUCOSE:
            if reading.glucose >= thresholds.glucose_high:
                alert = self._create_alert(
                    reading, AlertSeverity.WARNING,
                    f"Blood glucose high: {reading.glucose} mg/dL",
                    f"Glucose >= {thresholds.glucose_high}"
                )
                alerts_generated.append(alert)

            elif reading.glucose <= thresholds.glucose_low:
                alert = self._create_alert(
                    reading, AlertSeverity.CRITICAL,
                    f"Blood glucose critically low: {reading.glucose} mg/dL (hypoglycemia)",
                    f"Glucose <= {thresholds.glucose_low}"
                )
                alerts_generated.append(alert)

        elif reading.vital_type == VitalType.OXYGEN_SATURATION:
            if reading.oxygen_saturation <= thresholds.spo2_low:
                alert = self._create_alert(
                    reading, AlertSeverity.CRITICAL,
                    f"Oxygen saturation low: {reading.oxygen_saturation}% (hypoxia)",
                    f"SpO2 <= {thresholds.spo2_low}"
                )
                alerts_generated.append(alert)

        # Update patient status based on alerts
        if any(a.severity == AlertSeverity.CRITICAL for a in alerts_generated):
            patient.status = PatientStatus.CRITICAL
        elif any(a.severity == AlertSeverity.WARNING for a in alerts_generated):
            patient.status = PatientStatus.AT_RISK
        elif not self._has_active_alerts(reading.patient_id):
            patient.status = PatientStatus.STABLE

        return {
            'reading_id': reading.reading_id,
            'patient_id': reading.patient_id,
            'vital_type': reading.vital_type.value,
            'recorded_at': reading.timestamp.isoformat(),
            'alerts_generated': len(alerts_generated),
            'alert_ids': [a.alert_id for a in alerts_generated],
            'patient_status': patient.status.value
        }

    def _create_alert(self, reading: VitalReading, severity: AlertSeverity,
                     message: str, threshold: str) -> ClinicalAlert:
        """Create clinical alert"""

        alert = ClinicalAlert(
            alert_id=f"alert_{uuid.uuid4().hex}",
            patient_id=reading.patient_id,
            severity=severity,
            vital_type=reading.vital_type,
            reading_id=reading.reading_id,
            timestamp=reading.timestamp,
            alert_message=message,
            threshold_violated=threshold
        )

        self.alerts.append(alert)
        return alert

    def _check_weight_change(self, patient_id: str, current_weight: float,
                           threshold_lbs: float, period_days: int) -> Optional[Dict]:
        """Check for rapid weight change"""

        # Get recent weight readings
        cutoff = datetime.now() - timedelta(days=period_days)
        recent_weights = [
            r for r in self.vital_readings
            if (r.patient_id == patient_id and
                r.vital_type == VitalType.WEIGHT and
                r.timestamp >= cutoff and
                r.weight is not None)
        ]

        if len(recent_weights) < 2:
            return None

        # Get earliest weight in period
        earliest = min(recent_weights, key=lambda r: r.timestamp)
        change_lbs = current_weight - earliest.weight
        days = (datetime.now() - earliest.timestamp).days

        if abs(change_lbs) >= threshold_lbs:
            return {
                'change_lbs': change_lbs,
                'days': days,
                'previous_weight': earliest.weight,
                'current_weight': current_weight
            }

        return None

    def _has_active_alerts(self, patient_id: str) -> bool:
        """Check if patient has any active alerts"""
        return any(
            a.patient_id == patient_id and a.status == 'open'
            for a in self.alerts
        )

    def acknowledge_alert(self, alert_id: str, clinician_id: str,
                         notes: str = "") -> Dict:
        """Clinician acknowledges alert"""

        alert = next((a for a in self.alerts if a.alert_id == alert_id), None)
        if not alert:
            return {'error': 'Alert not found'}

        alert.status = 'acknowledged'
        alert.assigned_to = clinician_id
        alert.acknowledged_at = datetime.now()
        alert.resolution_notes = notes

        return {
            'alert_id': alert_id,
            'status': alert.status,
            'acknowledged_by': clinician_id,
            'acknowledged_at': alert.acknowledged_at.isoformat()
        }

    def resolve_alert(self, alert_id: str, resolution_notes: str) -> Dict:
        """Resolve clinical alert"""

        alert = next((a for a in self.alerts if a.alert_id == alert_id), None)
        if not alert:
            return {'error': 'Alert not found'}

        alert.status = 'resolved'
        alert.resolved_at = datetime.now()
        alert.resolution_notes = resolution_notes

        # Update patient status
        patient = self.patients.get(alert.patient_id)
        if patient and not self._has_active_alerts(alert.patient_id):
            patient.status = PatientStatus.STABLE

        return {
            'alert_id': alert_id,
            'status': 'resolved',
            'resolved_at': alert.resolved_at.isoformat()
        }

    def get_patient_dashboard(self, patient_id: str) -> Dict:
        """Generate patient monitoring dashboard"""

        patient = self.patients.get(patient_id)
        if not patient:
            return {'error': 'Patient not found'}

        # Get recent readings (last 7 days)
        recent_cutoff = datetime.now() - timedelta(days=7)
        recent_readings = [
            r for r in self.vital_readings
            if r.patient_id == patient_id and r.timestamp >= recent_cutoff
        ]

        # Get active alerts
        active_alerts = [
            a for a in self.alerts
            if a.patient_id == patient_id and a.status in ['open', 'acknowledged']
        ]

        # Calculate adherence (readings per day)
        days_enrolled = (datetime.now() - patient.enrollment_date).days
        total_readings = len([r for r in self.vital_readings if r.patient_id == patient_id])
        adherence_rate = (total_readings / days_enrolled * 100) if days_enrolled > 0 else 0

        # Group readings by vital type
        readings_by_type = {}
        for reading in recent_readings:
            vital_type = reading.vital_type.value
            if vital_type not in readings_by_type:
                readings_by_type[vital_type] = []
            readings_by_type[vital_type].append({
                'timestamp': reading.timestamp.isoformat(),
                'systolic': reading.systolic,
                'diastolic': reading.diastolic,
                'heart_rate': reading.heart_rate,
                'temperature': reading.temperature,
                'weight': reading.weight,
                'glucose': reading.glucose,
                'spo2': reading.oxygen_saturation
            })

        return {
            'patient': {
                'patient_id': patient_id,
                'name': f"{patient.first_name} {patient.last_name}",
                'age': patient.age(),
                'mrn': patient.mrn,
                'primary_diagnosis': patient.primary_diagnosis,
                'status': patient.status.value
            },
            'program': {
                'enrollment_date': patient.enrollment_date.isoformat(),
                'days_enrolled': days_enrolled,
                'program_type': patient.program_type,
                'monitoring_frequency': patient.monitoring_frequency
            },
            'adherence': {
                'total_readings': total_readings,
                'adherence_rate': round(adherence_rate, 1),
                'recent_readings_7days': len(recent_readings)
            },
            'recent_readings': readings_by_type,
            'active_alerts': [
                {
                    'alert_id': a.alert_id,
                    'severity': a.severity.value,
                    'message': a.alert_message,
                    'timestamp': a.timestamp.isoformat(),
                    'status': a.status
                } for a in active_alerts
            ]
        }

    def generate_billing_report(self, patient_id: str, month: int,
                               year: int) -> Dict:
        """Generate RPM billing report (CPT codes)"""

        patient = self.patients.get(patient_id)
        if not patient:
            return {'error': 'Patient not found'}

        # Calculate readings for the month
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)

        month_readings = [
            r for r in self.vital_readings
            if (r.patient_id == patient_id and
                start_date <= r.timestamp < end_date)
        ]

        # Count days with readings
        days_with_readings = len(set(r.timestamp.date() for r in month_readings))

        # Determine billable CPT codes
        billable_codes = []

        # 99454: At least 16 days of data transmission
        if days_with_readings >= 16:
            billable_codes.append({
                'code': '99454',
                'description': 'Remote monitoring device supply with daily recordings',
                'units': 1,
                'days_requirement': 16,
                'days_met': days_with_readings
            })

        # 99457/99458: Clinical staff time (placeholder - would need time tracking)
        # Assume 25 minutes of clinical staff time if patient had alerts
        month_alerts = [
            a for a in self.alerts
            if (a.patient_id == patient_id and
                start_date <= a.timestamp < end_date)
        ]

        if month_alerts:
            billable_codes.append({
                'code': '99457',
                'description': 'First 20 minutes of clinical staff time',
                'units': 1,
                'time_minutes': 20
            })

        return {
            'patient_id': patient_id,
            'billing_period': f"{year}-{month:02d}",
            'days_with_readings': days_with_readings,
            'total_readings': len(month_readings),
            'alerts_generated': len(month_alerts),
            'billable_codes': billable_codes,
            'billing_eligible': len(billable_codes) > 0
        }

# Example usage
def example_rpm_workflow():
    """Example remote patient monitoring workflow"""

    rpm = RemotePatientMonitoringSystem()

    # Enroll patient with CHF
    patient = Patient(
        patient_id="PT-001",
        mrn="MRN-123456",
        first_name="John",
        last_name="Smith",
        date_of_birth=datetime(1955, 6, 15),
        phone="555-0123",
        email="john.smith@example.com",
        primary_diagnosis="Congestive Heart Failure",
        comorbidities=["Hypertension", "Type 2 Diabetes"],
        medications=[
            {"name": "Lisinopril", "dose": "10mg", "frequency": "daily"},
            {"name": "Metformin", "dose": "500mg", "frequency": "twice daily"}
        ],
        program_type="CHF"
    )

    # Custom thresholds for CHF patient
    thresholds = ClinicalThresholds(
        patient_id="PT-001",
        systolic_high=160,  # More lenient for elderly
        weight_change_threshold=2.0,  # Sensitive for CHF
        weight_change_period_days=1
    )

    result = rpm.enroll_patient(patient, thresholds)
    print(f"Patient enrolled: {result}")

    # Record daily vitals
    # Blood pressure reading
    bp_reading = VitalReading(
        reading_id=f"reading_{uuid.uuid4().hex}",
        patient_id="PT-001",
        vital_type=VitalType.BLOOD_PRESSURE,
        timestamp=datetime.now(),
        device_id="BP-CUFF-001",
        systolic=168,
        diastolic=95,
        heart_rate=82
    )

    bp_result = rpm.record_vital_reading(bp_reading)
    print(f"\nBlood pressure recorded: {bp_result}")
    if bp_result.get('alerts_generated', 0) > 0:
        print(f"ALERT: {bp_result['alerts_generated']} alert(s) generated")

    # Weight reading (showing weight gain - concerning for CHF)
    weight_reading = VitalReading(
        reading_id=f"reading_{uuid.uuid4().hex}",
        patient_id="PT-001",
        vital_type=VitalType.WEIGHT,
        timestamp=datetime.now(),
        device_id="SCALE-001",
        weight=187.5  # 3 lb gain from yesterday (simulated)
    )

    # Simulate previous reading
    prev_weight = VitalReading(
        reading_id=f"reading_{uuid.uuid4().hex}",
        patient_id="PT-001",
        vital_type=VitalType.WEIGHT,
        timestamp=datetime.now() - timedelta(days=1),
        device_id="SCALE-001",
        weight=184.5
    )
    rpm.vital_readings.append(prev_weight)

    weight_result = rpm.record_vital_reading(weight_reading)
    print(f"\nWeight recorded: {weight_result}")

    # Get patient dashboard
    dashboard = rpm.get_patient_dashboard("PT-001")
    print(f"\nPatient Status: {dashboard['patient']['status']}")
    print(f"Active Alerts: {len(dashboard['active_alerts'])}")
    print(f"Adherence Rate: {dashboard['adherence']['adherence_rate']}%")

if __name__ == "__main__":
    example_rpm_workflow()
```
