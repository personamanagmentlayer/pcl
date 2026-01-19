# Quality Management Expert

---
skill_id: quality-management-expert
name: Quality Management Expert
category: domains
tags: [quality, qms, iso, compliance, auditing, continuous-improvement, six-sigma, quality-assurance]
version: 1.0.0
author: PCL Standard Library
dependencies: []
complexity: expert
estimated_time: 45 minutes
objectives:
  - Master quality management systems (QMS)
  - Understand compliance and regulatory requirements
  - Implement audit management and corrective actions
  - Apply continuous improvement methodologies
  - Navigate quality metrics and performance tracking
prerequisites:
  - Understanding of quality management principles
  - Knowledge of ISO standards and frameworks
  - Familiarity with audit processes
  - Experience with process improvement methods
outcome: Build comprehensive quality management solutions including QMS implementation, audit tracking, nonconformance management, and continuous improvement programs
---

## Core Concepts

### Quality Management Systems (QMS)
Structured frameworks for managing quality processes, documenting procedures, tracking metrics, and ensuring compliance with standards like ISO 9001, providing systematic approach to quality assurance.

### Compliance & Regulatory Management
Systems for tracking regulatory requirements, managing certifications, conducting compliance audits, and maintaining documentation to meet industry standards and legal obligations.

### Audit Management
Planning, executing, and tracking internal and external audits including preparation, finding documentation, corrective action tracking, and audit report management.

### Nonconformance & Corrective Action
Identification, documentation, root cause analysis, and resolution of quality issues using methodologies like 8D, 5 Whys, and fishbone diagrams with preventive action implementation.

### Continuous Improvement
Systematic approaches like Six Sigma, Lean, Kaizen, and PDCA (Plan-Do-Check-Act) for ongoing process optimization, waste reduction, and quality enhancement.

## Code Examples

### Quality Management System Core

