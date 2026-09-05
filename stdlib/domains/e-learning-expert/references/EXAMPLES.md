# E-Learning Expert — Code Examples

Reference material for the `e-learning-expert` skill. See [SKILL.md](../SKILL.md).

## Code Examples

### LMS Core System

```python
from datetime import datetime, timedelta
from enum import Enum
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
import uuid

class EnrollmentStatus(Enum):
    ENROLLED = "enrolled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DROPPED = "dropped"
    SUSPENDED = "suspended"

class ContentType(Enum):
    VIDEO = "video"
    TEXT = "text"
    QUIZ = "quiz"
    ASSIGNMENT = "assignment"
    DISCUSSION = "discussion"
    INTERACTIVE = "interactive"
    SCORM = "scorm"

class AssessmentType(Enum):
    QUIZ = "quiz"
    ASSIGNMENT = "assignment"
    PROJECT = "project"
    DISCUSSION = "discussion"
    PEER_REVIEW = "peer_review"

@dataclass
class LearningObjective:
    objective_id: str
    description: str
    bloom_level: str  # remember, understand, apply, analyze, evaluate, create
    assessments: List[str] = field(default_factory=list)

@dataclass
class CourseModule:
    module_id: str
    course_id: str
    title: str
    description: str
    order: int
    duration_minutes: int
    prerequisites: List[str] = field(default_factory=list)
    learning_objectives: List[LearningObjective] = field(default_factory=list)

@dataclass
class LearningContent:
    content_id: str
    module_id: str
    title: str
    content_type: ContentType
    order: int
    duration_minutes: Optional[int]
    url: Optional[str] = None
    content_data: Dict[str, Any] = field(default_factory=dict)
    required: bool = True

@dataclass
class Course:
    course_id: str
    title: str
    description: str
    instructor_id: str
    category: str
    difficulty_level: str  # beginner, intermediate, advanced
    duration_hours: float
    modules: List[CourseModule] = field(default_factory=list)
    published: bool = False
    created_at: datetime = field(default_factory=datetime.now)
    max_students: Optional[int] = None

    def get_total_modules(self) -> int:
        return len(self.modules)

    def calculate_completion_rate(self, completed_modules: int) -> float:
        total = self.get_total_modules()
        return (completed_modules / total * 100) if total > 0 else 0

@dataclass
class Student:
    student_id: str
    name: str
    email: str
    enrolled_courses: List[str] = field(default_factory=list)
    completed_courses: List[str] = field(default_factory=list)
    total_learning_hours: float = 0
    created_at: datetime = field(default_factory=datetime.now)

@dataclass
class Enrollment:
    enrollment_id: str
    student_id: str
    course_id: str
    status: EnrollmentStatus
    enrolled_date: datetime
    completed_date: Optional[datetime] = None
    progress_percentage: float = 0
    grade: Optional[float] = None
    last_accessed: datetime = field(default_factory=datetime.now)

@dataclass
class ContentProgress:
    student_id: str
    content_id: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    time_spent_minutes: float = 0
    completion_percentage: float = 0
    attempts: int = 0

class LearningManagementSystem:
    def __init__(self):
        self.courses: Dict[str, Course] = {}
        self.students: Dict[str, Student] = {}
        self.enrollments: Dict[str, Enrollment] = {}
        self.content_progress: List[ContentProgress] = []
        self.modules: Dict[str, CourseModule] = {}
        self.content: Dict[str, LearningContent] = {}

    def create_course(self, course_data: Dict[str, Any]) -> Course:
        """Create new course"""
        course = Course(
            course_id=course_data.get('course_id', str(uuid.uuid4())),
            title=course_data['title'],
            description=course_data['description'],
            instructor_id=course_data['instructor_id'],
            category=course_data['category'],
            difficulty_level=course_data.get('difficulty_level', 'beginner'),
            duration_hours=course_data['duration_hours'],
            max_students=course_data.get('max_students')
        )
        self.courses[course.course_id] = course
        return course

    def add_module_to_course(self, course_id: str,
                            module_data: Dict) -> CourseModule:
        """Add module to course"""
        course = self.courses.get(course_id)
        if not course:
            raise ValueError("Course not found")

        module = CourseModule(
            module_id=str(uuid.uuid4()),
            course_id=course_id,
            title=module_data['title'],
            description=module_data['description'],
            order=len(course.modules) + 1,
            duration_minutes=module_data['duration_minutes'],
            prerequisites=module_data.get('prerequisites', [])
        )

        course.modules.append(module)
        self.modules[module.module_id] = module
        return module

    def enroll_student(self, student_id: str, course_id: str) -> Enrollment:
        """Enroll student in course"""
        if course_id not in self.courses:
            raise ValueError("Course not found")

        if student_id not in self.students:
            raise ValueError("Student not found")

        # Check if already enrolled
        existing = [e for e in self.enrollments.values()
                   if e.student_id == student_id and
                   e.course_id == course_id and
                   e.status not in [EnrollmentStatus.COMPLETED,
                                   EnrollmentStatus.DROPPED]]

        if existing:
            return existing[0]

        enrollment = Enrollment(
            enrollment_id=str(uuid.uuid4()),
            student_id=student_id,
            course_id=course_id,
            status=EnrollmentStatus.ENROLLED,
            enrolled_date=datetime.now()
        )

        self.enrollments[enrollment.enrollment_id] = enrollment

        # Update student record
        student = self.students[student_id]
        if course_id not in student.enrolled_courses:
            student.enrolled_courses.append(course_id)

        return enrollment

    def track_content_progress(self, student_id: str, content_id: str,
                              completion_pct: float,
                              time_spent_minutes: float):
        """Track student progress on content"""
        # Find existing progress or create new
        progress = None
        for p in self.content_progress:
            if (p.student_id == student_id and
                p.content_id == content_id):
                progress = p
                break

        if not progress:
            progress = ContentProgress(
                student_id=student_id,
                content_id=content_id,
                started_at=datetime.now()
            )
            self.content_progress.append(progress)

        progress.completion_percentage = completion_pct
        progress.time_spent_minutes += time_spent_minutes
        progress.attempts += 1

        if completion_pct >= 100 and not progress.completed_at:
            progress.completed_at = datetime.now()

        # Update enrollment progress
        self._update_enrollment_progress(student_id, content_id)

    def _update_enrollment_progress(self, student_id: str, content_id: str):
        """Update overall enrollment progress"""
        content = self.content.get(content_id)
        if not content:
            return

        module = self.modules.get(content.module_id)
        if not module:
            return

        # Find enrollment
        enrollment = None
        for e in self.enrollments.values():
            if (e.student_id == student_id and
                e.course_id == module.course_id and
                e.status not in [EnrollmentStatus.COMPLETED,
                               EnrollmentStatus.DROPPED]):
                enrollment = e
                break

        if not enrollment:
            return

        # Calculate overall progress
        course = self.courses[module.course_id]
        total_content = sum(len(self._get_module_content(m.module_id))
                          for m in course.modules)

        completed_content = len([p for p in self.content_progress
                                if p.student_id == student_id and
                                p.completion_percentage >= 100 and
                                self._is_content_in_course(p.content_id,
                                                          module.course_id)])

        enrollment.progress_percentage = (completed_content / total_content * 100
                                         if total_content > 0 else 0)
        enrollment.last_accessed = datetime.now()

        if enrollment.progress_percentage >= 100:
            enrollment.status = EnrollmentStatus.COMPLETED
            enrollment.completed_date = datetime.now()

            student = self.students[student_id]
            if module.course_id not in student.completed_courses:
                student.completed_courses.append(module.course_id)

    def _get_module_content(self, module_id: str) -> List[LearningContent]:
        """Get all content for a module"""
        return [c for c in self.content.values()
                if c.module_id == module_id]

    def _is_content_in_course(self, content_id: str, course_id: str) -> bool:
        """Check if content belongs to course"""
        content = self.content.get(content_id)
        if not content:
            return False

        module = self.modules.get(content.module_id)
        return module and module.course_id == course_id

    def get_student_dashboard(self, student_id: str) -> Dict[str, Any]:
        """Generate student dashboard data"""
        student = self.students.get(student_id)
        if not student:
            return {}

        enrollments = [e for e in self.enrollments.values()
                      if e.student_id == student_id and
                      e.status == EnrollmentStatus.IN_PROGRESS]

        return {
            'student_id': student_id,
            'active_courses': len(enrollments),
            'completed_courses': len(student.completed_courses),
            'total_learning_hours': student.total_learning_hours,
            'in_progress': [
                {
                    'course_id': e.course_id,
                    'course_title': self.courses[e.course_id].title,
                    'progress': e.progress_percentage,
                    'last_accessed': e.last_accessed
                }
                for e in enrollments
            ]
        }
```

