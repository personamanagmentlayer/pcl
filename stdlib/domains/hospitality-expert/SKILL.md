---
name: hospitality-expert
version: 1.1.0
description: >-
  Expert-level hotel management, reservation systems, guest services, revenue management,
  and hospitality technology. Use when the user mentions hotel, reservation, PMS, or
  revenue management, or when the task involves Hotel Management Systems, Technologies,
  Standards and Protocols, or Reservations Management.
category: domains
tags: [hospitality, hotel, reservation, pms, revenue-management]
allowed-tools:
  - Read
  - Write
  - Edit
---

# Hospitality Expert

Expert guidance for hotel management, reservation systems, property management systems (PMS), guest services, revenue management, and hospitality technology solutions.

## Core Concepts

### Hotel Management Systems

- Property Management System (PMS)
- Central Reservation System (CRS)
- Revenue Management System (RMS)
- Channel Manager
- Point of Sale (POS)
- Guest Relationship Management (GRM)
- Housekeeping management

### Technologies

- Mobile check-in/check-out
- Digital key systems
- Guest messaging platforms
- IoT for room automation
- AI chatbots for customer service
- Contactless payments
- Energy management systems

### Standards and Protocols

- HTNG (Hotel Technology Next Generation)
- OpenTravel Alliance standards
- PCI-DSS for payment security
- ADA compliance for accessibility
- Brand standards (if franchise)
- OTA integrations (Booking.com, Expedia)

## Revenue Management System

```python
import numpy as np

class RevenueManagementSystem:
    """Hotel revenue management and dynamic pricing"""

    def __init__(self):
        self.pricing_rules = []
        self.demand_forecast = {}

    def calculate_dynamic_rate(self,
                              room_type: RoomType,
                              check_in_date: date,
                              days_until_arrival: int,
                              current_occupancy: float,
                              historical_data: dict) -> Decimal:
        """Calculate dynamic room rate"""
        # Base rate
        base_rates = {
            RoomType.STANDARD: Decimal('150'),
            RoomType.DELUXE: Decimal('200'),
            RoomType.SUITE: Decimal('350'),
            RoomType.EXECUTIVE: Decimal('450')
        }

        base_rate = base_rates.get(room_type, Decimal('150'))

        # Demand multiplier based on occupancy
        if current_occupancy > 0.85:
            demand_multiplier = Decimal('1.30')  # High demand
        elif current_occupancy > 0.70:
            demand_multiplier = Decimal('1.15')  # Moderate demand
        elif current_occupancy > 0.50:
            demand_multiplier = Decimal('1.00')  # Normal
        else:
            demand_multiplier = Decimal('0.85')  # Low demand

        # Booking window multiplier
        if days_until_arrival < 7:
            window_multiplier = Decimal('1.20')  # Last minute
        elif days_until_arrival < 14:
            window_multiplier = Decimal('1.10')
        elif days_until_arrival > 60:
            window_multiplier = Decimal('0.90')  # Early bird
        else:
            window_multiplier = Decimal('1.00')

        # Day of week adjustment
        if check_in_date.weekday() in [4, 5]:  # Friday, Saturday
            day_multiplier = Decimal('1.25')
        elif check_in_date.weekday() == 6:  # Sunday
            day_multiplier = Decimal('0.95')
        else:
            day_multiplier = Decimal('1.00')

        # Calculate final rate
        dynamic_rate = base_rate * demand_multiplier * window_multiplier * day_multiplier

        # Round to nearest dollar
        dynamic_rate = dynamic_rate.quantize(Decimal('1'))

        return dynamic_rate

    def forecast_demand(self, start_date: date, days: int) -> dict:
        """Forecast demand for upcoming period"""
        forecast = {}

        for i in range(days):
            forecast_date = start_date + timedelta(days=i)

            # Simplified demand forecast
            # In production, would use ML models
            base_demand = 70.0  # 70% base occupancy

            # Day of week factor
            if forecast_date.weekday() in [4, 5]:  # Weekend
                day_factor = 15
            elif forecast_date.weekday() == 6:
                day_factor = -10
            else:
                day_factor = 0

            # Seasonality factor (simplified)
            month = forecast_date.month
            if month in [6, 7, 8]:  # Summer
                season_factor = 10
            elif month in [12, 1]:  # Holiday season
                season_factor = 15
            else:
                season_factor = 0

            forecasted_occupancy = base_demand + day_factor + season_factor
            forecasted_occupancy = min(100, max(0, forecasted_occupancy))

            forecast[forecast_date.isoformat()] = {
                'date': forecast_date.isoformat(),
                'forecasted_occupancy': forecasted_occupancy,
                'confidence': 'high' if i < 14 else 'medium' if i < 30 else 'low'
            }

        return forecast

    def optimize_inventory(self, total_rooms: int, date_range: tuple) -> dict:
        """Optimize room inventory allocation"""
        # Allocate rooms across different channels
        # Direct bookings, OTAs, corporate contracts, etc.

        allocation = {
            'direct': int(total_rooms * 0.40),  # 40% direct
            'ota': int(total_rooms * 0.35),     # 35% OTAs
            'corporate': int(total_rooms * 0.15),  # 15% corporate
            'walk_in': int(total_rooms * 0.10)  # 10% walk-ins
        }

        return {
            'total_rooms': total_rooms,
            'allocation': allocation,
            'date_range': {
                'start': date_range[0].isoformat(),
                'end': date_range[1].isoformat()
            }
        }

    def calculate_revpar(self, revenue: Decimal, available_rooms: int) -> Decimal:
        """Calculate Revenue Per Available Room"""
        if available_rooms == 0:
            return Decimal('0')

        revpar = revenue / available_rooms
        return revpar.quantize(Decimal('0.01'))

    def calculate_adr(self, revenue: Decimal, rooms_sold: int) -> Decimal:
        """Calculate Average Daily Rate"""
        if rooms_sold == 0:
            return Decimal('0')

        adr = revenue / rooms_sold
        return adr.quantize(Decimal('0.01'))
```