```python
from datetime import datetime, date, timedelta
from enum import Enum
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
import uuid

class NonconformanceType(Enum):
    PRODUCT_DEFECT = "product_defect"
    PROCESS_DEVIATION = "process_deviation"
    DOCUMENTATION = "documentation"
    CUSTOMER_COMPLAINT = "customer_complaint"
    AUDIT_FINDING = "audit_finding"

class Severity(Enum):
    MINOR = "minor"
    MAJOR = "major"
    CRITICAL = "critical"

class NCStatus(Enum):
    OPEN = "open"
    INVESTIGATING = "investigating"
    ACTION_REQUIRED = "action_required"
    IN_PROGRESS = "in_progress"
    VERIFICATION = "verification"
    CLOSED = "closed"

class AuditType(Enum):
    INTERNAL = "internal"
    EXTERNAL = "external"
    CUSTOMER = "customer"
    CERTIFICATION = "certification"

@dataclass
class Process:
    process_id: str
    name: str
    description: str
    owner: str
    department: str
    documents: List[str] = field(default_factory=list)
    inputs: List[str] = field(default_factory=list)
    outputs: List[str] = field(default_factory=list)
    kpis: Dict[str, Any] = field(default_factory=dict)

@dataclass
class Document:
    document_id: str
    document_number: str
    title: str
    document_type: str  # procedure, work_instruction, form, policy
    version: str
    effective_date: date
    review_date: date
    owner: str
    status: str = "draft"  # draft, approved, obsolete
    content_url: Optional[str] = None

@dataclass
class Nonconformance:
    nc_id: str
    nc_number: str
    reported_by: str
    reported_date: datetime
    nc_type: NonconformanceType
    severity: Severity
    description: str
    process_id: Optional[str]
    product_id: Optional[str]
    status: NCStatus
    assigned_to: Optional[str] = None
    root_cause: Optional[str] = None
    corrective_actions: List[str] = field(default_factory=list)
    preventive_actions: List[str] = field(default_factory=list)
    target_close_date: Optional[date] = None
    closed_date: Optional[date] = None
    verification_notes: Optional[str] = None

@dataclass
class CorrectiveAction:
    action_id: str
    nc_id: str
    description: str
    responsible_person: str
    due_date: date
    status: str = "open"  # open, in_progress, completed, verified
    completion_date: Optional[date] = None
    effectiveness_check: bool = False
    effectiveness_date: Optional[date] = None

@dataclass
class Audit:
    audit_id: str
    audit_number: str
    audit_type: AuditType
    scope: str
    scheduled_date: date
    auditor: str
    auditee: str
    processes_audited: List[str]
    status: str = "planned"  # planned, in_progress, completed, closed
    findings: List[str] = field(default_factory=list)
    observations: List[str] = field(default_factory=list)
    report_date: Optional[date] = None

@dataclass
class AuditFinding:
    finding_id: str
    audit_id: str
    finding_type: str  # nonconformance, observation, opportunity
    severity: Severity
    description: str
    requirement: str  # ISO clause, procedure reference
    evidence: str
    created_nc_id: Optional[str] = None

class QualityManagementSystem:
    def __init__(self):
        self.processes: Dict[str, Process] = {}
        self.documents: Dict[str, Document] = {}
        self.nonconformances: Dict[str, Nonconformance] = {}
        self.corrective_actions: Dict[str, CorrectiveAction] = {}
        self.audits: Dict[str, Audit] = {}
        self.audit_findings: Dict[str, AuditFinding] = {}
        self.nc_counter: int = 1000
        self.audit_counter: int = 2000

    def create_process(self, process_data: Dict) -> Process:
        """Define quality process"""
        process = Process(
            process_id=process_data.get('process_id', str(uuid.uuid4())),
            name=process_data['name'],
            description=process_data['description'],
            owner=process_data['owner'],
            department=process_data['department'],
            documents=process_data.get('documents', []),
            inputs=process_data.get('inputs', []),
            outputs=process_data.get('outputs', []),
            kpis=process_data.get('kpis', {})
        )
        self.processes[process.process_id] = process
        return process

    def create_document(self, doc_data: Dict) -> Document:
        """Create controlled document"""
        document = Document(
            document_id=str(uuid.uuid4()),
            document_number=doc_data['document_number'],
            title=doc_data['title'],
            document_type=doc_data['document_type'],
            version=doc_data['version'],
            effective_date=doc_data['effective_date'],
            review_date=doc_data['review_date'],
            owner=doc_data['owner']
        )
        self.documents[document.document_id] = document
        return document

    def create_nonconformance(self, nc_data: Dict) -> Nonconformance:
        """Report nonconformance"""
        nc = Nonconformance(
            nc_id=str(uuid.uuid4()),
            nc_number=f"NC-{self.nc_counter}",
            reported_by=nc_data['reported_by'],
            reported_date=datetime.now(),
            nc_type=NonconformanceType(nc_data['nc_type']),
            severity=Severity(nc_data['severity']),
            description=nc_data['description'],
            process_id=nc_data.get('process_id'),
            product_id=nc_data.get('product_id'),
            status=NCStatus.OPEN,
            assigned_to=nc_data.get('assigned_to')
        )

        # Set target close date based on severity
        days_to_close = {
            Severity.CRITICAL: 7,
            Severity.MAJOR: 30,
            Severity.MINOR: 90
        }
        nc.target_close_date = date.today() + timedelta(
            days=days_to_close[nc.severity]
        )

        self.nonconformances[nc.nc_id] = nc
        self.nc_counter += 1

        return nc

    def add_corrective_action(self, nc_id: str, action_data: Dict) -> CorrectiveAction:
        """Add corrective action to NC"""
        nc = self.nonconformances.get(nc_id)
        if not nc:
            raise ValueError("Nonconformance not found")

        action = CorrectiveAction(
            action_id=str(uuid.uuid4()),
            nc_id=nc_id,
            description=action_data['description'],
            responsible_person=action_data['responsible_person'],
            due_date=action_data['due_date']
        )

        self.corrective_actions[action.action_id] = action
        nc.corrective_actions.append(action.action_id)

        if nc.status == NCStatus.OPEN:
            nc.status = NCStatus.ACTION_REQUIRED

        return action

    def complete_corrective_action(self, action_id: str,
                                   completion_notes: str = ""):
        """Mark corrective action as completed"""
        action = self.corrective_actions.get(action_id)
        if not action:
            return

        action.status = "completed"
        action.completion_date = date.today()

        # Check if all actions for NC are completed
        nc = self.nonconformances[action.nc_id]
        all_actions = [self.corrective_actions[aid]
                      for aid in nc.corrective_actions
                      if aid in self.corrective_actions]

        if all(a.status == "completed" for a in all_actions):
            nc.status = NCStatus.VERIFICATION

    def close_nonconformance(self, nc_id: str, verification_notes: str):
        """Close verified nonconformance"""
        nc = self.nonconformances.get(nc_id)
        if not nc:
            return

        nc.status = NCStatus.CLOSED
        nc.closed_date = date.today()
        nc.verification_notes = verification_notes

    def create_audit(self, audit_data: Dict) -> Audit:
        """Schedule audit"""
        audit = Audit(
            audit_id=str(uuid.uuid4()),
            audit_number=f"AUD-{self.audit_counter}",
            audit_type=AuditType(audit_data['audit_type']),
            scope=audit_data['scope'],
            scheduled_date=audit_data['scheduled_date'],
            auditor=audit_data['auditor'],
            auditee=audit_data['auditee'],
            processes_audited=audit_data['processes_audited']
        )

        self.audits[audit.audit_id] = audit
        self.audit_counter += 1

        return audit

    def add_audit_finding(self, audit_id: str, finding_data: Dict) -> AuditFinding:
        """Record audit finding"""
        finding = AuditFinding(
            finding_id=str(uuid.uuid4()),
            audit_id=audit_id,
            finding_type=finding_data['finding_type'],
            severity=Severity(finding_data['severity']),
            description=finding_data['description'],
            requirement=finding_data['requirement'],
            evidence=finding_data['evidence']
        )

        self.audit_findings[finding.finding_id] = finding

        audit = self.audits.get(audit_id)
        if audit:
            audit.findings.append(finding.finding_id)

        # Create NC if it's a nonconformance finding
        if finding.finding_type == "nonconformance":
            nc = self.create_nonconformance({
                'reported_by': audit.auditor,
                'nc_type': 'audit_finding',
                'severity': finding.severity.value,
                'description': f"Audit Finding: {finding.description}",
                'process_id': audit.processes_audited[0] if audit.processes_audited else None
            })
            finding.created_nc_id = nc.nc_id

        return finding

    def get_quality_metrics(self, days: int = 90) -> Dict[str, Any]:
        """Calculate quality metrics"""
        cutoff = datetime.now() - timedelta(days=days)

        # Get recent NCs
        recent_ncs = [nc for nc in self.nonconformances.values()
                     if nc.reported_date >= cutoff]

        # NC by type
        nc_by_type = {}
        for nc_type in NonconformanceType:
            count = len([nc for nc in recent_ncs
                        if nc.nc_type == nc_type])
            nc_by_type[nc_type.value] = count

        # NC by severity
        nc_by_severity = {}
        for severity in Severity:
            count = len([nc for nc in recent_ncs
                        if nc.severity == severity])
            nc_by_severity[severity.value] = count

        # Closure metrics
        closed_ncs = [nc for nc in recent_ncs
                     if nc.status == NCStatus.CLOSED]

        avg_closure_days = 0
        if closed_ncs:
            closure_times = [(nc.closed_date - nc.reported_date.date()).days
                           for nc in closed_ncs if nc.closed_date]
            avg_closure_days = sum(closure_times) / len(closure_times)

        # Overdue actions
        overdue_actions = len([a for a in self.corrective_actions.values()
                             if a.status != "completed" and
                             a.due_date < date.today()])

        return {
            'period_days': days,
            'total_ncs': len(recent_ncs),
            'open_ncs': len([nc for nc in recent_ncs
                           if nc.status not in [NCStatus.CLOSED]]),
            'closed_ncs': len(closed_ncs),
            'nc_by_type': nc_by_type,
            'nc_by_severity': nc_by_severity,
            'avg_closure_days': avg_closure_days,
            'overdue_actions': overdue_actions
        }

    def get_audit_summary(self, year: int) -> Dict[str, Any]:
        """Generate audit summary for year"""
        year_audits = [a for a in self.audits.values()
                      if a.scheduled_date.year == year]

        audits_by_type = {}
        for audit_type in AuditType:
            count = len([a for a in year_audits
                        if a.audit_type == audit_type])
            audits_by_type[audit_type.value] = count

        total_findings = sum(len(a.findings) for a in year_audits)

        return {
            'year': year,
            'total_audits': len(year_audits),
            'completed_audits': len([a for a in year_audits
                                   if a.status == "completed"]),
            'audits_by_type': audits_by_type,
            'total_findings': total_findings,
            'avg_findings_per_audit': (total_findings / len(year_audits)
                                      if year_audits else 0)
        }
```

