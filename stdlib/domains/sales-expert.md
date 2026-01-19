# Sales Expert

---
skill_id: sales-expert
name: Sales Expert
category: domains
tags: [sales, crm, pipeline, lead-management, sales-analytics, forecasting, opportunity-management, sales-automation]
version: 1.0.0
author: PCL Standard Library
dependencies: []
complexity: expert
estimated_time: 45 minutes
objectives:
  - Master CRM systems and sales pipeline management
  - Understand lead qualification and opportunity tracking
  - Implement sales analytics and forecasting
  - Apply sales automation and workflow optimization
  - Navigate territory management and quota planning
prerequisites:
  - Understanding of sales processes and methodologies
  - Knowledge of customer relationship management
  - Familiarity with sales metrics and KPIs
  - Experience with sales tools and automation
outcome: Build comprehensive sales technology solutions including CRM implementation, pipeline management, sales forecasting, and performance analytics
---

## Core Concepts

### Customer Relationship Management (CRM)
Central platform for managing customer interactions, tracking sales activities, maintaining contact databases, and coordinating sales team efforts across the customer lifecycle.

### Sales Pipeline Management
Systematic approach to tracking opportunities through sales stages, managing deal progression, identifying bottlenecks, and optimizing conversion rates at each stage.

### Lead Management & Qualification
Process of capturing, scoring, routing, and nurturing leads using frameworks like BANT (Budget, Authority, Need, Timeline) or MEDDIC to identify sales-ready prospects.

### Sales Forecasting
Predictive analytics using historical data, pipeline health, and probability-weighted opportunities to project future revenue and inform business planning decisions.

### Sales Automation
Technology-driven workflows that automate repetitive tasks like data entry, follow-ups, proposal generation, and reporting to increase seller productivity.

## Code Examples

### CRM Core System

