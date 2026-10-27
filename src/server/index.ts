import { app } from './app';
import { config } from './config';
import { startExpiredHoldsWorker } from './modules/reservations/worker';

const server = app.listen(config.port, () => {
  console.log(`=====================================================`);
  console.log(`  🎟️ Multi-Tenant Event & Ticket Reservation System   `);
  console.log(`  Server listening on port http://localhost:${config.port}`);
  console.log(`  Mode: ${config.nodeEnv}`);
  console.log(`=====================================================`);

  // Start background job for releasing expired ticket holds
  startExpiredHoldsWorker();
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
