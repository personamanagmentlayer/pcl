# Social Media Expert — Code Examples

Reference material for the `social-media-expert` skill. See [SKILL.md](../SKILL.md).

## Code Examples

### Social Media Management System

```python
from datetime import datetime, timedelta
from enum import Enum
from typing import List, Optional, Dict, Any, Set
from dataclasses import dataclass, field
import uuid
import hashlib

class Platform(Enum):
    FACEBOOK = "facebook"
    TWITTER = "twitter"
    INSTAGRAM = "instagram"
    LINKEDIN = "linkedin"
    TIKTOK = "tiktok"
    YOUTUBE = "youtube"

class PostStatus(Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    FAILED = "failed"

class ContentType(Enum):
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    CAROUSEL = "carousel"
    STORY = "story"
    REEL = "reel"
    LINK = "link"

@dataclass
class SocialAccount:
    account_id: str
    platform: Platform
    username: str
    display_name: str
    followers: int = 0
    following: int = 0
    verified: bool = False
    access_token: Optional[str] = None
    connected_at: datetime = field(default_factory=datetime.now)

@dataclass
class MediaAsset:
    asset_id: str
    asset_type: str  # image, video, gif
    url: str
    thumbnail_url: Optional[str] = None
    alt_text: Optional[str] = None
    duration_seconds: Optional[int] = None

@dataclass
class SocialPost:
    post_id: str
    account_id: str
    platform: Platform
    content_type: ContentType
    text: str
    status: PostStatus
    scheduled_time: Optional[datetime] = None
    published_time: Optional[datetime] = None
    media: List[MediaAsset] = field(default_factory=list)
    hashtags: List[str] = field(default_factory=list)
    mentions: List[str] = field(default_factory=list)
    link_url: Optional[str] = None
    created_by: str = ""
    created_at: datetime = field(default_factory=datetime.now)

    # Engagement metrics
    likes: int = 0
    comments: int = 0
    shares: int = 0
    impressions: int = 0
    reach: int = 0
    clicks: int = 0

    def calculate_engagement_rate(self) -> float:
        """Calculate engagement rate based on reach"""
        if self.reach == 0:
            return 0
        total_engagement = self.likes + self.comments + self.shares
        return (total_engagement / self.reach) * 100

@dataclass
class Comment:
    comment_id: str
    post_id: str
    author_username: str
    author_name: str
    text: str
    timestamp: datetime
    sentiment: Optional[str] = None  # positive, negative, neutral
    replied: bool = False
    reply_text: Optional[str] = None

@dataclass
class Campaign:
    campaign_id: str
    name: str
    description: str
    start_date: datetime
    end_date: datetime
    platforms: List[Platform]
    posts: List[str] = field(default_factory=list)  # post_ids
    budget: Optional[float] = None
    goals: Dict[str, Any] = field(default_factory=dict)
    hashtags: List[str] = field(default_factory=list)

class SocialMediaManager:
    def __init__(self):
        self.accounts: Dict[str, SocialAccount] = {}
        self.posts: Dict[str, SocialPost] = {}
        self.comments: Dict[str, Comment] = {}
        self.campaigns: Dict[str, Campaign] = {}
        self.content_calendar: Dict[datetime, List[str]] = {}

    def connect_account(self, account_data: Dict) -> SocialAccount:
        """Connect social media account"""
        account = SocialAccount(
            account_id=account_data.get('account_id', str(uuid.uuid4())),
            platform=Platform(account_data['platform']),
            username=account_data['username'],
            display_name=account_data['display_name'],
            followers=account_data.get('followers', 0),
            following=account_data.get('following', 0),
            verified=account_data.get('verified', False)
        )
        self.accounts[account.account_id] = account
        return account

    def create_post(self, post_data: Dict) -> SocialPost:
        """Create social media post"""
        post = SocialPost(
            post_id=str(uuid.uuid4()),
            account_id=post_data['account_id'],
            platform=Platform(post_data['platform']),
            content_type=ContentType(post_data['content_type']),
            text=post_data['text'],
            status=PostStatus.DRAFT,
            scheduled_time=post_data.get('scheduled_time'),
            media=post_data.get('media', []),
            hashtags=post_data.get('hashtags', []),
            mentions=post_data.get('mentions', []),
            link_url=post_data.get('link_url'),
            created_by=post_data['created_by']
        )

        self.posts[post.post_id] = post

        # Add to content calendar if scheduled
        if post.scheduled_time:
            post.status = PostStatus.SCHEDULED
            calendar_date = post.scheduled_time.date()
            if calendar_date not in self.content_calendar:
                self.content_calendar[calendar_date] = []
            self.content_calendar[calendar_date].append(post.post_id)

        return post

    def publish_post(self, post_id: str) -> bool:
        """Publish or schedule post"""
        post = self.posts.get(post_id)
        if not post:
            return False

        # Check if scheduled for future
        if post.scheduled_time and post.scheduled_time > datetime.now():
            post.status = PostStatus.SCHEDULED
            return True

        # Publish immediately
        # In production, would call actual social media API
        post.status = PostStatus.PUBLISHED
        post.published_time = datetime.now()

        return True

    def track_comment(self, comment_data: Dict) -> Comment:
        """Track comment on post"""
        comment = Comment(
            comment_id=str(uuid.uuid4()),
            post_id=comment_data['post_id'],
            author_username=comment_data['author_username'],
            author_name=comment_data['author_name'],
            text=comment_data['text'],
            timestamp=comment_data.get('timestamp', datetime.now())
        )

        # Perform sentiment analysis
        comment.sentiment = self._analyze_sentiment(comment.text)

        self.comments[comment.comment_id] = comment

        # Update post comment count
        if comment.post_id in self.posts:
            self.posts[comment.post_id].comments += 1

        return comment

    def _analyze_sentiment(self, text: str) -> str:
        """Simple sentiment analysis - in production use NLP library"""
        positive_words = ['great', 'awesome', 'love', 'excellent', 'amazing']
        negative_words = ['bad', 'terrible', 'hate', 'awful', 'poor']

        text_lower = text.lower()
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)

        if positive_count > negative_count:
            return 'positive'
        elif negative_count > positive_count:
            return 'negative'
        return 'neutral'

    def reply_to_comment(self, comment_id: str, reply_text: str):
        """Reply to comment"""
        comment = self.comments.get(comment_id)
        if comment:
            comment.replied = True
            comment.reply_text = reply_text

    def create_campaign(self, campaign_data: Dict) -> Campaign:
        """Create social media campaign"""
        campaign = Campaign(
            campaign_id=str(uuid.uuid4()),
            name=campaign_data['name'],
            description=campaign_data['description'],
            start_date=campaign_data['start_date'],
            end_date=campaign_data['end_date'],
            platforms=[Platform(p) for p in campaign_data['platforms']],
            budget=campaign_data.get('budget'),
            goals=campaign_data.get('goals', {}),
            hashtags=campaign_data.get('hashtags', [])
        )
        self.campaigns[campaign.campaign_id] = campaign
        return campaign

    def get_content_calendar(self, start_date: datetime,
                            end_date: datetime) -> Dict[str, List[Dict]]:
        """Get content calendar for date range"""
        calendar = {}

        current = start_date.date()
        end = end_date.date()

        while current <= end:
            posts_on_date = self.content_calendar.get(current, [])
            calendar[current.isoformat()] = [
                {
                    'post_id': post_id,
                    'platform': self.posts[post_id].platform.value,
                    'text': self.posts[post_id].text[:50] + '...',
                    'scheduled_time': self.posts[post_id].scheduled_time
                }
                for post_id in posts_on_date
                if post_id in self.posts
            ]
            current += timedelta(days=1)

        return calendar

    def get_best_posting_times(self, account_id: str,
                              days: int = 30) -> List[Dict]:
        """Analyze best posting times based on engagement"""
        cutoff = datetime.now() - timedelta(days=days)

        account_posts = [p for p in self.posts.values()
                        if p.account_id == account_id and
                        p.published_time and
                        p.published_time >= cutoff and
                        p.status == PostStatus.PUBLISHED]

        # Group by hour and day of week
        hour_engagement = {}

        for post in account_posts:
            hour = post.published_time.hour
            day_of_week = post.published_time.strftime('%A')
            key = f"{day_of_week}_{hour:02d}:00"

            if key not in hour_engagement:
                hour_engagement[key] = {
                    'total_posts': 0,
                    'total_engagement': 0,
                    'avg_engagement_rate': 0
                }

            hour_engagement[key]['total_posts'] += 1
            hour_engagement[key]['total_engagement'] += (post.likes +
                                                         post.comments +
                                                         post.shares)

        # Calculate averages
        for key, data in hour_engagement.items():
            if data['total_posts'] > 0:
                data['avg_engagement_rate'] = (data['total_engagement'] /
                                               data['total_posts'])

        # Sort by engagement
        sorted_times = sorted(hour_engagement.items(),
                            key=lambda x: x[1]['avg_engagement_rate'],
                            reverse=True)

        return [
            {
                'time_slot': time_slot,
                'avg_engagement': data['avg_engagement_rate'],
                'sample_size': data['total_posts']
            }
            for time_slot, data in sorted_times[:10]
        ]
```

