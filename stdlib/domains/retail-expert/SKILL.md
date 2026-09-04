---
name: retail-expert
version: 1.1.0
description: >-
  Expert-level retail systems, POS, inventory management, e-commerce, customer analytics,
  and omnichannel retail. Use when the user mentions POS, ecommerce, inventory, CRM, or
  omnichannel, or when the task involves Retail Systems, Omnichannel Retail, Technologies,
  or POS Operations.
category: domains
tags: [retail, pos, ecommerce, inventory, crm, omnichannel]
allowed-tools:
  - Read
  - Write
  - Edit
---

# Retail Expert

Expert guidance for retail systems, point-of-sale solutions, inventory management, e-commerce platforms, customer analytics, and omnichannel retail strategies.

## Core Concepts

### Retail Systems

- Point of Sale (POS) systems
- Inventory Management Systems (IMS)
- Customer Relationship Management (CRM)
- Order Management Systems (OMS)
- Warehouse Management Systems (WMS)
- E-commerce platforms
- Payment processing

### Omnichannel Retail

- Online-to-offline (O2O) integration
- Buy online, pick up in store (BOPIS)
- Ship from store
- Unified customer profiles
- Cross-channel inventory visibility
- Consistent pricing across channels
- Integrated loyalty programs

### Technologies

- Mobile POS (mPOS)
- Self-checkout systems
- Electronic shelf labels (ESL)
- RFID for inventory tracking
- Computer vision for analytics
- AI-powered recommendations
- Contactless payments

## Inventory Management

