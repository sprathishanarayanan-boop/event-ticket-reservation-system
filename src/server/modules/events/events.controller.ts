import { Request, Response } from 'express';
import { eventsService } from './events.service';

export class EventsController {
  async list(req: Request, res: Response) {
    try {
      const { tenant_id, category, status, search } = req.query;
      const events = await eventsService.listEvents({
        tenant_id: tenant_id as string | undefined,
        category: category as string | undefined,
        status: status as string | undefined,
        search: search as string | undefined,
      });
      return res.json(events);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const event = await eventsService.getEventById(id);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      return res.json(event);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      if (!req.user || !req.user.tenantId) {
        return res.status(403).json({ error: 'Forbidden: Organizer tenant association required' });
      }

      const { title, description, category, venue, start_time, end_time, sales_cutoff, banner_url, tiers } = req.body;

      if (!title || !venue || !start_time || !end_time || !sales_cutoff || !tiers || !Array.isArray(tiers) || tiers.length === 0) {
        return res.status(400).json({ error: 'Missing required event fields or tiers' });
      }

      const event = await eventsService.createEvent({
        tenant_id: req.user.tenantId,
        title,
        description,
        category,
        venue,
        start_time,
        end_time,
        sales_cutoff,
        banner_url,
        tiers,
      });

      return res.status(201).json(event);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenantId || '';
      const isAdmin = req.user?.role === 'ADMIN';

      const updated = await eventsService.updateEvent(id, tenantId, req.body, isAdmin);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenantId || '';
      const isAdmin = req.user?.role === 'ADMIN';

      const result = await eventsService.deleteEvent(id, tenantId, isAdmin);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}

export const eventsController = new EventsController();
