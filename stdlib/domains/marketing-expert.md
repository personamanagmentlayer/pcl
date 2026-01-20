# Marketing Expert

---

skill_id: marketing-expert
name: Marketing Expert
allowed-tools:

- Read
- Write
- WebSearch
  category: domains
  tags: [marketing, marketing-automation, campaigns, analytics, seo, content-marketing, email-marketing, digital-marketing]
  version: 1.0.0
  author: PCL Standard Library
  dependencies: []
  complexity: expert
  estimated_time: 45 minutes
  objectives:
- Master marketing automation platforms and workflows
- Understand campaign management and optimization
- Implement marketing analytics and attribution
- Apply SEO and content marketing strategies
- Navigate multi-channel marketing orchestration
  prerequisites:
- Understanding of marketing principles and customer journey
- Knowledge of digital marketing channels
- Familiarity with web analytics and tracking
- Experience with CRM systems
  outcome: Build comprehensive marketing technology solutions including automation workflows, campaign management, analytics tracking, and multi-channel orchestration

---

## Core Concepts

### Marketing Automation

Platforms that automate repetitive marketing tasks, nurture leads through personalized workflows, score prospects, and integrate with CRM systems for unified customer engagement.

### Campaign Management

End-to-end management of marketing campaigns across channels including planning, execution, tracking, optimization, and ROI measurement with A/B testing capabilities.

### Marketing Analytics & Attribution

Data analysis to understand campaign performance, customer behavior, conversion paths, and attribute revenue to specific marketing touchpoints across the customer journey.

### SEO & Content Marketing

Search engine optimization strategies combined with content creation, distribution, and performance tracking to drive organic traffic and engagement.

### Multi-Channel Orchestration

Coordinated customer experiences across email, social media, paid advertising, mobile, and web with consistent messaging and timing optimization.

## Code Examples

### Marketing Automation System