### Assessment System

```python
@dataclass
class Question:
    question_id: str
    question_type: str  # multiple_choice, true_false, short_answer, essay
    question_text: str
    points: int
    correct_answer: Optional[str] = None
    options: List[str] = field(default_factory=list)
    explanation: Optional[str] = None

@dataclass
class Quiz:
    quiz_id: str
    module_id: str
    title: str
    description: str
    time_limit_minutes: Optional[int]
    passing_score: float  # percentage
    max_attempts: int
    questions: List[Question] = field(default_factory=list)
    randomize_questions: bool = False

    def calculate_total_points(self) -> int:
        return sum(q.points for q in self.questions)

@dataclass
class QuizAttempt:
    attempt_id: str
    student_id: str
    quiz_id: str
    started_at: datetime
    submitted_at: Optional[datetime] = None
    answers: Dict[str, str] = field(default_factory=dict)  # question_id -> answer
    score: Optional[float] = None
    passed: bool = False

@dataclass
class Assignment:
    assignment_id: str
    module_id: str
    title: str
    description: str
    due_date: datetime
    max_points: int
    submission_type: str  # file, text, url
    rubric: Dict[str, Any] = field(default_factory=dict)

@dataclass
class Submission:
    submission_id: str
    assignment_id: str
    student_id: str
    submitted_at: datetime
    content: str
    attachments: List[str] = field(default_factory=list)
    grade: Optional[float] = None
    feedback: Optional[str] = None
    graded_at: Optional[datetime] = None
    graded_by: Optional[str] = None

class AssessmentSystem:
    def __init__(self):
        self.quizzes: Dict[str, Quiz] = {}
        self.quiz_attempts: Dict[str, QuizAttempt] = {}
        self.assignments: Dict[str, Assignment] = {}
        self.submissions: Dict[str, Submission] = {}

    def create_quiz(self, quiz_data: Dict) -> Quiz:
        """Create new quiz"""
        quiz = Quiz(
            quiz_id=str(uuid.uuid4()),
            module_id=quiz_data['module_id'],
            title=quiz_data['title'],
            description=quiz_data['description'],
            time_limit_minutes=quiz_data.get('time_limit_minutes'),
            passing_score=quiz_data.get('passing_score', 70),
            max_attempts=quiz_data.get('max_attempts', 3)
        )
        self.quizzes[quiz.quiz_id] = quiz
        return quiz

    def start_quiz_attempt(self, student_id: str, quiz_id: str) -> QuizAttempt:
        """Start new quiz attempt"""
        quiz = self.quizzes.get(quiz_id)
        if not quiz:
            raise ValueError("Quiz not found")

        # Check previous attempts
        previous = [a for a in self.quiz_attempts.values()
                   if a.student_id == student_id and
                   a.quiz_id == quiz_id]

        if len(previous) >= quiz.max_attempts:
            raise ValueError("Maximum attempts reached")

        attempt = QuizAttempt(
            attempt_id=str(uuid.uuid4()),
            student_id=student_id,
            quiz_id=quiz_id,
            started_at=datetime.now()
        )

        self.quiz_attempts[attempt.attempt_id] = attempt
        return attempt

    def submit_quiz_attempt(self, attempt_id: str,
                          answers: Dict[str, str]) -> QuizAttempt:
        """Submit and grade quiz attempt"""
        attempt = self.quiz_attempts.get(attempt_id)
        if not attempt:
            raise ValueError("Attempt not found")

        quiz = self.quizzes[attempt.quiz_id]
        attempt.answers = answers
        attempt.submitted_at = datetime.now()

        # Auto-grade objective questions
        correct_points = 0
        total_points = quiz.calculate_total_points()

        for question in quiz.questions:
            if question.question_type in ['multiple_choice', 'true_false']:
                student_answer = answers.get(question.question_id, '')
                if student_answer == question.correct_answer:
                    correct_points += question.points

        attempt.score = (correct_points / total_points * 100
                        if total_points > 0 else 0)
        attempt.passed = attempt.score >= quiz.passing_score

        return attempt

    def submit_assignment(self, assignment_id: str, student_id: str,
                         content: str, attachments: List[str] = None) -> Submission:
        """Submit assignment"""
        assignment = self.assignments.get(assignment_id)
        if not assignment:
            raise ValueError("Assignment not found")

        submission = Submission(
            submission_id=str(uuid.uuid4()),
            assignment_id=assignment_id,
            student_id=student_id,
            submitted_at=datetime.now(),
            content=content,
            attachments=attachments or []
        )

        self.submissions[submission.submission_id] = submission
        return submission

    def grade_submission(self, submission_id: str, grade: float,
                        feedback: str, grader_id: str):
        """Grade assignment submission"""
        submission = self.submissions.get(submission_id)
        if not submission:
            raise ValueError("Submission not found")

        assignment = self.assignments[submission.assignment_id]

        submission.grade = min(grade, assignment.max_points)
        submission.feedback = feedback
        submission.graded_at = datetime.now()
        submission.graded_by = grader_id
```

