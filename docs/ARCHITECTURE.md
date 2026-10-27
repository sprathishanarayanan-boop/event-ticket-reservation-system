# System Architecture & Technical Specifications

## 1. Architectural Overview

```
                         +-----------------------------+
                         |      React / Vite SPA       |
                         | (Hold Timer, Live Checkout) |
                         +--------------+--------------+
                                        |  REST / JWT
                                        v
                         +-----------------------------+
                         |    Express.js Backend API   |
                         |   (RBAC, Multi-Tenant Auth) |
                         +-------+--------------+------+
                                 |              |
                +----------------+              +----------------+
                v                                                v
    +-----------------------+                        +-----------------------+
    |   Redis Caching Layer |                        | Background Job Worker |
    | (Events, Read Cache,  |                        |  (10-Min Hold Release |
    |  In-Memory Fallback)  |                        |  Automated Cleaner)   |
    +-----------------------+                        +-----------+-----------+
                ^                                                |
                | Cache Invalidation & DB Queries                |
                +-----------------------+------------------------+
                                        v
                         +-----------------------------+
                         |   Atomic Transaction DB     |
                         |  (PostgreSQL / node:sqlite) |
                         |   ACID Concurrency Locks    |
                         +-----------------------------+
```

---

## 2. Concurrency Control & Double-Booking Prevention

### The Race Condition Challenge
When hundreds of attendees simultaneously click "Reserve" on the last remaining VIP tickets, naive database reads will allow multiple sessions to see positive inventory, leading to severe double-booking.

### The Solution: Two-Phase Atomic Transaction Locks
1. **PostgreSQL Production Mode**:
   Uses `SELECT ... FOR UPDATE` row-level exclusive locks:
   ```sql
   BEGIN TRANSACTION;
   SELECT * FROM ticket_tiers WHERE id = $1 FOR UPDATE;
   -- Check: total_capacity - (reserved_count + sold_count) >= requested_quantity
   -- If false: ROLLBACK and throw 409 Conflict
   UPDATE ticket_tiers SET reserved_count = reserved_count + $2 WHERE id = $1;
   INSERT INTO reservation_holds (...);
   COMMIT;
   ```
2. **Local Zero-Dependency Mode (node:sqlite)**:
   Uses `BEGIN IMMEDIATE;` combined with an internal async mutex queue in the Node.js event loop:
   - `BEGIN IMMEDIATE` reserves an exclusive write lock on the database file, blocking any other write transaction from beginning until the current hold is committed or rolled back.
   - Verified via `scripts/concurrency-test.ts` where 30 concurrent asynchronous requests race for 5 tickets: exactly 5 succeed, exactly 25 receive HTTP 409 Conflict, and exactly 0 seats are overbooked.

---

## 3. 10-Minute Temporary Reservation Engine & Background Worker

### Temporary Hold Lifecycle
1. When an attendee selects tickets, a `reservation_holds` record is created with:
   - `status = 'PENDING'`
   - `expires_at = CURRENT_TIMESTAMP + 10 minutes`
2. The UI displays a live, pulsing countdown timer synchronized with the server's `expires_at`.
3. If the user completes checkout within 10 minutes:
   - The hold status becomes `CONFIRMED`.
   - `reserved_count` is transferred to `sold_count`.
   - Valid digital tickets with unique QR codes are issued.
4. If the user abandons checkout or the timer hits zero:
   - The background queue worker (running every 15 seconds) detects `expires_at < CURRENT_TIMESTAMP AND status = 'PENDING'`.
   - The worker executes an atomic transaction setting `status = 'EXPIRED'` and decrementing `reserved_count`.
   - Available ticket capacity is immediately restored for other attendees.

---

## 4. Multi-Tenant Role-Based Access Control (RBAC)

| Role | Access Level | Tenant Scope | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **ADMIN** | System-wide | Global (All Tenants) | View cross-tenant revenue, system health, and inspect all platform events |
| **ORGANIZER** | Organization | Scoped to `tenant_id` | Create events, define tiered pricing, view real-time conversion rates and revenue |
| **ATTENDEE** | Consumer | Universal | Browse events, hold tickets, simulate checkout, view digital passes |

---

## 5. Caching Layer Strategy

- **Target Entities**: High-read endpoints:
  - `GET /api/v1/events` (catalog listing)
  - `GET /api/v1/events/:id` (detailed event & tier availability)
- **TTL**: 60–120 seconds default.
- **Cache Invalidation**: Event caches are purged immediately whenever:
  - A new reservation hold is placed
  - A hold is confirmed or payment completes
  - A hold expires or is cancelled
  - An organizer updates an event
- **Graceful Failover**: Uses `ioredis` when `REDIS_URL` is set, and transparently falls back to an in-memory TTL Map when Redis is not detected, ensuring 100% functionality in all environments.
