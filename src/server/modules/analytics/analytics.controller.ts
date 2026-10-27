import { Request, Response } from 'express';
import { analyticsService } from './analytics.service';

export class AnalyticsController {
  async getSummary(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // If organizer, tenant-scope to their tenantId. If admin, allow tenantId query param or null (all)
      let tenantId: string | null = null;
      if (req.user.role === 'ORGANIZER') {
        tenantId = req.user.tenantId || null;
      } else if (req.user.role === 'ADMIN' && req.query.tenant_id) {
        tenantId = req.query.tenant_id as string;
      }

      const summary = await analyticsService.getDashboardSummary(tenantId);
      return res.json(summary);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}

export const analyticsController = new AnalyticsController();