```python
from datetime import datetime, date, timedelta
from enum import Enum
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
from decimal import Decimal
import uuid

class LeadSource(Enum):
    WEB = "web"
    REFERRAL = "referral"
    COLD_CALL = "cold_call"
    TRADE_SHOW = "trade_show"
    PARTNER = "partner"
    MARKETING = "marketing"

class LeadQualification(Enum):
    UNQUALIFIED = "unqualified"
    WORKING = "working"
    NURTURE = "nurture"
    QUALIFIED = "qualified"
    DISQUALIFIED = "disqualified"

class OpportunityStage(Enum):
    PROSPECTING = "prospecting"
    QUALIFICATION = "qualification"
    NEEDS_ANALYSIS = "needs_analysis"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"

@dataclass
class Account:
    account_id: str
    name: str
    industry: str
    employees: Optional[int]
    annual_revenue: Optional[Decimal]
    website: Optional[str]
    billing_address: Dict[str, str]
    owner_id: str
    account_type: str = "prospect"  # prospect, customer, partner
    created_date: datetime = field(default_factory=datetime.now)

@dataclass
class Contact:
    contact_id: str
    account_id: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str]
    title: Optional[str]
    role: str  # decision_maker, influencer, user, blocker
    owner_id: str

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

@dataclass
class Lead:
    lead_id: str
    first_name: str
    last_name: str
    email: str
    company: str
    phone: Optional[str]
    source: LeadSource
    status: LeadQualification
    score: int = 0
    owner_id: Optional[str] = None
    created_date: datetime = field(default_factory=datetime.now)
    last_activity: Optional[datetime] = None

    def convert_to_opportunity(self, account_id: str) -> Dict[str, str]:
        """Convert lead to account, contact, and opportunity"""
        return {
            'account_id': account_id,
            'contact_id': str(uuid.uuid4()),
            'opportunity_id': str(uuid.uuid4())
        }

@dataclass
class Opportunity:
    opportunity_id: str
    name: str
    account_id: str
    amount: Decimal
    close_date: date
    stage: OpportunityStage
    probability: int  # 0-100
    owner_id: str
    lead_source: LeadSource
    next_step: str = ""
    competitors: List[str] = field(default_factory=list)
    created_date: datetime = field(default_factory=datetime.now)
    closed_date: Optional[datetime] = None

    @property
    def weighted_amount(self) -> Decimal:
        """Amount weighted by probability for forecasting"""
        return self.amount * Decimal(self.probability / 100)

    @property
    def age_days(self) -> int:
        """Days since opportunity creation"""
        return (datetime.now() - self.created_date).days

    def is_at_risk(self, threshold_days: int = 90) -> bool:
        """Check if opportunity is at risk based on age"""
        return self.age_days > threshold_days and \
               self.stage not in [OpportunityStage.CLOSED_WON,
                                 OpportunityStage.CLOSED_LOST]

@dataclass
class Activity:
    activity_id: str
    activity_type: str  # call, email, meeting, demo, proposal
    subject: str
    related_to: Dict[str, str]  # {type: 'opportunity', id: 'opp_123'}
    owner_id: str
    due_date: Optional[datetime] = None
    completed: bool = False
    completed_date: Optional[datetime] = None
    notes: str = ""

class SalesCRM:
    def __init__(self):
        self.accounts: Dict[str, Account] = {}
        self.contacts: Dict[str, Contact] = {}
        self.leads: Dict[str, Lead] = {}
        self.opportunities: Dict[str, Opportunity] = {}
        self.activities: Dict[str, Activity] = {}

        # Stage probability defaults
        self.stage_probabilities = {
            OpportunityStage.PROSPECTING: 10,
            OpportunityStage.QUALIFICATION: 20,
            OpportunityStage.NEEDS_ANALYSIS: 40,
            OpportunityStage.PROPOSAL: 60,
            OpportunityStage.NEGOTIATION: 80,
            OpportunityStage.CLOSED_WON: 100,
            OpportunityStage.CLOSED_LOST: 0
        }

    def create_lead(self, lead_data: Dict[str, Any]) -> Lead:
        lead = Lead(
            lead_id=lead_data.get('lead_id', str(uuid.uuid4())),
            first_name=lead_data['first_name'],
            last_name=lead_data['last_name'],
            email=lead_data['email'],
            company=lead_data['company'],
            phone=lead_data.get('phone'),
            source=LeadSource(lead_data['source']),
            status=LeadQualification.UNQUALIFIED,
            owner_id=lead_data.get('owner_id')
        )
        self.leads[lead.lead_id] = lead
        return lead

    def create_opportunity(self, opp_data: Dict[str, Any]) -> Opportunity:
        opportunity = Opportunity(
            opportunity_id=opp_data.get('opportunity_id', str(uuid.uuid4())),
            name=opp_data['name'],
            account_id=opp_data['account_id'],
            amount=Decimal(str(opp_data['amount'])),
            close_date=opp_data['close_date'],
            stage=OpportunityStage.PROSPECTING,
            probability=self.stage_probabilities[OpportunityStage.PROSPECTING],
            owner_id=opp_data['owner_id'],
            lead_source=LeadSource(opp_data.get('source', 'web'))
        )
        self.opportunities[opportunity.opportunity_id] = opportunity
        return opportunity

    def update_opportunity_stage(self, opp_id: str,
                                 new_stage: OpportunityStage):
        opportunity = self.opportunities.get(opp_id)
        if not opportunity:
            raise ValueError("Opportunity not found")

        opportunity.stage = new_stage
        opportunity.probability = self.stage_probabilities[new_stage]

        if new_stage in [OpportunityStage.CLOSED_WON,
                        OpportunityStage.CLOSED_LOST]:
            opportunity.closed_date = datetime.now()

    def get_pipeline(self, owner_id: Optional[str] = None) -> Dict[str, Any]:
        """Get sales pipeline view"""
        opportunities = list(self.opportunities.values())

        if owner_id:
            opportunities = [o for o in opportunities if o.owner_id == owner_id]

        # Exclude closed opportunities
        open_opps = [o for o in opportunities
                    if o.stage not in [OpportunityStage.CLOSED_WON,
                                      OpportunityStage.CLOSED_LOST]]

        pipeline_by_stage = {}
        for stage in OpportunityStage:
            stage_opps = [o for o in open_opps if o.stage == stage]
            pipeline_by_stage[stage.value] = {
                'count': len(stage_opps),
                'total_value': sum(o.amount for o in stage_opps),
                'weighted_value': sum(o.weighted_amount for o in stage_opps)
            }

        return {
            'total_opportunities': len(open_opps),
            'total_value': sum(o.amount for o in open_opps),
            'weighted_value': sum(o.weighted_amount for o in open_opps),
            'by_stage': pipeline_by_stage
        }

    def create_activity(self, activity_data: Dict[str, Any]) -> Activity:
        activity = Activity(
            activity_id=str(uuid.uuid4()),
            activity_type=activity_data['type'],
            subject=activity_data['subject'],
            related_to=activity_data['related_to'],
            owner_id=activity_data['owner_id'],
            due_date=activity_data.get('due_date'),
            notes=activity_data.get('notes', '')
        )
        self.activities[activity.activity_id] = activity
        return activity

    def get_sales_rep_performance(self, owner_id: str,
                                  period_days: int = 30) -> Dict[str, Any]:
        """Get performance metrics for a sales rep"""
        cutoff = datetime.now() - timedelta(days=period_days)

        # Get opportunities
        rep_opps = [o for o in self.opportunities.values()
                   if o.owner_id == owner_id]

        won_opps = [o for o in rep_opps
                   if o.stage == OpportunityStage.CLOSED_WON and
                   o.closed_date and o.closed_date >= cutoff]

        lost_opps = [o for o in rep_opps
                    if o.stage == OpportunityStage.CLOSED_LOST and
                    o.closed_date and o.closed_date >= cutoff]

        # Get activities
        rep_activities = [a for a in self.activities.values()
                         if a.owner_id == owner_id and
                         a.completed_date and a.completed_date >= cutoff]

        return {
            'owner_id': owner_id,
            'period_days': period_days,
            'opportunities_won': len(won_opps),
            'revenue_closed': sum(o.amount for o in won_opps),
            'win_rate': len(won_opps) / (len(won_opps) + len(lost_opps))
                       if (len(won_opps) + len(lost_opps)) > 0 else 0,
            'activities_completed': len(rep_activities),
            'avg_deal_size': sum(o.amount for o in won_opps) / len(won_opps)
                           if won_opps else Decimal(0)
        }
```

