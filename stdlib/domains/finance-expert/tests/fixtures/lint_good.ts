/**
 * Checkout, capture and settlement helpers for the storefront web client.
 *
 * The same program as `lint_bad.ts`, written the way the money model requires.
 * money_lint.py must report zero findings here.
 *
 * Money model (M4): an amount is a pair -- an exact count of minor units held
 * as `bigint`, and an ISO 4217 code -- carried together by `Money`. A `number`
 * never holds an amount: it is an IEEE-754 double and 0.1 + 0.2 is not 0.3.
 * Rounding happens once, at a declared point, with a declared mode (M5), and
 * splitting uses largest remainder so the parts sum exactly to the whole (M5).
 * Every mutating call to the provider carries a caller-derived idempotency key
 * (M7). The webhook verifies a signature and fails closed before it reads the
 * payload (M8). Timestamps are instants rendered as UTC ISO 8601 and the
 * accounting period is derived from the event, not the booking (M10). Nothing
 * regulated and no credential is written to a log (M15).
 */

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type Stripe from 'stripe';

export type CurrencyCode = 'EUR' | 'GBP' | 'USD' | 'JPY';

/** ISO 4217 minor-unit exponents for the currencies this client accepts. */
export const MINOR_UNIT_EXPONENT: Readonly<Record<CurrencyCode, number>> = {
  EUR: 2,
  GBP: 2,
  USD: 2,
  JPY: 0,
};

/** An exact quantity of minor units, inseparable from its currency. */
export interface Money {
  readonly minorUnits: bigint;
  readonly currency: CurrencyCode;
}

export function money(minorUnits: bigint, currency: CurrencyCode): Money {
  return { minorUnits, currency };
}

/** M6: cross-currency arithmetic is refused rather than silently performed. */
function sameCurrency(left: Money, right: Money): CurrencyCode {
  if (left.currency !== right.currency) {
    throw new RangeError(`${left.currency} and ${right.currency} do not add`);
  }
  return left.currency;
}

export function add(left: Money, right: Money): Money {
  return money(left.minorUnits + right.minorUnits, sameCurrency(left, right));
}

export function subtract(left: Money, right: Money): Money {
  return money(left.minorUnits - right.minorUnits, sameCurrency(left, right));
}

export function multiply(value: Money, factor: bigint): Money {
  return money(value.minorUnits * factor, value.currency);
}

/** Exact comparison: minor units are integers, so equality means equality. */
export function isZero(value: Money): boolean {
  return value.minorUnits === 0n;
}

// ---------------------------------------------------------------------------
// M5: one rounding point, one declared mode.
// ---------------------------------------------------------------------------

export type RoundingMode = 'half-even' | 'half-up' | 'down';

/**
 * Integer division with an explicit rounding mode. Nothing here ever touches
 * a double, so the result is the exact rounded quotient and not an
 * approximation of it.
 */
export function divideRound(
  numerator: bigint,
  denominator: bigint,
  mode: RoundingMode
): bigint {
  if (denominator <= 0n) {
    throw new RangeError('denominator must be positive');
  }
  const negative = numerator < 0n;
  const magnitude = negative ? -numerator : numerator;
  const whole = magnitude / denominator;
  const rest = magnitude % denominator;
  let rounded = whole;
  if (mode !== 'down' && rest > 0n) {
    const doubled = rest * 2n;
    const halfway = doubled === denominator;
    if (doubled > denominator) {
      rounded = whole + 1n;
    } else if (halfway && (mode === 'half-up' || whole % 2n === 1n)) {
      rounded = whole + 1n;
    }
  }
  return negative ? -rounded : rounded;
}

/** Scale money by an exact ratio, rounding once at a declared mode. */
export function scaleMoney(
  value: Money,
  numerator: bigint,
  denominator: bigint,
  mode: RoundingMode
): Money {
  return money(
    divideRound(value.minorUnits * numerator, denominator, mode),
    value.currency
  );
}

/** VAT expressed in basis points, so the rate itself is exact too. */
export function taxOn(net: Money, rateBasisPoints: bigint): Money {
  return scaleMoney(net, rateBasisPoints, 10000n, 'half-even');
}

