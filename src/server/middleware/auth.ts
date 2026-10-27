import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export type UserRole = 'ADMIN' | 'ORGANIZER' | 'ATTENDEE';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId || null,
    },
    config.jwtSecret,
    { expiresIn: '24h' }
  );
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing authorization token' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
  }
}

export function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as AuthUser;
      req.user = decoded;
    } catch {
      // ignore
    }
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: Requires one of role(s) [${roles.join(', ')}]. You have role '${req.user.role}'`,
      });
    }

    next();
  };
}

export function requireTenantScope(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Admins have global access
  if (req.user.role === 'ADMIN') {
    return next();
  }

  // Organizers must have a tenantId
  if (req.user.role === 'ORGANIZER') {
    if (!req.user.tenantId) {
      return res.status(403).json({ error: 'Forbidden: Organizer account not associated with a tenant' });
    }
    return next();
  }

  return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
}
