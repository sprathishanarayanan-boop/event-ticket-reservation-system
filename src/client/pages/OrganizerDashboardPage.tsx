import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  DollarSign,
  TrendingUp,
  Clock,
  Ticket,
  Plus,
  Loader2,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';

export const OrganizerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Event Form
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [category, setCategory] = useState('Technology');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [salesCutoff, setSalesCutoff] = useState('');
  const [tiers, setTiers] = useState([
    { name: 'VIP Access', price: 250, total_capacity: 50, description: 'VIP Lounge + Premium Seats' },
    { name: 'General Admission', price: 85, total_capacity: 150, description: 'Full Summit Pass' },
  ]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      const data = await api.getAnalyticsSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // Auto refresh analytics every 15 seconds for real-time dashboard feel
    const interval = setInterval(fetchAnalytics, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      await api.createEvent({
        title,
        venue,
        category,
        description,
        start_time: startTime || new Date(Date.now() + 14 * 86400000).toISOString(),
        end_time: endTime || new Date(Date.now() + 16 * 86400000).toISOString(),
        sales_cutoff: salesCutoff || new Date(Date.now() + 13 * 86400000).toISOString(),
        tiers,
      });

      setShowCreateModal(false);
      // Reset form
      setTitle('');
      setVenue('');
      setDescription('');
      await fetchAnalytics();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  const addTier = () => {
    setTiers([...tiers, { name: 'Tier Pass', price: 50, total_capacity: 100, description: '' }]);
  };

  const updateTier = (idx: number, field: string, val: any) => {
    const updated = [...tiers];
    updated[idx] = { ...updated[idx], [field]: val };
    setTiers(updated);
  };

  const removeTier = (idx: number) => {
    if (tiers.length > 1) {
      setTiers(tiers.filter((_, i) => i !== idx));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="text-sm">Calculating real-time tenant revenue & conversion rates...</p>
      </div>
    );
  }

  const holds = summary?.holds_summary || { total: 0, confirmed: 0, active: 0, expired: 0, released: 0 };
  const cap = summary?.capacity_summary || { total_capacity: 0, sold: 0, reserved: 0, available: 0, occupancy_rate: 0 };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
              Tenant Analytics
            </span>
            <span className="text-xs text-slate-400">Isolated Scope: {user?.tenant?.name || 'My Tenant Organization'}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">Organizer Studio & Metrics</h1>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Event</span>
        </button>
      </div>

      {/* 4 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Revenue */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Total Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            ${summary?.total_revenue ? summary.total_revenue.toFixed(2) : '0.00'}
          </div>
          <p className="text-[11px] text-slate-400">Realized settled payments</p>
        </div>

        {/* Ticket Conversion Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Hold Conversion Rate</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {summary?.conversion_rate_percentage || 0}%
          </div>
          <p className="text-[11px] text-slate-400">Holds converted to orders</p>
        </div>

        {/* Active Holds */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Active 10-Min Holds</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-300 font-mono">
            {holds.active}
          </div>
          <p className="text-[11px] text-slate-400">Currently awaiting checkout</p>
        </div>

        {/* Tickets Sold / Occupancy */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Occupancy Rate</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {cap.occupancy_rate}%
          </div>
          <p className="text-[11px] text-slate-400">{cap.sold} / {cap.total_capacity} tickets sold</p>
        </div>
      </div>

      {/* Conversion Funnel & Tier Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Reservation Hold Funnel</span>
          </h3>

          <div className="space-y-3 pt-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Total Holds Initiated:</span>
              <span className="font-mono font-bold text-white text-sm">{holds.total}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div className="bg-indigo-500 h-2 rounded-full w-full" />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed & Paid:
              </span>
              <span className="font-mono font-bold text-emerald-300 text-sm">{holds.confirmed}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full"
                style={{ width: `${holds.total > 0 ? (holds.confirmed / holds.total) * 100 : 0}%` }}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-amber-400 flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5" /> Active Live Holds:
              </span>
              <span className="font-mono font-bold text-amber-300 text-sm">{holds.active}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="bg-amber-500 h-2 rounded-full"
                style={{ width: `${holds.total > 0 ? (holds.active / holds.total) * 100 : 0}%` }}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-red-400 flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" /> Expired / Auto-Released:
              </span>
              <span className="font-mono font-bold text-red-300 text-sm">{holds.expired + holds.released}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="bg-red-500/80 h-2 rounded-full"
                style={{ width: `${holds.total > 0 ? ((holds.expired + holds.released) / holds.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Ticket Tier Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Ticket className="w-4 h-4 text-emerald-400" />
            <span>Tier Quotas & Capacity</span>
          </h3>

          <div className="space-y-4 pt-2">
            {summary?.tier_breakdown?.map((tier: any) => {
              const pct = tier.capacity > 0 ? Math.round((tier.sold / tier.capacity) * 100) : 0;
              return (
                <div key={tier.tier_name} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-white">{tier.tier_name}</span>
                    <span className="text-slate-400 font-mono">
                      {tier.sold} / {tier.capacity} sold ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>Active holds: {tier.reserved}</span>
                    <span>Revenue: ${tier.revenue?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Orders Stream */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-white text-base">Recent Real-Time Transactions</h3>
        {summary?.recent_orders?.length === 0 ? (
          <p className="text-xs text-slate-400">No transactions recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Event</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {summary?.recent_orders?.map((ord: any) => (
                  <tr key={ord.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono text-indigo-400 font-semibold">{ord.id.substring(0, 13)}...</td>
                    <td className="py-3 px-3 text-white font-medium">{ord.customer_name}</td>
                    <td className="py-3 px-3 truncate max-w-[200px]">{ord.event_title}</td>
                    <td className="py-3 px-3 font-mono font-bold text-white">${ord.total_amount.toFixed(2)}</td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded font-semibold">
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">{new Date(ord.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-base">Create New Event</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="p-6 space-y-4 overflow-y-auto flex-1">
              {createError && (
                <div className="bg-red-950/60 border border-red-500/40 rounded-xl p-3 text-xs text-red-200">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Cloud & Distributed Systems Summit 2026"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Venue</label>
                  <input
                    type="text"
                    required
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g., Seattle Convention Center"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Technology">Technology</option>
                    <option value="Music & Arts">Music & Arts</option>
                    <option value="Finance">Finance</option>
                    <option value="Health">Health</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Brief description of the event..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Tiers list */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Tiered Ticket Setup
                  </label>
                  <button
                    type="button"
                    onClick={addTier}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Tier</span>
                  </button>
                </div>

                {tiers.map((t, idx) => (
                  <div key={idx} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
                    <div className="grid grid-cols-12 gap-2">
                      <input
                        type="text"
                        placeholder="Tier name (e.g., VIP)"
                        value={t.name}
                        onChange={(e) => updateTier(idx, 'name', e.target.value)}
                        className="col-span-5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        value={t.price}
                        onChange={(e) => updateTier(idx, 'price', parseFloat(e.target.value) || 0)}
                        className="col-span-3 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Seats"
                        value={t.total_capacity}
                        onChange={(e) => updateTier(idx, 'total_capacity', parseInt(e.target.value) || 1)}
                        className="col-span-3 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => removeTier(idx)}
                        className="col-span-1 text-slate-500 hover:text-red-400 flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-2.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publish Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
