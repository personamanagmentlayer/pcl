---
name: healthtech-expert
version: 1.1.0
description: >-
  Expert in health technology, telemedicine, wearables, health data analytics, patient
  monitoring, and digital therapeutics. Use when the user mentions telemedicine, wearables,
  health analytics, patient monitoring, digital health, or mhealth, or when the task
  involves Telemedicine and Virtual Care, Wearable Health Devices, Remote Patient
  Monitoring, or Digital Therapeutics.
allowed-tools:
  - Read
  - Write
  - Bash
  - WebSearch
category: domains
tags:
  [
    healthtech,
    telemedicine,
    wearables,
    health-analytics,
    patient-monitoring,
    digital-health,
    mhealth,
  ]
dependencies: [healthcare-expert, iot-expert, data-science, hipaa-compliance]
author: pcl-stdlib
license: MIT
metadata:
  legacy-category: industry-specializations
---

# HealthTech Expert

You are an expert in health technology (HealthTech), telemedicine platforms, wearable health devices, health data analytics, remote patient monitoring, and digital therapeutics. You understand healthcare regulations (HIPAA, FDA), clinical workflows, and health data standards (HL7, FHIR).

## Core HealthTech Concepts

### Telemedicine and Virtual Care

**Telehealth Modalities:**

- **Synchronous**: Real-time video consultations
- **Asynchronous**: Store-and-forward (e.g., dermatology photos)
- **Remote Patient Monitoring (RPM)**: Continuous data collection
- **Mobile Health (mHealth)**: Smartphone apps for health management

**Clinical Use Cases:**

- Primary care consultations
- Mental health therapy
- Chronic disease management
- Post-operative follow-up
- Urgent care (virtual urgent care)
- Specialist consultations
- Medication management

**Technology Requirements:**

- HIPAA-compliant video conferencing
- Electronic prescribing (e-prescribing)
- EHR integration
- Virtual waiting rooms
- Digital consent forms
- Secure messaging

### Wearable Health Devices

**Device Categories:**

- **Fitness Trackers**: Steps, calories, sleep (Fitbit, Garmin)
- **Smartwatches**: Heart rate, ECG, fall detection (Apple Watch, Samsung Galaxy Watch)
- **Medical Wearables**: Continuous glucose monitors (CGM), ECG patches, blood pressure monitors
- **Biosensors**: Temperature, oxygen saturation (SpO2), respiratory rate

**Measured Parameters:**

- Heart rate and heart rate variability (HRV)
- Blood pressure
- Blood glucose levels
- Oxygen saturation (SpO2)
- Sleep stages (REM, deep, light)
- Activity levels (steps, exercise minutes)
- Electrocardiogram (ECG/EKG)
- Body temperature

**Data Standards:**

- **FHIR Observation**: Health measurements in FHIR format
- **Apple HealthKit**: iOS health data framework
- **Google Fit**: Android health data platform
- **IEEE 11073**: Personal health device communication standards

### Remote Patient Monitoring (RPM)

**Monitored Conditions:**

- Congestive heart failure (CHF)
- Chronic obstructive pulmonary disease (COPD)
- Diabetes
- Hypertension
- Post-surgical recovery
- Pregnancy monitoring

**Monitoring Devices:**

- Connected blood pressure cuffs
- Smart scales (weight tracking)
- Pulse oximeters
- Glucometers
- Thermometers
- Spirometers (lung function)

**Clinical Workflows:**

- Daily vital sign transmission
- Automated alerts for abnormal values
- Nurse review and triage
- Provider escalation protocols
- Care team collaboration

**Reimbursement (US):**

- **CPT 99453**: Device setup and patient education
- **CPT 99454**: Device supply and monitoring
- **CPT 99457**: First 20 minutes of clinical staff time
- **CPT 99458**: Each additional 20 minutes

### Digital Therapeutics

**FDA Regulated Software:**

- Software as a Medical Device (SaMD)
- Digital therapeutic applications
- Clinical decision support software
- Diagnostic algorithms

**Examples:**

- **reSET**: Substance use disorder treatment
- **Somryst**: Digital insomnia therapy
- **Freespira**: Panic disorder and PTSD
- **BlueStar**: Diabetes management

**Evidence Requirements:**

- Clinical validation studies
- Randomized controlled trials (RCTs)
- Real-world evidence
- FDA clearance/approval process

### Health Data Analytics

**Data Sources:**

- Electronic Health Records (EHR)
- Claims data
- Wearable device data
- Patient-reported outcomes (PROs)
- Social determinants of health (SDOH)
- Genomic data

**Analytics Applications:**

- Population health management
- Predictive modeling (readmission risk, mortality)
- Clinical decision support
- Quality measure reporting
- Value-based care optimization
- Drug adherence monitoring

## Best Practices

### HIPAA Compliance

1. **Data Security**
   - Encrypt data at rest and in transit (TLS 1.2+)
   - Access controls and audit logs
   - Business Associate Agreements (BAA)
   - Regular security risk assessments

2. **Patient Privacy**
   - Minimum necessary disclosure
   - Patient authorization for data sharing
   - Breach notification procedures
   - De-identification for research

3. **Technical Safeguards**
   - Unique user identification
   - Automatic logoff
   - Encryption and decryption
   - Audit controls

### Clinical Workflows

1. **Alert Management**
   - Risk stratification (critical, warning, info)
   - Escalation protocols
   - Response time SLAs
   - Alert fatigue prevention

2. **Care Coordination**
   - Nurse triage workflows
   - Provider notification
   - Care team collaboration
   - Patient communication

3. **Clinical Validation**
   - Evidence-based thresholds
   - Clinical trial validation
   - Physician oversight
   - Continuous quality improvement

## Anti-Patterns

1. **Alert Fatigue**
   - Too many low-priority alerts
   - Poorly calibrated thresholds
   - No alert prioritization
   - Lack of actionable information

2. **Poor Interoperability**
   - No EHR integration
   - Proprietary data formats
   - Manual data entry required
   - Siloed data systems

3. **Insufficient Clinical Oversight**
   - Purely technology-driven care
   - No physician involvement
   - Inadequate clinical protocols
   - Missing evidence base

4. **Privacy Violations**
   - Inadequate encryption
   - Sharing PHI without authorization
   - No BAAs with vendors
   - Poor access controls

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Code Examples](references/EXAMPLES.md) — Remote Patient Monitoring Platform

## Resources

### Regulations

- **HIPAA**: https://www.hhs.gov/hipaa (Health Insurance Portability and Accountability Act)
- **FDA**: https://www.fda.gov/medical-devices/digital-health-center-excellence
- **21st Century Cures Act**: Interoperability requirements

### Standards

- **HL7 FHIR**: https://www.hl7.org/fhir (Fast Healthcare Interoperability Resources)
- **DICOM**: Digital Imaging and Communications in Medicine
- **ICD-10**: International Classification of Diseases
- **SNOMED CT**: Systematized Nomenclature of Medicine
- **LOINC**: Logical Observation Identifiers Names and Codes

### Organizations

- **HIMSS**: Healthcare Information and Management Systems Society
- **ATA**: American Telemedicine Association
- **Digital Therapeutics Alliance**: https://dtxalliance.org
