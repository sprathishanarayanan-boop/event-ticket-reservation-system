import React, { useState } from 'react';
import { useAuth, UserRole } from '../context/AuthContext';
import { UserCheck, ShieldCheck, Ticket, Sparkles, X, Loader2, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onSuccess: () => void;
  onClose?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onClose }) => {
  const { login, register, switchRoleQuickly } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('ATTENDEE');
  const [tenantName, setTenantName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        await register({ name, email, password, role, tenantName });
      } else {
        await login(email, password);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoRole: UserRole) => {
    setLoading(true);
    setError(null);
    try {
      await switchRoleQuickly(demoRole);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Ticket className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-base">
              {isRegister ? 'Create Account' : 'Sign In to EventPass'}
            </h3>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 1-Click Demo Login Box (For evaluator convenience) */}
        <div className="p-5 bg-indigo-950/30 border-b border-indigo-500/20 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Instant Demo Accounts (Click to test roles)</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickDemo('ATTENDEE')}
              className="bg-slate-800/80 hover:bg-slate-700 text-blue-300 p-2 rounded-xl border border-slate-700 text-center font-medium transition"
            >
              <span className="block font-bold">Attendee</span>
              <span className="text-[10px] text-slate-400">Book seats</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('ORGANIZER')}
              className="bg-slate-800/80 hover:bg-slate-700 text-emerald-300 p-2 rounded-xl border border-slate-700 text-center font-medium transition"
            >
              <span className="block font-bold">Organizer</span>
              <span className="text-[10px] text-slate-400">Apex Tech</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('ADMIN')}
              className="bg-slate-800/80 hover:bg-slate-700 text-purple-300 p-2 rounded-xl border border-slate-700 text-center font-medium transition"
            >
              <span className="block font-bold">Admin</span>
              <span className="text-[10px] text-slate-400">All tenants</span>
            </button>
          </div>
        </div>

        {/* Regular Auth Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-950/60 border border-red-500/50 rounded-xl p-3 text-xs text-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {isRegister && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Account Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="ATTENDEE">Attendee (Book & Buy Tickets)</option>
                  <option value="ORGANIZER">Event Organizer (Host & Manage Events)</option>
                  <option value="ADMIN">System Administrator</option>
                </select>
              </div>

              {role === 'ORGANIZER' && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Organization / Brand Name</label>
                  <input
                    type="text"
                    required
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    placeholder="e.g., Summit Global Entertainment"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-2.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isRegister ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>
          </div>

          <div className="text-center pt-2 text-xs text-slate-400">
            {isRegister ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(false)}
                  className="text-indigo-400 hover:underline font-semibold"
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(true)}
                  className="text-indigo-400 hover:underline font-semibold"
                >
                  Sign Up
                </button>
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
