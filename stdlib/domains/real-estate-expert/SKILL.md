---
name: real-estate-expert
version: 1.1.0
description: >-
  Expert-level real estate systems, property management, MLS integration, CRM, virtual
  tours, and market analysis. Use when the user mentions property, MLS, CRM, proptech, or
  listings, or when the task involves Real Estate Systems, PropTech Solutions, Standards
  and Regulations, or Listing Management.
category: domains
tags: [real-estate, property, mls, crm, proptech, listings]
allowed-tools:
  - Read
  - Write
  - Edit
---

# Real Estate Expert

Expert guidance for real estate systems, property management, Multiple Listing Service (MLS) integration, customer relationship management, virtual tours, and market analysis.

## Core Concepts

### Real Estate Systems

- Multiple Listing Service (MLS) integration
- Property Management Systems (PMS)
- Customer Relationship Management (CRM)
- Transaction management
- Document management
- Lease management
- Maintenance tracking

### PropTech Solutions

- Virtual tours and 3D walkthroughs
- AI-powered property valuation
- Digital signatures and e-closing
- Smart home integration
- IoT sensors for properties
- Blockchain for title management
- Augmented reality for staging

### Standards and Regulations

- RESO (Real Estate Standards Organization)
- Fair Housing Act compliance
- RESPA (Real Estate Settlement Procedures Act)
- Data privacy (GDPR, CCPA)
- ADA compliance for websites
- NAR Code of Ethics

## Property Valuation and Analytics

```python
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler

class PropertyValuationSystem:
    """AI-powered property valuation"""

    def __init__(self):
        self.model = GradientBoostingRegressor(n_estimators=100)
        self.scaler = StandardScaler()
        self.trained = False

    def train_model(self, training_data: List[dict]):
        """Train valuation model on historical data"""
        features = []
        prices = []

        for property_data in training_data:
            feature_vector = self._extract_features(property_data)
            features.append(feature_vector)
            prices.append(property_data['sold_price'])

        X = np.array(features)
        y = np.array(prices)

        # Scale features
        X_scaled = self.scaler.fit_transform(X)

        # Train model
        self.model.fit(X_scaled, y)
        self.trained = True

    def estimate_value(self, property_data: dict) -> dict:
        """Estimate property value"""
        if not self.trained:
            return {'error': 'Model not trained'}

        features = self._extract_features(property_data)
        features_scaled = self.scaler.transform([features])

        estimated_value = self.model.predict(features_scaled)[0]

        # Calculate confidence interval (simplified)
        confidence_range = estimated_value * 0.1  # ±10%

        return {
            'estimated_value': estimated_value,
            'confidence_interval': {
                'lower': estimated_value - confidence_range,
                'upper': estimated_value + confidence_range
            },
            'price_per_sqft': estimated_value / property_data['square_feet']
        }

    def _extract_features(self, property_data: dict) -> List[float]:
        """Extract features for valuation model"""
        return [
            property_data['square_feet'],
            property_data['bedrooms'],
            property_data['bathrooms'],
            property_data['lot_size'],
            property_data['year_built'],
            property_data.get('garage_spaces', 0),
            property_data.get('stories', 1),
            1 if property_data.get('has_pool', False) else 0,
            1 if property_data.get('has_fireplace', False) else 0,
            property_data.get('neighborhood_score', 50)  # 0-100 scale
        ]

class MarketAnalytics:
    """Real estate market analytics"""

    def calculate_market_trends(self, sales_data: List[dict]) -> dict:
        """Calculate market trends and statistics"""
        if not sales_data:
            return {'error': 'No sales data available'}

        # Calculate metrics
        prices = [s['price'] for s in sales_data]
        days_on_market = [s['days_on_market'] for s in sales_data]

        median_price = np.median(prices)
        avg_price = np.mean(prices)
        avg_days_on_market = np.mean(days_on_market)

        # Calculate price trends (compare recent vs older data)
        recent_data = sales_data[-30:]  # Last 30 sales
        older_data = sales_data[-60:-30]  # Previous 30 sales

        if len(recent_data) > 0 and len(older_data) > 0:
            recent_avg = np.mean([s['price'] for s in recent_data])
            older_avg = np.mean([s['price'] for s in older_data])
            price_change = ((recent_avg - older_avg) / older_avg) * 100
        else:
            price_change = 0

        # Market health indicator
        if avg_days_on_market < 30:
            market_health = "Hot"
        elif avg_days_on_market < 60:
            market_health = "Balanced"
        else:
            market_health = "Slow"

        return {
            'median_price': median_price,
            'average_price': avg_price,
            'average_days_on_market': avg_days_on_market,
            'price_trend_percentage': price_change,
            'market_health': market_health,
            'total_sales': len(sales_data)
        }

    def calculate_inventory_metrics(self, active_listings: List[Property]) -> dict:
        """Calculate inventory and absorption metrics"""
        total_listings = len(active_listings)

        # Calculate average price
        avg_price = np.mean([float(p.listing_price) for p in active_listings])

        # Calculate months of inventory (simplified)
        # Would need sales velocity for accurate calculation
        months_of_inventory = 6.0  # Placeholder

        return {
            'total_active_listings': total_listings,
            'average_listing_price': avg_price,
            'months_of_inventory': months_of_inventory,
            'market_condition': 'Balanced' if 4 <= months_of_inventory <= 6 else
                              'Seller' if months_of_inventory < 4 else 'Buyer'
        }
```