### Continuous Improvement System

```python
class ImprovementMethod(Enum):
    KAIZEN = "kaizen"
    SIX_SIGMA = "six_sigma"
    LEAN = "lean"
    PDCA = "pdca"

@dataclass
class ImprovementProject:
    project_id: str
    title: str
    description: str
    method: ImprovementMethod
    champion: str
    team_members: List[str]
    target_process: str
    problem_statement: str
    goal: str
    start_date: date
    target_completion: date
    status: str = "planning"  # planning, executing, monitoring, completed
    baseline_metrics: Dict[str, float] = field(default_factory=dict)
    target_metrics: Dict[str, float] = field(default_factory=dict)
    actual_metrics: Dict[str, float] = field(default_factory=dict)
    roi: Optional[float] = None

@dataclass
class RootCauseAnalysis:
    analysis_id: str
    nc_id: str
    method: str  # 5_whys, fishbone, fmea
    problem_statement: str
    root_causes: List[str] = field(default_factory=list)
    contributing_factors: List[str] = field(default_factory=list)
    analysis_date: date = field(default_factory=date.today)
    analyst: str = ""

class ContinuousImprovement:
    def __init__(self):
        self.projects: Dict[str, ImprovementProject] = {}
        self.rca_analyses: Dict[str, RootCauseAnalysis] = {}

    def create_improvement_project(self, project_data: Dict) -> ImprovementProject:
        """Launch improvement project"""
        project = ImprovementProject(
            project_id=str(uuid.uuid4()),
            title=project_data['title'],
            description=project_data['description'],
            method=ImprovementMethod(project_data['method']),
            champion=project_data['champion'],
            team_members=project_data['team_members'],
            target_process=project_data['target_process'],
            problem_statement=project_data['problem_statement'],
            goal=project_data['goal'],
            start_date=project_data['start_date'],
            target_completion=project_data['target_completion'],
            baseline_metrics=project_data.get('baseline_metrics', {})
        )

        self.projects[project.project_id] = project
        return project

    def conduct_root_cause_analysis(self, nc_id: str,
                                    analysis_data: Dict) -> RootCauseAnalysis:
        """Perform root cause analysis"""
        rca = RootCauseAnalysis(
            analysis_id=str(uuid.uuid4()),
            nc_id=nc_id,
            method=analysis_data['method'],
            problem_statement=analysis_data['problem_statement'],
            analyst=analysis_data['analyst']
        )

        # Five Whys method
        if rca.method == "5_whys":
            rca.root_causes = analysis_data.get('root_causes', [])

        self.rca_analyses[rca.analysis_id] = rca
        return rca

    def calculate_project_roi(self, project_id: str,
                             cost: float, benefit: float) -> float:
        """Calculate ROI for improvement project"""
        project = self.projects.get(project_id)
        if not project:
            return 0

        roi = ((benefit - cost) / cost) * 100
        project.roi = roi

        return roi

    def get_improvement_portfolio(self) -> List[Dict]:
        """Get active improvement projects"""
        active_projects = [p for p in self.projects.values()
                         if p.status in ['planning', 'executing', 'monitoring']]

        return [
            {
                'project_id': p.project_id,
                'title': p.title,
                'method': p.method.value,
                'status': p.status,
                'champion': p.champion,
                'target_completion': p.target_completion,
                'days_remaining': (p.target_completion - date.today()).days
            }
            for p in active_projects
        ]
```

