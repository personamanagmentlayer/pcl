# Supply Chain Expert

---

skill_id: supply-chain-expert
name: Supply Chain Expert
allowed-tools:

- Read
- Write
- Bash
- WebSearch
  category: domains
  tags: [supply-chain, logistics, inventory, procurement, demand-planning, supplier-management, warehouse, scm]
  version: 1.0.0
  author: PCL Standard Library
  dependencies: []
  complexity: expert
  estimated_time: 45 minutes
  objectives:
- Master supply chain management systems
- Understand demand forecasting and planning
- Implement inventory optimization strategies
- Apply supplier relationship management
- Navigate logistics and distribution networks
  prerequisites:
- Understanding of supply chain fundamentals
- Knowledge of inventory management principles
- Familiarity with logistics operations
- Experience with ERP or SCM systems
  outcome: Build comprehensive supply chain solutions including demand planning, inventory management, supplier coordination, and logistics optimization

---

## Core Concepts

### Supply Chain Planning

Strategic and tactical planning processes including demand forecasting, supply planning, production scheduling, and sales and operations planning (S&OP) to balance supply and demand.

### Inventory Management

Systems for tracking, controlling, and optimizing inventory levels across locations using methods like EOQ, JIT, safety stock calculations, and ABC analysis to minimize costs while meeting service levels.

### Procurement & Supplier Management

End-to-end procurement processes including supplier selection, contract management, purchase order processing, supplier performance monitoring, and strategic sourcing decisions.

### Warehouse & Distribution

Management of warehouse operations including receiving, putaway, picking, packing, shipping, and distribution network optimization to ensure efficient order fulfillment.

### Logistics Coordination

Planning and execution of transportation, freight management, route optimization, carrier selection, and tracking to move goods efficiently through the supply chain.

## Code Examples

### Supply Chain Management Core

