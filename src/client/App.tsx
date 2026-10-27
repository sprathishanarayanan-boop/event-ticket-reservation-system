import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ReservationProvider, useReservation } from './context/ReservationContext';
import { Navbar } from './components/Navbar';
import { HoldTimerBanner } from './components/HoldTimerBanner';
import { EventsPage } from './pages/EventsPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { MyTicketsPage } from './pages/MyTicketsPage';
import { OrganizerDashboardPage } from './pages/OrganizerDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { LoginPage } from './pages/LoginPage';

function MainLayout() {
  const [currentTab, setCurrentTab] = useState<'events' | 'detail' | 'checkout' | 'tickets' | 'organizer' | 'admin'>('events');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const { user } = useAuth();

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setCurrentTab('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* 10-Minute Hold Expiration Sticky Alert Banner */}
      <HoldTimerBanner onGoToCheckout={() => setCurrentTab('checkout')} />

      {/* Main Navbar */}
      <Navbar
        currentTab={currentTab}
        onNavigate={(tab) => {
          setCurrentTab(tab as any);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAuth={() => setShowAuthModal(true)}
      />

      {/* Page Content */}
      <main className="flex-1 pb-16">
        {currentTab === 'events' && (
          <EventsPage onSelectEvent={handleSelectEvent} />
        )}

        {currentTab === 'detail' && selectedEventId && (
          <EventDetailPage
            eventId={selectedEventId}
            onBack={() => setCurrentTab('events')}
            onProceedToCheckout={() => setCurrentTab('checkout')}
            onOpenAuth={() => setShowAuthModal(true)}
          />
        )}

        {currentTab === 'checkout' && (
          <CheckoutPage
            onGoToEvents={() => setCurrentTab('events')}
            onGoToTickets={() => setCurrentTab('tickets')}
          />
        )}

        {currentTab === 'tickets' && (
          <MyTicketsPage />
        )}

        {currentTab === 'organizer' && (
          <OrganizerDashboardPage />
        )}

        {currentTab === 'admin' && (
          <AdminDashboardPage />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">EventPass Multi-Tenant System</span>
            <span>•</span>
            <span>ACID Concurrency Protected</span>
          </div>
          <div className="text-[11px] text-slate-500">
            PostgreSQL SELECT FOR UPDATE & SQLite Atomic Mutex • Redis Cache Layer • 10-Minute Hold Cleaner
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <LoginPage
          onSuccess={() => setShowAuthModal(false)}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <ReservationProvider>
        <MainLayout />
      </ReservationProvider>
    </AuthProvider>
  );
}

export default App;
