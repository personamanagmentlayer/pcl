# Customer Support Expert

---

skill_id: customer-support-expert
name: Customer Support Expert
allowed-tools:

- Read
- Write
- WebSearch
  category: domains
  tags: [support, helpdesk, ticketing, customer-service, knowledge-base, sla, service-desk, customer-success]
  version: 1.0.0
  author: PCL Standard Library
  dependencies: []
  complexity: expert
  estimated_time: 45 minutes
  objectives:
- Master helpdesk and ticketing systems
- Understand SLA management and escalation processes
- Implement knowledge base and self-service solutions
- Apply customer satisfaction measurement and analytics
- Navigate omnichannel support operations
  prerequisites:
- Understanding of customer service principles
- Knowledge of ITIL or service desk frameworks
- Familiarity with support workflows and processes
- Experience with customer communication channels
  outcome: Build comprehensive customer support systems including ticketing, knowledge management, SLA tracking, and customer satisfaction analytics

---

## Core Concepts

### Helpdesk & Ticketing Systems

Centralized platforms for managing customer inquiries, tracking issues through resolution, automating workflows, and maintaining complete interaction history across support channels.

### SLA Management

Service Level Agreement tracking that defines and monitors response and resolution times, escalation procedures, and ensures contractual support commitments are met.

### Knowledge Base Management

Self-service repositories containing articles, FAQs, troubleshooting guides, and documentation that enable customers to resolve issues independently and support agents to find answers quickly.

### Customer Satisfaction Measurement

Systems for collecting feedback through surveys (CSAT, NPS, CES), analyzing sentiment, tracking trends, and identifying improvement opportunities in support quality.

### Omnichannel Support

Unified support experience across multiple channels (email, chat, phone, social media, mobile) with consistent information and seamless transitions between channels.

## Code Examples

### Ticketing System Core

