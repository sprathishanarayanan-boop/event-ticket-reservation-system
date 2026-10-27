import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../src/server/db';

async function seed() {
  console.log('🌱 Starting database seeding...');

  // 1. Tenants
  const tenant1Id = 't-apex-tech-01';
  const tenant2Id = 't-sound-fest-02';

  await db.execute('DELETE FROM tickets');
  await db.execute('DELETE FROM transactions');
  await db.execute('DELETE FROM orders');
  await db.execute('DELETE FROM reservation_items');
  await db.execute('DELETE FROM reservation_holds');
  await db.execute('DELETE FROM ticket_tiers');
  await db.execute('DELETE FROM events');
  await db.execute('DELETE FROM users');
  await db.execute('DELETE FROM tenants');

  await db.execute(`
    INSERT INTO tenants (id, name, slug, logo_url) VALUES
    (?, 'Apex Tech Global', 'apex-tech', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=120&auto=format&fit=crop'),
    (?, 'Neon Horizon Festivals', 'neon-horizon', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=120&auto=format&fit=crop')
  `, [tenant1Id, tenant2Id]);

  // 2. Users (Admin, Organizers, Attendee)
  const salt = await bcrypt.genSalt(10);
  const adminPass = await bcrypt.hash('admin123', salt);
  const organizerPass = await bcrypt.hash('organizer123', salt);
  const attendeePass = await bcrypt.hash('attendee123', salt);

  const adminId = 'u-admin-01';
  const org1Id = 'u-org-apex-01';
  const org2Id = 'u-org-sound-02';
  const attendeeId = 'u-attendee-01';

  await db.execute(`
    INSERT INTO users (id, tenant_id, name, email, password_hash, role) VALUES
    (?, NULL, 'Global System Admin', 'admin@eventpass.com', ?, 'ADMIN'),
    (?, ?, 'Sarah Jenkins (Apex Organiser)', 'organizer@apextech.com', ?, 'ORGANIZER'),
    (?, ?, 'Marcus Vance (Soundfest Organiser)', 'organizer@soundfest.com', ?, 'ORGANIZER'),
    (?, NULL, 'Alex Morgan (Attendee)', 'attendee@example.com', ?, 'ATTENDEE')
  `, [
    adminId, adminPass,
    org1Id, tenant1Id, organizerPass,
    org2Id, tenant2Id, organizerPass,
    attendeeId, attendeePass,
  ]);

  // 3. Events & Tiers
  const event1Id = 'ev-ai-summit-2026';
  const event2Id = 'ev-neon-festival-2026';
  const event3Id = 'ev-fintech-expo-2026';

  const futureDate1 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const futureDate1End = new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString();
  const cutoff1 = new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString();

  const futureDate2 = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString();
  const futureDate2End = new Date(Date.now() + 47 * 24 * 60 * 60 * 1000).toISOString();
  const cutoff2 = new Date(Date.now() + 44 * 24 * 60 * 60 * 1000).toISOString();

  const futureDate3 = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
  const futureDate3End = new Date(Date.now() + 61 * 24 * 60 * 60 * 1000).toISOString();
  const cutoff3 = new Date(Date.now() + 59 * 24 * 60 * 60 * 1000).toISOString();

  await db.execute(`
    INSERT INTO events (id, tenant_id, title, description, category, venue, start_time, end_time, sales_cutoff, status, banner_url) VALUES
    (?, ?, 'Global AI & Autonomous Agents Summit 2026', 'The premier international conference bringing together AI researchers, systems architects, and engineering leaders.', 'Technology', 'Moscone Center, San Francisco, CA', ?, ?, ?, 'PUBLISHED', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop'),
    (?, ?, 'Neon Horizon Music & Arts Experience', 'A 3-day immersive electronic music and audio-visual arts spectacle under the desert stars.', 'Music & Arts', 'Empire Polo Grounds, Indio, CA', ?, ?, ?, 'PUBLISHED', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop'),
    (?, ?, 'FinTech Revolution & Digital Assets Expo', 'Exploring real-time settlement rails, multi-tenant digital banking, and next-gen institutional finance.', 'Finance', 'ExCeL London, UK', ?, ?, ?, 'PUBLISHED', 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&auto=format&fit=crop')
  `, [
    event1Id, tenant1Id, futureDate1, futureDate1End, cutoff1,
    event2Id, tenant2Id, futureDate2, futureDate2End, cutoff2,
    event3Id, tenant1Id, futureDate3, futureDate3End, cutoff3,
  ]);

  // Ticket Tiers
  const tier1Vip = 'tier-ai-vip';
  const tier1Ga = 'tier-ai-ga';
  const tier1Early = 'tier-ai-early';

  await db.execute(`
    INSERT INTO ticket_tiers (id, event_id, name, price, total_capacity, reserved_count, sold_count, description) VALUES
    (?, ?, 'VIP Keynote & Executive Lounge', 299.00, 30, 0, 5, 'Reserved front-row seats, exclusive networking dinner, and speaker greenroom pass.'),
    (?, ?, 'General Admission', 99.00, 150, 0, 15, 'Full access to all keynote sessions, tech workshops, and exhibition halls.'),
    (?, ?, 'Early Bird Innovator', 49.00, 50, 0, 20, 'Discounted admission for students, indie hackers, and early community members.')
  `, [
    tier1Vip, event1Id,
    tier1Ga, event1Id,
    tier1Early, event1Id,
  ]);

  // Festival Tiers
  await db.execute(`
    INSERT INTO ticket_tiers (id, event_id, name, price, total_capacity, reserved_count, sold_count, description) VALUES
    ('tier-neon-vip', ?, 'Backstage VIP Club Pass', 350.00, 25, 0, 4, 'Access to VIP viewing decks, artist lounge bar, and complimentary drinks.'),
    ('tier-neon-ga', ?, '3-Day Weekend Festival Pass', 180.00, 200, 0, 18, 'Unrestricted entry to all 4 stages across all three festival days.'),
    ('tier-neon-day', ?, 'Single Day Pass (Saturday)', 75.00, 300, 0, 12, 'Entry for Saturday headliner performances only.')
  `, [event2Id, event2Id, event2Id]);

  // FinTech Tiers
  await db.execute(`
    INSERT INTO ticket_tiers (id, event_id, name, price, total_capacity, reserved_count, sold_count, description) VALUES
    ('tier-fintech-exec', ?, 'Executive Summit Pass', 450.00, 40, 0, 6, 'Includes private roundtable sessions with fintech founders and private dining.'),
    ('tier-fintech-del', ?, 'Standard Delegate Pass', 150.00, 120, 0, 10, 'Access to all main stages and demo pavilions.')
  `, [event3Id, event3Id]);

  // 4. Sample Completed Order for Attendee
  const hold1Id = 'hold-seed-completed-01';
  const order1Id = 'ord-seed-01';
  const tx1Id = 'tx-seed-01';

  await db.execute(`
    INSERT INTO reservation_holds (id, user_id, event_id, status, expires_at, total_amount)
    VALUES (?, ?, ?, 'CONFIRMED', ?, 398.00)
  `, [hold1Id, attendeeId, event1Id, new Date().toISOString()]);

  await db.execute(`
    INSERT INTO reservation_items (id, reservation_id, tier_id, seat_number, quantity, unit_price)
    VALUES
    (?, ?, ?, 'VIP-Row-1-Seat-4', 1, 299.00),
    (?, ?, ?, 'GA-A12', 1, 99.00)
  `, [uuidv4(), hold1Id, tier1Vip, uuidv4(), hold1Id, tier1Ga]);

  await db.execute(`
    INSERT INTO orders (id, reservation_id, user_id, tenant_id, total_amount, status)
    VALUES (?, ?, ?, ?, 398.00, 'PAID')
  `, [order1Id, hold1Id, attendeeId, tenant1Id]);

  await db.execute(`
    INSERT INTO tickets (id, order_id, tier_id, attendee_name, attendee_email, seat_number, ticket_code, status)
    VALUES
    (?, ?, ?, 'Alex Morgan', 'attendee@example.com', 'VIP-Row-1-Seat-4', 'TKT-VIP-8842', 'VALID'),
    (?, ?, ?, 'Taylor Morgan', 'taylor@example.com', 'GA-A12', 'TKT-GA-9143', 'VALID')
  `, [uuidv4(), order1Id, tier1Vip, uuidv4(), order1Id, tier1Ga]);

  await db.execute(`
    INSERT INTO transactions (id, order_id, payment_gateway, gateway_transaction_id, amount, status, payload)
    VALUES (?, ?, 'MOCK_GATEWAY', 'mock_tx_seed_approved_9821', 398.00, 'APPROVED', '{"status":"APPROVED","method":"credit_card"}')
  `, [tx1Id, order1Id]);

  console.log('✅ Database seeded successfully!');
  console.log('------------------------------------------------');
  console.log('🔑 Pre-configured Test Accounts:');
  console.log('  1. ADMIN:     admin@eventpass.com      / admin123');
  console.log('  2. ORGANIZER: organizer@apextech.com   / organizer123');
  console.log('  3. ORGANIZER: organizer@soundfest.com  / organizer123');
  console.log('  4. ATTENDEE:  attendee@example.com     / attendee123');
  console.log('------------------------------------------------');
}

seed().catch(console.error);
