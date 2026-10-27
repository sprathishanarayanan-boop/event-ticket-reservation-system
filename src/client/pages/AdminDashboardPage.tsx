import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ShieldCheck, Server, Database, Activity, Building, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [sumRes, healthRes] = await Promise.all([
          api.getAnalyticsSummary(),
          api.getHealth(),
        ]);
        setSummary(sumRes);
        setHealth(healthRes);
      } catch (err) {
        console.error('Admin fetch error', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        <p className="text-sm">Fetching global multi-tenant system health & aggregate metrics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20 mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>System Administrator Console</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white">Global Multi-Tenant Hub</h1>
        <p className="text-xs text-slate-400 mt-1">
          Full cross-tenant visibility, transaction oversight, and infrastructure monitoring.
        </p>
      </div>

      {/* System Infrastructure Health Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>Infrastructure & Cache Status</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span>Caching Engine:</span>
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {health?.redis_connected ? 'Redis Online' : 'In-Memory High-Speed Cache'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {health?.redis_connected ? 'Distributed memory cache connected' : 'Local TTL caching active with automatic failover'}
            </p>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span>Concurrency Lock:</span>
              <span className="text-indigo-400 font-bold">ACID Transactional Mutex</span>
            </div>
            <p className="text-[11px] text-slate-500">Prevents race conditions and double-booking</p>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span>Hold Cleaner Worker:</span>
              <span className="text-amber-400 font-bold">Active (15s Interval)</span>
            </div>
            <p className="text-[11px] text-slate-500">Auto-expires unconfirmed holds after 10 min</p>
          </div>
        </div>
      </div>

      {/* Cross-Tenant Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-xs text-slate-400 font-semibold">Total Platform Volume</span>
          <div className="text-3xl font-extrabold text-white font-mono">
            ${summary?.total_revenue ? summary.total_revenue.toFixed(2) : '0.00'}
          </div>
          <span className="text-[11px] text-emerald-400">Across all tenant organizers</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-xs text-slate-400 font-semibold">Aggregate Conversion Rate</span>
          <div className="text-3xl font-extrabold text-indigo-300 font-mono">
            {summary?.conversion_rate_percentage || 0}%
          </div>
          <span className="text-[11px] text-slate-400">Total completed checkouts / holds</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-xs text-slate-400 font-semibold">Global Ticket Occupancy</span>
          <div className="text-3xl font-extrabold text-purple-300 font-mono">
            {summary?.capacity_summary?.occupancy_rate || 0}%
          </div>
          <span className="text-[11px] text-slate-400">
            {summary?.capacity_summary?.sold} / {summary?.capacity_summary?.total_capacity} tickets sold
          </span>
        </div>
      </div>

      {/* Tenancy Model Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <Building className="w-4 h-4 text-purple-400" />
          <span>Active Platform Tenants</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-white text-sm">Apex Tech Global</h4>
              <p className="text-slate-400">Slug: apex-tech</p>
              <div className="text-[11px] text-indigo-400 mt-1 font-mono">Organizer: organizer@apextech.com</div>
            </div>
            <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-2.5 py-1 rounded-md font-semibold">
              ACTIVE
            </span>
          </div>

          <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-white text-sm">Neon Horizon Festivals</h4>
              <p className="text-slate-400">Slug: neon-horizon</p>
              <div className="text-[11px] text-indigo-400 mt-1 font-mono">Organizer: organizer@soundfest.com</div>
            </div>
            <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-2.5 py-1 rounded-md font-semibold">
              ACTIVE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
