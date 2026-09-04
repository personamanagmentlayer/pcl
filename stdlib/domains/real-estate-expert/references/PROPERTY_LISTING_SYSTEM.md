# Real Estate Expert — Property Listing System

Reference material for the `real-estate-expert` skill. See [SKILL.md](../SKILL.md).

## Property Listing System

```python
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from enum import Enum

class PropertyType(Enum):
    SINGLE_FAMILY = "single_family"
    CONDO = "condo"
    TOWNHOUSE = "townhouse"
    MULTI_FAMILY = "multi_family"
    LAND = "land"
    COMMERCIAL = "commercial"

class ListingStatus(Enum):
    ACTIVE = "active"
    PENDING = "pending"
    SOLD = "sold"
    WITHDRAWN = "withdrawn"
    EXPIRED = "expired"

@dataclass
class Property:
    """Property information"""
    property_id: str
    mls_number: str
    property_type: PropertyType
    address: dict
    listing_price: Decimal
    bedrooms: int
    bathrooms: float
    square_feet: int
    lot_size: float  # acres
    year_built: int
    description: str
    features: List[str]
    photos: List[str]
    status: ListingStatus
    listing_date: datetime
    listing_agent_id: str
    coordinates: tuple  # (latitude, longitude)

@dataclass
class ShowingRequest:
    """Property showing request"""
    showing_id: str
    property_id: str
    buyer_agent_id: str
    buyer_name: str
    requested_date: datetime
    duration_minutes: int
    status: str  # 'pending', 'confirmed', 'cancelled'
    notes: str

class PropertyListingSystem:
    """Real estate listing management system"""

    def __init__(self):
        self.properties = {}
        self.showings = []
        self.saved_searches = {}

    def create_listing(self,
                      property_data: dict,
                      agent_id: str) -> Property:
        """Create new property listing"""
        property_id = self._generate_property_id()
        mls_number = self._generate_mls_number()

        property = Property(
            property_id=property_id,
            mls_number=mls_number,
            property_type=PropertyType(property_data['property_type']),
            address=property_data['address'],
            listing_price=Decimal(str(property_data['price'])),
            bedrooms=property_data['bedrooms'],
            bathrooms=property_data['bathrooms'],
            square_feet=property_data['square_feet'],
            lot_size=property_data.get('lot_size', 0),
            year_built=property_data['year_built'],
            description=property_data['description'],
            features=property_data.get('features', []),
            photos=property_data.get('photos', []),
            status=ListingStatus.ACTIVE,
            listing_date=datetime.now(),
            listing_agent_id=agent_id,
            coordinates=property_data.get('coordinates', (0, 0))
        )

        self.properties[property_id] = property

        # Notify matching saved searches
        self._notify_saved_searches(property)

        return property

    def search_properties(self, criteria: dict) -> List[Property]:
        """Search properties based on criteria"""
        results = []

        for property in self.properties.values():
            if property.status != ListingStatus.ACTIVE:
                continue

            # Price range
            if 'min_price' in criteria:
                if property.listing_price < Decimal(str(criteria['min_price'])):
                    continue

            if 'max_price' in criteria:
                if property.listing_price > Decimal(str(criteria['max_price'])):
                    continue

            # Bedrooms
            if 'min_bedrooms' in criteria:
                if property.bedrooms < criteria['min_bedrooms']:
                    continue

            # Bathrooms
            if 'min_bathrooms' in criteria:
                if property.bathrooms < criteria['min_bathrooms']:
                    continue

            # Square footage
            if 'min_sqft' in criteria:
                if property.square_feet < criteria['min_sqft']:
                    continue

            # Property type
            if 'property_type' in criteria:
                if property.property_type.value != criteria['property_type']:
                    continue

            # Location-based search (within radius)
            if 'location' in criteria and 'radius_miles' in criteria:
                distance = self._calculate_distance(
                    property.coordinates,
                    criteria['location']
                )
                if distance > criteria['radius_miles']:
                    continue

            results.append(property)

        # Sort by price or other criteria
        if criteria.get('sort_by') == 'price_asc':
            results.sort(key=lambda p: p.listing_price)
        elif criteria.get('sort_by') == 'price_desc':
            results.sort(key=lambda p: p.listing_price, reverse=True)
        elif criteria.get('sort_by') == 'newest':
            results.sort(key=lambda p: p.listing_date, reverse=True)

        return results

    def schedule_showing(self,
                        property_id: str,
                        buyer_agent_id: str,
                        buyer_name: str,
                        requested_date: datetime) -> dict:
        """Schedule property showing"""
        property = self.properties.get(property_id)
        if not property:
            return {'error': 'Property not found'}

        if property.status != ListingStatus.ACTIVE:
            return {'error': 'Property not available for showings'}

        # Check availability
        conflicts = self._check_showing_conflicts(property_id, requested_date)
        if conflicts:
            return {
                'error': 'Time slot not available',
                'conflicts': conflicts
            }

        showing = ShowingRequest(
            showing_id=self._generate_showing_id(),
            property_id=property_id,
            buyer_agent_id=buyer_agent_id,
            buyer_name=buyer_name,
            requested_date=requested_date,
            duration_minutes=30,
            status='pending',
            notes=''
        )

        self.showings.append(showing)

        # Notify listing agent
        self._notify_listing_agent(property.listing_agent_id, showing)

        return {
            'success': True,
            'showing_id': showing.showing_id,
            'status': 'pending_confirmation'
        }

    def calculate_price_per_sqft(self, property: Property) -> Decimal:
        """Calculate price per square foot"""
        if property.square_feet == 0:
            return Decimal('0')

        price_per_sqft = property.listing_price / property.square_feet
        return price_per_sqft.quantize(Decimal('0.01'))

    def generate_cma(self,
                    subject_property: Property,
                    radius_miles: float = 1.0) -> dict:
        """Generate Comparative Market Analysis (CMA)"""
        # Find comparable properties
        comparables = []

        for property in self.properties.values():
            # Skip the subject property
            if property.property_id == subject_property.property_id:
                continue

            # Similar property type
            if property.property_type != subject_property.property_type:
                continue

            # Recently sold (last 6 months)
            if property.status != ListingStatus.SOLD:
                continue

            days_since_sale = (datetime.now() - property.listing_date).days
            if days_since_sale > 180:
                continue

            # Within radius
            distance = self._calculate_distance(
                subject_property.coordinates,
                property.coordinates
            )
            if distance > radius_miles:
                continue

            # Similar size (within 20%)
            size_diff = abs(property.square_feet - subject_property.square_feet)
            size_diff_pct = size_diff / subject_property.square_feet
            if size_diff_pct > 0.2:
                continue

            # Similar bedrooms
            if abs(property.bedrooms - subject_property.bedrooms) > 1:
                continue

            comparables.append(property)

        if not comparables:
            return {'error': 'No comparable properties found'}

        # Calculate statistics
        prices = [float(p.listing_price) for p in comparables]
        price_per_sqft_values = [
            float(self.calculate_price_per_sqft(p)) for p in comparables
        ]

        avg_price = sum(prices) / len(prices)
        avg_price_per_sqft = sum(price_per_sqft_values) / len(price_per_sqft_values)

        # Estimate subject property value
        estimated_value = avg_price_per_sqft * subject_property.square_feet

        return {
            'subject_property_id': subject_property.property_id,
            'comparable_count': len(comparables),
            'comparables': [
                {
                    'property_id': p.property_id,
                    'address': p.address,
                    'price': float(p.listing_price),
                    'square_feet': p.square_feet,
                    'price_per_sqft': float(self.calculate_price_per_sqft(p))
                }
                for p in comparables[:5]  # Top 5 comparables
            ],
            'market_statistics': {
                'average_price': avg_price,
                'average_price_per_sqft': avg_price_per_sqft,
                'min_price': min(prices),
                'max_price': max(prices)
            },
            'estimated_value': estimated_value,
            'suggested_listing_price': estimated_value * 0.98  # Slightly below estimate
        }

    def save_search(self, user_id: str, search_criteria: dict) -> str:
        """Save search criteria for notifications"""
        search_id = self._generate_search_id()

        self.saved_searches[search_id] = {
            'user_id': user_id,
            'criteria': search_criteria,
            'created_at': datetime.now(),
            'active': True
        }

        return search_id

    def _calculate_distance(self, coord1: tuple, coord2: tuple) -> float:
        """Calculate distance between two coordinates (miles)"""
        from math import radians, sin, cos, sqrt, atan2

        lat1, lon1 = radians(coord1[0]), radians(coord1[1])
        lat2, lon2 = radians(coord2[0]), radians(coord2[1])

        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))

        radius_miles = 3959  # Earth's radius in miles
        distance = radius_miles * c

        return distance

    def _check_showing_conflicts(self,
                                property_id: str,
                                requested_date: datetime) -> List[dict]:
        """Check for scheduling conflicts"""
        conflicts = []

        for showing in self.showings:
            if showing.property_id != property_id:
                continue

            if showing.status == 'cancelled':
                continue

            # Check for time overlap (within 1 hour)
            time_diff = abs((showing.requested_date - requested_date).total_seconds() / 3600)
            if time_diff < 1:
                conflicts.append({
                    'showing_id': showing.showing_id,
                    'time': showing.requested_date.isoformat()
                })

        return conflicts

    def _notify_saved_searches(self, property: Property):
        """Notify users with matching saved searches"""
        # Implementation would check saved searches and send notifications
        pass

    def _notify_listing_agent(self, agent_id: str, showing: ShowingRequest):
        """Notify listing agent of showing request"""
        # Implementation would send email/SMS notification
        pass

    def _generate_property_id(self) -> str:
        import uuid
        return f"PROP-{uuid.uuid4().hex[:8].upper()}"

    def _generate_mls_number(self) -> str:
        import uuid
        return f"MLS-{uuid.uuid4().hex[:10].upper()}"

    def _generate_showing_id(self) -> str:
        import uuid
        return f"SHOW-{uuid.uuid4().hex[:8].upper()}"

    def _generate_search_id(self) -> str:
        import uuid
        return f"SEARCH-{uuid.uuid4().hex[:8].upper()}"
```