## Guest Services Management

```python
@dataclass
class GuestRequest:
    """Guest service request"""
    request_id: str
    reservation_id: str
    room_number: str
    guest_name: str
    request_type: str  # 'housekeeping', 'maintenance', 'concierge', 'amenity'
    description: str
    priority: str  # 'low', 'medium', 'high'
    status: str  # 'open', 'in_progress', 'completed'
    created_at: datetime
    assigned_to: Optional[str]
    completed_at: Optional[datetime]

class GuestServicesSystem:
    """Guest services and experience management"""

    def __init__(self):
        self.requests = []
        self.guest_preferences = {}
        self.loyalty_members = {}

    def submit_guest_request(self, request_data: dict) -> GuestRequest:
        """Submit guest service request"""
        request = GuestRequest(
            request_id=self._generate_request_id(),
            reservation_id=request_data['reservation_id'],
            room_number=request_data['room_number'],
            guest_name=request_data['guest_name'],
            request_type=request_data['request_type'],
            description=request_data['description'],
            priority=request_data.get('priority', 'medium'),
            status='open',
            created_at=datetime.now(),
            assigned_to=None,
            completed_at=None
        )

        self.requests.append(request)

        # Auto-assign based on request type
        self._auto_assign_request(request)

        return request

    def track_guest_preferences(self, guest_id: str, preferences: dict):
        """Track guest preferences for personalization"""
        self.guest_preferences[guest_id] = {
            'room_preferences': {
                'floor': preferences.get('preferred_floor'),
                'bed_type': preferences.get('bed_type'),
                'view': preferences.get('view_preference')
            },
            'amenities': preferences.get('amenities', []),
            'dietary_restrictions': preferences.get('dietary_restrictions', []),
            'special_occasions': preferences.get('special_occasions', {}),
            'communication_preference': preferences.get('communication', 'email')
        }

    def calculate_guest_satisfaction_score(self, reservation_id: str) -> dict:
        """Calculate guest satisfaction metrics"""
        # Simulate guest satisfaction score
        # In production, would be based on surveys and feedback

        metrics = {
            'overall_satisfaction': 4.5,  # Out of 5
            'check_in_experience': 4.7,
            'room_quality': 4.3,
            'staff_friendliness': 4.8,
            'cleanliness': 4.6,
            'value_for_money': 4.2,
            'likelihood_to_recommend': 9.0  # NPS score (0-10)
        }

        return {
            'reservation_id': reservation_id,
            'satisfaction_metrics': metrics,
            'nps_category': 'promoter' if metrics['likelihood_to_recommend'] >= 9 else
                          'passive' if metrics['likelihood_to_recommend'] >= 7 else
                          'detractor'
        }

    def _auto_assign_request(self, request: GuestRequest):
        """Auto-assign request to staff"""
        # Would implement smart assignment logic
        assignments = {
            'housekeeping': 'housekeeping_team',
            'maintenance': 'maintenance_team',
            'concierge': 'concierge_team',
            'amenity': 'front_desk'
        }

        request.assigned_to = assignments.get(request.request_type, 'front_desk')

    def _generate_request_id(self) -> str:
        import uuid
        return f"REQ-{uuid.uuid4().hex[:8].upper()}"
```

## Best Practices

### Reservations Management

- Implement real-time availability
- Use channel manager for distribution
- Enable mobile booking
- Implement flexible cancellation policies
- Send automated confirmations
- Track booking sources
- Enable group bookings

### Revenue Management

- Implement dynamic pricing
- Monitor competitor rates
- Forecast demand accurately
- Optimize inventory allocation
- Track RevPAR and ADR
- Use yield management strategies
- Analyze booking patterns

### Guest Experience

- Personalize guest interactions
- Enable mobile check-in/out
- Provide digital concierge services
- Track guest preferences
- Respond promptly to requests
- Implement loyalty programs
- Gather feedback systematically

### Operations

- Maintain housekeeping efficiency
- Implement preventive maintenance
- Use automated messaging
- Monitor room status in real-time
- Optimize staff scheduling
- Track operational metrics
- Ensure PCI-DSS compliance

## Anti-Patterns

❌ Manual reservation management
❌ Static pricing year-round
❌ No guest preference tracking
❌ Poor channel management
❌ Slow response to guest requests
❌ No mobile capabilities
❌ Inadequate staff training
❌ Poor data security
❌ No revenue analytics

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Property Management System](references/PROPERTY_MANAGEMENT_SYSTEM.md)

## Resources

- HTNG (Hotel Technology Next Generation): https://htng.org/
- HSMAI (Hospitality Sales and Marketing Association): https://www.hsmai.org/
- AHLA (American Hotel & Lodging Association): https://www.ahla.com/
- STR (Hotel data and analytics): https://str.com/
- OpenTravel Alliance: https://opentravel.org/
- Hospitality Technology: https://www.hospitalitytech.com/
- Revenue Management Best Practices: https://www.revparguru.com/
