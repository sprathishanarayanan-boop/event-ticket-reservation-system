import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Search, Calendar, MapPin, Tag, Users, ArrowRight, Loader2 } from 'lucide-react';

interface EventItem {
  id: string;
  title: string;
  description: string;
  category: string;
  venue: string;
  start_time: string;
  end_time: string;
  banner_url: string;
  tenant_name: string;
  tenant_slug: string;
  lowest_price: number;
  total_capacity: number;
  total_available: number;
  tiers: any[];
}

interface EventsPageProps {
  onSelectEvent: (eventId: string) => void;
}

export const EventsPage: React.FC<EventsPageProps> = ({ onSelectEvent }) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Technology', 'Music & Arts', 'Finance'];

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      try {
        const data = await api.getEvents({
          category: selectedCategory === 'All' ? undefined : selectedCategory,
          search: search || undefined,
        });
        setEvents(data);
      } catch (err) {
        console.error('Failed to load events', err);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [selectedCategory, search]);

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/20 p-8 lg:p-12 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <span>⚡ ACID Concurrency Protected</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>10-Minute Hold Engine</span>
          </div>
          <h1 className="text-3xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Reserve Tiered Event Tickets <span className="text-indigo-400">Without Double-Booking</span>
          </h1>
          <p className="text-slate-300 text-sm lg:text-base leading-relaxed">
            Multi-tenant event marketplace featuring atomic ticket reservation holds, high-speed Redis read caching, automated inventory reclamation, and simulated instant checkout.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="relative z-10 mt-8 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search events by title, venue, or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-sm">Loading real-time event inventory from cache...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 p-8">
          <p className="text-slate-300 font-semibold">No events found matching your filter criteria.</p>
          <p className="text-slate-500 text-xs mt-1">Try searching for "AI", "Music", or resetting the category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 rounded-2xl overflow-hidden flex flex-col group transition shadow-lg hover:shadow-indigo-500/10"
            >
              {/* Event Image Banner */}
              <div className="relative h-48 w-full overflow-hidden bg-slate-950">
                <img
                  src={event.banner_url}
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className="text-[11px] font-bold bg-slate-950/80 backdrop-blur-md text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-500/30">
                    {event.category || 'Event'}
                  </span>
                </div>
                <div className="absolute top-3 right-3">
                  <span className="text-[11px] font-semibold bg-slate-950/80 backdrop-blur-md text-slate-200 px-2 py-0.5 rounded border border-slate-700">
                    🏢 {event.tenant_name}
                  </span>
                </div>
              </div>

              {/* Event Details */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-white group-hover:text-indigo-300 transition line-clamp-1">
                    {event.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {event.description}
                  </p>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">{formatDate(event.start_time)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="truncate">{event.venue}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      <strong className="text-white">{event.total_available}</strong> / {event.total_capacity} seats available
                    </span>
                  </div>
                </div>

                {/* Footer / CTA */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Starting From</span>
                    <span className="text-lg font-extrabold text-white font-mono">
                      ${event.lowest_price ? event.lowest_price.toFixed(2) : 'Free'}
                    </span>
                  </div>

                  <button
                    onClick={() => onSelectEvent(event.id)}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md transition group-hover:translate-x-0.5"
                  >
                    <span>Reserve Seats</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
