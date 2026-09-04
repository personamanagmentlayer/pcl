# Healthcare Expert — Electronic Health Record System

Reference material for the `healthcare-expert` skill. See [SKILL.md](../SKILL.md).

## Electronic Health Record System

```python
from dataclasses import dataclass
from typing import List, Optional
from datetime import datetime

@dataclass
class Patient:
    """Patient record"""
    patient_id: str
    mrn: str  # Medical Record Number
    first_name: str
    last_name: str
    dob: datetime
    gender: str
    ssn: Optional[str]  # Encrypted
    address: dict
    phone: str
    email: str
    emergency_contact: dict
    insurance: dict

@dataclass
class Encounter:
    """Clinical encounter"""
    encounter_id: str
    patient_id: str
    encounter_date: datetime
    encounter_type: str  # 'inpatient', 'outpatient', 'emergency'
    chief_complaint: str
    provider_id: str
    facility_id: str
    diagnosis_codes: List[str]  # ICD-10
    procedure_codes: List[str]  # CPT
    notes: str

@dataclass
class Medication:
    """Medication order"""
    medication_id: str
    patient_id: str
    drug_name: str
    dosage: str
    frequency: str
    route: str  # 'oral', 'IV', etc.
    start_date: datetime
    end_date: Optional[datetime]
    prescriber_id: str
    pharmacy_notes: str

class EHRSystem:
    """Electronic Health Record system"""

    def __init__(self, db, logger, access_control, encryption):
        self.db = db
        self.logger = logger
        self.access_control = access_control
        self.encryption = encryption

    def get_patient_record(self, user_id, patient_id):
        """Retrieve patient record with audit logging"""
        # Check permissions
        if not self.access_control.can_access('read', patient_id):
            self.logger.log_access(
                user_id, patient_id, 'DENIED', 'patient_record'
            )
            raise PermissionError("Access denied")

        # Log access
        self.logger.log_access(
            user_id, patient_id, 'READ', 'patient_record'
        )

        # Retrieve and decrypt
        patient = self.db.get_patient(patient_id)
        if patient.ssn:
            patient.ssn = self.encryption.decrypt_phi(patient.ssn)

        return patient

    def create_encounter(self, user_id, encounter: Encounter):
        """Create clinical encounter"""
        if not self.access_control.can_access('write', encounter.patient_id):
            raise PermissionError("Cannot create encounter")

        # Encrypt sensitive data
        if encounter.notes:
            encounter.notes = self.encryption.encrypt_phi(encounter.notes)

        # Save encounter
        self.db.save_encounter(encounter)

        # Log creation
        self.logger.log_modification(
            user_id, 'encounter', encounter.encounter_id, 'created'
        )

        return encounter

    def get_patient_medications(self, user_id, patient_id):
        """Get active medications for patient"""
        if not self.access_control.can_access('read', patient_id):
            raise PermissionError("Access denied")

        self.logger.log_access(
            user_id, patient_id, 'READ', 'medications'
        )

        return self.db.get_active_medications(patient_id)

    def prescribe_medication(self, user_id, medication: Medication):
        """Prescribe new medication"""
        if not self.access_control.can_access('prescribe', medication.patient_id):
            raise PermissionError("Cannot prescribe medication")

        # Drug interaction check
        active_meds = self.get_patient_medications(user_id, medication.patient_id)
        interactions = self.check_drug_interactions(medication, active_meds)

        if interactions:
            return {'status': 'warning', 'interactions': interactions}

        self.db.save_medication(medication)

        self.logger.log_modification(
            user_id, 'medication', medication.medication_id, 'prescribed'
        )

        return {'status': 'success', 'medication_id': medication.medication_id}

    def check_drug_interactions(self, new_med, existing_meds):
        """Check for drug-drug interactions"""
        # This would integrate with a drug interaction database
        interactions = []
        # Implementation would check against drug interaction database
        return interactions
```
