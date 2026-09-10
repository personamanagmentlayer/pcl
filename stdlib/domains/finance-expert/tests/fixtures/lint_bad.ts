/**
 * Checkout helpers for the storefront web client.
 *
 * Fixture for money_lint.py. Every defect is deliberate and the comment above
 * it names the check it is meant to trip.
 *
 * Expected: C01 C03 C04 C05 C07 C08 C09 C10 C13 C15
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_KEY as string);

// C10 -- the webhook signing secret, committed.
const WEBHOOK_SECRET = 'whsec_NOTAREAL000000';

// C05 -- the shape carries three amounts and no currency.
// C01 -- and holds them as `number`, i.e. IEEE-754 doubles.
export interface CartLine {
  sku: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

// C03 -- toFixed rounds a double and hands back a string.
export function displayTotal(line: CartLine): string {
  return line.lineTotal.toFixed(2);
}

// C03 -- Math.round on an amount, with no declared rounding mode.
// C01 -- the amount parameter is a `number`.
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

// C04 -- an even division across sellers; the odd cents evaporate.
// C01 -- the running total is a `number`.
export function perSeller(orderTotal: number, sellers: string[]): number {
  return orderTotal / sellers.length;
}

// C07 -- a capture with no idempotency key; the retry captures twice.
export async function capturePayment(intentId: string, amountMinor: number) {
  return await stripe.paymentIntents.capture(intentId, {
    amount_to_capture: amountMinor,
  });
}

// C08 -- the handler trusts whatever POSTs to it.
export async function handlePspWebhook(req: any, res: any) {
  const event = JSON.parse(req.body);
  await applyEvent(event);
  res.status(200).send('');
}

// C09 -- the card number and the CVV land in the browser console.
export function debugCard(cardNumber: string, cvv: string) {
  console.log(`charging cardNumber=${cardNumber} cvv=${cvv}`);
}

// C13 -- a host-local clock decides which accounting period this lands in.
export function stampCapture(amountMinor: number) {
  const capturedAt = new Date();
  return { amountMinor, capturedAt };
}

// C15 -- an amount compared to a float literal.
// C01 -- and the amount is a `number`.
export function isFree(orderAmount: number): boolean {
  return orderAmount === 0.0;
}

async function applyEvent(event: unknown): Promise<void> {
  await Promise.resolve(event);
}

export { WEBHOOK_SECRET };
