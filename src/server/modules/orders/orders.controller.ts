import { Request, Response } from 'express';
import { ordersService } from './orders.service';

export class OrdersController {
  async getMyOrders(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const orders = await ordersService.getUserOrders(req.user.id);
      return res.json(orders);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  async getMyTickets(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const tickets = await ordersService.getUserTickets(req.user.id);
      return res.json(tickets);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  async getOrderById(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const { id } = req.params;
      const isAdmin = req.user.role === 'ADMIN';
      const order = await ordersService.getOrderById(id, req.user.id, isAdmin);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      return res.json(order);
    } catch (err: any) {
      return res.status(403).json({ error: err.message });
    }
  }
}

export const ordersController = new OrdersController();