/**
 * M5: largest remainder. The parts sum exactly to the whole, always -- the
 * odd minor units are handed to the largest remainders rather than dropped.
 */
export function allocate(total: Money, weights: readonly bigint[]): Money[] {
  if (weights.length === 0 || weights.some((w) => w < 0n)) {
    throw new RangeError('weights must be non-empty and non-negative');
  }
  const weightTotal = weights.reduce((acc, w) => acc + w, 0n);
  if (weightTotal === 0n) {
    throw new RangeError('weights must not all be zero');
  }
  const shares = weights.map((w) => (total.minorUnits * w) / weightTotal);
  const ranked = weights
    .map((w, index) => ({
      index,
      remainder: (total.minorUnits * w) % weightTotal,
    }))
    .sort((a, b) =>
      a.remainder === b.remainder
        ? a.index - b.index
        : a.remainder < b.remainder
          ? 1
          : -1
    );
  let leftover = total.minorUnits - shares.reduce((acc, s) => acc + s, 0n);
  for (const slot of ranked) {
    if (leftover === 0n) {
      break;
    }
    shares[slot.index] += 1n;
    leftover -= 1n;
  }
  return shares.map((minorUnits) => money(minorUnits, total.currency));
}

// ---------------------------------------------------------------------------
// Display. Formatting is string work on the exact integer, not arithmetic.
// ---------------------------------------------------------------------------

export function formatMoney(value: Money): string {
  const exponent = MINOR_UNIT_EXPONENT[value.currency];
  const negative = value.minorUnits < 0n;
  const magnitude = negative ? -value.minorUnits : value.minorUnits;
  const digits = magnitude.toString().padStart(exponent + 1, '0');
  const whole = digits.slice(0, digits.length - exponent);
  const fraction =
    exponent === 0 ? '' : `.${digits.slice(digits.length - exponent)}`;
  return `${negative ? '-' : ''}${whole}${fraction} ${value.currency}`;
}

// ---------------------------------------------------------------------------
// The basket. Every amount on the wire is a Money, so a currency travels with
// it and no shape can be summed across two of them.
// ---------------------------------------------------------------------------

export interface CartLine {
  readonly sku: string;
  readonly unitPrice: Money;
  readonly quantity: number;
  readonly lineTotal: Money;
}

export function extend(
  sku: string,
  unitPrice: Money,
  quantity: number
): CartLine {
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new RangeError('quantity must be a positive integer');
  }
  return {
    sku,
    unitPrice,
    quantity,
    lineTotal: multiply(unitPrice, BigInt(quantity)),
  };
}

export function orderTotal(
  cart: readonly CartLine[],
  shipping: Money,
  taxRateBasisPoints: bigint
): Money {
  if (cart.length === 0) {
    throw new RangeError('an order needs at least one line');
  }
  const goods = cart
    .slice(1)
    .reduce((acc, line) => add(acc, line.lineTotal), cart[0].lineTotal);
  const net = add(goods, shipping);
  return add(net, taxOn(net, taxRateBasisPoints));
}

// ---------------------------------------------------------------------------
// M10: time is threefold, and every instant is rendered in UTC. The clock is
// injected so the period a capture lands in never depends on the host's zone.
// ---------------------------------------------------------------------------

export interface BookingStamp {
  readonly occurredAt: string;
  readonly bookedAt: string;
  readonly period: string;
}

export type Clock = () => Date;

export function stamp(occurred: Date, clock: Clock): BookingStamp {
  const bookedAt = clock();
  if (bookedAt.getTime() < occurred.getTime()) {
    throw new RangeError('a booking cannot precede the event it records');
  }
  return {
    occurredAt: occurred.toISOString(),
    bookedAt: bookedAt.toISOString(),
    // The period follows the event, not the booking: an event at
    // 2026-08-31T23:40Z booked on 2 September still belongs to 2026-08.
    period: occurred.toISOString().slice(0, 7),
  };
}

// ---------------------------------------------------------------------------
// M7: every mutating call carries a key derived from the business action, so
// a retry replays the outcome instead of moving money a second time.
// ---------------------------------------------------------------------------

export function idempotencyKeyFor(
  action: string,
  orderId: string,
  attemptOf: string
): string {
  return createHash('sha256')
    .update(`${action}:${orderId}:${attemptOf}`)
    .digest('hex');
}

