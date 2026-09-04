# HR Tech Expert — Code Examples

Reference material for the `hr-tech-expert` skill. See [SKILL.md](../SKILL.md).

## Code Examples

### HRIS Core System

```python
from datetime import datetime, date
from enum import Enum
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
from decimal import Decimal

class EmploymentStatus(Enum):
    ACTIVE = "active"
    ON_LEAVE = "on_leave"
    TERMINATED = "terminated"
    RETIRED = "retired"
    SUSPENDED = "suspended"

class EmploymentType(Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACT = "contract"
    INTERN = "intern"
    TEMPORARY = "temporary"

@dataclass
class Compensation:
    base_salary: Decimal
    currency: str = "USD"
    pay_frequency: str = "monthly"  # weekly, biweekly, monthly
    effective_date: date = field(default_factory=date.today)
    bonus_eligible: bool = False
    commission_eligible: bool = False

    def calculate_annual_salary(self) -> Decimal:
        if self.pay_frequency == "weekly":
            return self.base_salary * 52
        elif self.pay_frequency == "biweekly":
            return self.base_salary * 26
        elif self.pay_frequency == "monthly":
            return self.base_salary * 12
        return self.base_salary

@dataclass
class JobPosition:
    position_id: str
    title: str
    department: str
    level: str
    reports_to: Optional[str]
    location: str
    employment_type: EmploymentType
    fte: float = 1.0  # Full-time equivalent
    description: str = ""
    requirements: List[str] = field(default_factory=list)

@dataclass
class Employee:
    employee_id: str
    first_name: str
    last_name: str
    email: str
    position: JobPosition
    hire_date: date
    status: EmploymentStatus
    compensation: Compensation
    manager_id: Optional[str] = None
    department: str = ""
    birth_date: Optional[date] = None
    emergency_contact: Dict[str, str] = field(default_factory=dict)

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    @property
    def tenure_years(self) -> float:
        days = (date.today() - self.hire_date).days
        return round(days / 365.25, 2)

    def is_eligible_for_benefits(self) -> bool:
        return (self.status == EmploymentStatus.ACTIVE and
                self.position.employment_type == EmploymentType.FULL_TIME)

class HRISSystem:
    def __init__(self):
        self.employees: Dict[str, Employee] = {}
        self.positions: Dict[str, JobPosition] = {}
        self.organizational_chart: Dict[str, List[str]] = {}

    def create_employee(self, employee_data: Dict[str, Any]) -> Employee:
        position = self.positions.get(employee_data['position_id'])
        if not position:
            raise ValueError("Position not found")

        compensation = Compensation(
            base_salary=Decimal(str(employee_data['base_salary'])),
            currency=employee_data.get('currency', 'USD'),
            pay_frequency=employee_data.get('pay_frequency', 'monthly')
        )

        employee = Employee(
            employee_id=employee_data['employee_id'],
            first_name=employee_data['first_name'],
            last_name=employee_data['last_name'],
            email=employee_data['email'],
            position=position,
            hire_date=employee_data['hire_date'],
            status=EmploymentStatus.ACTIVE,
            compensation=compensation,
            manager_id=employee_data.get('manager_id'),
            department=position.department
        )

        self.employees[employee.employee_id] = employee
        self._update_org_chart(employee)

        return employee

    def _update_org_chart(self, employee: Employee):
        if employee.manager_id:
            if employee.manager_id not in self.organizational_chart:
                self.organizational_chart[employee.manager_id] = []
            self.organizational_chart[employee.manager_id].append(employee.employee_id)

    def get_direct_reports(self, manager_id: str) -> List[Employee]:
        report_ids = self.organizational_chart.get(manager_id, [])
        return [self.employees[emp_id] for emp_id in report_ids
                if emp_id in self.employees]

    def get_team_hierarchy(self, manager_id: str,
                          max_depth: int = 10) -> Dict[str, Any]:
        """Get full team hierarchy under a manager"""
        manager = self.employees.get(manager_id)
        if not manager:
            return {}

        def build_tree(emp_id: str, depth: int = 0) -> Dict:
            if depth >= max_depth:
                return {}

            emp = self.employees[emp_id]
            reports = self.get_direct_reports(emp_id)

            return {
                'employee': {
                    'id': emp.employee_id,
                    'name': emp.full_name,
                    'title': emp.position.title,
                    'department': emp.department
                },
                'direct_reports': [build_tree(r.employee_id, depth + 1)
                                 for r in reports]
            }

        return build_tree(manager_id)

    def calculate_headcount(self, department: Optional[str] = None) -> Dict:
        employees = self.employees.values()

        if department:
            employees = [e for e in employees if e.department == department]

        active = [e for e in employees if e.status == EmploymentStatus.ACTIVE]

        return {
            'total': len(employees),
            'active': len(active),
            'by_type': self._count_by_employment_type(active),
            'by_department': self._count_by_department(active)
        }

    def _count_by_employment_type(self, employees: List[Employee]) -> Dict:
        counts = {}
        for emp in employees:
            emp_type = emp.position.employment_type.value
            counts[emp_type] = counts.get(emp_type, 0) + 1
        return counts

    def _count_by_department(self, employees: List[Employee]) -> Dict:
        counts = {}
        for emp in employees:
            counts[emp.department] = counts.get(emp.department, 0) + 1
        return counts
```