```python
from datetime import datetime, timedelta
from enum import Enum
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
import uuid

class TicketPriority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"
    CRITICAL = "critical"

class TicketStatus(Enum):
    NEW = "new"
    OPEN = "open"
    PENDING = "pending"
    ON_HOLD = "on_hold"
    RESOLVED = "resolved"
    CLOSED = "closed"

class TicketChannel(Enum):
    EMAIL = "email"
    CHAT = "chat"
    PHONE = "phone"
    WEB = "web"
    SOCIAL = "social"
    MOBILE = "mobile"

@dataclass
class SLA:
    sla_id: str
    name: str
    priority: TicketPriority
    first_response_hours: float
    resolution_hours: float
    business_hours_only: bool = True

@dataclass
class Customer:
    customer_id: str
    name: str
    email: str
    phone: Optional[str]
    company: Optional[str]
    tier: str = "standard"  # standard, premium, enterprise
    created_date: datetime = field(default_factory=datetime.now)

@dataclass
class TicketComment:
    comment_id: str
    ticket_id: str
    author: str
    author_type: str  # customer, agent, system
    content: str
    internal: bool = False
    created_at: datetime = field(default_factory=datetime.now)

@dataclass
class Ticket:
    ticket_id: str
    number: int
    customer_id: str
    subject: str
    description: str
    priority: TicketPriority
    status: TicketStatus
    channel: TicketChannel
    category: str
    assigned_to: Optional[str] = None
    sla: Optional[SLA] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    first_response_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    comments: List[TicketComment] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)

    def add_comment(self, author: str, content: str,
                   author_type: str = "agent", internal: bool = False):
        comment = TicketComment(
            comment_id=str(uuid.uuid4()),
            ticket_id=self.ticket_id,
            author=author,
            author_type=author_type,
            content=content,
            internal=internal
        )
        self.comments.append(comment)
        self.updated_at = datetime.now()

        if not self.first_response_at and author_type == "agent":
            self.first_response_at = datetime.now()

    def calculate_first_response_time(self) -> Optional[timedelta]:
        if self.first_response_at:
            return self.first_response_at - self.created_at
        return None

    def calculate_resolution_time(self) -> Optional[timedelta]:
        if self.resolved_at:
            return self.resolved_at - self.created_at
        return None

    def is_sla_breached(self) -> Dict[str, bool]:
        if not self.sla:
            return {'first_response': False, 'resolution': False}

        now = datetime.now()
        first_response_deadline = self.created_at + \
            timedelta(hours=self.sla.first_response_hours)
        resolution_deadline = self.created_at + \
            timedelta(hours=self.sla.resolution_hours)

        return {
            'first_response': not self.first_response_at and
                            now > first_response_deadline,
            'resolution': not self.resolved_at and
                        now > resolution_deadline
        }

class HelpdeskSystem:
    def __init__(self):
        self.tickets: Dict[str, Ticket] = {}
        self.customers: Dict[str, Customer] = {}
        self.slas: Dict[str, SLA] = {}
        self.agents: Dict[str, Dict] = {}
        self.ticket_counter: int = 1000

        # Initialize default SLAs
        self._initialize_default_slas()

    def _initialize_default_slas(self):
        sla_definitions = [
            ('critical', TicketPriority.CRITICAL, 0.5, 4),
            ('urgent', TicketPriority.URGENT, 1, 8),
            ('high', TicketPriority.HIGH, 2, 24),
            ('medium', TicketPriority.MEDIUM, 8, 48),
            ('low', TicketPriority.LOW, 24, 120)
        ]

        for name, priority, first_response, resolution in sla_definitions:
            sla = SLA(
                sla_id=str(uuid.uuid4()),
                name=f"{name.upper()} SLA",
                priority=priority,
                first_response_hours=first_response,
                resolution_hours=resolution
            )
            self.slas[sla.sla_id] = sla

    def create_ticket(self, ticket_data: Dict[str, Any]) -> Ticket:
        # Get or create customer
        customer_id = ticket_data.get('customer_id')
        if not customer_id or customer_id not in self.customers:
            customer = Customer(
                customer_id=str(uuid.uuid4()),
                name=ticket_data['customer_name'],
                email=ticket_data['customer_email'],
                phone=ticket_data.get('customer_phone')
            )
            self.customers[customer.customer_id] = customer
            customer_id = customer.customer_id

        # Determine SLA based on priority and customer tier
        priority = TicketPriority(ticket_data['priority'])
        sla = self._get_sla_for_priority(priority)

        # Create ticket
        ticket = Ticket(
            ticket_id=str(uuid.uuid4()),
            number=self.ticket_counter,
            customer_id=customer_id,
            subject=ticket_data['subject'],
            description=ticket_data['description'],
            priority=priority,
            status=TicketStatus.NEW,
            channel=TicketChannel(ticket_data.get('channel', 'email')),
            category=ticket_data.get('category', 'general'),
            sla=sla,
            tags=ticket_data.get('tags', [])
        )

        self.tickets[ticket.ticket_id] = ticket
        self.ticket_counter += 1

        # Auto-assign based on rules
        self._auto_assign_ticket(ticket)

        return ticket

    def _get_sla_for_priority(self, priority: TicketPriority) -> Optional[SLA]:
        for sla in self.slas.values():
            if sla.priority == priority:
                return sla
        return None

    def _auto_assign_ticket(self, ticket: Ticket):
        """Auto-assign ticket to available agent"""
        # Simplified assignment logic
        # In production, would use round-robin, skills-based, or load balancing
        available_agents = [a for a in self.agents.values()
                          if a.get('status') == 'available']

        if available_agents:
            # Assign to agent with lowest current ticket count
            agent = min(available_agents,
                       key=lambda a: a.get('current_tickets', 0))
            ticket.assigned_to = agent['agent_id']
            ticket.status = TicketStatus.OPEN

    def update_ticket_status(self, ticket_id: str, new_status: TicketStatus):
        ticket = self.tickets.get(ticket_id)
        if not ticket:
            raise ValueError("Ticket not found")

        ticket.status = new_status
        ticket.updated_at = datetime.now()

        if new_status == TicketStatus.RESOLVED:
            ticket.resolved_at = datetime.now()
        elif new_status == TicketStatus.CLOSED:
            ticket.closed_at = datetime.now()

    def escalate_ticket(self, ticket_id: str, reason: str):
        ticket = self.tickets.get(ticket_id)
        if not ticket:
            raise ValueError("Ticket not found")

        # Increase priority
        priority_order = [TicketPriority.LOW, TicketPriority.MEDIUM,
                         TicketPriority.HIGH, TicketPriority.URGENT,
                         TicketPriority.CRITICAL]

        current_idx = priority_order.index(ticket.priority)
        if current_idx < len(priority_order) - 1:
            ticket.priority = priority_order[current_idx + 1]

        # Update SLA
        ticket.sla = self._get_sla_for_priority(ticket.priority)

        # Add escalation comment
        ticket.add_comment(
            "system",
            f"Ticket escalated. Reason: {reason}",
            author_type="system",
            internal=True
        )

    def get_sla_compliance_report(self) -> Dict[str, Any]:
        """Generate SLA compliance metrics"""
        resolved_tickets = [t for t in self.tickets.values()
                          if t.status in [TicketStatus.RESOLVED,
                                        TicketStatus.CLOSED]]

        if not resolved_tickets:
            return {'total_tickets': 0}

        first_response_met = 0
        resolution_met = 0

        for ticket in resolved_tickets:
            if not ticket.sla:
                continue

            frt = ticket.calculate_first_response_time()
            if frt and frt <= timedelta(hours=ticket.sla.first_response_hours):
                first_response_met += 1

            rt = ticket.calculate_resolution_time()
            if rt and rt <= timedelta(hours=ticket.sla.resolution_hours):
                resolution_met += 1

        return {
            'total_tickets': len(resolved_tickets),
            'first_response_sla_met': first_response_met,
            'first_response_compliance': (first_response_met /
                                         len(resolved_tickets) * 100),
            'resolution_sla_met': resolution_met,
            'resolution_compliance': (resolution_met /
                                     len(resolved_tickets) * 100)
        }

    def get_agent_performance(self, agent_id: str,
                            days: int = 30) -> Dict[str, Any]:
        """Get performance metrics for an agent"""
        cutoff = datetime.now() - timedelta(days=days)

        agent_tickets = [t for t in self.tickets.values()
                        if t.assigned_to == agent_id and
                        t.created_at >= cutoff]

        resolved = [t for t in agent_tickets
                   if t.status in [TicketStatus.RESOLVED, TicketStatus.CLOSED]]

        if not agent_tickets:
            return {'agent_id': agent_id, 'tickets_handled': 0}

        total_resolution_time = sum(
            (t.calculate_resolution_time().total_seconds()
             for t in resolved if t.calculate_resolution_time()),
            timedelta()
        ).total_seconds()

        avg_resolution_hours = (total_resolution_time / 3600 / len(resolved)
                               if resolved else 0)

        return {
            'agent_id': agent_id,
            'period_days': days,
            'tickets_handled': len(agent_tickets),
            'tickets_resolved': len(resolved),
            'resolution_rate': (len(resolved) / len(agent_tickets) * 100),
            'avg_resolution_hours': avg_resolution_hours
        }
```