```python
from datetime import datetime, date, timedelta
from enum import Enum
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
from decimal import Decimal
import uuid

class OrderStatus(Enum):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    ORDERED = "ordered"
    IN_TRANSIT = "in_transit"
    RECEIVED = "received"
    CANCELLED = "cancelled"

class InventoryStatus(Enum):
    AVAILABLE = "available"
    RESERVED = "reserved"
    IN_TRANSIT = "in_transit"
    DAMAGED = "damaged"
    QUARANTINE = "quarantine"

@dataclass
class Product:
    product_id: str
    sku: str
    name: str
    category: str
    unit_cost: Decimal
    unit_price: Decimal
    lead_time_days: int
    min_order_qty: int = 1
    weight_kg: float = 0
    dimensions: Dict[str, float] = field(default_factory=dict)  # length, width, height

@dataclass
class Location:
    location_id: str
    name: str
    location_type: str  # warehouse, distribution_center, store, supplier
    address: Dict[str, str]
    capacity: Optional[int] = None
    active: bool = True

@dataclass
class InventoryItem:
    inventory_id: str
    product_id: str
    location_id: str
    quantity: int
    status: InventoryStatus
    lot_number: Optional[str] = None
    expiration_date: Optional[date] = None
    last_counted: Optional[datetime] = None

@dataclass
class Supplier:
    supplier_id: str
    name: str
    contact_name: str
    email: str
    phone: str
    address: Dict[str, str]
    payment_terms: str
    lead_time_days: int
    rating: float = 0  # 0-5 scale
    products_supplied: List[str] = field(default_factory=list)

@dataclass
class PurchaseOrder:
    po_number: str
    supplier_id: str
    order_date: date
    expected_delivery: date
    status: OrderStatus
    items: List[Dict[str, Any]]  # [{product_id, quantity, unit_price}]
    total_amount: Decimal
    shipping_address: Dict[str, str]
    notes: str = ""
    received_date: Optional[date] = None

    def calculate_total(self) -> Decimal:
        return sum(Decimal(str(item['quantity'])) *
                  Decimal(str(item['unit_price']))
                  for item in self.items)

class SupplyChainManager:
    def __init__(self):
        self.products: Dict[str, Product] = {}
        self.locations: Dict[str, Location] = {}
        self.inventory: List[InventoryItem] = []
        self.suppliers: Dict[str, Supplier] = {}
        self.purchase_orders: Dict[str, PurchaseOrder] = {}

    def add_product(self, product_data: Dict) -> Product:
        """Add product to catalog"""
        product = Product(
            product_id=product_data.get('product_id', str(uuid.uuid4())),
            sku=product_data['sku'],
            name=product_data['name'],
            category=product_data['category'],
            unit_cost=Decimal(str(product_data['unit_cost'])),
            unit_price=Decimal(str(product_data['unit_price'])),
            lead_time_days=product_data['lead_time_days'],
            min_order_qty=product_data.get('min_order_qty', 1),
            weight_kg=product_data.get('weight_kg', 0)
        )
        self.products[product.product_id] = product
        return product

    def get_inventory_level(self, product_id: str,
                           location_id: Optional[str] = None) -> int:
        """Get available inventory for product"""
        inventory_items = [i for i in self.inventory
                          if i.product_id == product_id and
                          i.status == InventoryStatus.AVAILABLE]

        if location_id:
            inventory_items = [i for i in inventory_items
                             if i.location_id == location_id]

        return sum(i.quantity for i in inventory_items)

    def calculate_reorder_point(self, product_id: str,
                               avg_daily_demand: float,
                               service_level: float = 0.95) -> int:
        """Calculate reorder point using lead time demand + safety stock"""
        product = self.products.get(product_id)
        if not product:
            return 0

        # Lead time demand
        lead_time_demand = avg_daily_demand * product.lead_time_days

        # Safety stock (simplified - in production would use demand variability)
        # Using service level to approximate z-score
        z_score = 1.65 if service_level == 0.95 else 1.96  # 95% or 99%
        safety_stock = z_score * (avg_daily_demand ** 0.5) * (product.lead_time_days ** 0.5)

        return int(lead_time_demand + safety_stock)

    def calculate_economic_order_quantity(self, product_id: str,
                                         annual_demand: int,
                                         ordering_cost: Decimal,
                                         holding_cost_rate: float = 0.25) -> int:
        """Calculate EOQ (Economic Order Quantity)"""
        product = self.products.get(product_id)
        if not product:
            return 0

        # EOQ = sqrt((2 * D * S) / H)
        # D = annual demand, S = ordering cost, H = holding cost per unit
        holding_cost = product.unit_cost * Decimal(str(holding_cost_rate))

        eoq = ((2 * annual_demand * ordering_cost) / holding_cost) ** 0.5

        # Round to min order quantity
        eoq = max(int(eoq), product.min_order_qty)

        return eoq

    def create_purchase_order(self, po_data: Dict) -> PurchaseOrder:
        """Create purchase order"""
        po = PurchaseOrder(
            po_number=po_data.get('po_number', f"PO-{len(self.purchase_orders)}"),
            supplier_id=po_data['supplier_id'],
            order_date=po_data.get('order_date', date.today()),
            expected_delivery=po_data['expected_delivery'],
            status=OrderStatus.DRAFT,
            items=po_data['items'],
            total_amount=Decimal(0),
            shipping_address=po_data['shipping_address'],
            notes=po_data.get('notes', '')
        )

        po.total_amount = po.calculate_total()
        self.purchase_orders[po.po_number] = po

        return po

    def receive_purchase_order(self, po_number: str,
                              received_items: Dict[str, int],
                              location_id: str):
        """Receive goods from purchase order"""
        po = self.purchase_orders.get(po_number)
        if not po:
            raise ValueError("Purchase order not found")

        po.status = OrderStatus.RECEIVED
        po.received_date = date.today()

        # Add to inventory
        for product_id, quantity in received_items.items():
            inventory_item = InventoryItem(
                inventory_id=str(uuid.uuid4()),
                product_id=product_id,
                location_id=location_id,
                quantity=quantity,
                status=InventoryStatus.AVAILABLE,
                last_counted=datetime.now()
            )
            self.inventory.append(inventory_item)

    def transfer_inventory(self, product_id: str, quantity: int,
                          from_location: str, to_location: str):
        """Transfer inventory between locations"""
        # Find available inventory at source
        source_inventory = [i for i in self.inventory
                          if i.product_id == product_id and
                          i.location_id == from_location and
                          i.status == InventoryStatus.AVAILABLE]

        available_qty = sum(i.quantity for i in source_inventory)

        if available_qty < quantity:
            raise ValueError("Insufficient inventory for transfer")

        # Deduct from source
        remaining = quantity
        for inv_item in source_inventory:
            if remaining <= 0:
                break

            deduct = min(inv_item.quantity, remaining)
            inv_item.quantity -= deduct
            remaining -= deduct

        # Add to destination
        dest_item = InventoryItem(
            inventory_id=str(uuid.uuid4()),
            product_id=product_id,
            location_id=to_location,
            quantity=quantity,
            status=InventoryStatus.AVAILABLE,
            last_counted=datetime.now()
        )
        self.inventory.append(dest_item)

    def get_inventory_valuation(self, location_id: Optional[str] = None) -> Dict:
        """Calculate total inventory value"""
        inventory_items = self.inventory

        if location_id:
            inventory_items = [i for i in inventory_items
                             if i.location_id == location_id]

        total_value = Decimal(0)
        total_units = 0

        for item in inventory_items:
            if item.status == InventoryStatus.AVAILABLE:
                product = self.products.get(item.product_id)
                if product:
                    total_value += product.unit_cost * item.quantity
                    total_units += item.quantity

        return {
            'total_value': total_value,
            'total_units': total_units,
            'by_category': self._value_by_category(inventory_items)
        }

    def _value_by_category(self, inventory_items: List[InventoryItem]) -> Dict:
        """Calculate inventory value by product category"""
        category_values = {}

        for item in inventory_items:
            if item.status != InventoryStatus.AVAILABLE:
                continue

            product = self.products.get(item.product_id)
            if not product:
                continue

            if product.category not in category_values:
                category_values[product.category] = Decimal(0)

            category_values[product.category] += product.unit_cost * item.quantity

        return category_values
```