### Sales Forecasting Engine

```python
from typing import List, Dict, Tuple
from datetime import date, timedelta
from decimal import Decimal

class ForecastCategory(Enum):
    PIPELINE = "pipeline"
    BEST_CASE = "best_case"
    COMMIT = "commit"
    CLOSED = "closed"

@dataclass
class ForecastSubmission:
    rep_id: str
    period: str  # YYYY-MM or YYYY-Q1
    category: ForecastCategory
    amount: Decimal
    submitted_date: datetime
    opportunities: List[str]  # opportunity IDs

class SalesForecastEngine:
    def __init__(self, crm: SalesCRM):
        self.crm = crm
        self.forecasts: Dict[str, List[ForecastSubmission]] = {}
        self.quotas: Dict[str, Decimal] = {}  # rep_id -> quota amount

    def calculate_weighted_forecast(self, rep_id: Optional[str] = None,
                                   close_date_end: Optional[date] = None) -> Decimal:
        """Calculate probability-weighted forecast"""
        opportunities = list(self.crm.opportunities.values())

        if rep_id:
            opportunities = [o for o in opportunities if o.owner_id == rep_id]

        if close_date_end:
            opportunities = [o for o in opportunities
                           if o.close_date <= close_date_end]

        # Only open opportunities
        opportunities = [o for o in opportunities
                        if o.stage not in [OpportunityStage.CLOSED_WON,
                                          OpportunityStage.CLOSED_LOST]]

        return sum(o.weighted_amount for o in opportunities)

    def calculate_commit_forecast(self, rep_id: str,
                                 close_date_end: date) -> Decimal:
        """Calculate forecast based on high-probability opportunities"""
        opportunities = [o for o in self.crm.opportunities.values()
                        if o.owner_id == rep_id and
                        o.close_date <= close_date_end and
                        o.probability >= 70 and
                        o.stage not in [OpportunityStage.CLOSED_WON,
                                       OpportunityStage.CLOSED_LOST]]

        return sum(o.amount for o in opportunities)

    def calculate_historical_accuracy(self, rep_id: str,
                                     periods: int = 3) -> Dict[str, float]:
        """Calculate forecast accuracy based on historical submissions"""
        # This would compare submitted forecasts to actual results
        # Simplified implementation
        return {
            'accuracy_rate': 0.85,  # 85% accurate
            'optimism_bias': 1.1,   # Tends to forecast 10% high
            'periods_analyzed': periods
        }

    def generate_forecast_report(self, period_end: date) -> Dict[str, Any]:
        """Generate comprehensive forecast report"""
        # Get all opportunities closing in period
        period_opps = [o for o in self.crm.opportunities.values()
                      if o.close_date <= period_end]

        # Group by owner
        by_rep = {}
        for opp in period_opps:
            if opp.owner_id not in by_rep:
                by_rep[opp.owner_id] = []
            by_rep[opp.owner_id].append(opp)

        rep_forecasts = {}
        total_pipeline = Decimal(0)
        total_weighted = Decimal(0)
        total_commit = Decimal(0)

        for rep_id, opps in by_rep.items():
            pipeline = sum(o.amount for o in opps
                         if o.stage not in [OpportunityStage.CLOSED_WON,
                                           OpportunityStage.CLOSED_LOST])
            weighted = sum(o.weighted_amount for o in opps
                         if o.stage not in [OpportunityStage.CLOSED_WON,
                                           OpportunityStage.CLOSED_LOST])
            commit = sum(o.amount for o in opps
                       if o.probability >= 70 and
                       o.stage not in [OpportunityStage.CLOSED_WON,
                                      OpportunityStage.CLOSED_LOST])

            quota = self.quotas.get(rep_id, Decimal(0))

            rep_forecasts[rep_id] = {
                'pipeline': pipeline,
                'weighted': weighted,
                'commit': commit,
                'quota': quota,
                'quota_attainment': (commit / quota * 100) if quota > 0 else 0
            }

            total_pipeline += pipeline
            total_weighted += weighted
            total_commit += commit

        return {
            'period_end': period_end.isoformat(),
            'total_pipeline': total_pipeline,
            'total_weighted': total_weighted,
            'total_commit': total_commit,
            'by_rep': rep_forecasts
        }

    def identify_risks(self, rep_id: Optional[str] = None) -> List[Dict]:
        """Identify at-risk opportunities"""
        risks = []
        opportunities = list(self.crm.opportunities.values())

        if rep_id:
            opportunities = [o for o in opportunities if o.owner_id == rep_id]

        for opp in opportunities:
            if opp.stage in [OpportunityStage.CLOSED_WON,
                           OpportunityStage.CLOSED_LOST]:
                continue

            risk_factors = []

            # Check age
            if opp.is_at_risk():
                risk_factors.append("Opportunity age exceeds threshold")

            # Check close date
            if opp.close_date < date.today():
                risk_factors.append("Close date passed")

            # Check for recent activity
            recent_activities = [a for a in self.crm.activities.values()
                               if a.related_to.get('id') == opp.opportunity_id and
                               a.completed and
                               a.completed_date and
                               a.completed_date >= datetime.now() - timedelta(days=14)]

            if not recent_activities:
                risk_factors.append("No activity in past 14 days")

            if risk_factors:
                risks.append({
                    'opportunity_id': opp.opportunity_id,
                    'opportunity_name': opp.name,
                    'amount': opp.amount,
                    'close_date': opp.close_date,
                    'stage': opp.stage.value,
                    'risk_factors': risk_factors
                })

        return risks
```

