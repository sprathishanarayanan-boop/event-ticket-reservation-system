import { Request, Response } from 'express';
import { authService } from './auth.service';

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { name, email, password, role, tenantName, tenantId } = req.body;
      if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'Name, email, password, and role are required' });
      }

      if (!['ADMIN', 'ORGANIZER', 'ATTENDEE'].includes(role)) {
        return res.status(400).json({ error: 'Role must be ADMIN, ORGANIZER, or ATTENDEE' });
      }

      const result = await authService.register({
        name,
        email,
        password,
        role,
        tenantName,
        tenantId,
      });

      return res.status(201).json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const result = await authService.login({ email, password });
      return res.json(result);
    } catch (err: any) {
      return res.status(401).json({ error: err.message });
    }
  }

  async me(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const profile = await authService.getProfile(req.user.id);
      return res.json(profile);
    } catch (err: any) {
      return res.status(404).json({ error: err.message });
    }
  }
}

export const authController = new AuthController();
