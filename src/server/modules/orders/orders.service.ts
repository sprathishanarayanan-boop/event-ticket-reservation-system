import { db } from '../../db';

export class OrdersService {
  async getUserOrders(userId: string) {
    const orders = await db.query(`
      SELECT o.*, e.title as event_title, e.venue as event_venue, e.start_time as event_start_time,
             e.banner_url as event_banner, t.name as tenant_name
      FROM orders o
      JOIN reservation_holds rh ON o.reservation_id = rh.id
      JOIN events e ON rh.event_id = e.id
      JOIN tenants t ON o.tenant_id = t.id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `, [userId]);

    for (const order of orders) {
      order.tickets = await db.query(`
        SELECT t.*, tt.name as tier_name
        FROM tickets t
        JOIN ticket_tiers tt ON t.tier_id = tt.id
        WHERE t.order_id = ?
      `, [order.id]);

      order.transactions = await db.query(`
        SELECT * FROM transactions WHERE order_id = ?
      `, [order.id]);
    }

    return orders;
  }

  async getUserTickets(userId: string) {
    const tickets = await db.query(`
      SELECT t.*, tt.name as tier_name, tt.price as unit_price,
             e.id as event_id, e.title as event_title, e.venue as event_venue,
             e.start_time as event_start_time, e.end_time as event_end_time,
             e.banner_url as event_banner, o.created_at as purchase_date
      FROM tickets t
      JOIN orders o ON t.order_id = o.id
      JOIN ticket_tiers tt ON t.tier_id = tt.id
      JOIN events e ON tt.event_id = e.id
      WHERE o.user_id = ? AND o.status = 'PAID'
      ORDER BY e.start_time ASC
    `, [userId]);

    return tickets;
  }

  async getOrderById(orderId: string, userId: string, isAdmin: boolean = false) {
    const order = await db.getOne(`
      SELECT o.*, e.title as event_title, e.venue as event_venue, e.start_time as event_start_time,
             e.banner_url as event_banner, t.name as tenant_name
      FROM orders o
      JOIN reservation_holds rh ON o.reservation_id = rh.id
      JOIN events e ON rh.event_id = e.id
      JOIN tenants t ON o.tenant_id = t.id
      WHERE o.id = ?
    `, [orderId]);

    if (!order) {
      return null;
    }

    if (!isAdmin && order.user_id !== userId) {
      throw new Error('Unauthorized to view this order');
    }

    order.tickets = await db.query(`
      SELECT t.*, tt.name as tier_name
      FROM tickets t
      JOIN ticket_tiers tt ON t.tier_id = tt.id
      WHERE t.order_id = ?
    `, [order.id]);

    order.transactions = await db.query('SELECT * FROM transactions WHERE order_id = ?', [order.id]);

    return order;
  }
}

export const ordersService = new OrdersService();
