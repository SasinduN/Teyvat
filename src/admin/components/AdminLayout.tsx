import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ExternalLink,
  CalendarCheck,
  Camera,
  Images,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorOff,
  Settings,
  X,
  type LucideIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { COLLECTIONS } from '@/admin/collections';
import { describeError } from '@/lib/errors';
import { useInquiryCounts, useUnreadTitle } from '@/admin/useInquiryCounts';
import { PageCrash } from '@/admin/components/PageCrash';
import { ErrorBoundary } from '@/lib/ErrorBoundary';
import { cn } from '@/utils/cn';
import { documentBrand } from '@/lib/brand';

/** The brand as the server wrote it into this page (the admin doesn't load content). */
const brand = documentBrand();

const NavItem: React.FC<{
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
  /** A count shown on the right, e.g. unread enquiries. Hidden when 0. */
  badge?: number;
  onNavigate?: () => void;
}> = ({ to, icon: Icon, label, end, badge, onNavigate }) => (
  <NavLink
    to={to}
    end={end}
    onClick={onNavigate}
    className={({ isActive }) =>
      cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors',
        isActive
          ? 'bg-[var(--accent)] text-[var(--on-accent)]'
          : 'text-[var(--sand)]/75 hover:bg-white/10 hover:text-white'
      )
    }
  >
    <Icon className="h-4 w-4 shrink-0" />
    <span className="truncate">{label}</span>
    {badge ? (
      <span
        className="ml-auto rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-bold text-[var(--on-accent)]"
        aria-label={`${badge} new`}
      >
        {badge}
      </span>
    ) : null}
  </NavLink>
);

export const AdminLayout: React.FC = () => {
  const { user, signOut, signOutEverywhere } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const unread = useInquiryCounts().data?.new ?? 0;
  useUnreadTitle(unread);

  // If the request fails the session is still live on the server, so stay put
  // and say so rather than pretending the sign-out happened.
  const handleSignOut = async (everywhere: boolean) => {
    try {
      await (everywhere ? signOutEverywhere() : signOut());
      navigate('/admin/login', { replace: true });
    } catch (e) {
      toast.error(describeError(e));
    }
  };

  const closeMobile = () => setMobileOpen(false);

  const sidebar = (
    <div className="flex h-full flex-col bg-[var(--inverse-surface)] p-4">
      <div className="mb-6 px-2 pt-2">
        <div className="font-heading text-lg font-bold text-white">{brand.name}</div>
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent-text)]">
          Content Admin
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        <NavItem to="/admin" icon={LayoutDashboard} label="Dashboard" end onNavigate={closeMobile} />
        <NavItem
          to="/admin/inquiries"
          icon={Inbox}
          label="Enquiries"
          badge={unread}
          onNavigate={closeMobile}
        />

        <div className="px-3 pb-1 pt-5 text-xs font-bold uppercase tracking-[0.2em] text-[var(--sand)]/40">
          Content
        </div>
        {COLLECTIONS.map((c) => (
          <NavItem
            key={c.slug}
            to={`/admin/${c.slug}`}
            icon={c.icon}
            label={c.label}
            onNavigate={closeMobile}
          />
        ))}

        <div className="px-3 pb-1 pt-5 text-xs font-bold uppercase tracking-[0.2em] text-[var(--sand)]/40">
          Site
        </div>
        <NavItem to="/admin/bookings" icon={CalendarCheck} label="Bookings" onNavigate={closeMobile} />
        <NavItem to="/admin/media" icon={Images} label="Media library" onNavigate={closeMobile} />
        <NavItem to="/admin/credits" icon={Camera} label="Photo credits" onNavigate={closeMobile} />
        <NavItem to="/admin/settings" icon={Settings} label="Settings" onNavigate={closeMobile} />
      </nav>

      <div className="mt-4 space-y-1 border-t border-white/10 pt-4">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--sand)]/75 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ExternalLink className="h-4 w-4 shrink-0" />
          <span>View live site</span>
        </a>
        <button
          onClick={() => void handleSignOut(false)}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--sand)]/75 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign out</span>
        </button>
        <button
          onClick={() => void handleSignOut(true)}
          title="Ends your session on every browser and device"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--sand)]/75 transition-colors hover:bg-white/10 hover:text-white"
        >
          <MonitorOff className="h-4 w-4 shrink-0" />
          <span>Sign out everywhere</span>
        </button>

        <div className="truncate px-3 pt-3 text-xs text-[var(--sand)]/40">
          {user?.fullName || user?.email}
        </div>
      </div>
    </div>
  );

  return (
    <div className="te-admin min-h-screen bg-[var(--background)]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={closeMobile} />
          <aside id="admin-navigation" className="absolute inset-y-0 left-0 w-64 shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Mobile top bar */}
        <div className="te-admin-toolbar sticky top-0 z-40 flex items-center gap-3 border-b border-[var(--border-strong)]/50 bg-[var(--background)]/95 py-3 backdrop-blur lg:hidden">
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen} aria-controls="admin-navigation"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--inverse-surface)] text-white"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <span className="font-heading text-base font-bold text-[var(--brand-primary)]">
            {brand.name} Admin
          </span>
        </div>

        <main className="te-container py-8">
          {/* A page that throws shows PageCrash; the sidebar keeps working. */}
          <ErrorBoundary
            name="admin page"
            resetKey={location.pathname}
            fallback={(reset) => <PageCrash onRetry={reset} />}
          >
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};
