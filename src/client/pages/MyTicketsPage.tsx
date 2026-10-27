import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Ticket, Calendar, MapPin, QrCode, Download, Loader2, Sparkles } from 'lucide-react';

export const MyTicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTickets() {
      setLoading(true);
      try {
        const data = await api.getMyTickets();
        setTickets(data);
      } catch (err) {
        console.error('Failed to load tickets', err);
      } finally {
        setLoading(false);
      }
    }
    loadTickets();
  }, []);

  const formatDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Verified Digital Passes</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white">My Confirmed Tickets</h1>
        <p className="text-xs text-slate-400 mt-1">
          Present your QR code or ticket token at the entrance venue gate.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-sm">Fetching your digital passes...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800 p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
            <Ticket className="w-6 h-6" />
          </div>
          <h3 className="text-white font-bold text-base">No Tickets Found</h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">
            You haven't completed any ticket purchases yet. Browse active events and complete checkout to get passes!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tickets.map((t) => (
            <div
              key={t.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between hover:border-slate-700 transition"
            >
              {/* Event Header */}
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded">
                      {t.tier_name || 'Pass'}
                    </span>
                    <h3 className="font-bold text-lg text-white mt-1.5 line-clamp-1">{t.event_title}</h3>
                  </div>
                  <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-2 py-1 rounded-md font-semibold border border-emerald-500/30">
                    {t.status}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{formatDate(t.event_start_time)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span className="truncate">{t.event_venue}</span>
                  </div>
                </div>

                <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-slate-400 text-[10px]">Attendee Name</div>
                    <div className="font-semibold text-white">{t.attendee_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-400 text-[10px]">Seat Allocation</div>
                    <div className="font-semibold text-emerald-400 font-mono">{t.seat_number}</div>
                  </div>
                </div>
              </div>

              {/* QR Code Bar */}
              <div className="bg-slate-950 p-4 border-t border-dashed border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {/* Stylized QR Code placeholder */}
                  <div className="w-14 h-14 bg-white p-1 rounded-lg flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" className="w-12 h-12 text-slate-900 fill-current">
                      <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h4v4h-4v-4zm-4 4h4v4h-4v-4zm0-4h4v-4h-4v4zm4-4h4v4h-4v-4z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-medium">Ticket Token</div>
                    <div className="font-mono font-extrabold text-indigo-300 text-sm tracking-wide">{t.ticket_code}</div>
                  </div>
                </div>

                <button
                  onClick={() => window.print()}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print Pass</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
