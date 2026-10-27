import React, { useState } from 'react';
import { useReservation } from '../context/ReservationContext';
import { PaymentModal } from '../components/PaymentModal';
import { Clock, ShieldCheck, CheckCircle2, ArrowRight, AlertTriangle, Ticket, Download } from 'lucide-react';

interface CheckoutPageProps {
  onGoToEvents: () => void;
  onGoToTickets: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onGoToEvents, onGoToTickets }) => {
  const { hold, remainingSeconds, isExpired, releaseHold, clearHold, formatTime } = useReservation();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);

  if (completedOrder) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8 animate-in fade-in duration-300">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-white">Payment Confirmed!</h1>
            <p className="text-sm text-slate-300">
              Your tickets have been issued and seat allocations are officially confirmed.
            </p>
          </div>

          <div className="bg-slate-950/60 rounded-2xl p-6 border border-slate-800/80 text-left space-y-4">
            <div className="flex flex-wrap items-center justify-between text-xs border-b border-slate-800 pb-3 gap-2">
              <div>
                <span className="text-slate-400 block">Order Reference:</span>
                <span className="font-mono font-bold text-white text-sm">{completedOrder.order_id}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block">Gateway Transaction:</span>
                <span className="font-mono text-emerald-400 font-semibold">{completedOrder.gateway_transaction_id}</span>
              </div>
            </div>

            {/* Issued Tickets */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Issued Tickets</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {completedOrder.tickets?.map((t: any) => (
                  <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-indigo-400 text-xs">{t.ticket_code}</span>
                      <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded font-semibold">
                        VALID
                      </span>
                    </div>
                    <div className="text-xs text-white font-medium">{t.attendee_name}</div>
                    <div className="text-[11px] text-slate-400">Allocated Seat: <strong className="text-slate-200">{t.seat_number}</strong></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={onGoToTickets}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition"
            >
              <Ticket className="w-4 h-4" />
              <span>View My Digital Tickets & QR Codes</span>
            </button>
            <button
              onClick={onGoToEvents}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm px-5 py-3 rounded-xl transition"
            >
              Explore More Events
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!hold || isExpired) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white">No Active Reservation Hold</h2>
        <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
          You currently have no tickets held. Please browse our events and select ticket tiers to place a 10-minute hold.
        </p>
        <button
          onClick={onGoToEvents}
          className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow transition"
        >
          Explore Events
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Expiration Timer Card */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border border-indigo-500/40 rounded-2xl p-5 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Time Left to Complete Order</div>
            <div className="text-2xl font-extrabold text-white font-mono tracking-tight">
              {formatTime(remainingSeconds)}
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-md font-medium">
            Seats Reserved Exclusively
          </span>
        </div>
      </div>

      {/* Reservation Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-xl font-extrabold text-white">Review Reservation Hold</h2>
          <p className="text-xs text-slate-400 mt-1">
            Event: <strong className="text-indigo-300">{hold.event_title || 'Selected Event'}</strong>
          </p>
        </div>

        {/* Items */}
        <div className="space-y-3">
          {hold.items?.map((item: any, idx: number) => (
            <div
              key={item.id || idx}
              className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 flex items-center justify-between text-sm"
            >
              <div>
                <h4 className="font-bold text-white">{item.tierName || item.tier_name || 'Tier Pass'}</h4>
                <div className="text-xs text-slate-400">
                  {item.quantity} seat(s) • Assigned: {item.seatNumber || item.seat_number}
                </div>
              </div>
              <div className="text-right font-mono font-bold text-white text-base">
                ${((item.unitPrice || item.unit_price) * item.quantity).toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        {/* Pricing Breakdown */}
        <div className="border-t border-slate-800 pt-4 space-y-2 text-xs text-slate-400">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-mono text-slate-200">${hold.total_amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Booking Fee & Taxes (Mock Sandbox)</span>
            <span className="font-mono text-emerald-400">$0.00</span>
          </div>
          <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-slate-800">
            <span>Total Amount Due</span>
            <span className="font-mono text-indigo-300">${hold.total_amount.toFixed(2)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-between items-center">
          <button
            onClick={releaseHold}
            className="text-xs text-slate-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-lg transition"
          >
            Cancel & Release Seats
          </button>

          <button
            onClick={() => setShowPaymentModal(true)}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Proceed to Simulated Payment</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showPaymentModal && (
        <PaymentModal
          reservationId={hold.id}
          totalAmount={hold.total_amount}
          eventTitle={hold.event_title || 'Selected Event'}
          onSuccess={(orderData) => {
            setShowPaymentModal(false);
            clearHold();
            setCompletedOrder(orderData);
          }}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
};