```python
from datetime import datetime, timedelta
from enum import Enum
from typing import List, Optional, Dict, Any, Callable
from dataclasses import dataclass, field
import uuid

class LeadStatus(Enum):
    NEW = "new"
    ENGAGED = "engaged"
    MQL = "marketing_qualified"  # Marketing Qualified Lead
    SQL = "sales_qualified"      # Sales Qualified Lead
    CUSTOMER = "customer"
    CHURNED = "churned"

class CampaignType(Enum):
    EMAIL = "email"
    SOCIAL = "social"
    PAID_SEARCH = "paid_search"
    DISPLAY = "display"
    CONTENT = "content"
    WEBINAR = "webinar"

@dataclass
class Lead:
    lead_id: str
    email: str
    first_name: str
    last_name: str
    company: Optional[str]
    status: LeadStatus
    score: int = 0
    source: str = "unknown"
    created_at: datetime = field(default_factory=datetime.now)
    tags: List[str] = field(default_factory=list)
    custom_fields: Dict[str, Any] = field(default_factory=dict)

    def add_score(self, points: int, reason: str = ""):
        self.score += points
        if self.score >= 100 and self.status == LeadStatus.ENGAGED:
            self.status = LeadStatus.MQL

@dataclass
class WorkflowStep:
    step_id: str
    step_type: str  # email, wait, condition, webhook, score
    name: str
    config: Dict[str, Any]
    next_step: Optional[str] = None
    condition: Optional[Callable] = None

@dataclass
class MarketingWorkflow:
    workflow_id: str
    name: str
    trigger: str  # form_submit, page_visit, tag_added, etc.
    steps: List[WorkflowStep]
    active: bool = True
    enrollment_count: int = 0

@dataclass
class Campaign:
    campaign_id: str
    name: str
    campaign_type: CampaignType
    start_date: datetime
    end_date: Optional[datetime]
    budget: float
    target_audience: Dict[str, Any]
    content: Dict[str, Any]
    metrics: Dict[str, int] = field(default_factory=dict)

    def track_metric(self, metric_name: str, value: int = 1):
        if metric_name not in self.metrics:
            self.metrics[metric_name] = 0
        self.metrics[metric_name] += value

    def calculate_roi(self, revenue: float) -> float:
        if self.budget == 0:
            return 0
        return ((revenue - self.budget) / self.budget) * 100

class MarketingAutomationPlatform:
    def __init__(self):
        self.leads: Dict[str, Lead] = {}
        self.workflows: Dict[str, MarketingWorkflow] = {}
        self.campaigns: Dict[str, Campaign] = {}
        self.workflow_enrollments: Dict[str, List[str]] = {}  # workflow_id -> lead_ids

        # Scoring rules
        self.scoring_rules = {
            'email_open': 5,
            'email_click': 10,
            'page_visit': 3,
            'form_submit': 25,
            'webinar_attend': 30,
            'pricing_page_visit': 20,
            'demo_request': 50
        }

    def create_lead(self, lead_data: Dict[str, Any]) -> Lead:
        lead = Lead(
            lead_id=lead_data.get('lead_id', str(uuid.uuid4())),
            email=lead_data['email'],
            first_name=lead_data['first_name'],
            last_name=lead_data['last_name'],
            company=lead_data.get('company'),
            status=LeadStatus.NEW,
            source=lead_data.get('source', 'unknown'),
            tags=lead_data.get('tags', [])
        )
        self.leads[lead.lead_id] = lead
        return lead

    def track_activity(self, lead_id: str, activity: str,
                      metadata: Dict = None):
        lead = self.leads.get(lead_id)
        if not lead:
            return

        # Apply scoring
        if activity in self.scoring_rules:
            points = self.scoring_rules[activity]
            lead.add_score(points, reason=activity)

        # Check for workflow triggers
        self._check_workflow_triggers(lead, activity, metadata)

    def create_workflow(self, workflow_data: Dict) -> MarketingWorkflow:
        steps = []
        for step_data in workflow_data['steps']:
            step = WorkflowStep(
                step_id=step_data.get('step_id', str(uuid.uuid4())),
                step_type=step_data['type'],
                name=step_data['name'],
                config=step_data['config'],
                next_step=step_data.get('next_step')
            )
            steps.append(step)

        workflow = MarketingWorkflow(
            workflow_id=workflow_data.get('workflow_id', str(uuid.uuid4())),
            name=workflow_data['name'],
            trigger=workflow_data['trigger'],
            steps=steps
        )

        self.workflows[workflow.workflow_id] = workflow
        return workflow

    def enroll_in_workflow(self, lead_id: str, workflow_id: str):
        workflow = self.workflows.get(workflow_id)
        if not workflow or not workflow.active:
            return

        if workflow_id not in self.workflow_enrollments:
            self.workflow_enrollments[workflow_id] = []

        if lead_id not in self.workflow_enrollments[workflow_id]:
            self.workflow_enrollments[workflow_id].append(lead_id)
            workflow.enrollment_count += 1
            self._execute_workflow(lead_id, workflow)

    def _execute_workflow(self, lead_id: str, workflow: MarketingWorkflow):
        """Execute workflow steps for a lead"""
        lead = self.leads[lead_id]

        for step in workflow.steps:
            if step.step_type == "email":
                self._send_email(lead, step.config)
            elif step.step_type == "wait":
                # In production, this would schedule the next step
                wait_duration = step.config.get('duration', 1)
                pass
            elif step.step_type == "condition":
                # Evaluate condition and branch
                if step.condition and not step.condition(lead):
                    break
            elif step.step_type == "score":
                points = step.config.get('points', 0)
                lead.add_score(points, reason=step.name)
            elif step.step_type == "tag":
                tag = step.config.get('tag')
                if tag and tag not in lead.tags:
                    lead.tags.append(tag)

    def _send_email(self, lead: Lead, config: Dict):
        """Send marketing email (placeholder for actual email service)"""
        template = config.get('template')
        subject = config.get('subject')
        # In production, integrate with email service provider
        print(f"Sending email to {lead.email}: {subject}")

    def _check_workflow_triggers(self, lead: Lead, activity: str,
                                 metadata: Dict = None):
        """Check if activity should trigger any workflows"""
        for workflow in self.workflows.values():
            if workflow.active and workflow.trigger == activity:
                self.enroll_in_workflow(lead.lead_id, workflow.workflow_id)

    def segment_leads(self, criteria: Dict[str, Any]) -> List[Lead]:
        """Segment leads based on criteria"""
        results = list(self.leads.values())

        if 'status' in criteria:
            results = [l for l in results if l.status == criteria['status']]

        if 'min_score' in criteria:
            results = [l for l in results if l.score >= criteria['min_score']]

        if 'tags' in criteria:
            required_tags = set(criteria['tags'])
            results = [l for l in results
                      if required_tags.issubset(set(l.tags))]

        if 'source' in criteria:
            results = [l for l in results if l.source == criteria['source']]

        return results
```