### Applicant Tracking System

```python
from typing import List, Dict, Optional
from datetime import datetime
from enum import Enum

class ApplicationStatus(Enum):
    NEW = "new"
    SCREENING = "screening"
    PHONE_SCREEN = "phone_screen"
    INTERVIEW = "interview"
    OFFER = "offer"
    HIRED = "hired"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"

@dataclass
class Candidate:
    candidate_id: str
    first_name: str
    last_name: str
    email: str
    phone: str
    resume_url: str
    linkedin_url: Optional[str] = None
    source: str = "career_site"  # referral, linkedin, agency, etc.
    skills: List[str] = field(default_factory=list)
    applied_date: datetime = field(default_factory=datetime.now)

@dataclass
class Interview:
    interview_id: str
    candidate_id: str
    interviewer_id: str
    scheduled_date: datetime
    interview_type: str  # phone, video, onsite, panel
    status: str = "scheduled"
    feedback: Optional[str] = None
    rating: Optional[int] = None  # 1-5 scale

@dataclass
class JobRequisition:
    req_id: str
    title: str
    department: str
    hiring_manager: str
    positions: int
    status: str = "open"  # open, on_hold, filled, cancelled
    description: str = ""
    requirements: List[str] = field(default_factory=list)
    salary_range: tuple[Decimal, Decimal] = field(default=(Decimal(0), Decimal(0)))
    opened_date: date = field(default_factory=date.today)

@dataclass
class Application:
    application_id: str
    candidate: Candidate
    requisition: JobRequisition
    status: ApplicationStatus
    applied_date: datetime
    interviews: List[Interview] = field(default_factory=list)
    notes: List[Dict] = field(default_factory=list)

    def add_note(self, author: str, note: str):
        self.notes.append({
            'timestamp': datetime.now(),
            'author': author,
            'note': note
        })

class ApplicantTrackingSystem:
    def __init__(self):
        self.candidates: Dict[str, Candidate] = {}
        self.requisitions: Dict[str, JobRequisition] = {}
        self.applications: Dict[str, Application] = {}
        self.interviews: Dict[str, Interview] = {}

    def create_requisition(self, req_data: Dict) -> JobRequisition:
        req = JobRequisition(
            req_id=req_data['req_id'],
            title=req_data['title'],
            department=req_data['department'],
            hiring_manager=req_data['hiring_manager'],
            positions=req_data['positions'],
            description=req_data.get('description', ''),
            requirements=req_data.get('requirements', [])
        )
        self.requisitions[req.req_id] = req
        return req

    def submit_application(self, candidate_data: Dict,
                          req_id: str) -> Application:
        # Create or get candidate
        candidate_id = candidate_data.get('candidate_id',
                                        f"CAND-{len(self.candidates)}")

        if candidate_id in self.candidates:
            candidate = self.candidates[candidate_id]
        else:
            candidate = Candidate(
                candidate_id=candidate_id,
                first_name=candidate_data['first_name'],
                last_name=candidate_data['last_name'],
                email=candidate_data['email'],
                phone=candidate_data['phone'],
                resume_url=candidate_data['resume_url'],
                skills=candidate_data.get('skills', [])
            )
            self.candidates[candidate_id] = candidate

        requisition = self.requisitions.get(req_id)
        if not requisition:
            raise ValueError("Requisition not found")

        application = Application(
            application_id=f"APP-{len(self.applications)}",
            candidate=candidate,
            requisition=requisition,
            status=ApplicationStatus.NEW,
            applied_date=datetime.now()
        )

        self.applications[application.application_id] = application
        return application

    def schedule_interview(self, application_id: str,
                          interviewer_id: str,
                          scheduled_date: datetime,
                          interview_type: str) -> Interview:
        application = self.applications.get(application_id)
        if not application:
            raise ValueError("Application not found")

        interview = Interview(
            interview_id=f"INT-{len(self.interviews)}",
            candidate_id=application.candidate.candidate_id,
            interviewer_id=interviewer_id,
            scheduled_date=scheduled_date,
            interview_type=interview_type
        )

        application.interviews.append(interview)
        self.interviews[interview.interview_id] = interview

        # Update application status
        if application.status == ApplicationStatus.SCREENING:
            application.status = ApplicationStatus.PHONE_SCREEN
        elif application.status == ApplicationStatus.PHONE_SCREEN:
            application.status = ApplicationStatus.INTERVIEW

        return interview

    def get_pipeline_metrics(self, req_id: Optional[str] = None) -> Dict:
        applications = self.applications.values()

        if req_id:
            applications = [a for a in applications
                          if a.requisition.req_id == req_id]

        pipeline = {}
        for status in ApplicationStatus:
            count = len([a for a in applications if a.status == status])
            pipeline[status.value] = count

        return {
            'total_applications': len(applications),
            'pipeline': pipeline,
            'conversion_rates': self._calculate_conversion_rates(applications)
        }

    def _calculate_conversion_rates(self, applications: List[Application]) -> Dict:
        total = len(applications)
        if total == 0:
            return {}

        screened = len([a for a in applications
                       if a.status.value not in ['new', 'rejected', 'withdrawn']])
        interviewed = len([a for a in applications
                         if a.status == ApplicationStatus.INTERVIEW])
        offers = len([a for a in applications
                     if a.status == ApplicationStatus.OFFER])
        hired = len([a for a in applications
                    if a.status == ApplicationStatus.HIRED])

        return {
            'screening_rate': screened / total if total > 0 else 0,
            'interview_rate': interviewed / screened if screened > 0 else 0,
            'offer_rate': offers / interviewed if interviewed > 0 else 0,
            'hire_rate': hired / offers if offers > 0 else 0
        }
```

