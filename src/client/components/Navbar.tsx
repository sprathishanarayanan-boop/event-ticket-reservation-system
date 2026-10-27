import React, { useState } from 'react';
import { useAuth, UserRole } from '../context/AuthContext';
import { useReservation } from '../context/ReservationContext';
import { Ticket, BarChart3, ShieldCheck, UserCheck, LogOut, Sparkles, ChevronDown } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onNavigate, onOpenAuth }) => {
  const { user, logout, switchRoleQuickly } = useAuth();
  const { hold, remainingSeconds, formatTime } = useReservation();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-900/60 text-purple-300 border-purple-500/40';
      case 'ORGANIZER':
        return 'bg-emerald-900/60 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-blue-900/60 text-blue-300 border-blue-500/40';
    }
  };

  return (
    <nav className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onNavigate('events')}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent flex items-center gap-1.5">
                EventPass
                <span className="text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
                  Multi-Tenant
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Atomic High-Concurrency Engine</p>
            </div>
          </button>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1 text-sm font-medium">
            <button
              onClick={() => onNavigate('events')}
              className={`px-3 py-1.5 rounded-lg transition ${
                currentTab === 'events' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Explore Events
            </button>
            {user && (
              <button
                onClick={() => onNavigate('tickets')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  currentTab === 'tickets' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                My Tickets
              </button>
            )}
            {(user?.role === 'ORGANIZER' || user?.role === 'ADMIN') && (
              <button
                onClick={() => onNavigate('organizer')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  currentTab === 'organizer' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <span>Organizer Studio</span>
              </button>
            )}
            {user?.role === 'ADMIN' && (
              <button
                onClick={() => onNavigate('admin')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  currentTab === 'admin' ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Admin Hub</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Section: Active Hold Pill + Role Switcher + Auth */}
        <div className="flex items-center gap-3">
          {/* Active Hold Pill */}
          {hold && remainingSeconds > 0 && (
            <button
              onClick={() => onNavigate('checkout')}
              className="flex items-center gap-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 px-3 py-1.5 rounded-full text-xs font-mono font-bold transition animate-pulse"
            >
              <span>Hold: {formatTime(remainingSeconds)}</span>
            </button>
          )}

          {/* Quick Demo Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg transition"
              title="Fast Role Switcher (Admin / Organizer / Attendee)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline font-medium">Role:</span>
              <span className={`px-1.5 py-0.2 rounded border text-[11px] font-bold ${getRoleBadge(user?.role)}`}>
                {user?.role || 'Guest'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 text-xs">
                <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 mb-1 border-b border-slate-800">
                  Switch Demo Account
                </div>
                <button
                  onClick={() => { switchRoleQuickly('ATTENDEE'); setRoleMenuOpen(false); }}
                  className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 flex items-center justify-between text-slate-200"
                >
                  <span>Attendee (Alex Morgan)</span>
                  <span className="text-[10px] bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded">ATTENDEE</span>
                </button>
                <button
                  onClick={() => { switchRoleQuickly('ORGANIZER'); setRoleMenuOpen(false); }}
                  className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 flex items-center justify-between text-slate-200"
                >
                  <span>Organizer (Apex Tech)</span>
                  <span className="text-[10px] bg-emerald-900/50 text-emerald-300 px-1.5 py-0.5 rounded">ORGANIZER</span>
                </button>
                <button
                  onClick={() => { switchRoleQuickly('ADMIN'); setRoleMenuOpen(false); }}
                  className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 flex items-center justify-between text-slate-200"
                >
                  <span>Global System Admin</span>
                  <span className="text-[10px] bg-purple-900/50 text-purple-300 px-1.5 py-0.5 rounded">ADMIN</span>
                </button>
              </div>
            )}
          </div>

          {/* User profile / Logout / Login */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden lg:block text-right">
                <div className="text-xs font-semibold text-slate-200 leading-tight">{user.name}</div>
                <div className="text-[10px] text-slate-400 leading-tight truncate max-w-[120px]">{user.email}</div>
              </div>
              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3 py-1.5 rounded-lg shadow-sm transition"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
