# Retail Expert — Point of Sale System

Reference material for the `retail-expert` skill. See [SKILL.md](../SKILL.md).

## Point of Sale System

```python
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from enum import Enum

class PaymentMethod(Enum):
    CASH = "cash"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    MOBILE_PAYMENT = "mobile_payment"
    GIFT_CARD = "gift_card"

class TransactionStatus(Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    VOIDED = "voided"
    REFUNDED = "refunded"

@dataclass
class Product:
    """Product/SKU information"""
    sku: str
    name: str
    description: str
    price: Decimal
    cost: Decimal
    barcode: str
    category: str
    department: str
    tax_rate: Decimal
    is_taxable: bool
    stock_quantity: int
    reorder_point: int

@dataclass
class LineItem:
    """Transaction line item"""
    sku: str
    product_name: str
    quantity: int
    unit_price: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    line_total: Decimal

@dataclass
class Transaction:
    """POS transaction"""
    transaction_id: str
    store_id: str
    register_id: str
    cashier_id: str
    timestamp: datetime
    items: List[LineItem]
    subtotal: Decimal
    tax_total: Decimal
    discount_total: Decimal
    grand_total: Decimal
    payment_method: PaymentMethod
    status: TransactionStatus
    customer_id: Optional[str]

class POSSystem:
    """Point of Sale system"""

    def __init__(self, store_id: str, register_id: str):
        self.store_id = store_id
        self.register_id = register_id
        self.current_transaction = None
        self.products = {}

    def start_transaction(self, cashier_id: str) -> str:
        """Start new transaction"""
        transaction_id = self._generate_transaction_id()

        self.current_transaction = Transaction(
            transaction_id=transaction_id,
            store_id=self.store_id,
            register_id=self.register_id,
            cashier_id=cashier_id,
            timestamp=datetime.now(),
            items=[],
            subtotal=Decimal('0'),
            tax_total=Decimal('0'),
            discount_total=Decimal('0'),
            grand_total=Decimal('0'),
            payment_method=None,
            status=TransactionStatus.PENDING,
            customer_id=None
        )

        return transaction_id

    def scan_item(self, barcode: str, quantity: int = 1) -> dict:
        """Scan and add item to transaction"""
        if not self.current_transaction:
            return {'error': 'No active transaction'}

        # Lookup product
        product = self._lookup_product(barcode)
        if not product:
            return {'error': 'Product not found', 'barcode': barcode}

        # Check inventory
        if product.stock_quantity < quantity:
            return {
                'error': 'Insufficient inventory',
                'available': product.stock_quantity
            }

        # Calculate line item totals
        unit_price = product.price
        line_subtotal = unit_price * quantity
        discount_amount = Decimal('0')  # Apply promotions here

        # Calculate tax
        tax_amount = Decimal('0')
        if product.is_taxable:
            tax_amount = (line_subtotal - discount_amount) * product.tax_rate

        line_total = line_subtotal - discount_amount + tax_amount

        # Create line item
        line_item = LineItem(
            sku=product.sku,
            product_name=product.name,
            quantity=quantity,
            unit_price=unit_price,
            discount_amount=discount_amount,
            tax_amount=tax_amount,
            line_total=line_total
        )

        # Add to transaction
        self.current_transaction.items.append(line_item)

        # Update transaction totals
        self._recalculate_totals()

        return {
            'success': True,
            'item': {
                'name': product.name,
                'quantity': quantity,
                'price': float(unit_price),
                'line_total': float(line_total)
            },
            'transaction_total': float(self.current_transaction.grand_total)
        }

    def apply_discount(self, discount_code: str) -> dict:
        """Apply discount/promotion to transaction"""
        if not self.current_transaction:
            return {'error': 'No active transaction'}

        discount = self._validate_discount(discount_code)
        if not discount:
            return {'error': 'Invalid discount code'}

        # Apply discount based on type
        if discount['type'] == 'percentage':
            discount_amount = self.current_transaction.subtotal * (discount['value'] / 100)
        elif discount['type'] == 'fixed':
            discount_amount = Decimal(str(discount['value']))
        else:
            return {'error': 'Unknown discount type'}

        self.current_transaction.discount_total += discount_amount
        self._recalculate_totals()

        return {
            'success': True,
            'discount_applied': float(discount_amount),
            'new_total': float(self.current_transaction.grand_total)
        }

    def process_payment(self,
                       payment_method: PaymentMethod,
                       amount: Decimal,
                       payment_details: dict = None) -> dict:
        """Process payment for transaction"""
        if not self.current_transaction:
            return {'error': 'No active transaction'}

        if amount < self.current_transaction.grand_total:
            return {'error': 'Insufficient payment amount'}

        # Process payment through payment gateway
        payment_result = self._process_payment_gateway(
            payment_method,
            amount,
            payment_details
        )

        if not payment_result['success']:
            return payment_result

        # Complete transaction
        self.current_transaction.payment_method = payment_method
        self.current_transaction.status = TransactionStatus.COMPLETED

        # Update inventory
        self._update_inventory()

        # Calculate change
        change = amount - self.current_transaction.grand_total

        # Generate receipt
        receipt = self._generate_receipt()

        transaction_id = self.current_transaction.transaction_id
        self.current_transaction = None  # Clear current transaction

        return {
            'success': True,
            'transaction_id': transaction_id,
            'amount_paid': float(amount),
            'change': float(change),
            'receipt': receipt
        }

    def void_transaction(self, reason: str) -> dict:
        """Void current transaction"""
        if not self.current_transaction:
            return {'error': 'No active transaction'}

        self.current_transaction.status = TransactionStatus.VOIDED
        transaction_id = self.current_transaction.transaction_id
        self.current_transaction = None

        return {
            'success': True,
            'transaction_id': transaction_id,
            'reason': reason
        }

    def _recalculate_totals(self):
        """Recalculate transaction totals"""
        self.current_transaction.subtotal = sum(
            item.unit_price * item.quantity for item in self.current_transaction.items
        )

        self.current_transaction.tax_total = sum(
            item.tax_amount for item in self.current_transaction.items
        )

        self.current_transaction.grand_total = (
            self.current_transaction.subtotal +
            self.current_transaction.tax_total -
            self.current_transaction.discount_total
        )

    def _lookup_product(self, barcode: str) -> Optional[Product]:
        """Lookup product by barcode"""
        return self.products.get(barcode)

    def _validate_discount(self, discount_code: str) -> Optional[dict]:
        """Validate and retrieve discount details"""
        # Implementation would check against promotion database
        return None

    def _process_payment_gateway(self,
                                payment_method: PaymentMethod,
                                amount: Decimal,
                                details: dict) -> dict:
        """Process payment through gateway"""
        # Integration with payment processor (Stripe, Square, etc.)
        return {'success': True, 'transaction_id': 'pay_123456'}

    def _update_inventory(self):
        """Update inventory after sale"""
        for item in self.current_transaction.items:
            product = self.products.get(item.sku)
            if product:
                product.stock_quantity -= item.quantity

    def _generate_receipt(self) -> dict:
        """Generate transaction receipt"""
        return {
            'transaction_id': self.current_transaction.transaction_id,
            'timestamp': self.current_transaction.timestamp.isoformat(),
            'items': [
                {
                    'name': item.product_name,
                    'qty': item.quantity,
                    'price': float(item.unit_price),
                    'total': float(item.line_total)
                }
                for item in self.current_transaction.items
            ],
            'subtotal': float(self.current_transaction.subtotal),
            'tax': float(self.current_transaction.tax_total),
            'discount': float(self.current_transaction.discount_total),
            'total': float(self.current_transaction.grand_total)
        }

    def _generate_transaction_id(self) -> str:
        """Generate unique transaction ID"""
        import uuid
        return f"TXN-{uuid.uuid4().hex[:12].upper()}"
```