### Performance Management System

```python
class ReviewCycle(Enum):
    QUARTERLY = "quarterly"
    SEMI_ANNUAL = "semi_annual"
    ANNUAL = "annual"

@dataclass
class Goal:
    goal_id: str
    employee_id: str
    title: str
    description: str
    category: str  # individual, team, company
    start_date: date
    due_date: date
    progress: int = 0  # 0-100
    status: str = "in_progress"  # in_progress, completed, cancelled
    measurable_criteria: List[str] = field(default_factory=list)

    def update_progress(self, progress: int):
        self.progress = min(100, max(0, progress))
        if self.progress >= 100:
            self.status = "completed"

@dataclass
class PerformanceReview:
    review_id: str
    employee_id: str
    reviewer_id: str
    review_period_start: date
    review_period_end: date
    cycle: ReviewCycle
    overall_rating: Optional[int] = None  # 1-5 scale
    competency_ratings: Dict[str, int] = field(default_factory=dict)
    goals_achievement: Dict[str, int] = field(default_factory=dict)
    strengths: List[str] = field(default_factory=list)
    areas_for_improvement: List[str] = field(default_factory=list)
    comments: str = ""
    submitted_date: Optional[datetime] = None
    status: str = "draft"  # draft, submitted, acknowledged

class PerformanceManagementSystem:
    def __init__(self):
        self.goals: Dict[str, Goal] = {}
        self.reviews: Dict[str, PerformanceReview] = {}
        self.competencies: Dict[str, List[str]] = {
            'technical': ['Technical Expertise', 'Problem Solving', 'Innovation'],
            'leadership': ['Team Leadership', 'Strategic Thinking', 'Decision Making'],
            'communication': ['Written Communication', 'Verbal Communication', 'Collaboration']
        }

    def create_goal(self, employee_id: str, goal_data: Dict) -> Goal:
        goal = Goal(
            goal_id=f"GOAL-{len(self.goals)}",
            employee_id=employee_id,
            title=goal_data['title'],
            description=goal_data['description'],
            category=goal_data.get('category', 'individual'),
            start_date=goal_data['start_date'],
            due_date=goal_data['due_date'],
            measurable_criteria=goal_data.get('criteria', [])
        )
        self.goals[goal.goal_id] = goal
        return goal

    def initiate_review(self, employee_id: str, reviewer_id: str,
                       cycle: ReviewCycle) -> PerformanceReview:
        today = date.today()

        if cycle == ReviewCycle.QUARTERLY:
            period_days = 90
        elif cycle == ReviewCycle.SEMI_ANNUAL:
            period_days = 180
        else:  # ANNUAL
            period_days = 365

        period_start = date(today.year, 1, 1) if cycle == ReviewCycle.ANNUAL else today

        review = PerformanceReview(
            review_id=f"REV-{len(self.reviews)}",
            employee_id=employee_id,
            reviewer_id=reviewer_id,
            review_period_start=period_start,
            review_period_end=today,
            cycle=cycle
        )

        # Pre-populate goals achievement
        employee_goals = self.get_employee_goals(employee_id)
        for goal in employee_goals:
            review.goals_achievement[goal.goal_id] = goal.progress

        self.reviews[review.review_id] = review
        return review

    def get_employee_goals(self, employee_id: str) -> List[Goal]:
        return [g for g in self.goals.values()
                if g.employee_id == employee_id]

    def calculate_goal_completion_rate(self, employee_id: str) -> float:
        goals = self.get_employee_goals(employee_id)
        if not goals:
            return 0.0

        completed = len([g for g in goals if g.status == "completed"])
        return (completed / len(goals)) * 100
```