### Knowledge Base System

```python
from typing import List, Dict, Optional
from datetime import datetime
from dataclasses import dataclass, field

@dataclass
class KBArticle:
    article_id: str
    title: str
    content: str
    category: str
    tags: List[str]
    author: str
    status: str = "draft"  # draft, published, archived
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    views: int = 0
    helpful_votes: int = 0
    not_helpful_votes: int = 0
    related_articles: List[str] = field(default_factory=list)

    def calculate_helpfulness_score(self) -> float:
        total_votes = self.helpful_votes + self.not_helpful_votes
        if total_votes == 0:
            return 0
        return (self.helpful_votes / total_votes) * 100

@dataclass
class KBCategory:
    category_id: str
    name: str
    description: str
    parent_category: Optional[str] = None
    order: int = 0

class KnowledgeBase:
    def __init__(self):
        self.articles: Dict[str, KBArticle] = {}
        self.categories: Dict[str, KBCategory] = {}

    def create_article(self, article_data: Dict) -> KBArticle:
        article = KBArticle(
            article_id=str(uuid.uuid4()),
            title=article_data['title'],
            content=article_data['content'],
            category=article_data['category'],
            tags=article_data.get('tags', []),
            author=article_data['author']
        )
        self.articles[article.article_id] = article
        return article

    def search_articles(self, query: str,
                       category: Optional[str] = None) -> List[KBArticle]:
        """Search articles by keyword"""
        results = []
        query_lower = query.lower()

        for article in self.articles.values():
            if article.status != "published":
                continue

            if category and article.category != category:
                continue

            # Simple keyword matching
            if (query_lower in article.title.lower() or
                query_lower in article.content.lower() or
                any(query_lower in tag.lower() for tag in article.tags)):
                results.append(article)

        # Sort by views (popularity)
        results.sort(key=lambda a: a.views, reverse=True)
        return results

    def record_article_view(self, article_id: str):
        article = self.articles.get(article_id)
        if article:
            article.views += 1

    def record_feedback(self, article_id: str, helpful: bool):
        article = self.articles.get(article_id)
        if article:
            if helpful:
                article.helpful_votes += 1
            else:
                article.not_helpful_votes += 1

    def get_popular_articles(self, limit: int = 10) -> List[KBArticle]:
        published = [a for a in self.articles.values()
                    if a.status == "published"]
        published.sort(key=lambda a: a.views, reverse=True)
        return published[:limit]

    def get_low_performing_articles(self, threshold: float = 50) -> List[KBArticle]:
        """Find articles with low helpfulness scores"""
        return [a for a in self.articles.values()
                if a.status == "published" and
                a.calculate_helpfulness_score() < threshold and
                (a.helpful_votes + a.not_helpful_votes) >= 10]
```