## Lease Management

```python
@dataclass
class Lease:
    """Rental lease agreement"""
    lease_id: str
    property_id: str
    tenant_name: str
    tenant_contact: dict
    start_date: datetime
    end_date: datetime
    monthly_rent: Decimal
    security_deposit: Decimal
    status: str  # 'active', 'expired', 'terminated'
    auto_renew: bool

@dataclass
class MaintenanceRequest:
    """Maintenance request for property"""
    request_id: str
    property_id: str
    tenant_name: str
    category: str  # 'plumbing', 'electrical', 'hvac', etc.
    priority: str  # 'low', 'medium', 'high', 'emergency'
    description: str
    submitted_date: datetime
    status: str  # 'open', 'in_progress', 'completed'
    assigned_to: Optional[str]

class PropertyManagementSystem:
    """Property management for landlords and property managers"""

    def __init__(self):
        self.leases = {}
        self.maintenance_requests = []
        self.rent_payments = []

    def create_lease(self, lease_data: dict) -> Lease:
        """Create new lease agreement"""
        lease_id = self._generate_lease_id()

        lease = Lease(
            lease_id=lease_id,
            property_id=lease_data['property_id'],
            tenant_name=lease_data['tenant_name'],
            tenant_contact=lease_data['tenant_contact'],
            start_date=lease_data['start_date'],
            end_date=lease_data['end_date'],
            monthly_rent=Decimal(str(lease_data['monthly_rent'])),
            security_deposit=Decimal(str(lease_data['security_deposit'])),
            status='active',
            auto_renew=lease_data.get('auto_renew', False)
        )

        self.leases[lease_id] = lease

        # Schedule rent payment reminders
        self._schedule_rent_reminders(lease)

        return lease

    def record_rent_payment(self,
                           lease_id: str,
                           amount: Decimal,
                           payment_date: datetime,
                           payment_method: str) -> dict:
        """Record rent payment"""
        lease = self.leases.get(lease_id)
        if not lease:
            return {'error': 'Lease not found'}

        payment = {
            'payment_id': self._generate_payment_id(),
            'lease_id': lease_id,
            'amount': amount,
            'payment_date': payment_date,
            'payment_method': payment_method,
            'for_month': payment_date.strftime('%Y-%m')
        }

        self.rent_payments.append(payment)

        # Check if payment is late
        expected_date = datetime(payment_date.year, payment_date.month, 1)
        days_late = (payment_date - expected_date).days

        return {
            'success': True,
            'payment_id': payment['payment_id'],
            'days_late': max(0, days_late),
            'late_fee': self._calculate_late_fee(lease, days_late)
        }

    def submit_maintenance_request(self, request_data: dict) -> MaintenanceRequest:
        """Submit maintenance request"""
        request = MaintenanceRequest(
            request_id=self._generate_request_id(),
            property_id=request_data['property_id'],
            tenant_name=request_data['tenant_name'],
            category=request_data['category'],
            priority=request_data.get('priority', 'medium'),
            description=request_data['description'],
            submitted_date=datetime.now(),
            status='open',
            assigned_to=None
        )

        self.maintenance_requests.append(request)

        # Auto-assign emergency requests
        if request.priority == 'emergency':
            self._assign_emergency_maintenance(request)

        return request

    def check_lease_expiration(self) -> List[dict]:
        """Check for expiring leases"""
        expiring_soon = []
        current_date = datetime.now()

        for lease in self.leases.values():
            if lease.status != 'active':
                continue

            days_until_expiration = (lease.end_date - current_date).days

            if 0 < days_until_expiration <= 60:
                expiring_soon.append({
                    'lease_id': lease.lease_id,
                    'property_id': lease.property_id,
                    'tenant_name': lease.tenant_name,
                    'end_date': lease.end_date.isoformat(),
                    'days_remaining': days_until_expiration,
                    'auto_renew': lease.auto_renew
                })

        return expiring_soon

    def _calculate_late_fee(self, lease: Lease, days_late: int) -> Decimal:
        """Calculate late fee for rent payment"""
        if days_late <= 5:  # Grace period
            return Decimal('0')

        # $50 flat fee + $5 per day after grace period
        late_fee = Decimal('50') + (Decimal('5') * (days_late - 5))
        return late_fee

    def _schedule_rent_reminders(self, lease: Lease):
        """Schedule monthly rent payment reminders"""
        # Implementation would schedule reminder emails/notifications
        pass

    def _assign_emergency_maintenance(self, request: MaintenanceRequest):
        """Auto-assign emergency maintenance requests"""
        # Implementation would assign to on-call maintenance staff
        pass

    def _generate_lease_id(self) -> str:
        import uuid
        return f"LEASE-{uuid.uuid4().hex[:8].upper()}"

    def _generate_payment_id(self) -> str:
        import uuid
        return f"PAY-{uuid.uuid4().hex[:8].upper()}"

    def _generate_request_id(self) -> str:
        import uuid
        return f"MAINT-{uuid.uuid4().hex[:8].upper()}"
```