### Campaign Management & Analytics

```python
from collections import defaultdict
from typing import List, Dict, Tuple

@dataclass
class CampaignMetrics:
    impressions: int = 0
    clicks: int = 0
    conversions: int = 0
    spend: float = 0
    revenue: float = 0

    @property
    def ctr(self) -> float:
        """Click-through rate"""
        return (self.clicks / self.impressions * 100) if self.impressions > 0 else 0

    @property
    def conversion_rate(self) -> float:
        return (self.conversions / self.clicks * 100) if self.clicks > 0 else 0

    @property
    def cpc(self) -> float:
        """Cost per click"""
        return self.spend / self.clicks if self.clicks > 0 else 0

    @property
    def cpa(self) -> float:
        """Cost per acquisition"""
        return self.spend / self.conversions if self.conversions > 0 else 0

    @property
    def roas(self) -> float:
        """Return on ad spend"""
        return (self.revenue / self.spend) if self.spend > 0 else 0

@dataclass
class TouchPoint:
    timestamp: datetime
    channel: str
    campaign_id: str
    lead_id: str
    interaction_type: str  # impression, click, view, etc.
    value: float = 0

class AttributionModel:
    @staticmethod
    def first_touch(touchpoints: List[TouchPoint]) -> Dict[str, float]:
        """First touch attribution"""
        if not touchpoints:
            return {}

        first = min(touchpoints, key=lambda t: t.timestamp)
        return {first.campaign_id: 100.0}

    @staticmethod
    def last_touch(touchpoints: List[TouchPoint]) -> Dict[str, float]:
        """Last touch attribution"""
        if not touchpoints:
            return {}

        last = max(touchpoints, key=lambda t: t.timestamp)
        return {last.campaign_id: 100.0}

    @staticmethod
    def linear(touchpoints: List[TouchPoint]) -> Dict[str, float]:
        """Linear attribution - equal credit to all touches"""
        if not touchpoints:
            return {}

        credit_per_touch = 100.0 / len(touchpoints)
        attribution = defaultdict(float)

        for touch in touchpoints:
            attribution[touch.campaign_id] += credit_per_touch

        return dict(attribution)

    @staticmethod
    def time_decay(touchpoints: List[TouchPoint],
                   half_life_days: int = 7) -> Dict[str, float]:
        """Time decay attribution - recent touches get more credit"""
        if not touchpoints:
            return {}

        conversion_time = max(touchpoints, key=lambda t: t.timestamp).timestamp
        attribution = defaultdict(float)
        total_weight = 0

        for touch in touchpoints:
            days_before_conversion = (conversion_time - touch.timestamp).days
            weight = 0.5 ** (days_before_conversion / half_life_days)
            attribution[touch.campaign_id] += weight
            total_weight += weight

        # Normalize to 100%
        if total_weight > 0:
            attribution = {k: (v / total_weight * 100)
                         for k, v in attribution.items()}

        return dict(attribution)

class MarketingAnalytics:
    def __init__(self):
        self.campaigns: Dict[str, Campaign] = {}
        self.touchpoints: Dict[str, List[TouchPoint]] = {}  # lead_id -> touchpoints
        self.conversions: Dict[str, Dict] = {}  # lead_id -> conversion data

    def track_touchpoint(self, lead_id: str, campaign_id: str,
                        channel: str, interaction_type: str):
        touchpoint = TouchPoint(
            timestamp=datetime.now(),
            channel=channel,
            campaign_id=campaign_id,
            lead_id=lead_id,
            interaction_type=interaction_type
        )

        if lead_id not in self.touchpoints:
            self.touchpoints[lead_id] = []
        self.touchpoints[lead_id].append(touchpoint)

    def track_conversion(self, lead_id: str, value: float,
                        conversion_type: str = "sale"):
        self.conversions[lead_id] = {
            'timestamp': datetime.now(),
            'value': value,
            'type': conversion_type
        }

    def calculate_attribution(self, model: str = "linear") -> Dict[str, float]:
        """Calculate attribution across all conversions"""
        campaign_revenue = defaultdict(float)

        for lead_id, conversion in self.conversions.items():
            touchpoints = self.touchpoints.get(lead_id, [])
            if not touchpoints:
                continue

            # Get attribution for this conversion
            if model == "first_touch":
                attribution = AttributionModel.first_touch(touchpoints)
            elif model == "last_touch":
                attribution = AttributionModel.last_touch(touchpoints)
            elif model == "linear":
                attribution = AttributionModel.linear(touchpoints)
            elif model == "time_decay":
                attribution = AttributionModel.time_decay(touchpoints)
            else:
                attribution = AttributionModel.linear(touchpoints)

            # Allocate revenue based on attribution
            conversion_value = conversion['value']
            for campaign_id, credit_pct in attribution.items():
                campaign_revenue[campaign_id] += (conversion_value * credit_pct / 100)

        return dict(campaign_revenue)

    def get_campaign_performance(self, campaign_id: str) -> Dict[str, Any]:
        campaign = self.campaigns.get(campaign_id)
        if not campaign:
            return {}

        # Calculate attributed revenue
        attributed_revenue = self.calculate_attribution("linear")
        revenue = attributed_revenue.get(campaign_id, 0)

        metrics = campaign.metrics

        return {
            'campaign_id': campaign_id,
            'campaign_name': campaign.name,
            'impressions': metrics.get('impressions', 0),
            'clicks': metrics.get('clicks', 0),
            'conversions': metrics.get('conversions', 0),
            'spend': campaign.budget,
            'revenue': revenue,
            'roi': campaign.calculate_roi(revenue),
            'ctr': (metrics.get('clicks', 0) / metrics.get('impressions', 1)) * 100,
            'conversion_rate': (metrics.get('conversions', 0) /
                              metrics.get('clicks', 1)) * 100
        }
```

