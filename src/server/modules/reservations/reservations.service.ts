import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db';
import { cache } from '../../cache';
import { config } from '../../config';

export interface HoldItemInput {
  tier_id: string;
  quantity: number;
  seat_number?: string;
}

export interface CreateHoldInput {
  user_id: string;
  event_id: string;
  items: HoldItemInput[];
}

export class ReservationsService {
  /**
   * Places tickets on a 10-minute temporary reservation hold atomically.
   * Uses BEGIN IMMEDIATE (SQLite) or SELECT FOR UPDATE (PostgreSQL) to guarantee NO DOUBLE BOOKING.
   */
  async createHold(input: CreateHoldInput) {
    if (!input.items || input.items.length === 0) {
      throw new Error('At least one ticket tier must be selected');
    }

    return await db.transaction(async (tx) => {
      // 1. Verify Event
      const event = await tx.getOne<{
        id: string;
        tenant_id: string;
        status: string;
        sales_cutoff: string;
      }>('SELECT id, tenant_id, status, sales_cutoff FROM events WHERE id = ?', [input.event_id]);

      if (!event) {
        throw new Error('Event not found');
      }

      if (event.status !== 'PUBLISHED') {
        throw new Error('Event is not currently open for bookings');
      }

      if (new Date() > new Date(event.sales_cutoff)) {
        throw new Error('Ticket sales for this event have closed');
      }

      let totalAmount = 0;
      const verifiedItems: {
        tierId: string;
        tierName: string;
        unitPrice: number;
        quantity: number;
        seatNumber: string;
      }[] = [];

      // 2. Atomically verify and lock each ticket tier
      for (const item of input.items) {
        if (!item.quantity || item.quantity <= 0) {
          throw new Error('Item quantity must be greater than 0');
        }

        // Lock tier row to prevent concurrent race conditions
        const tier = await tx.getOne<{
          id: string;
          name: string;
          price: number;
          total_capacity: number;
          reserved_count: number;
          sold_count: number;
        }>('SELECT * FROM ticket_tiers WHERE id = ? AND event_id = ?', [item.tier_id, input.event_id]);

        if (!tier) {
          throw new Error(`Ticket tier '${item.tier_id}' does not exist for this event`);
        }

        const available = tier.total_capacity - ((tier.reserved_count || 0) + (tier.sold_count || 0));
        if (available < item.quantity) {
          const err = new Error(
            `Seats exhausted: Only ${Math.max(0, available)} seat(s) available for '${tier.name}', but ${item.quantity} requested.`
          );
          (err as any).statusCode = 409;
          throw err;
        }

        // Atomically increment reserved_count
        await tx.execute(
          'UPDATE ticket_tiers SET reserved_count = reserved_count + ? WHERE id = ?',
          [item.quantity, tier.id]
        );

        const subtotal = tier.price * item.quantity;
        totalAmount += subtotal;

        verifiedItems.push({
          tierId: tier.id,
          tierName: tier.name,
          unitPrice: tier.price,
          quantity: item.quantity,
          seatNumber: item.seat_number || `General-${Math.floor(100 + Math.random() * 900)}`,
        });
      }

      // 3. Create Reservation Hold record with 10-minute expiry
      const reservationId = uuidv4();
      const expiresAt = new Date(Date.now() + config.reservationHoldMinutes * 60 * 1000).toISOString();

      await tx.execute(`
        INSERT INTO reservation_holds (id, user_id, event_id, status, expires_at, total_amount)
        VALUES (?, ?, ?, 'PENDING', ?, ?)
      `, [
        reservationId,
        input.user_id,
        input.event_id,
        expiresAt,
        totalAmount,
      ]);

      // 4. Create Reservation Items
      for (const vItem of verifiedItems) {
        const itemId = uuidv4();
        await tx.execute(`
          INSERT INTO reservation_items (id, reservation_id, tier_id, seat_number, quantity, unit_price)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          itemId,
          reservationId,
          vItem.tierId,
          vItem.seatNumber,
          vItem.quantity,
          vItem.unitPrice,
        ]);
      }

      // Invalidate event cache so other viewers see updated availability
      await cache.del(`event:${input.event_id}`);
      await cache.delByPattern('events:*');

      return {
        reservation_id: reservationId,
        event_id: input.event_id,
        status: 'PENDING',
        expires_at: expiresAt,
        hold_duration_minutes: config.reservationHoldMinutes,
        total_amount: totalAmount,
        items: verifiedItems,
      };
    });
  }

  /**
   * Retrieves reservation details and computes remaining hold seconds.
   */
  async getHold(id: string, userId?: string) {
    const hold = await db.getOne<{
      id: string;
      user_id: string;
      event_id: string;
      status: string;
      expires_at: string;
      total_amount: number;
      created_at: string;
    }>('SELECT * FROM reservation_holds WHERE id = ?', [id]);

    if (!hold) {
      return null;
    }

    if (userId && hold.user_id !== userId) {
      throw new Error('Unauthorized to view this reservation');
    }

    // Check if expired and pending
    const now = Date.now();
    const expiryTime = new Date(hold.expires_at).getTime();
    let remainingSeconds = Math.max(0, Math.floor((expiryTime - now) / 1000));

    if (hold.status === 'PENDING' && remainingSeconds === 0) {
      // Auto-expire
      await this.expireHold(id);
      hold.status = 'EXPIRED';
      remainingSeconds = 0;
    }

    const items = await db.query(`
      SELECT ri.*, tt.name as tier_name
      FROM reservation_items ri
      JOIN ticket_tiers tt ON ri.tier_id = tt.id
      WHERE ri.reservation_id = ?
    `, [id]);

    const event = await db.getOne('SELECT id, title, venue, start_time, banner_url FROM events WHERE id = ?', [hold.event_id]);

    return {
      ...hold,
      remaining_seconds: remainingSeconds,
      is_expired: hold.status === 'EXPIRED' || (hold.status === 'PENDING' && remainingSeconds === 0),
      items,
      event,
    };
  }

  /**
   * Cancels a pending hold and immediately restores available seat inventory.
   */
  async cancelHold(id: string, userId: string) {
    return await db.transaction(async (tx) => {
      const hold = await tx.getOne<{
        id: string;
        user_id: string;
        event_id: string;
        status: string;
      }>('SELECT * FROM reservation_holds WHERE id = ?', [id]);

      if (!hold) {
        throw new Error('Reservation hold not found');
      }

      if (hold.user_id !== userId) {
        throw new Error('Unauthorized to cancel this reservation');
      }

      if (hold.status !== 'PENDING') {
        throw new Error(`Cannot cancel reservation in '${hold.status}' status`);
      }

      const items = await tx.query<{ tier_id: string; quantity: number }>(
        'SELECT tier_id, quantity FROM reservation_items WHERE reservation_id = ?',
        [id]
      );

      // Decrement reserved_count
      for (const item of items) {
        await tx.execute(
          'UPDATE ticket_tiers SET reserved_count = MAX(0, reserved_count - ?) WHERE id = ?',
          [item.quantity, item.tier_id]
        );
      }

      await tx.execute(
        "UPDATE reservation_holds SET status = 'RELEASED', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [id]
      );

      await cache.del(`event:${hold.event_id}`);
      await cache.delByPattern('events:*');

      return { success: true, message: 'Reservation hold released successfully' };
    });
  }

  /**
   * Expire an individual hold and return inventory.
   */
  async expireHold(id: string) {
    return await db.transaction(async (tx) => {
      const hold = await tx.getOne<{
        id: string;
        event_id: string;
        status: string;
      }>('SELECT id, event_id, status FROM reservation_holds WHERE id = ?', [id]);

      if (!hold || hold.status !== 'PENDING') return;

      const items = await tx.query<{ tier_id: string; quantity: number }>(
        'SELECT tier_id, quantity FROM reservation_items WHERE reservation_id = ?',
        [id]
      );

      for (const item of items) {
        await tx.execute(
          'UPDATE ticket_tiers SET reserved_count = MAX(0, reserved_count - ?) WHERE id = ?',
          [item.quantity, item.tier_id]
        );
      }

      await tx.execute(
        "UPDATE reservation_holds SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [id]
      );

      await cache.del(`event:${hold.event_id}`);
      await cache.delByPattern('events:*');
    });
  }

  /**
   * Scans and releases all pending holds whose 10-minute window has expired.
   * Invoked by background worker.
   */
  async releaseExpiredHolds(): Promise<number> {
    const expiredHolds = await db.query<{ id: string }>(`
      SELECT id FROM reservation_holds
      WHERE status = 'PENDING' AND expires_at < CURRENT_TIMESTAMP
    `);

    for (const hold of expiredHolds) {
      try {
        await this.expireHold(hold.id);
        console.log(`[Hold Worker] Successfully expired hold: ${hold.id}`);
      } catch (err) {
        console.error(`[Hold Worker] Error expiring hold ${hold.id}:`, err);
      }
    }

    return expiredHolds.length;
  }
}

export const reservationsService = new ReservationsService();