/**
 * The provider's SDK types its amounts as `number`. Crossing that boundary is
 * a conversion with a precondition, not a cast: the value has to be an exact
 * integer count of minor units inside the safe-integer range, and an amount
 * that is not fails loudly here rather than being silently rounded on the
 * wire. Money is never held as a `number` on this side of the boundary.
 */
export function minorUnitsForGateway(value: Money): number {
  const safe = BigInt(Number.MAX_SAFE_INTEGER);
  if (value.minorUnits > safe || value.minorUnits < -safe) {
    throw new RangeError(
      `${formatMoney(value)} is outside the safe integer range`
    );
  }
  return Number(value.minorUnits);
}

export async function capturePayment(
  gateway: Stripe,
  intentId: string,
  price: Money,
  orderId: string
): Promise<Stripe.PaymentIntent> {
  return gateway.paymentIntents.capture(
    intentId,
    { amount_to_capture: minorUnitsForGateway(price) },
    { idempotencyKey: idempotencyKeyFor('capture', orderId, intentId) }
  );
}

export async function refundCharge(
  gateway: Stripe,
  chargeId: string,
  price: Money,
  orderId: string
): Promise<Stripe.Refund> {
  return gateway.charges.refund(
    chargeId,
    {
      amount: minorUnitsForGateway(price),
      currency: price.currency.toLowerCase(),
    },
    { idempotencyKey: idempotencyKeyFor('refund', orderId, chargeId) }
  );
}

// ---------------------------------------------------------------------------
// M8: the provider webhook is verified and fails closed. Only then is the
// payload parsed, and only then is the event deduplicated on its own id.
// ---------------------------------------------------------------------------

export interface PspEvent {
  readonly id: string;
  readonly type: string;
  readonly occurredAt: string;
  readonly amountMinorUnits: string;
  readonly currency: CurrencyCode;
}

export interface InboundRequest {
  readonly rawBody: Buffer;
  readonly headers: Readonly<Record<string, string | undefined>>;
}

export interface HandlerResult {
  readonly status: number;
  readonly body: string;
}

export class SignatureRejected extends Error {}

function signingKey(): Buffer {
  const configured = process.env.PSP_WEBHOOK_SIGNING_SECRET;
  if (!configured) {
    throw new Error('PSP_WEBHOOK_SIGNING_SECRET is not configured');
  }
  return Buffer.from(configured, 'utf8');
}

export function parseVerified(rawBody: Buffer, presented: string): PspEvent {
  const expected = createHmac('sha256', signingKey()).update(rawBody).digest();
  const offered = Buffer.from(presented, 'hex');
  if (
    offered.length !== expected.length ||
    !timingSafeEqual(offered, expected)
  ) {
    throw new SignatureRejected('the presented signature did not match');
  }
  return JSON.parse(rawBody.toString('utf8')) as PspEvent;
}

export async function handlePspWebhook(
  request: InboundRequest,
  seen: (eventId: string) => Promise<boolean>,
  apply: (event: PspEvent) => Promise<void>
): Promise<HandlerResult> {
  let event: PspEvent;
  try {
    event = parseVerified(
      request.rawBody,
      request.headers['psp-signature'] ?? ''
    );
  } catch {
    return { status: 400, body: 'rejected' };
  }
  if (await seen(event.id)) {
    return { status: 200, body: 'duplicate' };
  }
  await apply(event);
  return { status: 200, body: 'ok' };
}

export function eventAmount(event: PspEvent): Money {
  return money(BigInt(event.amountMinorUnits), event.currency);
}

// ---------------------------------------------------------------------------
// M15: an opaque token and the last four digits. Nothing else leaves the
// vault, and nothing else reaches a log line.
// ---------------------------------------------------------------------------

export interface CardReference {
  readonly networkToken: string;
  readonly last4: string;
}

export function logAuthorisation(
  logger: { info: (fields: Record<string, unknown>, message: string) => void },
  card: CardReference,
  orderId: string,
  price: Money
): void {
  logger.info(
    {
      orderId,
      token: card.networkToken,
      last4: card.last4,
      amount: formatMoney(price),
    },
    'authorisation accepted'
  );
}
