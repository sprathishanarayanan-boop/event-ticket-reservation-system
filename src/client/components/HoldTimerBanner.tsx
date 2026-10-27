import React from 'react';
import { useReservation } from '../context/ReservationContext';
import { Clock, AlertTriangle, ArrowRight, X } from 'lucide-react';

interface HoldTimerBannerProps {
  onGoToCheckout: () => void;
}

export const HoldTimerBanner: React.FC<HoldTimerBannerProps> = ({ onGoToCheckout }) => {
  const { hold, remainingSeconds, isExpired, releaseHold, formatTime } = useReservation();

  if (!hold) return null;

  if (isExpired) {
    return (
      <div className="bg-red-950/90 border-b border-red-500/30 text-red-200 px-4 py-2.5 text-sm flex items-center justify-between backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2 font-medium">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>Your 10-minute ticket reservation hold has expired. Seats have been returned to the public pool.</span>
        </div>
        <button
          onClick={releaseHold}
          className="text-xs bg-red-800/60 hover:bg-red-700 text-white px-2.5 py-1 rounded transition"
        >
          Dismiss
        </button>
      </div>
    );
  }

  const isLowTime = remainingSeconds <= 120; // 2 minutes or less

  return (
    <div
      className={`px-4 py-2 text-sm flex flex-wrap items-center justify-between gap-3 sticky top-0 z-50 backdrop-blur-md border-b transition-colors ${
        isLowTime
          ? 'bg-amber-950/90 border-amber-500/40 text-amber-200 animate-pulse'
          : 'bg-indigo-950/90 border-indigo-500/30 text-indigo-100'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <div className="flex items-center gap-1.5 font-semibold text-slate-100">
          <Clock className="w-4 h-4 text-indigo-400" />
          <span>Temporary Hold Active:</span>
          <span className="font-mono text-base font-bold bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700/60 text-white">
            {formatTime(remainingSeconds)}
          </span>
        </div>
        <span className="hidden sm:inline text-xs text-slate-300">
          Held for event <strong className="text-white">{hold.event_title || 'Selected Event'}</strong> (${hold.total_amount.toFixed(2)})
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={onGoToCheckout}
          className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5 rounded-lg shadow-sm transition"
        >
          <span>Complete Checkout</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={releaseHold}
          className="text-slate-400 hover:text-white px-2 py-1.5 rounded transition hover:bg-slate-800"
          title="Release seats immediately"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