### Social Analytics Engine

```python
from collections import defaultdict

class SocialAnalytics:
    def __init__(self, manager: SocialMediaManager):
        self.manager = manager

    def get_account_performance(self, account_id: str,
                                days: int = 30) -> Dict[str, Any]:
        """Get account performance metrics"""
        cutoff = datetime.now() - timedelta(days=days)

        account = self.manager.accounts.get(account_id)
        if not account:
            return {}

        posts = [p for p in self.manager.posts.values()
                if p.account_id == account_id and
                p.published_time and
                p.published_time >= cutoff]

        if not posts:
            return {
                'account_id': account_id,
                'period_days': days,
                'total_posts': 0
            }

        total_engagement = sum(p.likes + p.comments + p.shares
                             for p in posts)
        total_reach = sum(p.reach for p in posts)
        total_impressions = sum(p.impressions for p in posts)

        avg_engagement_rate = (sum(p.calculate_engagement_rate()
                                  for p in posts) / len(posts))

        return {
            'account_id': account_id,
            'username': account.username,
            'platform': account.platform.value,
            'period_days': days,
            'total_posts': len(posts),
            'total_engagement': total_engagement,
            'total_reach': total_reach,
            'total_impressions': total_impressions,
            'avg_engagement_rate': avg_engagement_rate,
            'avg_reach_per_post': total_reach / len(posts),
            'followers': account.followers
        }

    def get_top_performing_posts(self, account_id: str,
                                 limit: int = 10) -> List[Dict]:
        """Get top performing posts by engagement"""
        posts = [p for p in self.manager.posts.values()
                if p.account_id == account_id and
                p.status == PostStatus.PUBLISHED]

        # Sort by engagement rate
        sorted_posts = sorted(posts,
                            key=lambda p: p.calculate_engagement_rate(),
                            reverse=True)

        return [
            {
                'post_id': p.post_id,
                'text': p.text[:100],
                'published_time': p.published_time,
                'engagement_rate': p.calculate_engagement_rate(),
                'likes': p.likes,
                'comments': p.comments,
                'shares': p.shares,
                'reach': p.reach
            }
            for p in sorted_posts[:limit]
        ]

    def analyze_hashtag_performance(self, days: int = 30) -> List[Dict]:
        """Analyze hashtag performance"""
        cutoff = datetime.now() - timedelta(days=days)

        hashtag_stats = defaultdict(lambda: {
            'usage_count': 0,
            'total_reach': 0,
            'total_engagement': 0,
            'posts': []
        })

        posts = [p for p in self.manager.posts.values()
                if p.published_time and
                p.published_time >= cutoff and
                p.status == PostStatus.PUBLISHED]

        for post in posts:
            for hashtag in post.hashtags:
                stats = hashtag_stats[hashtag]
                stats['usage_count'] += 1
                stats['total_reach'] += post.reach
                stats['total_engagement'] += (post.likes + post.comments +
                                             post.shares)
                stats['posts'].append(post.post_id)

        # Calculate averages and sort
        hashtag_performance = []
        for hashtag, stats in hashtag_stats.items():
            hashtag_performance.append({
                'hashtag': hashtag,
                'usage_count': stats['usage_count'],
                'avg_reach': stats['total_reach'] / stats['usage_count'],
                'avg_engagement': stats['total_engagement'] / stats['usage_count'],
                'total_reach': stats['total_reach']
            })

        hashtag_performance.sort(key=lambda x: x['avg_engagement'],
                               reverse=True)

        return hashtag_performance

    def get_audience_sentiment(self, account_id: str,
                              days: int = 30) -> Dict[str, Any]:
        """Analyze audience sentiment from comments"""
        cutoff = datetime.now() - timedelta(days=days)

        # Get posts for account
        post_ids = [p.post_id for p in self.manager.posts.values()
                   if p.account_id == account_id and
                   p.published_time and
                   p.published_time >= cutoff]

        # Get comments on those posts
        comments = [c for c in self.manager.comments.values()
                   if c.post_id in post_ids]

        if not comments:
            return {'total_comments': 0}

        sentiment_counts = defaultdict(int)
        for comment in comments:
            if comment.sentiment:
                sentiment_counts[comment.sentiment] += 1

        return {
            'total_comments': len(comments),
            'positive': sentiment_counts.get('positive', 0),
            'negative': sentiment_counts.get('negative', 0),
            'neutral': sentiment_counts.get('neutral', 0),
            'sentiment_score': (
                (sentiment_counts.get('positive', 0) -
                 sentiment_counts.get('negative', 0)) /
                len(comments) * 100
            )
        }

    def get_campaign_performance(self, campaign_id: str) -> Dict[str, Any]:
        """Get campaign performance metrics"""
        campaign = self.manager.campaigns.get(campaign_id)
        if not campaign:
            return {}

        campaign_posts = [self.manager.posts[pid]
                         for pid in campaign.posts
                         if pid in self.manager.posts]

        if not campaign_posts:
            return {
                'campaign_id': campaign_id,
                'total_posts': 0
            }

        total_reach = sum(p.reach for p in campaign_posts)
        total_engagement = sum(p.likes + p.comments + p.shares
                             for p in campaign_posts)

        return {
            'campaign_id': campaign_id,
            'campaign_name': campaign.name,
            'total_posts': len(campaign_posts),
            'total_reach': total_reach,
            'total_engagement': total_engagement,
            'avg_engagement_rate': (sum(p.calculate_engagement_rate()
                                       for p in campaign_posts) /
                                   len(campaign_posts)),
            'platforms': [p.value for p in campaign.platforms],
            'duration_days': (campaign.end_date - campaign.start_date).days
        }
```

