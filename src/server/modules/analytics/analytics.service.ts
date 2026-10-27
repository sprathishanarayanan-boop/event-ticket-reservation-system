import { db } from '../../db';

export class AnalyticsService {
  async getDashboardSummary(tenantId?: string | null) {
    const isTenantScoped = !!tenantId;
    const tenantParam = tenantId ? [tenantId] : [];

    // 1. Total Revenue
    const revenueSql = isTenantScoped
      ? "SELECT COALESCE(SUM(total_amount), 0) as total_revenue FROM orders WHERE tenant_id = ? AND status = 'PAID'"
      : "SELECT COALESCE(SUM(total_amount), 0) as total_revenue FROM orders WHERE status = 'PAID'";
    const revRow = await db.getOne<{ total_revenue: number }>(revenueSql, tenantParam);
    const totalRevenue = revRow?.total_revenue || 0;

    // 2. Orders Count & Holds Conversion
    const totalOrdersSql = isTenantScoped
      ? "SELECT COUNT(*) as count FROM orders WHERE tenant_id = ? AND status = 'PAID'"
      : "SELECT COUNT(*) as count FROM orders WHERE status = 'PAID'";
    const totalOrdersRow = await db.getOne<{ count: number }>(totalOrdersSql, tenantParam);
    const totalOrders = totalOrdersRow?.count || 0;

    // Holds initiated
    const holdsSql = isTenantScoped
      ? `SELECT
          COUNT(*) as total_holds,
          SUM(CASE WHEN rh.status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmed_holds,
          SUM(CASE WHEN rh.status = 'EXPIRED' THEN 1 ELSE 0 END) as expired_holds,
          SUM(CASE WHEN rh.status = 'RELEASED' THEN 1 ELSE 0 END) as released_holds,
          SUM(CASE WHEN rh.status = 'PENDING' AND rh.expires_at > CURRENT_TIMESTAMP THEN 1 ELSE 0 END) as active_holds
         FROM reservation_holds rh
         JOIN events e ON rh.event_id = e.id
         WHERE e.tenant_id = ?`
      : `SELECT
          COUNT(*) as total_holds,
          SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmed_holds,
          SUM(CASE WHEN status = 'EXPIRED' THEN 1 ELSE 0 END) as expired_holds,
          SUM(CASE WHEN status = 'RELEASED' THEN 1 ELSE 0 END) as released_holds,
          SUM(CASE WHEN status = 'PENDING' AND expires_at > CURRENT_TIMESTAMP THEN 1 ELSE 0 END) as active_holds
         FROM reservation_holds`;

    const holdsRow = await db.getOne<{
      total_holds: number;
      confirmed_holds: number;
      expired_holds: number;
      released_holds: number;
      active_holds: number;
    }>(holdsSql, tenantParam);

    const totalHolds = holdsRow?.total_holds || 0;
    const confirmedHolds = holdsRow?.confirmed_holds || 0;
    const expiredHolds = holdsRow?.expired_holds || 0;
    const releasedHolds = holdsRow?.released_holds || 0;
    const activeHolds = holdsRow?.active_holds || 0;

    // Conversion rate: confirmed / total holds
    const conversionRate = totalHolds > 0
      ? Number(((confirmedHolds / totalHolds) * 100).toFixed(1))
      : 0;

    // 3. Ticket Capacity and Breakdown
    const capacitySql = isTenantScoped
      ? `SELECT
          COALESCE(SUM(tt.total_capacity), 0) as total_capacity,
          COALESCE(SUM(tt.sold_count), 0) as total_sold,
          COALESCE(SUM(tt.reserved_count), 0) as total_reserved
         FROM ticket_tiers tt
         JOIN events e ON tt.event_id = e.id
         WHERE e.tenant_id = ?`
      : `SELECT
          COALESCE(SUM(total_capacity), 0) as total_capacity,
          COALESCE(SUM(sold_count), 0) as total_sold,
          COALESCE(SUM(reserved_count), 0) as total_reserved
         FROM ticket_tiers`;

    const capRow = await db.getOne<{
      total_capacity: number;
      total_sold: number;
      total_reserved: number;
    }>(capacitySql, tenantParam);

    const totalCapacity = capRow?.total_capacity || 0;
    const totalSold = capRow?.total_sold || 0;
    const totalReserved = capRow?.total_reserved || 0;
    const totalAvailable = Math.max(0, totalCapacity - (totalSold + totalReserved));

    // 4. Sales Over Time (last 7 days or sample grouped by date)
    const salesOverTimeSql = isTenantScoped
      ? `SELECT strftime('%Y-%m-%d', o.created_at) as sale_date, SUM(o.total_amount) as daily_revenue, COUNT(*) as orders_count
         FROM orders o
         WHERE o.tenant_id = ? AND o.status = 'PAID'
         GROUP BY strftime('%Y-%m-%d', o.created_at)
         ORDER BY sale_date ASC
         LIMIT 14`
      : `SELECT strftime('%Y-%m-%d', created_at) as sale_date, SUM(total_amount) as daily_revenue, COUNT(*) as orders_count
         FROM orders
         WHERE status = 'PAID'
         GROUP BY strftime('%Y-%m-%d', created_at)
         ORDER BY sale_date ASC
         LIMIT 14`;

    const salesOverTime = await db.query(salesOverTimeSql, tenantParam);

    // 5. Tier Breakdown
    const tierSql = isTenantScoped
      ? `SELECT tt.name as tier_name, SUM(tt.sold_count) as sold, SUM(tt.reserved_count) as reserved,
                SUM(tt.total_capacity) as capacity, SUM(tt.sold_count * tt.price) as revenue
         FROM ticket_tiers tt
         JOIN events e ON tt.event_id = e.id
         WHERE e.tenant_id = ?
         GROUP BY tt.name`
      : `SELECT name as tier_name, SUM(sold_count) as sold, SUM(reserved_count) as reserved,
                SUM(total_capacity) as capacity, SUM(sold_count * price) as revenue
         FROM ticket_tiers
         GROUP BY name`;

    const tierBreakdown = await db.query(tierSql, tenantParam);

    // 6. Recent Orders
    const recentOrdersSql = isTenantScoped
      ? `SELECT o.id, o.total_amount, o.status, o.created_at, u.name as customer_name, e.title as event_title
         FROM orders o
         JOIN users u ON o.user_id = u.id
         JOIN reservation_holds rh ON o.reservation_id = rh.id
         JOIN events e ON rh.event_id = e.id
         WHERE o.tenant_id = ?
         ORDER BY o.created_at DESC
         LIMIT 5`
      : `SELECT o.id, o.total_amount, o.status, o.created_at, u.name as customer_name, e.title as event_title
         FROM orders o
         JOIN users u ON o.user_id = u.id
         JOIN reservation_holds rh ON o.reservation_id = rh.id
         JOIN events e ON rh.event_id = e.id
         ORDER BY o.created_at DESC
         LIMIT 5`;

    const recentOrders = await db.query(recentOrdersSql, tenantParam);

    return {
      total_revenue: totalRevenue,
      total_orders: totalOrders,
      conversion_rate_percentage: conversionRate,
      holds_summary: {
        total: totalHolds,
        confirmed: confirmedHolds,
        active: activeHolds,
        expired: expiredHolds,
        released: releasedHolds,
      },
      capacity_summary: {
        total_capacity: totalCapacity,
        sold: totalSold,
        reserved: totalReserved,
        available: totalAvailable,
        occupancy_rate: totalCapacity > 0 ? Number(((totalSold / totalCapacity) * 100).toFixed(1)) : 0,
      },
      sales_over_time: salesOverTime,
      tier_breakdown: tierBreakdown,
      recent_orders: recentOrders,
    };
  }
}

export const analyticsService = new AnalyticsService();