### Customer Satisfaction Tracking

```python
class SurveyType(Enum):
    CSAT = "csat"  # Customer Satisfaction Score
    NPS = "nps"    # Net Promoter Score
    CES = "ces"    # Customer Effort Score

@dataclass
class SurveyResponse:
    response_id: str
    customer_id: str
    ticket_id: Optional[str]
    survey_type: SurveyType
    score: int
    comment: Optional[str]
    created_at: datetime = field(default_factory=datetime.now)

class CustomerSatisfactionTracker:
    def __init__(self):
        self.responses: List[SurveyResponse] = []

    def record_response(self, customer_id: str, survey_type: SurveyType,
                       score: int, ticket_id: Optional[str] = None,
                       comment: Optional[str] = None) -> SurveyResponse:
        response = SurveyResponse(
            response_id=str(uuid.uuid4()),
            customer_id=customer_id,
            ticket_id=ticket_id,
            survey_type=survey_type,
            score=score,
            comment=comment
        )
        self.responses.append(response)
        return response

    def calculate_csat(self, days: Optional[int] = None) -> float:
        """Calculate CSAT (% of satisfied customers, typically 4-5 on 5-point scale)"""
        responses = self._filter_by_days(SurveyType.CSAT, days)
        if not responses:
            return 0

        satisfied = len([r for r in responses if r.score >= 4])
        return (satisfied / len(responses)) * 100

    def calculate_nps(self, days: Optional[int] = None) -> float:
        """Calculate NPS (% promoters - % detractors)"""
        responses = self._filter_by_days(SurveyType.NPS, days)
        if not responses:
            return 0

        promoters = len([r for r in responses if r.score >= 9])
        detractors = len([r for r in responses if r.score <= 6])

        return ((promoters - detractors) / len(responses)) * 100

    def calculate_ces(self, days: Optional[int] = None) -> float:
        """Calculate average CES (Customer Effort Score, typically 1-7 scale)"""
        responses = self._filter_by_days(SurveyType.CES, days)
        if not responses:
            return 0

        return sum(r.score for r in responses) / len(responses)

    def _filter_by_days(self, survey_type: SurveyType,
                       days: Optional[int]) -> List[SurveyResponse]:
        responses = [r for r in self.responses if r.survey_type == survey_type]

        if days:
            cutoff = datetime.now() - timedelta(days=days)
            responses = [r for r in responses if r.created_at >= cutoff]

        return responses

    def get_satisfaction_trends(self, survey_type: SurveyType,
                               months: int = 6) -> Dict[str, float]:
        """Get satisfaction trends over time"""
        trends = {}

        for i in range(months):
            start_date = datetime.now() - timedelta(days=(i+1)*30)
            end_date = datetime.now() - timedelta(days=i*30)

            period_responses = [r for r in self.responses
                              if r.survey_type == survey_type and
                              start_date <= r.created_at < end_date]

            if survey_type == SurveyType.CSAT:
                score = (len([r for r in period_responses if r.score >= 4]) /
                        len(period_responses) * 100) if period_responses else 0
            elif survey_type == SurveyType.NPS:
                if period_responses:
                    promoters = len([r for r in period_responses if r.score >= 9])
                    detractors = len([r for r in period_responses if r.score <= 6])
                    score = ((promoters - detractors) / len(period_responses)) * 100
                else:
                    score = 0
            else:  # CES
                score = (sum(r.score for r in period_responses) /
                        len(period_responses)) if period_responses else 0

            month_key = start_date.strftime("%Y-%m")
            trends[month_key] = score

        return trends
```

