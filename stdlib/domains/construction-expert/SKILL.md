---
name: construction-expert
version: 1.1.0
description: >-
  Expert-level construction management, project planning, BIM, safety compliance, and
  construction technology. Use when the user mentions BIM, project management, safety, or
  building, or when the task involves Construction Management, Technologies, Standards and
  Regulations, or Cost Control.
category: domains
tags: [construction, bim, project-management, safety, building]
allowed-tools:
  - Read
  - Write
  - Edit
---

# Construction Expert

Expert guidance for construction management, project planning, Building Information Modeling (BIM), safety compliance, and modern construction technology solutions.

## Core Concepts

### Construction Management

- Project planning and scheduling
- Cost estimation and control
- Resource management
- Quality assurance
- Contract management
- Risk management
- Change order management

### Technologies

- Building Information Modeling (BIM)
- Construction management software
- Drone surveying and inspection
- 3D printing and modular construction
- IoT sensors for monitoring
- Augmented reality for visualization
- Construction robotics

### Standards and Regulations

- OSHA safety regulations
- Building codes (IBC, IRC)
- AIA contracts and standards
- LEED certification
- ISO 19650 (BIM standards)
- CSI MasterFormat
- Environmental regulations

## Safety Management System

```python
@dataclass
class SafetyIncident:
    """Safety incident report"""
    incident_id: str
    project_id: str
    incident_type: str  # 'injury', 'near_miss', 'property_damage'
    severity: str  # 'minor', 'moderate', 'severe', 'fatal'
    description: str
    location: str
    occurred_at: datetime
    reported_by: str
    injured_person: Optional[str]
    root_cause: Optional[str]
    corrective_actions: List[str]

class SafetyManagementSystem:
    """Construction safety management"""

    def __init__(self):
        self.incidents = []
        self.safety_inspections = []
        self.training_records = []

    def conduct_safety_inspection(self, project_id: str, inspector: str) -> dict:
        """Conduct safety inspection"""
        inspection_items = [
            'Personal protective equipment (PPE)',
            'Fall protection systems',
            'Scaffolding integrity',
            'Electrical safety',
            'Equipment guarding',
            'Housekeeping',
            'Fire prevention',
            'First aid availability',
            'Emergency exits',
            'Signage and barriers'
        ]

        violations = []
        passed_items = []

        # Simulate inspection (in production, would be actual checklist)
        for item in inspection_items:
            # Random pass/fail for demonstration
            import random
            if random.random() < 0.85:  # 85% pass rate
                passed_items.append(item)
            else:
                violations.append({
                    'item': item,
                    'severity': random.choice(['minor', 'major']),
                    'action_required': 'Correct immediately' if random.random() < 0.3 else 'Correct within 24 hours'
                })

        inspection = {
            'inspection_id': self._generate_inspection_id(),
            'project_id': project_id,
            'inspector': inspector,
            'inspection_date': datetime.now(),
            'items_inspected': len(inspection_items),
            'items_passed': len(passed_items),
            'violations': violations,
            'overall_score': (len(passed_items) / len(inspection_items)) * 100,
            'status': 'pass' if len(violations) == 0 else 'fail'
        }

        self.safety_inspections.append(inspection)

        return inspection

    def report_incident(self, incident_data: dict) -> SafetyIncident:
        """Report safety incident"""
        incident = SafetyIncident(
            incident_id=self._generate_incident_id(),
            project_id=incident_data['project_id'],
            incident_type=incident_data['incident_type'],
            severity=incident_data['severity'],
            description=incident_data['description'],
            location=incident_data['location'],
            occurred_at=incident_data['occurred_at'],
            reported_by=incident_data['reported_by'],
            injured_person=incident_data.get('injured_person'),
            root_cause=None,
            corrective_actions=[]
        )

        self.incidents.append(incident)

        # Notify relevant parties
        self._notify_incident(incident)

        return incident

    def calculate_safety_metrics(self, project_id: str, hours_worked: float) -> dict:
        """Calculate safety performance metrics"""
        project_incidents = [
            i for i in self.incidents
            if i.project_id == project_id
        ]

        # Count recordable incidents
        recordable_incidents = [
            i for i in project_incidents
            if i.incident_type == 'injury' and i.severity in ['moderate', 'severe', 'fatal']
        ]

        # OSHA Incident Rate = (Number of incidents × 200,000) / Total hours worked
        if hours_worked > 0:
            incident_rate = (len(recordable_incidents) * 200000) / hours_worked
        else:
            incident_rate = 0

        # Days Away, Restricted, or Transferred (DART) Rate
        dart_incidents = [
            i for i in recordable_incidents
            if i.severity in ['severe', 'fatal']
        ]
        dart_rate = (len(dart_incidents) * 200000) / hours_worked if hours_worked > 0 else 0

        return {
            'project_id': project_id,
            'total_hours_worked': hours_worked,
            'total_incidents': len(project_incidents),
            'recordable_incidents': len(recordable_incidents),
            'incident_rate': incident_rate,
            'dart_rate': dart_rate,
            'safety_rating': 'Excellent' if incident_rate < 1.0 else
                           'Good' if incident_rate < 3.0 else
                           'Needs Improvement'
        }

    def _notify_incident(self, incident: SafetyIncident):
        """Notify stakeholders of incident"""
        # Implementation would send notifications
        pass

    def _generate_inspection_id(self) -> str:
        import uuid
        return f"INS-{uuid.uuid4().hex[:8].upper()}"

    def _generate_incident_id(self) -> str:
        import uuid
        return f"INC-{uuid.uuid4().hex[:8].upper()}"
```