### SEO & Content Marketing

```python
@dataclass
class ContentPiece:
    content_id: str
    title: str
    url: str
    content_type: str  # blog, whitepaper, video, infographic
    publish_date: datetime
    author: str
    keywords: List[str]
    target_persona: str
    funnel_stage: str  # awareness, consideration, decision
    metrics: Dict[str, int] = field(default_factory=dict)

    def track_engagement(self, metric: str, value: int = 1):
        if metric not in self.metrics:
            self.metrics[metric] = 0
        self.metrics[metric] += value

@dataclass
class SEOKeyword:
    keyword: str
    search_volume: int
    difficulty: int  # 0-100
    current_rank: Optional[int] = None
    target_rank: int = 10
    content_ids: List[str] = field(default_factory=list)

class ContentMarketingEngine:
    def __init__(self):
        self.content: Dict[str, ContentPiece] = {}
        self.keywords: Dict[str, SEOKeyword] = {}

    def create_content(self, content_data: Dict) -> ContentPiece:
        content = ContentPiece(
            content_id=content_data.get('content_id', str(uuid.uuid4())),
            title=content_data['title'],
            url=content_data['url'],
            content_type=content_data['type'],
            publish_date=content_data.get('publish_date', datetime.now()),
            author=content_data['author'],
            keywords=content_data.get('keywords', []),
            target_persona=content_data.get('persona', 'general'),
            funnel_stage=content_data.get('stage', 'awareness')
        )

        self.content[content.content_id] = content

        # Link keywords to content
        for keyword in content.keywords:
            if keyword in self.keywords:
                self.keywords[keyword].content_ids.append(content.content_id)

        return content

    def track_keyword(self, keyword: str, search_volume: int,
                     difficulty: int, current_rank: Optional[int] = None):
        self.keywords[keyword] = SEOKeyword(
            keyword=keyword,
            search_volume=search_volume,
            difficulty=difficulty,
            current_rank=current_rank
        )

    def get_content_performance(self, content_id: str) -> Dict:
        content = self.content.get(content_id)
        if not content:
            return {}

        metrics = content.metrics
        views = metrics.get('views', 0)

        return {
            'title': content.title,
            'views': views,
            'shares': metrics.get('shares', 0),
            'leads_generated': metrics.get('leads', 0),
            'avg_time_on_page': metrics.get('avg_time', 0),
            'bounce_rate': metrics.get('bounces', 0) / views if views > 0 else 0,
            'engagement_rate': self._calculate_engagement_rate(content)
        }

    def _calculate_engagement_rate(self, content: ContentPiece) -> float:
        views = content.metrics.get('views', 0)
        if views == 0:
            return 0

        engaged = (content.metrics.get('shares', 0) +
                  content.metrics.get('comments', 0) +
                  content.metrics.get('downloads', 0))

        return (engaged / views) * 100

    def recommend_content(self, persona: str, stage: str) -> List[ContentPiece]:
        """Recommend content for specific persona and funnel stage"""
        matching = [c for c in self.content.values()
                   if c.target_persona == persona and c.funnel_stage == stage]

        # Sort by performance (views)
        matching.sort(key=lambda c: c.metrics.get('views', 0), reverse=True)

        return matching[:5]
```

