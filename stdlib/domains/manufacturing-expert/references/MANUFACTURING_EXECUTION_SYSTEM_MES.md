# Manufacturing Expert — Manufacturing Execution System (MES)

Reference material for the `manufacturing-expert` skill. See [SKILL.md](../SKILL.md).

## Manufacturing Execution System (MES)

```python
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List, Optional
from enum import Enum

class OrderStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ON_HOLD = "on_hold"
    CANCELLED = "cancelled"

class MachineStatus(Enum):
    IDLE = "idle"
    RUNNING = "running"
    MAINTENANCE = "maintenance"
    ERROR = "error"
    OFFLINE = "offline"

@dataclass
class WorkOrder:
    """Manufacturing work order"""
    order_id: str
    product_id: str
    quantity: int
    priority: int  # 1 (highest) to 5 (lowest)
    due_date: datetime
    status: OrderStatus
    assigned_line: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    actual_quantity: int = 0
    defect_quantity: int = 0

@dataclass
class Machine:
    """Production machine/equipment"""
    machine_id: str
    machine_type: str
    status: MachineStatus
    current_order: Optional[str]
    production_rate: float  # units per hour
    uptime_percentage: float
    last_maintenance: datetime
    next_maintenance: datetime
    oee: float  # Overall Equipment Effectiveness

@dataclass
class ProductionMetrics:
    """Real-time production metrics"""
    timestamp: datetime
    line_id: str
    produced_units: int
    defective_units: int
    downtime_minutes: int
    cycle_time_seconds: float
    efficiency_percentage: float

class ManufacturingExecutionSystem:
    """MES for production management"""

    def __init__(self):
        self.work_orders = {}
        self.machines = {}
        self.production_data = []

    def create_work_order(self,
                         product_id: str,
                         quantity: int,
                         due_date: datetime,
                         priority: int = 3) -> WorkOrder:
        """Create new production work order"""
        order_id = self._generate_order_id()

        order = WorkOrder(
            order_id=order_id,
            product_id=product_id,
            quantity=quantity,
            priority=priority,
            due_date=due_date,
            status=OrderStatus.PENDING,
            assigned_line=None,
            started_at=None,
            completed_at=None
        )

        self.work_orders[order_id] = order
        return order

    def schedule_production(self) -> List[dict]:
        """Schedule work orders to production lines"""
        # Get pending orders sorted by priority and due date
        pending_orders = [
            order for order in self.work_orders.values()
            if order.status == OrderStatus.PENDING
        ]

        sorted_orders = sorted(
            pending_orders,
            key=lambda x: (x.priority, x.due_date)
        )

        # Get available machines
        available_machines = [
            machine for machine in self.machines.values()
            if machine.status in [MachineStatus.IDLE, MachineStatus.RUNNING]
        ]

        schedule = []

        for order in sorted_orders:
            # Find best machine for this order
            best_machine = self._find_best_machine(order, available_machines)

            if best_machine:
                # Calculate estimated completion time
                production_time = order.quantity / best_machine.production_rate
                estimated_completion = datetime.now() + timedelta(hours=production_time)

                schedule.append({
                    'order_id': order.order_id,
                    'machine_id': best_machine.machine_id,
                    'estimated_start': datetime.now(),
                    'estimated_completion': estimated_completion,
                    'estimated_duration_hours': production_time
                })

                # Update order
                order.assigned_line = best_machine.machine_id
                order.status = OrderStatus.IN_PROGRESS

        return schedule

    def _find_best_machine(self, order: WorkOrder, machines: List[Machine]) -> Optional[Machine]:
        """Find optimal machine for work order"""
        if not machines:
            return None

        # Score machines based on multiple factors
        scored_machines = []

        for machine in machines:
            score = 0

            # Prefer machines with higher OEE
            score += machine.oee * 50

            # Prefer machines that are idle
            if machine.status == MachineStatus.IDLE:
                score += 30

            # Prefer machines with recent maintenance
            days_since_maintenance = (datetime.now() - machine.last_maintenance).days
            score += max(0, 20 - days_since_maintenance)

            scored_machines.append((score, machine))

        # Return highest scoring machine
        scored_machines.sort(reverse=True, key=lambda x: x[0])
        return scored_machines[0][1]

    def record_production(self,
                         order_id: str,
                         produced: int,
                         defective: int = 0) -> dict:
        """Record production output"""
        order = self.work_orders.get(order_id)
        if not order:
            return {'error': 'Order not found'}

        order.actual_quantity += produced
        order.defect_quantity += defective

        # Check if order is complete
        if order.actual_quantity >= order.quantity:
            order.status = OrderStatus.COMPLETED
            order.completed_at = datetime.now()

            # Calculate metrics
            duration = order.completed_at - order.started_at
            yield_rate = ((order.actual_quantity - order.defect_quantity) /
                         order.actual_quantity * 100)

            return {
                'order_id': order_id,
                'status': 'completed',
                'duration_hours': duration.total_seconds() / 3600,
                'yield_rate': yield_rate,
                'total_produced': order.actual_quantity,
                'total_defective': order.defect_quantity
            }

        return {
            'order_id': order_id,
            'status': 'in_progress',
            'progress_percentage': (order.actual_quantity / order.quantity) * 100
        }

    def calculate_oee(self,
                     machine_id: str,
                     time_period_hours: int = 24) -> dict:
        """Calculate Overall Equipment Effectiveness"""
        machine = self.machines.get(machine_id)
        if not machine:
            return {'error': 'Machine not found'}

        # OEE = Availability × Performance × Quality

        # Availability: (Operating Time / Planned Production Time)
        planned_time = time_period_hours * 60  # minutes
        downtime = self._get_downtime(machine_id, time_period_hours)
        operating_time = planned_time - downtime
        availability = operating_time / planned_time

        # Performance: (Actual Production / Ideal Production)
        actual_production = self._get_production_count(machine_id, time_period_hours)
        ideal_production = machine.production_rate * time_period_hours
        performance = actual_production / ideal_production if ideal_production > 0 else 0

        # Quality: (Good Units / Total Units)
        defects = self._get_defect_count(machine_id, time_period_hours)
        quality = (actual_production - defects) / actual_production if actual_production > 0 else 0

        oee = availability * performance * quality

        return {
            'machine_id': machine_id,
            'period_hours': time_period_hours,
            'oee': oee * 100,  # Percentage
            'availability': availability * 100,
            'performance': performance * 100,
            'quality': quality * 100,
            'world_class_oee': 85.0  # Benchmark
        }

    def _get_downtime(self, machine_id: str, hours: int) -> float:
        """Get machine downtime in minutes"""
        # Query production data for downtime
        # Implementation would aggregate from time-series data
        return 0.0

    def _get_production_count(self, machine_id: str, hours: int) -> int:
        """Get production count for machine"""
        # Implementation would query production records
        return 0

    def _get_defect_count(self, machine_id: str, hours: int) -> int:
        """Get defect count for machine"""
        # Implementation would query quality records
        return 0

    def _generate_order_id(self) -> str:
        """Generate unique order ID"""
        import uuid
        return f"WO-{uuid.uuid4().hex[:8].upper()}"
```
