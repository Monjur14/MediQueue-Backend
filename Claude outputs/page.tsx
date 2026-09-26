'use client';

import { useState } from 'react';
import { useRequireAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth.store';
import { useMyActiveToken, useUpdatePatientProfile, type PatientProfile } from '@/hooks/api/queue';
import { useQueueSocket } from '@/hooks/useQueueSocket';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Status badge                                                        */
/* ------------------------------------------------------------------ */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    waiting:         { label: 'Waiting',        cls: 'bg-yellow-100 text-yellow-800' },
    called:          { label: 'Your turn!',      cls: 'bg-green-100 text-green-800 animate-pulse' },
    in_consultation: { label: 'In consultation', cls: 'bg-blue-100 text-blue-800' },
    completed:       { label: 'Done',            cls: 'bg-gray-100 text-gray-800' },
    skipped:         { label: 'Skipped',         cls: 'bg-red-100 text-red-700' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-800' };
  return (
    <span className={cn('inline-block rounded-full px-3 py-1 text-xs font-semibold', cls)}>
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Active token card                                                   */
/* ------------------------------------------------------------------ */
function ActiveTokenCard() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const userId      = useAuthStore((s) => s.user?.id);
  const { data: token, isLoading, isError, refetch } = useMyActiveToken();

  // WebSocket for real-time updates — personal room events give zero-latency patches
  useQueueSocket(token?.session_id ?? null, accessToken, userId);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 p-8 text-center">
        <svg className="animate-spin h-6 w-6 text-blue-500 mx-auto" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm text-gray-700 mt-3">Checking for your token…</p>
      </div>
    );
  }

  if (isError || !token) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
          <div className="text-4xl mb-3">🏥</div>
          <p className="font-semibold text-gray-900">No active queue today</p>
          <p className="text-sm text-gray-700 mt-1">
            Visit the clinic reception — they'll assign you a token.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="text-sm text-blue-600 hover:underline text-center w-full"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Clinic / doctor info */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          {token.department_name}
        </p>
        <p className="text-sm font-medium text-gray-900 mt-0.5">
          Dr. {token.doctor_name}
        </p>
        <p className="text-xs text-gray-700 mt-0.5">{token.clinic_name}</p>
        <div className="flex items-center gap-1 mt-2">
          <span className="text-xs text-gray-700">Now serving:</span>
          <span className="text-xs font-bold text-gray-900">#{token.current_token}</span>
        </div>
      </div>

      {/* Break banner */}
      {token.session_status === 'break' && (() => {
        const resumeTime = token.break_started_at && token.break_expected_duration
          ? new Date(
              new Date(token.break_started_at).getTime() +
              token.break_expected_duration * 60_000
            ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : null;
        return (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-center">
            <p className="font-semibold text-orange-800">☕ Now Serving: Doctor on Break</p>
            {resumeTime && (
              <p className="text-sm text-orange-700 mt-1">
                Queue Will Start Again: <span className="font-bold">{resumeTime}</span>
              </p>
            )}
          </div>
        );
      })()}

      {/* Session closed banner */}
      {token.session_status === 'closed' && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
          <p className="font-semibold text-gray-700">🏁 Session Closed for Today</p>
          <p className="text-sm text-gray-500 mt-1">The clinic has closed the queue for today.</p>
        </div>
      )}

      {/* My token */}
      <div className={cn(
        'rounded-xl border-2 p-5',
        token.status === 'called'
          ? 'border-green-400 bg-green-50'
          : 'border-blue-200 bg-blue-50',
      )}>
        {token.status === 'called' && (
          <p className="text-center text-green-700 font-bold text-sm mb-3 animate-bounce">
            🔔 Your turn — please go to the doctor!
          </p>
        )}

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Your token
            </p>
            <p className="text-5xl font-black text-blue-700 mt-1">#{token.my_token}</p>
          </div>
          <div className="text-right space-y-2">
            <StatusBadge status={token.status} />
            {token.status === 'waiting' && (
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {token.patients_ahead === 0
                  ? "You're next!"
                  : `${token.patients_ahead} ahead`}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Profile section                                                     */
/* ------------------------------------------------------------------ */
function ProfileSection() {
  const user    = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName]     = useState(user?.name ?? '');
  const [phone, setPhone]   = useState(user?.phone ?? '');
  const [channel, setChannel] = useState<PatientProfile['preferred_channel']>('whatsapp');
  const update = useUpdatePatientProfile();

  const handleSave = async () => {
    const body: Partial<PatientProfile> = {
      preferred_channel: channel,
    };
    if (name.trim())  body.full_name = name.trim();
    if (phone.trim()) body.phone     = phone.trim();

    try {
      await update.mutateAsync(body);
      if (user) setUser({ ...user, name: body.full_name ?? user.name, phone: body.phone ?? user.phone });
    } catch {
      // toast shown by hook
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-700">My Profile</p>

      {/* Name */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Full name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Phone */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Phone number
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+880…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Notification preference */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Notification preference
        </label>
        <div className="flex gap-2">
          {(['whatsapp', 'sms', 'both'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setChannel(c)}
              className={cn(
                'flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-colors',
                channel === c
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300',
              )}
            >
              {c === 'whatsapp' ? 'WhatsApp' : c === 'sms' ? 'SMS' : 'Both'}
            </button>
          ))}
        </div>
      </div>

      {/* Read-only email */}
      <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Email</p>
        <p className="text-sm text-gray-600 mt-0.5">{user?.email}</p>
      </div>

      <Button
        onClick={handleSave}
        disabled={update.isPending}
        className="w-full"
      >
        {update.isPending ? 'Saving…' : 'Save changes'}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
export default function PatientQueuePage() {
  const { user, loading } = useRequireAuth(['patient']);
  const logout = useAuthStore((s) => s.logout);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 pt-6 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">MediQueue</h1>
            <p className="text-sm text-gray-700">Hello, {user.name}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            Sign out
          </Button>
        </div>

        <div className="space-y-4">
          <ActiveTokenCard />
          <ProfileSection />
        </div>
      </div>
    </div>
  );
}
