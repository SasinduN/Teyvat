import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ExternalLink,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  type LucideIcon
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { COLLECTIONS } from '@/admin/collections';
import { cn } from '@/utils/cn';

const NavItem: React.FC<{
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
  onNavigate?: () => void;
}> = ({ to, icon: Icon, label, end, onNavigate }) => (
  <NavLink
    to={to}
    end={end}
    onClick={onNavigate}
    className={({ isActive }) =>
      cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors',
        isActive
          ? 'bg-[#D4AF37] text-[#0F2E23]'
          : 'text-[#F5EFEB]/75 hover:bg-white/10 hover:text-white'
      )
    }
  >
    <Icon className="h-4 w-4 shrink-0" />
    <span className="truncate">{label}</span>
  </NavLink>
);

export const AdminLayout: React.FC = () => {
  const { admin, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login', { replace: true });
  };

  const closeMobile = () => setMobileOpen(false);

  const sidebar = (
    <div className="flex h-full flex-col bg-[#0F2E23] p-4">
      <div className="mb-6 px-2 pt-2">
        <div className="font-heading text-lg font-bold text-white">Travel Eye</div>
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
          Content Admin
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        <NavItem to="/admin" icon={LayoutDashboard} label="Dashboard" end onNavigate={closeMobile} />
        <NavItem to="/admin/inquiries" icon={Inbox} label="Enquiries" onNavigate={closeMobile} />

        <div className="px-3 pb-1 pt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#F5EFEB]/40">
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
      </nav>

      <div className="mt-4 space-y-1 border-t border-white/10 pt-4">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-[#F5EFEB]/75 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ExternalLink className="h-4 w-4 shrink-0" />
          <span>View live site</span>
        </a>
        <button
          onClick={() => void handleSignOut()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-[#F5EFEB]/75 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign out</span>
        </button>

        <div className="truncate px-3 pt-3 text-[10px] font-light text-[#F5EFEB]/40">
          {admin?.full_name || user?.email}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FBF9F6]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={closeMobile} />
          <aside className="absolute inset-y-0 left-0 w-64 shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-[#D4C3B5]/50 bg-[#FBF9F6]/95 px-4 py-3 backdrop-blur lg:hidden">
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F2E23] text-white"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <span className="font-heading text-base font-bold text-[#0F2E23]">
            Travel Eye Admin
          </span>
        </div>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
