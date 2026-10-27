import { v4 as uuidv4 } from 'uuid';
import { db } from '../src/server/db';
import { reservationsService } from '../src/server/modules/reservations/reservations.service';
import { generateToken } from '../src/server/middleware/auth';

async function runConcurrencyStressTest() {
  console.log('===============================================================');
  console.log('🚀 HIGH-CONCURRENCY RACE CONDITION & DOUBLE-BOOKING STRESS TEST');
  console.log('===============================================================');

  // 1. Setup isolated test event with limited tickets
  const tenantId = `tenant-concurrency-${uuidv4().substring(0, 8)}`;
  const eventId = `event-concurrency-${uuidv4().substring(0, 8)}`;
  const tierId = `tier-limited-${uuidv4().substring(0, 8)}`;
  const TOTAL_SEATS = 5;
  const CONCURRENT_ATTEMPTS = 30;

  await db.execute('INSERT INTO tenants (id, name, slug) VALUES (?, ?, ?)', [
    tenantId, 'Concurrency Test Tenant', `tenant-${Date.now()}`
  ]);

  const now = new Date();
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await db.execute(`
    INSERT INTO events (id, tenant_id, title, venue, start_time, end_time, sales_cutoff, status)
    VALUES (?, ?, 'High Concurrency Flash Sale', 'Virtual Arena', ?, ?, ?, 'PUBLISHED')
  `, [eventId, tenantId, future, future, future]);

  await db.execute(`
    INSERT INTO ticket_tiers (id, event_id, name, price, total_capacity, reserved_count, sold_count)
    VALUES (?, ?, 'Flash VIP Seat', 100.00, ?, 0, 0)
  `, [tierId, eventId, TOTAL_SEATS]);

  console.log(`[Setup] Event created with exactly ${TOTAL_SEATS} seats available.`);
  console.log(`[Launch] Simulating ${CONCURRENT_ATTEMPTS} simultaneous users trying to reserve 1 ticket at the exact same millisecond...\n`);

  // Create simulated attendee users
  const testUsers = Array.from({ length: CONCURRENT_ATTEMPTS }).map((_, i) => ({
    id: `user-sim-${i}-${uuidv4().substring(0, 6)}`,
    email: `attendee_${i}_${Date.now()}@stress-test.com`,
    name: `Stress Attendee ${i + 1}`,
    role: 'ATTENDEE' as const,
  }));

  for (const u of testUsers) {
    await db.execute(
      'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [u.id, u.name, u.email, 'hash_placeholder', u.role]
    );
  }

  let successCount = 0;
  let conflictCount = 0;
  let otherErrorCount = 0;
  const successfulHolds: string[] = [];

  const startMs = Date.now();

  // Run all requests simultaneously
  const results = await Promise.allSettled(
    testUsers.map(async (user, idx) => {
      try {
        const hold = await reservationsService.createHold({
          user_id: user.id,
          event_id: eventId,
          items: [{ tier_id: tierId, quantity: 1, seat_number: `Seat-${idx + 1}` }],
        });
        return hold;
      } catch (err: any) {
        throw err;
      }
    })
  );

  const durationMs = Date.now() - startMs;

  for (const res of results) {
    if (res.status === 'fulfilled') {
      successCount++;
      successfulHolds.push(res.value.reservation_id);
    } else {
      const err = res.reason;
      if (err.statusCode === 409 || err.message?.includes('Seats exhausted')) {
        conflictCount++;
      } else {
        otherErrorCount++;
        console.error('Unexpected error:', err.message);
      }
    }
  }

  // Verify final database state
  const updatedTier = await db.getOne<{
    total_capacity: number;
    reserved_count: number;
    sold_count: number;
  }>('SELECT total_capacity, reserved_count, sold_count FROM ticket_tiers WHERE id = ?', [tierId]);

  console.log('---------------------------------------------------------------');
  console.log('📊 CONCURRENCY RESULTS & INTEGRITY REPORT:');
  console.log(`   ⏱️ Duration:                  ${durationMs}ms`);
  console.log(`   🎯 Total Concurrent Attempts: ${CONCURRENT_ATTEMPTS}`);
  console.log(`   ✅ Successful Reservations:   ${successCount} (Expected: ${TOTAL_SEATS})`);
  console.log(`   🛡️ Blocked Conflicts (409):   ${conflictCount} (Expected: ${CONCURRENT_ATTEMPTS - TOTAL_SEATS})`);
  console.log(`   ❌ Unexpected Errors:         ${otherErrorCount}`);
  console.log(`   📦 Database Reserved Count:   ${updatedTier?.reserved_count} / ${updatedTier?.total_capacity}`);
  console.log('---------------------------------------------------------------');

  if (successCount === TOTAL_SEATS && conflictCount === (CONCURRENT_ATTEMPTS - TOTAL_SEATS) && updatedTier?.reserved_count === TOTAL_SEATS) {
    console.log('🎉 PASS: Atomic concurrency verification SUCCESSFUL! Zero double-booking detected.\n');
  } else {
    console.error('❌ FAIL: Race condition detected! Expected exactly 5 reservations.');
    process.exit(1);
  }

  // 2. Test Expiration Cleanup Worker
  console.log('⏳ Testing 10-Minute Expiration Cleanup Worker...');
  // Artificially age the 5 holds by setting expires_at to 1 hour ago
  await db.execute(`
    UPDATE reservation_holds
    SET expires_at = datetime('now', '-1 hour')
    WHERE id IN (${successfulHolds.map(() => '?').join(',')})
  `, successfulHolds);

  const releasedCount = await reservationsService.releaseExpiredHolds();
  const reclaimedTier = await db.getOne<{ reserved_count: number }>('SELECT reserved_count FROM ticket_tiers WHERE id = ?', [tierId]);

  console.log(`   🧹 Worker released ${releasedCount} expired hold(s).`);
  console.log(`   🔄 Tier reserved count restored to: ${reclaimedTier?.reserved_count} (Expected: 0)`);

  if (releasedCount === TOTAL_SEATS && reclaimedTier?.reserved_count === 0) {
    console.log('🎉 PASS: Expired holds successfully released back to ticket pool!\n');
  } else {
    console.error('❌ FAIL: Expiration worker failed to restore inventory.');
    process.exit(1);
  }

  console.log('🏆 All concurrency and race condition requirements SATISFIED!');
}

runConcurrencyStressTest().catch(console.error);