### Demand Forecasting System

```python
from typing import List, Tuple
from collections import defaultdict

@dataclass
class DemandHistory:
    product_id: str
    date: date
    quantity: int
    location_id: Optional[str] = None

@dataclass
class DemandForecast:
    product_id: str
    forecast_date: date
    forecasted_quantity: int
    confidence_level: float
    method: str  # moving_average, exponential_smoothing, etc.

class DemandForecasting:
    def __init__(self):
        self.demand_history: List[DemandHistory] = []
        self.forecasts: List[DemandForecast] = []

    def record_demand(self, product_id: str, date: date, quantity: int,
                     location_id: Optional[str] = None):
        """Record historical demand"""
        demand = DemandHistory(
            product_id=product_id,
            date=date,
            quantity=quantity,
            location_id=location_id
        )
        self.demand_history.append(demand)

    def simple_moving_average(self, product_id: str,
                             periods: int = 3) -> float:
        """Calculate simple moving average forecast"""
        # Get recent demand
        product_demand = [d for d in self.demand_history
                         if d.product_id == product_id]

        if len(product_demand) < periods:
            return 0

        # Sort by date and get last N periods
        product_demand.sort(key=lambda d: d.date, reverse=True)
        recent_demand = product_demand[:periods]

        avg = sum(d.quantity for d in recent_demand) / periods
        return avg

    def exponential_smoothing(self, product_id: str,
                             alpha: float = 0.3) -> float:
        """Calculate exponential smoothing forecast"""
        product_demand = [d for d in self.demand_history
                         if d.product_id == product_id]

        if not product_demand:
            return 0

        # Sort by date
        product_demand.sort(key=lambda d: d.date)

        # Initialize with first actual value
        forecast = float(product_demand[0].quantity)

        # Apply exponential smoothing
        for demand in product_demand[1:]:
            forecast = alpha * demand.quantity + (1 - alpha) * forecast

        return forecast

    def calculate_forecast_accuracy(self, product_id: str,
                                   periods: int = 12) -> Dict[str, float]:
        """Calculate forecast accuracy metrics"""
        # Get actual vs forecasted
        product_history = [d for d in self.demand_history
                          if d.product_id == product_id]

        if len(product_history) < periods:
            return {}

        product_history.sort(key=lambda d: d.date, reverse=True)
        recent = product_history[:periods]

        errors = []
        abs_errors = []
        pct_errors = []

        for actual in recent:
            # Find corresponding forecast
            forecast = next((f for f in self.forecasts
                           if f.product_id == product_id and
                           f.forecast_date == actual.date), None)

            if forecast:
                error = actual.quantity - forecast.forecasted_quantity
                errors.append(error)
                abs_errors.append(abs(error))

                if actual.quantity > 0:
                    pct_error = abs(error) / actual.quantity * 100
                    pct_errors.append(pct_error)

        if not errors:
            return {}

        # Calculate metrics
        return {
            'mean_error': sum(errors) / len(errors),  # Bias
            'mean_absolute_error': sum(abs_errors) / len(abs_errors),  # MAE
            'mean_absolute_percentage_error': (sum(pct_errors) / len(pct_errors)
                                              if pct_errors else 0)  # MAPE
        }

    def generate_forecast(self, product_id: str, forecast_date: date,
                         method: str = "exponential_smoothing") -> DemandForecast:
        """Generate demand forecast"""
        if method == "moving_average":
            forecasted_qty = self.simple_moving_average(product_id)
        else:  # exponential_smoothing
            forecasted_qty = self.exponential_smoothing(product_id)

        forecast = DemandForecast(
            product_id=product_id,
            forecast_date=forecast_date,
            forecasted_quantity=int(forecasted_qty),
            confidence_level=0.85,
            method=method
        )

        self.forecasts.append(forecast)
        return forecast
```

