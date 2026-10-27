-- Multi-Tenant Event & Ticket Reservation System Schema

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK(role IN ('ADMIN', 'ORGANIZER', 'ATTENDEE')) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  venue TEXT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  sales_cutoff DATETIME NOT NULL,
  status TEXT CHECK(status IN ('DRAFT', 'PUBLISHED', 'CANCELLED')) DEFAULT 'PUBLISHED',
  banner_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ticket_tiers (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  total_capacity INTEGER NOT NULL,
  reserved_count INTEGER DEFAULT 0,
  sold_count INTEGER DEFAULT 0,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reservation_holds (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  status TEXT CHECK(status IN ('PENDING', 'CONFIRMED', 'RELEASED', 'EXPIRED')) DEFAULT 'PENDING',
  expires_at DATETIME NOT NULL,
  total_amount REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reservation_items (
  id TEXT PRIMARY KEY,
  reservation_id TEXT NOT NULL,
  tier_id TEXT NOT NULL,
  seat_number TEXT,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  FOREIGN KEY (reservation_id) REFERENCES reservation_holds(id) ON DELETE CASCADE,
  FOREIGN KEY (tier_id) REFERENCES ticket_tiers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  reservation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  total_amount REAL NOT NULL,
  status TEXT CHECK(status IN ('PAID', 'FAILED', 'REFUNDED')) DEFAULT 'PAID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reservation_id) REFERENCES reservation_holds(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  tier_id TEXT NOT NULL,
  attendee_name TEXT NOT NULL,
  attendee_email TEXT NOT NULL,
  seat_number TEXT,
  ticket_code TEXT UNIQUE NOT NULL,
  status TEXT CHECK(status IN ('VALID', 'USED', 'CANCELLED')) DEFAULT 'VALID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (tier_id) REFERENCES ticket_tiers(id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  payment_gateway TEXT DEFAULT 'MOCK_GATEWAY',
  gateway_transaction_id TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
  failure_reason TEXT,
  payload TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Indexes for high-concurrency lookup performance
CREATE INDEX IF NOT EXISTS idx_events_tenant ON events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tiers_event ON ticket_tiers(event_id);
CREATE INDEX IF NOT EXISTS idx_holds_status_expires ON reservation_holds(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(ticket_code);
