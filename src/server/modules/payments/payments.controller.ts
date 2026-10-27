import { Request, Response } from 'express';
import { paymentsService } from './payments.service';

export class PaymentsController {
  async checkout(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required for checkout' });
      }

      const { reservation_id, simulate_outcome, payment_method, attendees } = req.body;
      if (!reservation_id) {
        return res.status(400).json({ error: 'reservation_id is required' });
      }

      // Simulate a realistic gateway delay (e.g. 500ms)
      await new Promise(resolve => setTimeout(resolve, 500));

      const result = await paymentsService.processCheckout({
        reservation_id,
        user_id: req.user.id,
        simulate_outcome,
        payment_method,
        attendees,
      });

      return res.status(200).json(result);
    } catch (err: any) {
      const status = err.statusCode || 400;
      return res.status(status).json({
        error: err.message,
        details: err.details || null,
      });
    }
  }

  async health(req: Request, res: Response) {
    try {
      const info = await paymentsService.simulateGatewayHealth();
      return res.json(info);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}

export const paymentsController = new PaymentsController();