```python
import numpy as np
from datetime import datetime, timedelta

class InventoryManagementSystem:
    """Inventory management and optimization"""

    def __init__(self):
        self.products = {}
        self.warehouses = {}
        self.transfer_orders = []

    def calculate_reorder_point(self,
                               average_daily_demand: float,
                               lead_time_days: int,
                               service_level: float = 0.95) -> dict:
        """Calculate optimal reorder point"""
        # Safety stock calculation
        demand_std_dev = average_daily_demand * 0.2  # Assume 20% variation

        # Z-score for service level
        from scipy import stats
        z_score = stats.norm.ppf(service_level)

        safety_stock = z_score * demand_std_dev * np.sqrt(lead_time_days)
        reorder_point = (average_daily_demand * lead_time_days) + safety_stock

        return {
            'reorder_point': int(np.ceil(reorder_point)),
            'safety_stock': int(np.ceil(safety_stock)),
            'average_daily_demand': average_daily_demand,
            'lead_time_days': lead_time_days,
            'service_level': service_level
        }

    def calculate_economic_order_quantity(self,
                                         annual_demand: float,
                                         ordering_cost: Decimal,
                                         holding_cost_per_unit: Decimal) -> dict:
        """Calculate Economic Order Quantity (EOQ)"""
        eoq = np.sqrt(
            (2 * annual_demand * float(ordering_cost)) /
            float(holding_cost_per_unit)
        )

        # Calculate total annual cost
        number_of_orders = annual_demand / eoq
        ordering_cost_total = number_of_orders * float(ordering_cost)
        holding_cost_total = (eoq / 2) * float(holding_cost_per_unit)
        total_cost = ordering_cost_total + holding_cost_total

        return {
            'eoq': int(np.ceil(eoq)),
            'orders_per_year': number_of_orders,
            'order_frequency_days': int(365 / number_of_orders),
            'total_annual_cost': total_cost,
            'ordering_cost': ordering_cost_total,
            'holding_cost': holding_cost_total
        }

    def analyze_abc(self, products: List[dict]) -> dict:
        """ABC analysis for inventory classification"""
        # Calculate annual value for each product
        for product in products:
            product['annual_value'] = (
                product['unit_cost'] * product['annual_demand']
            )

        # Sort by annual value
        sorted_products = sorted(
            products,
            key=lambda x: x['annual_value'],
            reverse=True
        )

        total_value = sum(p['annual_value'] for p in sorted_products)
        cumulative_value = 0
        results = {'A': [], 'B': [], 'C': []}

        for product in sorted_products:
            cumulative_value += product['annual_value']
            percentage = (cumulative_value / total_value) * 100

            if percentage <= 80:
                category = 'A'  # Top 20% items, 80% value
            elif percentage <= 95:
                category = 'B'  # Next 30% items, 15% value
            else:
                category = 'C'  # Bottom 50% items, 5% value

            product['abc_category'] = category
            results[category].append(product)

        return {
            'classification': results,
            'summary': {
                'A_items': len(results['A']),
                'B_items': len(results['B']),
                'C_items': len(results['C']),
                'total_value': total_value
            }
        }

    def forecast_demand(self,
                       historical_sales: List[float],
                       periods_ahead: int = 12) -> dict:
        """Forecast future demand using exponential smoothing"""
        # Triple exponential smoothing (Holt-Winters)
        alpha = 0.3  # Level smoothing
        beta = 0.1   # Trend smoothing
        gamma = 0.2  # Seasonality smoothing
        season_length = 12  # Monthly seasonality

        n = len(historical_sales)
        forecast = []

        # Initialize level and trend
        level = np.mean(historical_sales[:season_length])
        trend = (np.mean(historical_sales[season_length:2*season_length]) -
                np.mean(historical_sales[:season_length])) / season_length

        # Initialize seasonal indices
        seasonal = np.array(historical_sales[:season_length]) / level

        # Generate forecasts
        for i in range(periods_ahead):
            season_idx = i % season_length
            forecast_value = (level + trend * (i + 1)) * seasonal[season_idx]
            forecast.append(max(0, forecast_value))

        return {
            'forecast': forecast,
            'periods_ahead': periods_ahead,
            'method': 'holt_winters',
            'confidence_interval_95': self._calculate_confidence_interval(
                historical_sales,
                forecast
            )
        }

    def check_stock_levels(self) -> List[dict]:
        """Check stock levels and generate alerts"""
        alerts = []

        for sku, product in self.products.items():
            # Check for low stock
            if product.stock_quantity <= product.reorder_point:
                alerts.append({
                    'type': 'reorder',
                    'severity': 'high',
                    'sku': sku,
                    'product_name': product.name,
                    'current_stock': product.stock_quantity,
                    'reorder_point': product.reorder_point,
                    'action': 'Place purchase order'
                })

            # Check for overstock
            max_stock = product.reorder_point * 3
            if product.stock_quantity > max_stock:
                alerts.append({
                    'type': 'overstock',
                    'severity': 'medium',
                    'sku': sku,
                    'product_name': product.name,
                    'current_stock': product.stock_quantity,
                    'max_stock': max_stock,
                    'action': 'Review purchasing strategy'
                })

            # Check for no sales (dead stock)
            # Implementation would check sales history

        return alerts

    def _calculate_confidence_interval(self,
                                      historical: List[float],
                                      forecast: List[float]) -> dict:
        """Calculate 95% confidence interval for forecast"""
        # Simplified confidence interval
        std_error = np.std(historical) * 1.5
        return {
            'lower': [max(0, f - 1.96 * std_error) for f in forecast],
            'upper': [f + 1.96 * std_error for f in forecast]
        }
```

## Customer Analytics