## BIM Integration

```python
class BIMManagement:
    """Building Information Modeling management"""

    def __init__(self):
        self.models = {}
        self.clash_detections = []

    def perform_clash_detection(self, model_ids: List[str]) -> dict:
        """Detect clashes between BIM models"""
        # Simulate clash detection between disciplines
        # In production, would use BIM software APIs (Revit, Navisworks)

        clashes = [
            {
                'clash_id': 'CLASH-001',
                'type': 'hard',  # 'hard' or 'soft'
                'disciplines': ['structural', 'mep'],
                'description': 'Steel beam conflicts with HVAC duct',
                'location': 'Level 3, Grid B-4',
                'severity': 'high',
                'status': 'open'
            },
            {
                'clash_id': 'CLASH-002',
                'type': 'soft',
                'disciplines': ['architectural', 'mep'],
                'description': 'Insufficient clearance for plumbing access',
                'location': 'Level 2, Grid C-2',
                'severity': 'medium',
                'status': 'open'
            }
        ]

        return {
            'models_analyzed': model_ids,
            'total_clashes': len(clashes),
            'hard_clashes': len([c for c in clashes if c['type'] == 'hard']),
            'soft_clashes': len([c for c in clashes if c['type'] == 'soft']),
            'clashes': clashes
        }

    def extract_quantities(self, model_id: str) -> dict:
        """Extract material quantities from BIM model"""
        # Simulate quantity takeoff
        # In production, would extract from actual BIM model

        quantities = {
            'concrete': {
                'unit': 'cubic_yards',
                'quantity': 1250,
                'cost_per_unit': 150,
                'total_cost': 187500
            },
            'rebar': {
                'unit': 'tons',
                'quantity': 85,
                'cost_per_unit': 800,
                'total_cost': 68000
            },
            'structural_steel': {
                'unit': 'tons',
                'quantity': 120,
                'cost_per_unit': 1200,
                'total_cost': 144000
            }
        }

        total_cost = sum(item['total_cost'] for item in quantities.values())

        return {
            'model_id': model_id,
            'quantities': quantities,
            'total_estimated_cost': total_cost
        }
```

## Best Practices

### Project Management

- Use critical path method for scheduling
- Implement regular progress reviews
- Maintain detailed documentation
- Use integrated project delivery (IPD)
- Implement lean construction principles
- Track key performance indicators
- Conduct regular stakeholder meetings

### Cost Control

- Develop detailed estimates
- Track costs continuously
- Manage change orders effectively
- Use value engineering
- Implement cost coding systems
- Monitor cash flow
- Conduct regular audits

### Safety Management

- Implement comprehensive safety program
- Conduct regular toolbox talks
- Provide proper PPE
- Maintain OSHA compliance
- Investigate all incidents
- Track safety metrics
- Promote safety culture

### BIM Implementation

- Use BIM for clash detection
- Implement 4D scheduling
- Extract quantities from model
- Enable collaboration
- Maintain model coordination
- Use BIM for facility management
- Follow ISO 19650 standards

## Anti-Patterns

❌ Poor project planning
❌ Inadequate cost tracking
❌ No safety program
❌ Poor communication
❌ Ignoring change orders
❌ No quality control
❌ Inadequate documentation
❌ Poor subcontractor management
❌ No risk management

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Project Management System](references/PROJECT_MANAGEMENT_SYSTEM.md)

## Resources

- AIA (American Institute of Architects): https://www.aia.org/
- AGC (Associated General Contractors): https://www.agc.org/
- OSHA: https://www.osha.gov/construction
- International Building Code: https://www.iccsafe.org/
- buildingSMART (BIM): https://www.buildingsmart.org/
- PMI Construction Extension: https://www.pmi.org/
- LEED Certification: https://www.usgbc.org/leed
