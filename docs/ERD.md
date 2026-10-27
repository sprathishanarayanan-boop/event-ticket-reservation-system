# Multi-Tenant Event & Ticket Reservation System — Entity Relationship Diagram (ERD)

## 1. High-Level Entity-Relationship Model

```mermaid
erDiagram
    TENANT ||--o{ USER : "employs / organizes"
    TENANT ||--o{ EVENT : "hosts"
    TENANT ||--o{ ORDER : "receives revenue"
    USER ||--o{ RESERVATION_HOLD : "initiates"
    USER ||--o{ ORDER : "places"
    EVENT ||--|{ TICKET_TIER : "offers"
    EVENT ||--o{ RESERVATION_HOLD : "locks inventory"
    RESERVATION_HOLD ||--|{ RESERVATION_ITEM : "contains"
    TICKET_TIER ||--o{ RESERVATION_ITEM : "allocated to"
    RESERVATION_HOLD ||--o| ORDER : "converted to"
    ORDER ||--|{ TICKET : "issues"
    TICKET_TIER ||--o{ TICKET : "defines class of"
    ORDER ||--|{ TRANSACTION : "settled via"

    TENANT {
        string id PK
        string name
        string slug UK
        string logo_url
        datetime created_at
    }

    USER {
        string id PK
        string tenant_id FK "Nullable for Attendee/Admin"
        string name
        string email UK
        string password_hash
        string role "ADMIN | ORGANIZER | ATTENDEE"
        datetime created_at
    }

    EVENT {
        string id PK
        string tenant_id FK
        string title
        string description
        string category
        string venue
        datetime start_time
        datetime end_time
        datetime sales_cutoff
        string status "DRAFT | PUBLISHED | CANCELLED"
        string banner_url
        datetime created_at
        datetime updated_at
    }

    TICKET_TIER {
        string id PK
        string event_id FK
        string name "VIP | General Admission | Early Bird"
        numeric price
        integer total_capacity
        integer reserved_count "Held by active 10-min reservations"
        integer sold_count "Confirmed & Paid"
        string description
        datetime created_at
    }

    RESERVATION_HOLD {
        string id PK
        string user_id FK
        string event_id FK
        string status "PENDING | CONFIRMED | RELEASED | EXPIRED"
        datetime expires_at "NOW + 10 minutes"
        numeric total_amount
        datetime created_at
        datetime updated_at
    }

    RESERVATION_ITEM {
        string id PK
        string reservation_id FK
        string tier_id FK
        string seat_number "Assigned Seat or General Identifier"
        integer quantity
        numeric unit_price
    }

    ORDER {
        string id PK
        string reservation_id FK
        string user_id FK
        string tenant_id FK
        numeric total_amount
        string status "PAID | FAILED | REFUNDED"
        datetime created_at
    }

    TICKET {
        string id PK
        string order_id FK
        string tier_id FK
        string attendee_name
        string attendee_email
        string seat_number
        string ticket_code UK "Unique Cryptographic/QR Token"
        string status "VALID | USED | CANCELLED"
        datetime created_at
    }

    TRANSACTION {
        string id PK
        string order_id FK
        string payment_gateway "MOCK_GATEWAY"
        string gateway_transaction_id UK
        numeric amount
        string status "PENDING | APPROVED | REJECTED"
        string failure_reason
        text payload "Gateway Metadata / Webhook payload"
        datetime created_at
    }
```

---

## 2. Table Specifications & Cardinalities

### 1. `tenants`
- **Purpose**: Defines isolated organizer organizations in the multi-tenant architecture.
- **Cardinality**: `1 Tenant : Many Events`, `1 Tenant : Many Organizers`.

### 2. `users`
- **Purpose**: Role-Based Access Control (RBAC).
- **Roles**:
  - `ADMIN`: Global administration across all tenants.
  - `ORGANIZER`: Scoped strictly to their `tenant_id`. Manages events, ticket tiers, and views real-time conversion & revenue analytics.
  - `ATTENDEE`: End-user purchasing tickets, holding temporary seats, and viewing digital passes.

### 3. `events`
- **Purpose**: Event listings hosted by an organizer tenant.
- **Key Attributes**: `sales_cutoff` enforces hard stops on purchases; `status` controls booking availability.

### 4. `ticket_tiers`
- **Purpose**: Tiered inventory breakdown (VIP, General Admission).
- **Invariant**:
  $$\text{Available Seats} = \text{total\_capacity} - (\text{reserved\_count} + \text{sold\_count})$$
  Atomic locking guarantees $\text{Available Seats} \ge 0$ at all times.

### 5. `reservation_holds`
- **Purpose**: 10-minute temporary seat reservation engine.
- **Lifecycle**:
  - `PENDING`: Seats currently locked exclusively for attendee. Expiration countdown active ($10\text{ min}$).
  - `CONFIRMED`: Successfully checked out and paid. `reserved_count` decremented; `sold_count` incremented.
  - `EXPIRED`: 10-minute timer passed without payment. Inventory automatically reclaimed by background worker.
  - `RELEASED`: Manually cancelled by attendee or rejected by gateway decline.

### 6. `orders` & `tickets`
- **Purpose**: Permanent financial order record and unique attendee passes with QR verification tokens.

### 7. `transactions`
- **Purpose**: Payment gateway audit log tracking simulated card authorizations, declines, and gateway IDs.