```python
from sklearn.cluster import KMeans
import pandas as pd

class CustomerAnalytics:
    """Customer segmentation and analytics"""

    def __init__(self):
        self.customers = {}
        self.transactions = []

    def calculate_rfm(self, customer_transactions: pd.DataFrame) -> pd.DataFrame:
        """Calculate RFM (Recency, Frequency, Monetary) scores"""
        current_date = datetime.now()

        rfm = customer_transactions.groupby('customer_id').agg({
            'transaction_date': lambda x: (current_date - x.max()).days,  # Recency
            'transaction_id': 'count',  # Frequency
            'amount': 'sum'  # Monetary
        })

        rfm.columns = ['recency', 'frequency', 'monetary']

        # Calculate RFM scores (1-5 scale)
        rfm['r_score'] = pd.qcut(rfm['recency'], 5, labels=[5, 4, 3, 2, 1])
        rfm['f_score'] = pd.qcut(rfm['frequency'].rank(method='first'), 5, labels=[1, 2, 3, 4, 5])
        rfm['m_score'] = pd.qcut(rfm['monetary'], 5, labels=[1, 2, 3, 4, 5])

        # Combined RFM score
        rfm['rfm_score'] = (
            rfm['r_score'].astype(int) +
            rfm['f_score'].astype(int) +
            rfm['m_score'].astype(int)
        )

        return rfm

    def segment_customers(self, rfm_data: pd.DataFrame) -> dict:
        """Segment customers based on RFM scores"""
        segments = {}

        for customer_id, row in rfm_data.iterrows():
            r, f, m = int(row['r_score']), int(row['f_score']), int(row['m_score'])

            if r >= 4 and f >= 4 and m >= 4:
                segment = 'Champions'
            elif r >= 3 and f >= 3 and m >= 3:
                segment = 'Loyal Customers'
            elif r >= 4 and f <= 2:
                segment = 'New Customers'
            elif r <= 2 and f >= 3:
                segment = 'At Risk'
            elif r <= 2 and f <= 2:
                segment = 'Lost Customers'
            elif m >= 4:
                segment = 'Big Spenders'
            else:
                segment = 'Regular Customers'

            segments[customer_id] = {
                'segment': segment,
                'rfm_scores': {'r': r, 'f': f, 'm': m}
            }

        return segments

    def calculate_customer_lifetime_value(self,
                                         average_purchase_value: Decimal,
                                         purchase_frequency: float,
                                         customer_lifespan_years: float) -> Decimal:
        """Calculate Customer Lifetime Value (CLV)"""
        clv = (
            float(average_purchase_value) *
            purchase_frequency *
            customer_lifespan_years
        )

        return Decimal(str(clv)).quantize(Decimal('0.01'))

    def predict_churn(self, customer_features: dict) -> dict:
        """Predict customer churn probability"""
        # Features: recency, frequency, monetary, days_since_last_purchase, etc.
        # This would use a trained ML model

        churn_score = 0.35  # Placeholder

        if churn_score > 0.7:
            risk = 'high'
            action = 'Send personalized offer immediately'
        elif churn_score > 0.4:
            risk = 'medium'
            action = 'Include in next marketing campaign'
        else:
            risk = 'low'
            action = 'Continue regular engagement'

        return {
            'churn_probability': churn_score,
            'risk_level': risk,
            'recommended_action': action
        }

    def recommend_products(self,
                          customer_id: str,
                          top_n: int = 5) -> List[dict]:
        """Generate product recommendations"""
        # Collaborative filtering or content-based recommendations
        # This would use recommendation algorithms

        recommendations = [
            {
                'sku': 'PROD001',
                'name': 'Recommended Product 1',
                'score': 0.95,
                'reason': 'Frequently bought together'
            }
        ]

        return recommendations[:top_n]
```

## Best Practices

### POS Operations

- Ensure POS system uptime (99.9%+)
- Implement offline mode for network outages
- Use barcode scanning for accuracy
- Support multiple payment methods
- Enable quick item lookup
- Implement receipt management (print/email)
- Track cashier performance metrics

### Inventory Management

- Implement cycle counting programs
- Use ABC analysis for prioritization
- Maintain accurate stock records
- Set appropriate reorder points
- Use RFID for high-value items
- Implement first-in-first-out (FIFO)
- Track inventory turnover ratios

### E-commerce

- Optimize for mobile shopping
- Implement abandoned cart recovery
- Use high-quality product images
- Enable customer reviews
- Provide multiple shipping options
- Implement real-time inventory updates
- Support guest checkout

### Customer Experience

- Personalize marketing communications
- Implement loyalty programs
- Provide omnichannel support
- Enable easy returns and exchanges
- Use customer feedback
- Implement chatbots for support
- Track Net Promoter Score (NPS)

## Anti-Patterns

❌ No inventory tracking or inaccurate counts
❌ Single payment method only
❌ Poor checkout experience (slow/complex)
❌ No customer data collection
❌ Siloed online and offline systems
❌ Manual price updates across locations
❌ No backup for POS systems
❌ Ignoring cart abandonment
❌ No product recommendations

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Point of Sale System](references/POINT_OF_SALE_SYSTEM.md)

## Resources

- NRF (National Retail Federation): https://nrf.com/
- Shopify Developer Docs: https://shopify.dev/
- Square Developer Platform: https://developer.squareup.com/
- WooCommerce: https://woocommerce.com/
- Magento: https://magento.com/
- Retail Analytics Council: https://www.retailanalyticscouncil.com/
- GS1 Standards: https://www.gs1.org/