## Best Practices

### Marketing Automation

- Implement lead scoring with clear MQL/SQL definitions
- Create lifecycle-based nurture workflows
- Use personalization tokens and dynamic content
- A/B test email subject lines and content
- Monitor workflow performance and optimize
- Maintain clean data with validation rules
- Implement re-engagement campaigns for inactive leads

### Campaign Management

- Set clear KPIs and success metrics upfront
- Use UTM parameters for tracking
- Implement conversion tracking pixels
- Create campaign naming conventions
- Monitor campaigns daily and optimize
- Document learnings for future campaigns
- Conduct post-campaign analysis

### Analytics & Attribution

- Implement multi-touch attribution modeling
- Track customer journey across all touchpoints
- Use data visualization for insights
- Create custom dashboards for stakeholders
- Regular data quality audits
- Benchmark against industry standards
- Focus on actionable metrics, not vanity metrics

### Content Marketing

- Create content calendar aligned with business goals
- Optimize content for target keywords
- Implement content distribution strategy
- Repurpose content across formats
- Track content performance metrics
- Update and refresh evergreen content
- Build internal linking structure

## Anti-Patterns

### Poor Practices

- Batch and blast email campaigns
- Ignoring mobile optimization
- Over-automating without personalization
- Not cleaning marketing database
- Focusing only on last-touch attribution
- Creating content without SEO research
- Not testing before launching campaigns
- Ignoring data privacy regulations

### Common Mistakes

- Too many emails causing unsubscribes
- Complex workflows without testing
- Not segmenting audiences
- Inadequate tracking implementation
- Ignoring bounce rates and deliverability
- Not aligning sales and marketing
- Vanity metrics over business outcomes

## Resources

### Marketing Platforms

- HubSpot - All-in-one marketing platform
- Marketo - Enterprise marketing automation
- Pardot - B2B marketing automation
- Mailchimp - Email marketing platform
- Google Analytics - Web analytics
- SEMrush - SEO and content marketing
- Hootsuite - Social media management

### Industry Resources

- Content Marketing Institute
- Marketing Land
- MarTech Conference
- HubSpot Academy
- Google Analytics Academy
- Moz SEO Learning Center

### Standards & Best Practices

- CAN-SPAM compliance
- GDPR marketing guidelines
- Email deliverability best practices
- Google SEO guidelines

---

_Part of the PCL Standard Library - Master marketing technology and digital marketing excellence._