### Sales Analytics & Reporting

```python
from typing import Dict, List, Any
from datetime import datetime, timedelta, date
from collections import defaultdict

class SalesAnalytics:
    def __init__(self, crm: SalesCRM):
        self.crm = crm

    def calculate_win_rate(self, rep_id: Optional[str] = None,
                          days: int = 90) -> float:
        """Calculate win rate for closed opportunities"""
        cutoff = datetime.now() - timedelta(days=days)
        opportunities = list(self.crm.opportunities.values())

        if rep_id:
            opportunities = [o for o in opportunities if o.owner_id == rep_id]

        closed = [o for o in opportunities
                 if o.closed_date and o.closed_date >= cutoff and
                 o.stage in [OpportunityStage.CLOSED_WON,
                           OpportunityStage.CLOSED_LOST]]

        won = [o for o in closed if o.stage == OpportunityStage.CLOSED_WON]

        return (len(won) / len(closed) * 100) if closed else 0

    def calculate_avg_sales_cycle(self, rep_id: Optional[str] = None) -> float:
        """Calculate average days to close won deals"""
        opportunities = [o for o in self.crm.opportunities.values()
                        if o.stage == OpportunityStage.CLOSED_WON and
                        o.closed_date]

        if rep_id:
            opportunities = [o for o in opportunities if o.owner_id == rep_id]

        if not opportunities:
            return 0

        cycles = [(o.closed_date - o.created_date).days
                 for o in opportunities]

        return sum(cycles) / len(cycles)

    def analyze_pipeline_health(self) -> Dict[str, Any]:
        """Analyze overall pipeline health metrics"""
        open_opps = [o for o in self.crm.opportunities.values()
                    if o.stage not in [OpportunityStage.CLOSED_WON,
                                      OpportunityStage.CLOSED_LOST]]

        # Pipeline coverage ratio (pipeline value / quota)
        total_pipeline = sum(o.amount for o in open_opps)
        total_quota = sum(self.crm.quotas.values()) if hasattr(self.crm, 'quotas') else 0

        # Stage distribution
        stage_counts = defaultdict(int)
        for opp in open_opps:
            stage_counts[opp.stage.value] += 1

        # Age distribution
        age_buckets = {'0-30': 0, '31-60': 0, '61-90': 0, '90+': 0}
        for opp in open_opps:
            age = opp.age_days
            if age <= 30:
                age_buckets['0-30'] += 1
            elif age <= 60:
                age_buckets['31-60'] += 1
            elif age <= 90:
                age_buckets['61-90'] += 1
            else:
                age_buckets['90+'] += 1

        return {
            'total_opportunities': len(open_opps),
            'total_value': total_pipeline,
            'average_deal_size': total_pipeline / len(open_opps) if open_opps else 0,
            'pipeline_coverage': (total_pipeline / total_quota) if total_quota > 0 else 0,
            'stage_distribution': dict(stage_counts),
            'age_distribution': age_buckets,
            'at_risk_count': len([o for o in open_opps if o.is_at_risk()])
        }

    def lead_conversion_analysis(self) -> Dict[str, Any]:
        """Analyze lead-to-opportunity conversion"""
        leads = list(self.crm.leads.values())
        qualified = [l for l in leads
                    if l.status == LeadQualification.QUALIFIED]

        # Would need to track conversions in production
        conversion_rate = len(qualified) / len(leads) if leads else 0

        by_source = defaultdict(lambda: {'total': 0, 'qualified': 0})
        for lead in leads:
            by_source[lead.source.value]['total'] += 1
            if lead.status == LeadQualification.QUALIFIED:
                by_source[lead.source.value]['qualified'] += 1

        source_conversion = {
            source: {
                'total': data['total'],
                'qualified': data['qualified'],
                'conversion_rate': (data['qualified'] / data['total'] * 100)
                                 if data['total'] > 0 else 0
            }
            for source, data in by_source.items()
        }

        return {
            'total_leads': len(leads),
            'qualified_leads': len(qualified),
            'overall_conversion_rate': conversion_rate * 100,
            'by_source': source_conversion
        }
```

