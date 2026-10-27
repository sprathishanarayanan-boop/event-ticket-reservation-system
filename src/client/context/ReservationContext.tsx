import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export interface ActiveHold {
  id: string;
  event_id: string;
  event_title?: string;
  event_venue?: string;
  expires_at: string;
  total_amount: number;
  items: any[];
}

interface ReservationContextType {
  hold: ActiveHold | null;
  remainingSeconds: number;
  isExpired: boolean;
  setNewHold: (holdData: any) => void;
  clearHold: () => void;
  releaseHold: () => Promise<void>;
  formatTime: (seconds: number) => string;
}

const ReservationContext = createContext<ReservationContextType | undefined>(undefined);

export const ReservationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hold, setHold] = useState<ActiveHold | null>(() => {
    const saved = localStorage.getItem('active_reservation');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      if (new Date(parsed.expires_at).getTime() <= Date.now()) {
        localStorage.removeItem('active_reservation');
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    if (!hold) return 0;
    return Math.max(0, Math.floor((new Date(hold.expires_at).getTime() - Date.now()) / 1000));
  });

  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    if (!hold) {
      setRemainingSeconds(0);
      setIsExpired(false);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(hold.expires_at).getTime() - Date.now()) / 1000));
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        setIsExpired(true);
        localStorage.removeItem('active_reservation');
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [hold]);

  const setNewHold = (holdData: any) => {
    const active: ActiveHold = {
      id: holdData.reservation_id || holdData.id,
      event_id: holdData.event_id,
      event_title: holdData.event_title || holdData.event?.title,
      event_venue: holdData.event?.venue,
      expires_at: holdData.expires_at,
      total_amount: holdData.total_amount,
      items: holdData.items || [],
    };
    localStorage.setItem('active_reservation', JSON.stringify(active));
    setHold(active);
    setIsExpired(false);
    setRemainingSeconds(Math.max(0, Math.floor((new Date(active.expires_at).getTime() - Date.now()) / 1000)));
  };

  const clearHold = () => {
    localStorage.removeItem('active_reservation');
    setHold(null);
    setIsExpired(false);
    setRemainingSeconds(0);
  };

  const releaseHold = async () => {
    if (!hold) return;
    try {
      await api.cancelHold(hold.id);
    } catch (err) {
      console.warn('Could not cancel hold:', err);
    } finally {
      clearHold();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ReservationContext.Provider
      value={{
        hold,
        remainingSeconds,
        isExpired,
        setNewHold,
        clearHold,
        releaseHold,
        formatTime,
      }}
    >
      {children}
    </ReservationContext.Provider>
  );
};

export function useReservation() {
  const context = useContext(ReservationContext);
  if (!context) {
    throw new Error('useReservation must be used within a ReservationProvider');
  }
  return context;
}