### Quality Inspection System

```python
@dataclass
class InspectionPoint:
    point_id: str
    name: str
    process_id: str
    inspection_type: str  # receiving, in_process, final, patrol
    frequency: str  # per_unit, sample, periodic
    sample_size: Optional[int] = None
    acceptance_criteria: Dict[str, Any] = field(default_factory=dict)

@dataclass
class InspectionResult:
    result_id: str
    inspection_point_id: str
    inspector: str
    inspection_date: datetime
    lot_number: str
    quantity_inspected: int
    quantity_accepted: int
    quantity_rejected: int
    defects_found: List[Dict] = field(default_factory=list)
    pass_fail: bool = True
    notes: str = ""

class QualityInspection:
    def __init__(self):
        self.inspection_points: Dict[str, InspectionPoint] = {}
        self.inspection_results: List[InspectionResult] = []

    def create_inspection_point(self, point_data: Dict) -> InspectionPoint:
        """Define inspection checkpoint"""
        point = InspectionPoint(
            point_id=str(uuid.uuid4()),
            name=point_data['name'],
            process_id=point_data['process_id'],
            inspection_type=point_data['inspection_type'],
            frequency=point_data['frequency'],
            sample_size=point_data.get('sample_size'),
            acceptance_criteria=point_data.get('acceptance_criteria', {})
        )

        self.inspection_points[point.point_id] = point
        return point

    def record_inspection(self, result_data: Dict) -> InspectionResult:
        """Record inspection results"""
        result = InspectionResult(
            result_id=str(uuid.uuid4()),
            inspection_point_id=result_data['inspection_point_id'],
            inspector=result_data['inspector'],
            inspection_date=datetime.now(),
            lot_number=result_data['lot_number'],
            quantity_inspected=result_data['quantity_inspected'],
            quantity_accepted=result_data['quantity_accepted'],
            quantity_rejected=result_data['quantity_rejected'],
            defects_found=result_data.get('defects_found', []),
            pass_fail=result_data['pass_fail'],
            notes=result_data.get('notes', '')
        )

        self.inspection_results.append(result)
        return result

    def calculate_first_pass_yield(self, process_id: str,
                                   days: int = 30) -> float:
        """Calculate first pass yield"""
        cutoff = datetime.now() - timedelta(days=days)

        # Get inspection points for process
        process_points = [p.point_id for p in self.inspection_points.values()
                         if p.process_id == process_id]

        # Get results for these points
        results = [r for r in self.inspection_results
                  if r.inspection_point_id in process_points and
                  r.inspection_date >= cutoff]

        if not results:
            return 0

        total_inspected = sum(r.quantity_inspected for r in results)
        total_accepted = sum(r.quantity_accepted for r in results)

        fpy = (total_accepted / total_inspected * 100) if total_inspected > 0 else 0

        return fpy
```

