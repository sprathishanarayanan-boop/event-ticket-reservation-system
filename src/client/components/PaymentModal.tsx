import React, { useState } from 'react';
import { api } from '../services/api';
import { CreditCard, CheckCircle2, AlertCircle, Loader2, ShieldCheck, X } from 'lucide-react';

interface PaymentModalProps {
  reservationId: string;
  totalAmount: number;
  eventTitle: string;
  onSuccess: (orderData: any) => void;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  reservationId,
  totalAmount,
  eventTitle,
  onSuccess,
  onClose,
}) => {
  const [outcome, setOutcome] = useState<'APPROVED' | 'REJECTED' | 'RANDOM'>('APPROVED');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form inputs
  const [cardholderName, setCardholderName] = useState('Alex Morgan');
  const [attendeeEmail, setAttendeeEmail] = useState('attendee@example.com');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('888');

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await api.checkout({
        reservation_id: reservationId,
        simulate_outcome: outcome,
        payment_method: 'credit_card',
        attendees: [
          { name: cardholderName, email: attendeeEmail },
        ],
      });

      setIsProcessing(false);
      onSuccess(res);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Payment processing failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Payment Simulation Gateway</h3>
              <p className="text-xs text-slate-400">Mock Sandbox Environment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handlePay} className="p-5 space-y-4">
          {/* Order Snapshot */}
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/60 flex items-center justify-between text-sm">
            <div>
              <div className="text-xs text-slate-400">Total Payable</div>
              <div className="text-lg font-extrabold text-white font-mono">${totalAmount.toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 truncate max-w-[180px]">{eventTitle}</div>
              <div className="text-[11px] text-emerald-400 font-medium">10-min hold active</div>
            </div>
          </div>

          {/* Simulation Outcome Trigger (Requirement: Mock Gateway Approve/Reject) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Simulated Gateway Outcome:
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label
                className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition ${
                  outcome === 'APPROVED'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                    : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="outcome"
                  checked={outcome === 'APPROVED'}
                  onChange={() => setOutcome('APPROVED')}
                  className="hidden"
                />
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold">Approve (200)</div>
                  <div className="text-[10px] opacity-75">Issues Valid Tickets</div>
                </div>
              </label>

              <label
                className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition ${
                  outcome === 'REJECTED'
                    ? 'bg-rose-950/40 border-rose-500 text-rose-200'
                    : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="outcome"
                  checked={outcome === 'REJECTED'}
                  onChange={() => setOutcome('REJECTED')}
                  className="hidden"
                />
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <div className="font-bold">Decline (402)</div>
                  <div className="text-[10px] opacity-75">Releases Held Seats</div>
                </div>
              </label>
            </div>
          </div>

          {/* Attendee Info */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Attendee Name</label>
            <input
              type="text"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Ticket Delivery Email</label>
            <input
              type="email"
              value={attendeeEmail}
              onChange={(e) => setAttendeeEmail(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Card fields */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Card Number (Sandbox)</label>
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Expiry</label>
              <input
                type="text"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">CVC</label>
              <input
                type="text"
                value={cvc}
                onChange={(e) => setCvc(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="bg-red-950/60 border border-red-500/50 rounded-lg p-3 text-xs text-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isProcessing}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-sm text-white shadow-lg flex items-center justify-center gap-2 transition ${
                isProcessing
                  ? 'bg-indigo-700 opacity-70 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Simulating Payment Gateway...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirm & Authorize ${totalAmount.toFixed(2)}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