### Supplier Performance Management

```python
@dataclass
class SupplierMetrics:
    supplier_id: str
    on_time_delivery_rate: float  # percentage
    quality_acceptance_rate: float  # percentage
    average_lead_time_days: float
    total_orders: int
    total_value: Decimal
    last_evaluation_date: datetime

@dataclass
class DeliveryPerformance:
    po_number: str
    supplier_id: str
    expected_date: date
    actual_date: date
    on_time: bool
    days_variance: int

class SupplierPerformanceManager:
    def __init__(self, scm: SupplyChainManager):
        self.scm = scm
        self.delivery_records: List[DeliveryPerformance] = []
        self.metrics: Dict[str, SupplierMetrics] = {}

    def record_delivery(self, po_number: str, actual_date: date):
        """Record delivery performance"""
        po = self.scm.purchase_orders.get(po_number)
        if not po:
            return

        days_variance = (actual_date - po.expected_delivery).days
        on_time = days_variance <= 0

        delivery = DeliveryPerformance(
            po_number=po_number,
            supplier_id=po.supplier_id,
            expected_date=po.expected_delivery,
            actual_date=actual_date,
            on_time=on_time,
            days_variance=days_variance
        )

        self.delivery_records.append(delivery)

    def calculate_supplier_metrics(self, supplier_id: str,
                                   days: int = 90) -> SupplierMetrics:
        """Calculate supplier performance metrics"""
        cutoff = date.today() - timedelta(days=days)

        # Get supplier's POs
        supplier_pos = [po for po in self.scm.purchase_orders.values()
                       if po.supplier_id == supplier_id and
                       po.order_date >= cutoff]

        if not supplier_pos:
            return SupplierMetrics(
                supplier_id=supplier_id,
                on_time_delivery_rate=0,
                quality_acceptance_rate=0,
                average_lead_time_days=0,
                total_orders=0,
                total_value=Decimal(0),
                last_evaluation_date=datetime.now()
            )

        # On-time delivery rate
        supplier_deliveries = [d for d in self.delivery_records
                             if d.supplier_id == supplier_id]

        on_time_count = len([d for d in supplier_deliveries if d.on_time])
        otd_rate = (on_time_count / len(supplier_deliveries) * 100
                   if supplier_deliveries else 0)

        # Average lead time
        lead_times = [abs(d.days_variance) for d in supplier_deliveries]
        avg_lead_time = sum(lead_times) / len(lead_times) if lead_times else 0

        # Total value
        total_value = sum(po.total_amount for po in supplier_pos)

        metrics = SupplierMetrics(
            supplier_id=supplier_id,
            on_time_delivery_rate=otd_rate,
            quality_acceptance_rate=95.0,  # Would track quality issues in production
            average_lead_time_days=avg_lead_time,
            total_orders=len(supplier_pos),
            total_value=total_value,
            last_evaluation_date=datetime.now()
        )

        self.metrics[supplier_id] = metrics
        return metrics

    def get_supplier_scorecard(self, supplier_id: str) -> Dict[str, Any]:
        """Generate supplier scorecard"""
        metrics = self.calculate_supplier_metrics(supplier_id)
        supplier = self.scm.suppliers.get(supplier_id)

        if not supplier:
            return {}

        # Calculate overall score (weighted)
        weights = {
            'on_time_delivery': 0.4,
            'quality': 0.4,
            'cost': 0.2
        }

        overall_score = (
            metrics.on_time_delivery_rate * weights['on_time_delivery'] +
            metrics.quality_acceptance_rate * weights['quality'] +
            75 * weights['cost']  # Simplified cost score
        ) / 100 * 5  # Convert to 5-point scale

        return {
            'supplier_id': supplier_id,
            'supplier_name': supplier.name,
            'overall_score': round(overall_score, 2),
            'on_time_delivery_rate': metrics.on_time_delivery_rate,
            'quality_rate': metrics.quality_acceptance_rate,
            'average_lead_time': metrics.average_lead_time_days,
            'total_orders_90d': metrics.total_orders,
            'total_spend_90d': metrics.total_value
        }
```

