import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, LogIn, Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ApiRequestError } from '@/lib/api/http';
import { describeError } from '@/lib/errors';
import { Button, Card, ErrorNote, FieldLabel, Input, PasswordInput } from '@/admin/components/ui';
import { brandAddress } from '@shared/brand';
import { documentBrand } from '@/lib/brand';

/** The brand as the server wrote it into this page (the admin doesn't load content). */
const brand = documentBrand();

interface LocationState {
  from?: string;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * A failed sign-in. Once 3 or fewer remain, the server's 401 says how many
 * tries this email has left from here (`server/src/auth/throttle.ts`: 5 over
 * 15 minutes).
 */
function failureMessage(err: unknown): string {
  if (err instanceof ApiRequestError && err.code === 'unauthorized' && err.limits.attemptsLeft !== undefined) {
    const left = err.limits.attemptsLeft;
    return left === 0
      ? `${err.message} Sign-in is now paused for up to 15 minutes.`
      : `${err.message} ${plural(left, 'attempt')} left before sign-in is paused for 15 minutes.`;
  }
  return describeError(err);
}

/** The 429's wait, in minutes, then seconds for the last one. */
function lockedMessage(seconds: number): string {
  const wait = seconds >= 60 ? plural(Math.ceil(seconds / 60), 'minute') : plural(seconds, 'second');
  return `Too many attempts. Try again in ${wait}.`;
}

export const LoginPage: React.FC = () => {
  const { signIn, user, initializing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A 429: no sign-in until then (from its Retry-After), counted down each second.
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (lockedUntil === null) return;
    const timer = window.setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= lockedUntil) setLockedUntil(null);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockedUntil]);

  const secondsLocked = lockedUntil === null ? 0 : Math.max(0, Math.ceil((lockedUntil - now) / 1000));
  const locked = secondsLocked > 0;

  const destination = (location.state as LocationState | null)?.from ?? '/admin';

  // Already signed in? Skip the form.
  useEffect(() => {
    if (!initializing && user) {
      navigate(destination, { replace: true });
    }
  }, [initializing, user, destination, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || locked) return;

    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
      navigate(destination, { replace: true });
    } catch (err) {
      const wait = err instanceof ApiRequestError && err.status === 429 ? err.limits.retryAfterSeconds : undefined;
      if (wait) {
        const time = Date.now();
        setNow(time);
        setLockedUntil(time + wait * 1000);
        setError(null);
      } else {
        // The server's own wording ("Incorrect email or password.", or a 429
        // without Retry-After), plus the attempts left once there are few.
        setError(failureMessage(err));
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--inverse-surface)] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-heading text-3xl font-bold text-white">{brand.name}</div>
          <div className="mt-1 text-xs font-bold uppercase tracking-[0.25em] text-[var(--accent-text)]">
            Content Admin
          </div>
        </div>

        <Card className="p-6 sm:p-8">
          <h1 className="font-heading text-xl font-bold text-[var(--brand-primary)]">Sign in</h1>
          <p className="mt-1 text-sm text-[var(--text-primary)]/60">
            Use the email and password for your {brand.name} admin account.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <FieldLabel htmlFor="admin-email" required>
                Email
              </FieldLabel>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[var(--brand-primary)]/45" />
                <Input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="username"
                  placeholder={brandAddress('you')}
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="admin-password" required>
                Password
              </FieldLabel>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[var(--brand-primary)]/45" />
                <PasswordInput
                  id="admin-password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {locked ? (
              <ErrorNote>{lockedMessage(secondsLocked)}</ErrorNote>
            ) : (
              error && <ErrorNote>{error}</ErrorNote>
            )}

            <Button
              type="submit"
              icon={LogIn}
              loading={submitting}
              disabled={locked}
              className="w-full py-3"
            >
              Sign in
            </Button>
          </form>
        </Card>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--sand)]/60 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to the site
          </Link>
        </div>
      </div>
    </div>
  );
};
