import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db';
import { cache } from '../../cache';
import { config } from '../../config';

export interface CheckoutInput {
  reservation_id: string;
  user_id: string;
  simulate_outcome?: 'APPROVED' | 'REJECTED' | 'RANDOM';
  payment_method?: string;
  attendees?: { name: string; email: string; seat_number?: string }[];
}

export class PaymentsService {
  /**
   * Process simulated checkout for a held reservation.
   * Atomically confirms hold, converts reserved counts to sold counts, and creates order/tickets/transaction.
   */
  async processCheckout(input: CheckoutInput) {
    const outcome = input.simulate_outcome || (Math.random() < config.mockPaymentFailureRate ? 'REJECTED' : 'APPROVED');

    return await db.transaction(async (tx) => {
      // 1. Fetch and verify reservation hold
      const hold = await tx.getOne<{
        id: string;
        user_id: string;
        event_id: string;
        status: string;
        expires_at: string;
        total_amount: number;
      }>('SELECT * FROM reservation_holds WHERE id = ?', [input.reservation_id]);

      if (!hold) {
        throw new Error('Reservation hold not found');
      }

      if (hold.user_id !== input.user_id) {
        throw new Error('Unauthorized: You do not own this reservation');
      }

      if (hold.status === 'EXPIRED' || (hold.status === 'PENDING' && new Date() > new Date(hold.expires_at))) {
        const err = new Error('Reservation hold has expired. Your seats have been released back to the event pool.');
        (err as any).statusCode = 410; // Gone
        throw err;
      }

      if (hold.status === 'CONFIRMED') {
        throw new Error('This reservation has already been confirmed and paid');
      }

      if (hold.status === 'RELEASED') {
        throw new Error('This reservation was previously released or cancelled');
      }

      // Fetch event & tenant details
      const event = await tx.getOne<{ tenant_id: string; title: string }>('SELECT tenant_id, title FROM events WHERE id = ?', [hold.event_id]);
      if (!event) {
        throw new Error('Associated event not found');
      }

      const items = await tx.query<{
        id: string;
        tier_id: string;
        seat_number: string;
        quantity: number;
        unit_price: number;
      }>('SELECT * FROM reservation_items WHERE reservation_id = ?', [hold.id]);

      const gatewayTxId = `mock_tx_${uuidv4().replace(/-/g, '').substring(0, 16)}`;

      if (outcome === 'REJECTED') {
        // Payment failed: release reserved seats back to available pool
        for (const item of items) {
          await tx.execute(
            'UPDATE ticket_tiers SET reserved_count = MAX(0, reserved_count - ?) WHERE id = ?',
            [item.quantity, item.tier_id]
          );
        }

        await tx.execute(
          "UPDATE reservation_holds SET status = 'RELEASED', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [hold.id]
        );

        const orderId = uuidv4();
        await tx.execute(`
          INSERT INTO orders (id, reservation_id, user_id, tenant_id, total_amount, status)
          VALUES (?, ?, ?, ?, ?, 'FAILED')
        `, [orderId, hold.id, input.user_id, event.tenant_id, hold.total_amount]);

        const txId = uuidv4();
        await tx.execute(`
          INSERT INTO transactions (id, order_id, payment_gateway, gateway_transaction_id, amount, status, failure_reason)
          VALUES (?, ?, 'MOCK_GATEWAY', ?, ?, 'REJECTED', 'Simulated Card Decline: Insufficient Funds')
        `, [txId, orderId, gatewayTxId, hold.total_amount]);

        await cache.del(`event:${hold.event_id}`);
        await cache.delByPattern('events:*');

        const failureErr = new Error('Payment was declined by mock payment gateway (Simulated Decline). Held seats have been released.');
        (failureErr as any).statusCode = 402; // Payment Required
        (failureErr as any).details = { gateway_transaction_id: gatewayTxId, status: 'REJECTED' };
        throw failureErr;
      }

      // Outcome is APPROVED: Confirm reservation
      await tx.execute(
        "UPDATE reservation_holds SET status = 'CONFIRMED', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [hold.id]
      );

      // Decrement reserved_count and increment sold_count
      for (const item of items) {
        await tx.execute(`
          UPDATE ticket_tiers
          SET reserved_count = MAX(0, reserved_count - ?),
              sold_count = sold_count + ?
          WHERE id = ?
        `, [item.quantity, item.quantity, item.tier_id]);
      }

      // Create Order
      const orderId = uuidv4();
      await tx.execute(`
        INSERT INTO orders (id, reservation_id, user_id, tenant_id, total_amount, status)
        VALUES (?, ?, ?, ?, ?, 'PAID')
      `, [orderId, hold.id, input.user_id, event.tenant_id, hold.total_amount]);

      // Create Tickets with unique QR code tokens
      const generatedTickets: any[] = [];
      let attendeeIdx = 0;

      for (const item of items) {
        for (let i = 0; i < item.quantity; i++) {
          const ticketId = uuidv4();
          const ticketCode = `TKT-${uuidv4().substring(0, 8).toUpperCase()}`;
          const attendee = input.attendees && input.attendees[attendeeIdx]
            ? input.attendees[attendeeIdx]
            : { name: 'Valued Attendee', email: 'attendee@example.com' };

          const seatNum = item.seat_number ? `${item.seat_number}-${i + 1}` : `Seat-${Math.floor(100 + Math.random() * 900)}`;

          await tx.execute(`
            INSERT INTO tickets (id, order_id, tier_id, attendee_name, attendee_email, seat_number, ticket_code, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'VALID')
          `, [ticketId, orderId, item.tier_id, attendee.name, attendee.email, seatNum, ticketCode]);

          generatedTickets.push({
            id: ticketId,
            tier_id: item.tier_id,
            attendee_name: attendee.name,
            attendee_email: attendee.email,
            seat_number: seatNum,
            ticket_code: ticketCode,
            status: 'VALID',
          });
          attendeeIdx++;
        }
      }

      // Create Transaction
      const txId = uuidv4();
      await tx.execute(`
        INSERT INTO transactions (id, order_id, payment_gateway, gateway_transaction_id, amount, status, payload)
        VALUES (?, ?, 'MOCK_GATEWAY', ?, ?, 'APPROVED', ?)
      `, [txId, orderId, gatewayTxId, hold.total_amount, JSON.stringify({ method: input.payment_method || 'CARD', processed_at: new Date() })]);

      // Invalidate caches
      await cache.del(`event:${hold.event_id}`);
      await cache.delByPattern('events:*');

      return {
        success: true,
        order_id: orderId,
        reservation_id: hold.id,
        event_title: event.title,
        total_amount: hold.total_amount,
        status: 'PAID',
        gateway_transaction_id: gatewayTxId,
        tickets: generatedTickets,
      };
    });
  }

  /**
   * Mock payment simulation status tester.
   */
  async simulateGatewayHealth() {
    return {
      status: 'ONLINE',
      gateway: 'MockPay Global Sandbox',
      supported_methods: ['credit_card', 'debit_card', 'apple_pay', 'google_pay'],
      supported_currencies: ['USD', 'EUR', 'GBP'],
      latency_ms: 120,
    };
  }
}

export const paymentsService = new PaymentsService();