## Best Practices

### Inventory Management

- Implement ABC analysis for inventory prioritization
- Use safety stock calculations based on demand variability
- Regular cycle counting and physical inventory
- Track inventory turnover ratio
- Implement FIFO/FEFO for perishable goods
- Monitor slow-moving and obsolete inventory
- Use automated reorder points

### Demand Planning

- Use multiple forecasting methods
- Collaborate with sales and marketing
- Account for seasonality and trends
- Regular forecast accuracy tracking
- Implement S&OP process
- Update forecasts based on actual demand
- Consider external factors (market, economy)

### Supplier Management

- Diversify supplier base for risk mitigation
- Develop strategic partnerships
- Track supplier performance metrics
- Conduct regular business reviews
- Implement supplier development programs
- Clear contracts and SLAs
- Maintain contingency suppliers

### Logistics Optimization

- Optimize warehouse layout and processes
- Use route optimization algorithms
- Consolidate shipments when possible
- Track transportation costs and KPIs
- Implement track and trace systems
- Balance speed vs cost in shipping
- Measure on-time delivery performance

## Anti-Patterns

### Poor Practices

- Reactive vs proactive inventory management
- Single source supplier dependency
- Ignoring demand forecast accuracy
- Excessive safety stock or stockouts
- Poor visibility across supply chain
- Manual processes and spreadsheets
- Not tracking supplier performance
- Inadequate contingency planning

### Common Mistakes

- Ordering without demand analysis
- Ignoring lead time variability
- Poor communication with suppliers
- Not optimizing inventory locations
- Lack of real-time data
- Ignoring total cost of ownership
- No risk management strategy
- Underinvesting in technology

## Resources

### SCM Platforms

- SAP SCM - Enterprise supply chain
- Oracle SCM Cloud - Cloud-based solution
- Blue Yonder - AI-driven SCM
- Kinaxis RapidResponse - S&OP platform
- Manhattan Associates - WMS and TMS
- Llamasoft - Supply chain design

### Methodologies

- SCOR Model - Supply Chain Operations Reference
- Lean Supply Chain principles
- Six Sigma for quality
- Theory of Constraints
- JIT (Just-In-Time)

### Industry Organizations

- APICS / ASCM - Supply chain education
- CSCMP - Council of Supply Chain Management
- ISM - Institute for Supply Management

### Learning Resources

- MIT Center for Transportation & Logistics
- APICS CPIM and CSCP certifications
- Supply Chain Dive publications
- Gartner Supply Chain research

---

_Part of the PCL Standard Library - Master supply chain management and optimize end-to-end logistics operations._
