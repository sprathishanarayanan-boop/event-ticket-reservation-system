import { Request, Response } from 'express';
import { reservationsService } from './reservations.service';

export class ReservationsController {
  async createHold(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required to reserve tickets' });
      }

      const { event_id, items } = req.body;
      if (!event_id || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'event_id and an array of items are required' });
      }

      const hold = await reservationsService.createHold({
        user_id: req.user.id,
        event_id,
        items,
      });

      return res.status(201).json(hold);
    } catch (err: any) {
      const status = err.statusCode || 400;
      return res.status(status).json({ error: err.message });
    }
  }

  async getHold(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.role === 'ADMIN' ? undefined : req.user?.id;

      const hold = await reservationsService.getHold(id, userId);
      if (!hold) {
        return res.status(404).json({ error: 'Reservation hold not found' });
      }

      return res.json(hold);
    } catch (err: any) {
      return res.status(403).json({ error: err.message });
    }
  }

  async cancelHold(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const result = await reservationsService.cancelHold(id, req.user.id);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}

export const reservationsController = new ReservationsController();
