# Hospitality Expert — Property Management System

Reference material for the `hospitality-expert` skill. See [SKILL.md](../SKILL.md).

## Property Management System

```python
from dataclasses import dataclass
from datetime import datetime, timedelta, date
from typing import List, Optional, Dict
from decimal import Decimal
from enum import Enum

class RoomType(Enum):
    STANDARD = "standard"
    DELUXE = "deluxe"
    SUITE = "suite"
    EXECUTIVE = "executive"

class RoomStatus(Enum):
    VACANT_CLEAN = "vacant_clean"
    VACANT_DIRTY = "vacant_dirty"
    OCCUPIED_CLEAN = "occupied_clean"
    OCCUPIED_DIRTY = "occupied_dirty"
    OUT_OF_ORDER = "out_of_order"
    OUT_OF_SERVICE = "out_of_service"

class ReservationStatus(Enum):
    CONFIRMED = "confirmed"
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

@dataclass
class Room:
    """Hotel room information"""
    room_number: str
    room_type: RoomType
    floor: int
    status: RoomStatus
    base_rate: Decimal
    features: List[str]
    bed_type: str
    max_occupancy: int
    square_feet: int
    is_smoking: bool

@dataclass
class Reservation:
    """Guest reservation"""
    reservation_id: str
    guest_name: str
    guest_email: str
    guest_phone: str
    room_type: RoomType
    check_in_date: date
    check_out_date: date
    num_adults: int
    num_children: int
    status: ReservationStatus
    rate_per_night: Decimal
    total_amount: Decimal
    special_requests: str
    created_at: datetime
    booking_source: str  # 'direct', 'ota', 'phone', etc.
    assigned_room: Optional[str]

@dataclass
class Folio:
    """Guest folio (bill)"""
    folio_id: str
    reservation_id: str
    room_number: str
    guest_name: str
    charges: List[Dict]
    total_charges: Decimal
    payments: List[Dict]
    balance: Decimal

class PropertyManagementSystem:
    """Hotel property management system"""

    def __init__(self):
        self.rooms = {}
        self.reservations = {}
        self.folios = {}
        self.guests = {}

    def create_reservation(self, reservation_data: dict) -> Reservation:
        """Create new reservation"""
        reservation_id = self._generate_reservation_id()

        # Calculate total amount
        check_in = reservation_data['check_in_date']
        check_out = reservation_data['check_out_date']
        num_nights = (check_out - check_in).days

        rate_per_night = Decimal(str(reservation_data['rate_per_night']))
        total_amount = rate_per_night * num_nights

        reservation = Reservation(
            reservation_id=reservation_id,
            guest_name=reservation_data['guest_name'],
            guest_email=reservation_data['guest_email'],
            guest_phone=reservation_data['guest_phone'],
            room_type=RoomType(reservation_data['room_type']),
            check_in_date=check_in,
            check_out_date=check_out,
            num_adults=reservation_data['num_adults'],
            num_children=reservation_data.get('num_children', 0),
            status=ReservationStatus.CONFIRMED,
            rate_per_night=rate_per_night,
            total_amount=total_amount,
            special_requests=reservation_data.get('special_requests', ''),
            created_at=datetime.now(),
            booking_source=reservation_data.get('booking_source', 'direct'),
            assigned_room=None
        )

        self.reservations[reservation_id] = reservation

        return reservation

    def check_in_guest(self, reservation_id: str) -> dict:
        """Process guest check-in"""
        reservation = self.reservations.get(reservation_id)
        if not reservation:
            return {'error': 'Reservation not found'}

        # Find available room of requested type
        available_room = self._find_available_room(
            reservation.room_type,
            reservation.check_in_date,
            reservation.check_out_date
        )

        if not available_room:
            return {'error': 'No rooms available of requested type'}

        # Assign room
        reservation.assigned_room = available_room.room_number
        reservation.status = ReservationStatus.CHECKED_IN

        # Update room status
        available_room.status = RoomStatus.OCCUPIED_CLEAN

        # Create folio
        folio = self._create_folio(reservation, available_room)

        return {
            'reservation_id': reservation_id,
            'room_number': available_room.room_number,
            'guest_name': reservation.guest_name,
            'check_in_time': datetime.now().isoformat(),
            'check_out_date': reservation.check_out_date.isoformat(),
            'folio_id': folio.folio_id
        }

    def check_out_guest(self, reservation_id: str) -> dict:
        """Process guest check-out"""
        reservation = self.reservations.get(reservation_id)
        if not reservation:
            return {'error': 'Reservation not found'}

        # Get folio
        folio = next(
            (f for f in self.folios.values() if f.reservation_id == reservation_id),
            None
        )

        if not folio:
            return {'error': 'Folio not found'}

        # Check for outstanding balance
        if folio.balance > 0:
            return {
                'error': 'Outstanding balance',
                'balance_due': float(folio.balance)
            }

        # Update reservation status
        reservation.status = ReservationStatus.CHECKED_OUT

        # Update room status
        if reservation.assigned_room:
            room = self.rooms.get(reservation.assigned_room)
            if room:
                room.status = RoomStatus.VACANT_DIRTY

        return {
            'reservation_id': reservation_id,
            'guest_name': reservation.guest_name,
            'check_out_time': datetime.now().isoformat(),
            'total_charges': float(folio.total_charges),
            'folio_summary': {
                'room_charges': float(folio.total_charges),
                'payments_received': float(folio.total_charges - folio.balance)
            }
        }

    def _find_available_room(self,
                            room_type: RoomType,
                            check_in: date,
                            check_out: date) -> Optional[Room]:
        """Find available room of specified type"""
        for room in self.rooms.values():
            if room.room_type != room_type:
                continue

            if room.status not in [RoomStatus.VACANT_CLEAN, RoomStatus.VACANT_DIRTY]:
                continue

            # Check if room is available for date range
            if self._is_room_available(room.room_number, check_in, check_out):
                return room

        return None

    def _is_room_available(self, room_number: str, check_in: date, check_out: date) -> bool:
        """Check if room is available for date range"""
        for reservation in self.reservations.values():
            if reservation.assigned_room != room_number:
                continue

            if reservation.status in [ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW]:
                continue

            # Check for date overlap
            if not (check_out <= reservation.check_in_date or check_in >= reservation.check_out_date):
                return False

        return True

    def _create_folio(self, reservation: Reservation, room: Room) -> Folio:
        """Create guest folio"""
        folio_id = self._generate_folio_id()

        # Calculate room charges
        num_nights = (reservation.check_out_date - reservation.check_in_date).days
        room_charge = reservation.rate_per_night * num_nights

        charges = [{
            'date': datetime.now(),
            'description': f'Room {room.room_number} - {num_nights} nights',
            'amount': float(room_charge)
        }]

        folio = Folio(
            folio_id=folio_id,
            reservation_id=reservation.reservation_id,
            room_number=room.room_number,
            guest_name=reservation.guest_name,
            charges=charges,
            total_charges=room_charge,
            payments=[],
            balance=room_charge
        )

        self.folios[folio_id] = folio

        return folio

    def post_charge(self, folio_id: str, charge_data: dict) -> dict:
        """Post charge to guest folio"""
        folio = self.folios.get(folio_id)
        if not folio:
            return {'error': 'Folio not found'}

        charge = {
            'date': datetime.now(),
            'description': charge_data['description'],
            'amount': float(Decimal(str(charge_data['amount'])))
        }

        folio.charges.append(charge)
        folio.total_charges += Decimal(str(charge_data['amount']))
        folio.balance += Decimal(str(charge_data['amount']))

        return {
            'folio_id': folio_id,
            'charge_posted': charge,
            'new_balance': float(folio.balance)
        }

    def process_payment(self, folio_id: str, payment_data: dict) -> dict:
        """Process payment for folio"""
        folio = self.folios.get(folio_id)
        if not folio:
            return {'error': 'Folio not found'}

        payment_amount = Decimal(str(payment_data['amount']))

        if payment_amount > folio.balance:
            return {'error': 'Payment exceeds balance'}

        payment = {
            'date': datetime.now(),
            'payment_method': payment_data['payment_method'],
            'amount': float(payment_amount)
        }

        folio.payments.append(payment)
        folio.balance -= payment_amount

        return {
            'folio_id': folio_id,
            'payment_processed': payment,
            'remaining_balance': float(folio.balance)
        }

    def get_room_availability(self, check_in: date, check_out: date) -> dict:
        """Get room availability for date range"""
        availability = {}

        for room_type in RoomType:
            available_count = 0

            for room in self.rooms.values():
                if room.room_type == room_type:
                    if self._is_room_available(room.room_number, check_in, check_out):
                        available_count += 1

            availability[room_type.value] = available_count

        return {
            'check_in_date': check_in.isoformat(),
            'check_out_date': check_out.isoformat(),
            'availability': availability
        }

    def _generate_reservation_id(self) -> str:
        import uuid
        return f"RES-{uuid.uuid4().hex[:10].upper()}"

    def _generate_folio_id(self) -> str:
        import uuid
        return f"FOL-{uuid.uuid4().hex[:8].upper()}"
```