### Learning Analytics Engine

```python
from collections import defaultdict
from typing import List, Dict

class LearningAnalytics:
    def __init__(self, lms: LearningManagementSystem,
                 assessment_system: AssessmentSystem):
        self.lms = lms
        self.assessment_system = assessment_system

    def calculate_course_completion_rate(self, course_id: str) -> float:
        """Calculate course completion rate"""
        enrollments = [e for e in self.lms.enrollments.values()
                      if e.course_id == course_id]

        if not enrollments:
            return 0

        completed = len([e for e in enrollments
                        if e.status == EnrollmentStatus.COMPLETED])

        return (completed / len(enrollments)) * 100

    def calculate_average_grade(self, course_id: str) -> Optional[float]:
        """Calculate average grade for course"""
        enrollments = [e for e in self.lms.enrollments.values()
                      if e.course_id == course_id and
                      e.grade is not None]

        if not enrollments:
            return None

        return sum(e.grade for e in enrollments) / len(enrollments)

    def identify_at_risk_students(self, course_id: str) -> List[Dict]:
        """Identify students at risk of not completing"""
        at_risk = []

        enrollments = [e for e in self.lms.enrollments.values()
                      if e.course_id == course_id and
                      e.status == EnrollmentStatus.IN_PROGRESS]

        for enrollment in enrollments:
            risk_factors = []

            # Low progress
            if enrollment.progress_percentage < 30:
                risk_factors.append("Low progress")

            # No recent activity
            days_since_access = (datetime.now() - enrollment.last_accessed).days
            if days_since_access > 7:
                risk_factors.append(f"No activity for {days_since_access} days")

            # Low quiz scores
            student_attempts = [a for a in self.assessment_system.quiz_attempts.values()
                              if a.student_id == enrollment.student_id]

            if student_attempts:
                avg_score = sum(a.score for a in student_attempts
                              if a.score is not None) / len(student_attempts)
                if avg_score < 60:
                    risk_factors.append(f"Low quiz average: {avg_score:.1f}%")

            if risk_factors:
                at_risk.append({
                    'student_id': enrollment.student_id,
                    'progress': enrollment.progress_percentage,
                    'last_access': enrollment.last_accessed,
                    'risk_factors': risk_factors
                })

        return at_risk

    def generate_engagement_report(self, course_id: str,
                                  days: int = 30) -> Dict[str, Any]:
        """Generate course engagement metrics"""
        cutoff = datetime.now() - timedelta(days=days)

        enrollments = [e for e in self.lms.enrollments.values()
                      if e.course_id == course_id]

        active_students = len([e for e in enrollments
                             if e.last_accessed >= cutoff])

        # Content completion
        course = self.lms.courses[course_id]
        total_content = sum(len(self.lms._get_module_content(m.module_id))
                          for m in course.modules)

        avg_content_completed = 0
        if enrollments:
            for enrollment in enrollments:
                completed = len([p for p in self.lms.content_progress
                               if p.student_id == enrollment.student_id and
                               p.completion_percentage >= 100 and
                               self.lms._is_content_in_course(p.content_id,
                                                              course_id)])
                avg_content_completed += completed

            avg_content_completed /= len(enrollments)

        return {
            'course_id': course_id,
            'period_days': days,
            'total_enrolled': len(enrollments),
            'active_students': active_students,
            'engagement_rate': (active_students / len(enrollments) * 100
                              if enrollments else 0),
            'avg_content_completed': avg_content_completed,
            'completion_rate': self.calculate_course_completion_rate(course_id)
        }

    def analyze_content_effectiveness(self, course_id: str) -> List[Dict]:
        """Analyze which content is most/least effective"""
        course = self.lms.courses[course_id]
        content_stats = []

        for module in course.modules:
            module_content = self.lms._get_module_content(module.module_id)

            for content in module_content:
                progress_records = [p for p in self.lms.content_progress
                                  if p.content_id == content.content_id]

                if not progress_records:
                    continue

                completion_rate = (len([p for p in progress_records
                                      if p.completion_percentage >= 100]) /
                                 len(progress_records) * 100)

                avg_time = (sum(p.time_spent_minutes for p in progress_records) /
                           len(progress_records))

                avg_attempts = (sum(p.attempts for p in progress_records) /
                              len(progress_records))

                content_stats.append({
                    'content_id': content.content_id,
                    'title': content.title,
                    'type': content.content_type.value,
                    'completion_rate': completion_rate,
                    'avg_time_minutes': avg_time,
                    'avg_attempts': avg_attempts
                })

        # Sort by completion rate
        content_stats.sort(key=lambda x: x['completion_rate'])

        return content_stats
```
