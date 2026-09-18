import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, LogIn, Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { describeError, isSupabaseConfigured } from '@/lib/supabase';
import { Button, Card, ErrorNote, FieldLabel, Input } from '@/admin/components/ui';

interface LocationState {
  from?: string;
}

export const LoginPage: React.FC = () => {
  const { signIn, session, isAdmin, initializing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const destination = (location.state as LocationState | null)?.from ?? '/admin';

  // Already signed in as an admin? Skip the form.
  useEffect(() => {
    if (!initializing && session && isAdmin) {
      navigate(destination, { replace: true });
    }
  }, [initializing, session, isAdmin, destination, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(describeError(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F2E23] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-heading text-3xl font-bold text-white">Travel Eye</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
            Content Admin
          </div>
        </div>

        <Card className="p-6 sm:p-8">
          <h1 className="font-heading text-xl font-bold text-[#0F2E23]">Sign in</h1>
          <p className="mt-1 text-xs font-light text-[#1A1A1A]/60">
            Use the email and password for your Travel Eye admin account.
          </p>

          {!isSupabaseConfigured && (
            <div className="mt-4">
              <ErrorNote>
                Supabase is not configured. Copy <code>.env.example</code> to{' '}
                <code>.env.local</code> and set <code>VITE_SUPABASE_URL</code> and{' '}
                <code>VITE_SUPABASE_ANON_KEY</code>.
              </ErrorNote>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <FieldLabel htmlFor="admin-email" required>
                Email
              </FieldLabel>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[#1C4737]/45" />
                <Input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="username"
                  placeholder="you@traveleye.lk"
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
                <Lock className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[#1C4737]/45" />
                <Input
                  id="admin-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && <ErrorNote>{error}</ErrorNote>}

            <Button
              type="submit"
              icon={LogIn}
              loading={submitting}
              disabled={!isSupabaseConfigured}
              className="w-full py-3"
            >
              Sign in
            </Button>
          </form>
        </Card>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#F5EFEB]/60 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to the site
          </Link>
        </div>
      </div>
    </div>
  );
};
