import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { authenticate, requireRole } from './middleware/auth';
import { authController } from './modules/auth/auth.controller';
import { eventsController } from './modules/events/events.controller';
import { reservationsController } from './modules/reservations/reservations.controller';
import { paymentsController } from './modules/payments/payments.controller';
import { ordersController } from './modules/orders/orders.controller';
import { analyticsController } from './modules/analytics/analytics.controller';
import { cache } from './cache';

export const app = express();

app.use(cors());
app.use(express.json());

// Request logging in development
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[HTTP] ${req.method} ${req.url}`);
  }
  next();
});

// Health check
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    redis_connected: cache.isRedisConnected(),
    uptime_seconds: Math.floor(process.uptime()),
  });
});

// --- Auth Routes ---
app.post('/api/v1/auth/register', (req, res) => authController.register(req, res));
app.post('/api/v1/auth/login', (req, res) => authController.login(req, res));
app.get('/api/v1/auth/me', authenticate, (req, res) => authController.me(req, res));

// --- Event Management Routes ---
app.get('/api/v1/events', (req, res) => eventsController.list(req, res));
app.get('/api/v1/events/:id', (req, res) => eventsController.getById(req, res));
app.post('/api/v1/events', authenticate, requireRole('ORGANIZER', 'ADMIN'), (req, res) => eventsController.create(req, res));
app.put('/api/v1/events/:id', authenticate, requireRole('ORGANIZER', 'ADMIN'), (req, res) => eventsController.update(req, res));
app.delete('/api/v1/events/:id', authenticate, requireRole('ORGANIZER', 'ADMIN'), (req, res) => eventsController.delete(req, res));

// --- Reservation Hold Engine (10-Minute Temporary Hold) ---
app.post('/api/v1/reservations/hold', authenticate, (req, res) => reservationsController.createHold(req, res));
app.get('/api/v1/reservations/:id', authenticate, (req, res) => reservationsController.getHold(req, res));
app.post('/api/v1/reservations/:id/cancel', authenticate, (req, res) => reservationsController.cancelHold(req, res));

// --- Payment Simulation ---
app.post('/api/v1/payments/checkout', authenticate, (req, res) => paymentsController.checkout(req, res));
app.get('/api/v1/payments/health', (req, res) => paymentsController.health(req, res));

// --- Orders and Tickets ---
app.get('/api/v1/orders/me', authenticate, (req, res) => ordersController.getMyOrders(req, res));
app.get('/api/v1/orders/tickets', authenticate, (req, res) => ordersController.getMyTickets(req, res));
app.get('/api/v1/orders/:id', authenticate, (req, res) => ordersController.getOrderById(req, res));

// --- Real-time Analytics Dashboard ---
app.get('/api/v1/analytics/summary', authenticate, requireRole('ORGANIZER', 'ADMIN'), (req, res) => analyticsController.getSummary(req, res));

// --- Serve Static Client in Production ---
const clientDistPath = path.resolve(__dirname, '../../dist/client');
app.use(express.static(clientDistPath));

app.get('*', (req: Request, res: Response, next: NextFunction) => {
  if (req.url.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).send('API ready. Start client dev server or run npm run build:client.');
    }
  });
});

// Centralized error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error]', err);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
  });
});
