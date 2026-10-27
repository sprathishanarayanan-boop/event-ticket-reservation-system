import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useReservation } from '../context/ReservationContext';
import { Calendar, MapPin, Clock, ArrowLeft, Plus, Minus, AlertCircle, Loader2, Sparkles } from 'lucide-react';

interface EventDetailPageProps {
  eventId: string;
  onBack: () => void;
  onProceedToCheckout: () => void;
  onOpenAuth: () => void;
}

export const EventDetailPage: React.FC<EventDetailPageProps> = ({
  eventId,
  onBack,
  onProceedToCheckout,
  onOpenAuth,
}) => {
  const { user, switchRoleQuickly } = useAuth();
  const { setNewHold } = useReservation();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvent() {
      setLoading(true);
      try {
        const data = await api.getEvent(eventId);
        setEvent(data);
        const initQuantities: Record<string, number> = {};
        data.tiers?.forEach((tier: any) => {
          initQuantities[tier.id] = 0;
        });
        setQuantities(initQuantities);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to load event');
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [eventId]);

  const updateQuantity = (tierId: string, delta: number, maxAvailable: number) => {
    setQuantities((prev) => {
      const current = prev[tierId] || 0;
      const next = Math.max(0, Math.min(maxAvailable, current + delta));
      return { ...prev, [tierId]: next };
    });
  };

  const totalSeats = Object.values(quantities).reduce((a, b) => a + b, 0);
  const totalPrice = event?.tiers?.reduce((sum: number, tier: any) => {
    return sum + (quantities[tier.id] || 0) * tier.price;
  }, 0) || 0;

  const handleCreateHold = async () => {
    if (!user) {
      // Auto switch to demo attendee if not logged in for smooth demo experience
      await switchRoleQuickly('ATTENDEE');
    }

    if (totalSeats === 0) {
      setErrorMessage('Please select at least 1 ticket to hold');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const items = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([tierId, qty]) => ({
        tier_id: tierId,
        quantity: qty,
        seat_number: `Seat-${Math.floor(100 + Math.random() * 900)}`,
      }));

    try {
      const holdRes = await api.createHold({
        event_id: eventId,
        items,
      });

      // Attach event title for banner
      holdRes.event_title = event.title;
      setNewHold(holdRes);
      onProceedToCheckout();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to place reservation hold');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="text-sm">Fetching event & seat tiers...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-red-400 font-semibold mb-4">Event could not be found.</p>
        <button onClick={onBack} className="text-indigo-400 text-sm hover:underline">
          Back to Events
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-medium transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Events Catalog</span>
      </button>

      {/* Main Event Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="relative h-64 sm:h-80 w-full overflow-hidden">
          <img src={event.banner_url} alt={event.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold bg-indigo-600 text-white px-2.5 py-1 rounded-md">
                {event.category || 'Event'}
              </span>
              <span className="text-xs font-semibold bg-slate-900/90 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700">
                🏢 Hosted by {event.tenant_name}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
              {event.title}
            </h1>
          </div>
        </div>

        {/* Metadata bar */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-800 text-xs text-slate-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-400 font-medium">Date & Time</div>
              <div className="font-semibold text-white">{formatDate(event.start_time)}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-400 font-medium">Venue Location</div>
              <div className="font-semibold text-white">{event.venue}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-400 font-medium">Ticket Sales Cut-off</div>
              <div className="font-semibold text-white">{formatDate(event.sales_cutoff)}</div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="p-6">
          <h3 className="text-sm font-bold text-slate-200 mb-2">About This Event</h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            {event.description}
          </p>
        </div>
      </div>

      {/* Ticket Tiers Selection */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-white">Select Ticket Tiers</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select seats below to place them in an exclusive 10-minute hold
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Zero Double-Booking Guarantee</span>
          </div>
        </div>

        {errorMessage && (
          <div className="bg-red-950/60 border border-red-500/40 rounded-xl p-3 text-xs text-red-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-4">
          {event.tiers?.map((tier: any) => {
            const available = tier.available_count ?? (tier.total_capacity - ((tier.reserved_count || 0) + (tier.sold_count || 0)));
            const isSoldOut = available <= 0;
            const currentQty = quantities[tier.id] || 0;

            return (
              <div
                key={tier.id}
                className={`p-5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isSoldOut
                    ? 'bg-slate-950/60 border-slate-800/80 opacity-60'
                    : currentQty > 0
                    ? 'bg-indigo-950/20 border-indigo-500/50 shadow-md'
                    : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Tier Info */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-bold text-white text-base">{tier.name}</h3>
                    {isSoldOut ? (
                      <span className="text-[10px] bg-red-900/60 text-red-300 px-2 py-0.5 rounded font-bold uppercase">
                        Sold Out
                      </span>
                    ) : (
                      <span className="text-[10px] bg-emerald-900/50 text-emerald-300 px-2 py-0.5 rounded font-semibold">
                        {available} remaining
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                    {tier.description || 'General tier admission pass.'}
                  </p>
                </div>

                {/* Price and Counter */}
                <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Unit Price</span>
                    <span className="font-extrabold text-lg text-white font-mono">
                      ${tier.price.toFixed(2)}
                    </span>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl p-1">
                    <button
                      onClick={() => updateQuantity(tier.id, -1, available)}
                      disabled={currentQty <= 0 || isSoldOut}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-mono font-bold text-sm text-white">
                      {currentQty}
                    </span>
                    <button
                      onClick={() => updateQuantity(tier.id, 1, available)}
                      disabled={currentQty >= available || isSoldOut}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Bar */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-400">Total for {totalSeats} Ticket(s):</div>
            <div className="text-2xl font-extrabold text-white font-mono">
              ${totalPrice.toFixed(2)}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleCreateHold}
              disabled={totalSeats === 0 || submitting}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm text-white shadow-lg flex items-center justify-center gap-2 transition ${
                totalSeats === 0 || submitting
                  ? 'bg-slate-800 opacity-50 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Locking Seats in DB...</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  <span>Hold for 10 Minutes & Checkout</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