## Best Practices

### QMS Implementation
- Define clear quality policy and objectives
- Document processes and procedures
- Implement document control system
- Train personnel on QMS requirements
- Regular management reviews
- Internal audit schedule
- Continuous improvement culture
- Risk-based thinking

### Nonconformance Management
- Timely reporting and investigation
- Root cause analysis for all major NCs
- Effective corrective actions
- Verification of action effectiveness
- Trend analysis and prevention
- Clear responsibility assignment
- Escalation procedures

### Audit Management
- Risk-based audit planning
- Trained and competent auditors
- Objective and evidence-based
- Clear audit criteria
- Constructive findings
- Timely follow-up
- Lessons learned documentation

### Continuous Improvement
- Data-driven decision making
- Employee involvement and empowerment
- Structured improvement methodologies
- Measure and track improvements
- Celebrate successes
- Share best practices
- Sustain improvements

## Anti-Patterns

### Poor Practices
- QMS as documentation exercise only
- Blame culture for nonconformances
- Superficial root cause analysis
- Corrective actions not verified
- Audit findings not closed
- Quality as quality department responsibility
- No management commitment
- Ignoring customer feedback

### Common Mistakes
- Over-documentation without value
- Generic corrective actions
- Not addressing root causes
- Audit fatigue from excessive auditing
- Quality inspection without improvement
- Reactive vs proactive quality
- Inadequate training
- Poor communication of quality issues

## Resources

### QMS Standards
- ISO 9001 - Quality Management System
- ISO 13485 - Medical Devices QMS
- IATF 16949 - Automotive QMS
- AS9100 - Aerospace QMS
- ISO 14001 - Environmental Management

### Methodologies
- Six Sigma (DMAIC methodology)
- Lean Manufacturing
- Total Quality Management (TQM)
- Kaizen continuous improvement
- 8D Problem Solving

### Tools
- MasterControl - QMS software
- ETQ Reliance - Quality management
- Qualio - Cloud QMS
- Greenlight Guru - Medical device QMS
- Arena - PLM with quality

### Learning Resources
- ASQ (American Society for Quality)
- ISO 9001 Lead Auditor training
- Six Sigma certifications (Green Belt, Black Belt)
- Lean certifications
- Quality Management Journal

---

*Part of the PCL Standard Library - Master quality management systems and drive organizational excellence through continuous improvement.*
