const BASE_URL = '/api/v1';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data.error || (data.details ? JSON.stringify(data.details) : 'Request failed');
    const err = new Error(errorMsg);
    (err as any).statusCode = res.status;
    (err as any).details = data;
    throw err;
  }
  return data;
}

export const api = {
  // Auth
  async login(credentials: { email: string; password: string }) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return handleResponse(res);
  },

  async register(data: any) {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getMe() {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Events
  async getEvents(params?: { category?: string; search?: string; tenant_id?: string }) {
    const query = new URLSearchParams(params as any).toString();
    const res = await fetch(`${BASE_URL}/events?${query}`);
    return handleResponse(res);
  },

  async getEvent(id: string) {
    const res = await fetch(`${BASE_URL}/events/${id}`);
    return handleResponse(res);
  },

  async createEvent(data: any) {
    const res = await fetch(`${BASE_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // Reservations (10-minute temporary hold)
  async createHold(data: { event_id: string; items: { tier_id: string; quantity: number; seat_number?: string }[] }) {
    const res = await fetch(`${BASE_URL}/reservations/hold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getHold(id: string) {
    const res = await fetch(`${BASE_URL}/reservations/${id}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async cancelHold(id: string) {
    const res = await fetch(`${BASE_URL}/reservations/${id}/cancel`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Payment Simulation
  async checkout(data: { reservation_id: string; simulate_outcome?: 'APPROVED' | 'REJECTED' | 'RANDOM'; attendees?: any[] }) {
    const res = await fetch(`${BASE_URL}/payments/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getGatewayHealth() {
    const res = await fetch(`${BASE_URL}/payments/health`);
    return handleResponse(res);
  },

  // Orders & Tickets
  async getMyOrders() {
    const res = await fetch(`${BASE_URL}/orders/me`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async getMyTickets() {
    const res = await fetch(`${BASE_URL}/orders/tickets`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Analytics
  async getAnalyticsSummary(tenantId?: string) {
    const query = tenantId ? `?tenant_id=${tenantId}` : '';
    const res = await fetch(`${BASE_URL}/analytics/summary${query}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Health
  async getHealth() {
    const res = await fetch(`${BASE_URL}/health`);
    return handleResponse(res);
  },
};
