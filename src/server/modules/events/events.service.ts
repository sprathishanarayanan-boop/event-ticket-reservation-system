import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db';
import { cache } from '../../cache';

export interface TicketTierInput {
  name: string;
  price: number;
  total_capacity: number;
  description?: string;
}

export interface CreateEventInput {
  tenant_id: string;
  title: string;
  description?: string;
  category?: string;
  venue: string;
  start_time: string;
  end_time: string;
  sales_cutoff: string;
  banner_url?: string;
  tiers: TicketTierInput[];
}

export class EventsService {
  async listEvents(filter?: { tenant_id?: string; category?: string; status?: string; search?: string }) {
    const cacheKey = `events:list:${filter?.tenant_id || 'all'}:${filter?.category || 'all'}:${filter?.status || 'all'}:${filter?.search || ''}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    let sql = `
      SELECT e.*, t.name as tenant_name, t.slug as tenant_slug, t.logo_url as tenant_logo
      FROM events e
      JOIN tenants t ON e.tenant_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filter?.tenant_id) {
      sql += ' AND e.tenant_id = ?';
      params.push(filter.tenant_id);
    }
    if (filter?.category) {
      sql += ' AND e.category = ?';
      params.push(filter.category);
    }
    if (filter?.status) {
      sql += ' AND e.status = ?';
      params.push(filter.status);
    } else {
      sql += " AND e.status != 'CANCELLED'";
    }
    if (filter?.search) {
      sql += ' AND (e.title LIKE ? OR e.description LIKE ? OR e.venue LIKE ?)';
      const term = `%${filter.search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY e.start_time ASC';

    const events = await db.query(sql, params);

    // Attach ticket tier summaries
    for (const ev of events) {
      const tiers = await db.query('SELECT * FROM ticket_tiers WHERE event_id = ? ORDER BY price ASC', [ev.id]);
      ev.tiers = tiers;
      ev.lowest_price = tiers.length > 0 ? Math.min(...tiers.map(t => t.price)) : 0;
      ev.total_capacity = tiers.reduce((sum, t) => sum + t.total_capacity, 0);
      ev.total_sold = tiers.reduce((sum, t) => sum + (t.sold_count || 0), 0);
      ev.total_reserved = tiers.reduce((sum, t) => sum + (t.reserved_count || 0), 0);
      ev.total_available = ev.total_capacity - (ev.total_sold + ev.total_reserved);
    }

    await cache.set(cacheKey, events, 60); // 1 minute cache for list
    return events;
  }

  async getEventById(id: string) {
    const cacheKey = `event:${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const event = await db.getOne(`
      SELECT e.*, t.name as tenant_name, t.slug as tenant_slug, t.logo_url as tenant_logo
      FROM events e
      JOIN tenants t ON e.tenant_id = t.id
      WHERE e.id = ?
    `, [id]);

    if (!event) {
      return null;
    }

    const tiers = await db.query(`
      SELECT id, event_id, name, price, total_capacity, reserved_count, sold_count, description,
             (total_capacity - (reserved_count + sold_count)) as available_count
      FROM ticket_tiers
      WHERE event_id = ?
      ORDER BY price ASC
    `, [id]);

    event.tiers = tiers;
    event.is_cutoff_passed = new Date() > new Date(event.sales_cutoff);

    await cache.set(cacheKey, event, 120); // 2 minutes cache for detail
    return event;
  }

  async createEvent(input: CreateEventInput) {
    const eventId = uuidv4();
    const bannerUrl = input.banner_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&auto=format&fit=crop';

    await db.transaction(async (tx) => {
      await tx.execute(`
        INSERT INTO events (id, tenant_id, title, description, category, venue, start_time, end_time, sales_cutoff, status, banner_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PUBLISHED', ?)
      `, [
        eventId,
        input.tenant_id,
        input.title,
        input.description || '',
        input.category || 'Conference',
        input.venue,
        input.start_time,
        input.end_time,
        input.sales_cutoff,
        bannerUrl,
      ]);

      for (const tier of input.tiers) {
        const tierId = uuidv4();
        await tx.execute(`
          INSERT INTO ticket_tiers (id, event_id, name, price, total_capacity, reserved_count, sold_count, description)
          VALUES (?, ?, ?, ?, ?, 0, 0, ?)
        `, [
          tierId,
          eventId,
          tier.name,
          tier.price,
          tier.total_capacity,
          tier.description || '',
        ]);
      }
    });

    // Invalidate caches
    await cache.delByPattern('events:*');

    return this.getEventById(eventId);
  }

  async updateEvent(id: string, tenantId: string, updates: Partial<CreateEventInput>, isAdmin: boolean = false) {
    const event = await db.getOne('SELECT tenant_id FROM events WHERE id = ?', [id]);
    if (!event) {
      throw new Error('Event not found');
    }

    if (!isAdmin && event.tenant_id !== tenantId) {
      throw new Error('Unauthorized to modify this event');
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.category !== undefined) { fields.push('category = ?'); values.push(updates.category); }
    if (updates.venue !== undefined) { fields.push('venue = ?'); values.push(updates.venue); }
    if (updates.start_time !== undefined) { fields.push('start_time = ?'); values.push(updates.start_time); }
    if (updates.end_time !== undefined) { fields.push('end_time = ?'); values.push(updates.end_time); }
    if (updates.sales_cutoff !== undefined) { fields.push('sales_cutoff = ?'); values.push(updates.sales_cutoff); }
    if (updates.banner_url !== undefined) { fields.push('banner_url = ?'); values.push(updates.banner_url); }

    if (fields.length > 0) {
      fields.push("updated_at = CURRENT_TIMESTAMP");
      values.push(id);
      await db.execute(`UPDATE events SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    // Invalidate caches
    await cache.del(`event:${id}`);
    await cache.delByPattern('events:*');

    return this.getEventById(id);
  }

  async deleteEvent(id: string, tenantId: string, isAdmin: boolean = false) {
    const event = await db.getOne('SELECT tenant_id FROM events WHERE id = ?', [id]);
    if (!event) {
      throw new Error('Event not found');
    }

    if (!isAdmin && event.tenant_id !== tenantId) {
      throw new Error('Unauthorized to delete this event');
    }

    await db.execute("UPDATE events SET status = 'CANCELLED' WHERE id = ?", [id]);
    await cache.del(`event:${id}`);
    await cache.delByPattern('events:*');
    return { success: true, message: 'Event marked as cancelled' };
  }
}

export const eventsService = new EventsService();