## Best Practices

### CRM Management
- Maintain data quality with validation rules
- Implement standardized naming conventions
- Use automation to reduce manual data entry
- Regular data cleanup and deduplication
- Comprehensive activity tracking
- Clear opportunity stage definitions
- Document sales processes in the system

### Pipeline Management
- Define clear stage exit criteria
- Regular pipeline reviews and inspection
- Monitor pipeline coverage ratio (3-4x quota)
- Track velocity through each stage
- Identify and address bottlenecks
- Move or close stale opportunities
- Balance pipeline across stages

### Lead Management
- Implement lead scoring and routing
- Define clear qualification criteria
- Fast response times for inbound leads
- Nurture programs for unqualified leads
- Track lead source effectiveness
- Regular lead cleanup and archiving

### Sales Forecasting
- Use multiple forecast categories
- Weekly forecast updates and reviews
- Track forecast accuracy over time
- Commit to realistic numbers
- Include opportunity-level detail
- Monitor deal slippage patterns
- Adjust for historical accuracy

## Anti-Patterns

### Poor Practices
- Inaccurate or outdated CRM data
- Lack of consistent data entry standards
- Over-customization of CRM systems
- Ignoring data privacy and security
- Manual processes that should be automated
- No defined sales process
- Optimistic forecasting without accountability
- Ignoring pipeline coverage metrics

### Common Mistakes
- Not updating opportunities regularly
- Keeping dead deals in pipeline
- Forecasting deals not in CRM
- Lack of activity documentation
- Poor opportunity hygiene
- No sales playbooks or methodologies
- Inadequate sales training on tools
- Not leveraging CRM analytics

## Resources

### CRM Platforms
- Salesforce - Leading enterprise CRM
- HubSpot CRM - All-in-one platform
- Microsoft Dynamics 365 - Enterprise sales
- Pipedrive - Pipeline-focused CRM
- Zoho CRM - Affordable solution
- Close - Sales engagement platform

### Sales Methodologies
- MEDDIC - Enterprise sales qualification
- BANT - Budget, Authority, Need, Timeline
- Challenger Sale - Teaching approach
- SPIN Selling - Question-based methodology
- Solution Selling - Problem-solving approach

### Industry Resources
- Sales Hacker community
- LinkedIn Sales Solutions blog
- Salesforce Sales Cloud resources
- Gartner CRM research
- AA-ISP (Sales Development)

### Learning Platforms
- Salesforce Trailhead
- HubSpot Academy Sales Certification
- LinkedIn Learning - Sales courses
- Sales Enablement Society

---

*Part of the PCL Standard Library - Master sales technology and drive revenue growth through effective CRM and pipeline management.*