## Best Practices

### Listing Management

- Use high-quality professional photos
- Write compelling property descriptions
- Include virtual tours and 3D walkthroughs
- Update listings immediately when status changes
- Respond to inquiries within 1 hour
- Maintain accurate MLS data
- Use targeted marketing campaigns

### Property Valuation

- Use multiple valuation methods (CMA, AVM, appraisal)
- Consider local market conditions
- Account for property condition and upgrades
- Review comparable sales regularly
- Factor in seasonal trends
- Include neighborhood analysis
- Document valuation methodology

### Lease Management

- Use standardized lease templates
- Conduct thorough tenant screening
- Document property condition (move-in/move-out)
- Maintain security deposit in separate account
- Schedule regular property inspections
- Respond to maintenance requests promptly
- Maintain clear communication with tenants

### Compliance

- Follow Fair Housing Act requirements
- Maintain proper licensing
- Use compliant lease agreements
- Protect tenant privacy
- Follow eviction procedures properly
- Maintain insurance coverage
- Keep accurate financial records

## Anti-Patterns

❌ Poor quality listing photos
❌ Inaccurate property information
❌ Slow response to inquiries
❌ No virtual tour options
❌ Ignoring online reviews
❌ Manual document management
❌ No tenant screening process
❌ Poor maintenance tracking
❌ Inadequate insurance coverage

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Property Listing System](references/PROPERTY_LISTING_SYSTEM.md)

## Resources

- NAR (National Association of Realtors): https://www.nar.realtor/
- RESO Standards: https://www.reso.org/
- Zillow API: https://www.zillow.com/howto/api/
- Realtor.com API: https://www.realtor.com/
- CoreLogic: https://www.corelogic.com/
- Redfin Data: https://www.redfin.com/
- Fair Housing Act: https://www.hud.gov/fairhousing
