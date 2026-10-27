import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-jwt-key-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  databaseUrl: process.env.DATABASE_URL || '',
  dbFile: process.env.DB_FILE ? path.resolve(process.cwd(), process.env.DB_FILE) : path.resolve(process.cwd(), 'data/events.db'),
  redisUrl: process.env.REDIS_URL || '',
  redisTtlSeconds: parseInt(process.env.REDIS_TTL_SECONDS || '300', 10),
  reservationHoldMinutes: parseInt(process.env.RESERVATION_HOLD_MINUTES || '10', 10),
  cleanupIntervalSeconds: parseInt(process.env.CLEANUP_INTERVAL_SECONDS || '15', 10),
  mockPaymentFailureRate: parseFloat(process.env.MOCK_PAYMENT_FAILURE_RATE || '0.0'),
};
