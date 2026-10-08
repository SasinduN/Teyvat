import { Link } from 'react-router-dom';
import React, { useState, useId } from 'react';
import { Logo } from './Logo';
import { useSiteSettings } from '@/hooks/useSiteContent';
import { MapPin, Phone, Mail, CheckCircle2, ArrowRight } from 'lucide-react';
import { NAV_LINKS } from '@shared/site-paths';
import { API_ROUTES } from '@shared/api';
import { postJson } from '@/lib/api/http';
import { describeError } from '@/lib/errors';
import { SiteLink } from './SiteLink';

const OptionalLink: React.FC<React.AnchorHTMLAttributes<HTMLAnchorElement>> = ({ href, children, className, ...props }) => href
  ? <a href={href} className={className} {...props}>{children}</a>
  : <span aria-label={props['aria-label']} className="opacity-60" title="Coming soon">{children}</span>;

export const Footer: React.FC = () => {
  const settings = useSiteSettings();
  const emailId = useId();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setSending(true); setError(null);
    try {
      await postJson(API_ROUTES.newsletter, { email, website });
      setSubscribed(true); setEmail('');
    } catch (err) { setError(describeError(err)); }
    finally { setSending(false); }
  };

  return (
    <footer className="bg-[var(--inverse-deep)] text-white pt-20 pb-12 border-t border-white/10 relative overflow-hidden">
      <div className="te-container">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-12 pb-16 border-b border-white/10">
          
          {/* Brand Info (4 cols) */}
          <div className="md:col-span-4 space-y-5">
            <Logo variant="light" size="lg" />
            <p className="font-heading italic text-lg text-[var(--accent-text)]">
              “See Sri Lanka Through a Different Eye.”
            </p>
            <p className="text-xs text-white/70 leading-relaxed font-light">
              Travel Eye is Sri Lanka’s premier travel discovery and experience platform. Dedicated to showcasing the island’s authentic heritage, wild landscapes, and luxury sanctuaries.
            </p>

            {/* Social Icons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <OptionalLink href={settings.instagramUrl} className="w-9 h-9 rounded-full bg-white/10 hover:bg-[var(--accent)] hover:text-[var(--brand-primary)] flex items-center justify-center transition-colors" aria-label="Instagram">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </OptionalLink>
              <OptionalLink href={settings.facebookUrl} className="w-9 h-9 rounded-full bg-white/10 hover:bg-[var(--accent)] hover:text-[var(--brand-primary)] flex items-center justify-center transition-colors" aria-label="Facebook">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.5 5H18V0h-3.808C10.592 0 9 1.849 9 4.7V8z"/></svg>
              </OptionalLink>
              <OptionalLink href={settings.tiktokUrl} className="w-9 h-9 rounded-full bg-white/10 hover:bg-[var(--accent)] hover:text-[var(--brand-primary)] flex items-center justify-center transition-colors font-bold text-xs" aria-label="TikTok">
                TT
              </OptionalLink>
              <OptionalLink href={settings.youtubeUrl} className="w-9 h-9 rounded-full bg-white/10 hover:bg-[var(--accent)] hover:text-[var(--brand-primary)] flex items-center justify-center transition-colors" aria-label="YouTube">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
              </OptionalLink>
            </div>
          </div>

          {/* Navigation Links (2 cols) */}
          <div className="md:col-span-2 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--accent-text)]">
              Navigation
            </h4>
            <ul className="space-y-2.5 text-xs text-white/80 font-medium">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <SiteLink
                    to={link.to}
                    className="hover:text-[var(--accent-text)] transition-colors capitalize text-left"
                  >
                    {link.label}
                  </SiteLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Details (3 cols) */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--accent-text)]">
              Contact Travel Eye
            </h4>
            <ul className="space-y-3 text-xs text-white/80">
              <li className="flex items-start space-x-3">
                <MapPin className="w-4 h-4 text-[var(--accent-text)] shrink-0 mt-0.5" />
                <span>{settings.postalAddress}</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-[var(--accent-text)] shrink-0" />
                <span>{settings.phone}</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-[var(--accent-text)] shrink-0" />
                <a href={`mailto:${settings.contactEmail}`} className="hover:text-[var(--accent-text)] transition-colors">
                  {settings.contactEmail}
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter (3 cols) */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--accent-text)]">
              Travel Eye Dispatch
            </h4>
            <p className="text-xs text-white/70 font-light">
              Get secret island guides, travel inspiration, and seasonal offers delivered to your inbox.
            </p>

            {subscribed ? (
              <div role="status" className="p-3 bg-[var(--brand-secondary)] rounded-2xl border border-[var(--emerald-edge)] text-xs text-[var(--accent-text)] flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--accent-text)]" />
                <span>Welcome to Travel Eye Dispatch!</span>
              </div>
            ) : (
              <form aria-busy={sending} onSubmit={handleSubscribe} className="space-y-2">
                <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
                  <label>Leave this field empty<input type="text" name="dispatch_website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label>
                </div>
                <label className="sr-only" htmlFor={emailId}>Email address for Travel Eye Dispatch</label>
                <input
                  id={emailId} name="email" autoComplete="email" maxLength={254}
                  type="email"
                  required
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/15 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="submit" disabled={sending}
                  className="te-button te-button--primary w-full py-3 font-bold text-xs flex items-center justify-center space-x-1"
                >
                  <span>{sending ? "Subscribing..." : "Subscribe"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                {error && <p role="alert" className="text-xs text-white">{error}</p>}
              </form>
            )}
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-white/50 space-y-2 sm:space-y-0">
          <p>© 2026 Travel Eye Sri Lanka. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
            <Link to="/photo-credits" className="hover:text-white transition-colors">Photography credits</Link>
            <OptionalLink href={settings.privacyUrl} className="hover:text-white transition-colors">Privacy Policy</OptionalLink>
            <OptionalLink href={settings.termsUrl} className="hover:text-white transition-colors">Terms of Service</OptionalLink>
            <OptionalLink href={settings.sustainabilityUrl} className="hover:text-white transition-colors">Sustainability Pledge</OptionalLink>
          </div>
        </div>

      </div>
    </footer>
  );
};