## Best Practices

### Ticketing System

- Use clear ticket categorization and tagging
- Implement automated ticket routing and assignment
- Set realistic SLAs based on priority and customer tier
- Track all customer interactions in tickets
- Use templates for common responses
- Implement escalation workflows
- Regular ticket queue monitoring

### SLA Management

- Define measurable service level objectives
- Monitor SLA compliance in real-time
- Set up alerts for at-risk tickets
- Regular SLA review and adjustment
- Transparent SLA reporting to customers
- Consider business hours vs 24/7 support
- Build in buffer time for complex issues

### Knowledge Base

- Keep articles current and accurate
- Use clear, simple language
- Include screenshots and videos
- Organize with intuitive categories
- Enable article rating and feedback
- Regularly review and update content
- Track which articles reduce tickets
- Make KB searchable and accessible

### Customer Satisfaction

- Send surveys at appropriate times
- Keep surveys short and focused
- Act on feedback systematically
- Close the loop with customers
- Track trends over time
- Benchmark against industry standards
- Share insights across organization

## Anti-Patterns

### Poor Practices

- Slow response times without acknowledgment
- Inconsistent information across channels
- Agents working from outdated knowledge
- No ticket prioritization or triage
- Ignoring customer feedback
- Lack of self-service options
- Poor internal communication
- Not tracking support metrics

### Common Mistakes

- Over-promising and under-delivering on SLAs
- Treating all tickets equally regardless of impact
- Closing tickets without customer confirmation
- Not documenting solutions in KB
- Insufficient agent training
- Lack of escalation procedures
- Ignoring repeat issues and root causes

## Resources

### Support Platforms

- Zendesk - Popular helpdesk solution
- Freshdesk - Modern support platform
- ServiceNow - Enterprise service management
- Intercom - Conversational support
- Help Scout - Customer-focused helpdesk
- Jira Service Management - ITSM platform

### Frameworks

- ITIL (Information Technology Infrastructure Library)
- HDI Support Center Certification
- Customer Service Institute standards

### Learning Resources

- Zendesk Customer Service Training
- HDI (Help Desk Institute) certification
- ICMI (International Customer Management Institute)
- Customer Experience Professionals Association

---

_Part of the PCL Standard Library - Master customer support technology and deliver exceptional service experiences._