### Influencer Management System

```python
@dataclass
class Influencer:
    influencer_id: str
    name: str
    platform: Platform
    username: str
    followers: int
    engagement_rate: float
    niche: List[str]
    contact_email: Optional[str] = None
    rate_per_post: Optional[float] = None
    past_collaborations: int = 0

@dataclass
class InfluencerCampaign:
    campaign_id: str
    name: str
    influencers: List[str]  # influencer_ids
    budget: float
    start_date: datetime
    end_date: datetime
    deliverables: Dict[str, int]  # {post_type: count}
    tracking_hashtag: str
    status: str = "planning"  # planning, active, completed

class InfluencerManager:
    def __init__(self):
        self.influencers: Dict[str, Influencer] = {}
        self.campaigns: Dict[str, InfluencerCampaign] = {}

    def add_influencer(self, influencer_data: Dict) -> Influencer:
        """Add influencer to database"""
        influencer = Influencer(
            influencer_id=str(uuid.uuid4()),
            name=influencer_data['name'],
            platform=Platform(influencer_data['platform']),
            username=influencer_data['username'],
            followers=influencer_data['followers'],
            engagement_rate=influencer_data['engagement_rate'],
            niche=influencer_data['niche'],
            contact_email=influencer_data.get('contact_email'),
            rate_per_post=influencer_data.get('rate_per_post')
        )
        self.influencers[influencer.influencer_id] = influencer
        return influencer

    def find_influencers(self, niche: str, min_followers: int,
                        platform: Optional[Platform] = None) -> List[Influencer]:
        """Find influencers matching criteria"""
        results = []

        for influencer in self.influencers.values():
            if platform and influencer.platform != platform:
                continue

            if influencer.followers < min_followers:
                continue

            if niche.lower() in [n.lower() for n in influencer.niche]:
                results.append(influencer)

        # Sort by engagement rate
        results.sort(key=lambda i: i.engagement_rate, reverse=True)

        return results

    def calculate_influencer_roi(self, campaign_id: str,
                                revenue: float) -> Dict[str, float]:
        """Calculate ROI for influencer campaign"""
        campaign = self.campaigns.get(campaign_id)
        if not campaign:
            return {}

        roi = ((revenue - campaign.budget) / campaign.budget) * 100

        return {
            'campaign_id': campaign_id,
            'budget': campaign.budget,
            'revenue': revenue,
            'roi_percentage': roi,
            'cost_per_influencer': campaign.budget / len(campaign.influencers)
        }
```
