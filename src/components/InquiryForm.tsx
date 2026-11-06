import React, { useState, useId, useEffect, useRef } from 'react';
import { CheckCircle2, Send, Compass, User, Mail, Phone, Loader2, AlertCircle } from 'lucide-react';
import { submitInquiry } from '@/lib/api/inquiries';
import { describeError } from '@/lib/errors';

interface InquiryFormProps {
  /** What the enquiry is about; saved as its subject and quoted in the message. */
  prefilledSubject: string;
  /** What the message starts as, instead of quoting the subject (the wishlist). */
  prefilledMessage?: string;
  /** The button after a successful send. */
  onDone: () => void;
  doneLabel?: string;
}

const blankForm = (subject: string, message?: string) => ({
  name: '',
  email: '',
  phone: '',
  travelers: '2 Adults',
  dates: 'Next 3 Months',
  message: message ?? (subject ? `I would like to inquire about: ${subject}` : ''),
  website: ''
});

/**
 * The enquiry form and its "received" message: inside `InquiryModal`, and
 * inline on the About page. It keeps its own state, so give it a new `key`
 * for a new subject.
 */
export const InquiryForm: React.FC<InquiryFormProps> = ({
  prefilledSubject,
  prefilledMessage,
  onDone,
  doneLabel = 'Back to Travel Eye'
}) => {
  const id = useId();
  const successRef = useRef<HTMLDivElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormdata] = useState(() => blankForm(prefilledSubject, prefilledMessage));

  useEffect(() => { if (submitted) successRef.current?.focus(); }, [submitted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;

    setSending(true);
    setError(null);
    try {
      await submitInquiry({ ...formData, subject: prefilledSubject });
      setSubmitted(true);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {submitted ? (
        <div ref={successRef} tabIndex={-1} role="status" className="py-8 text-center space-y-4">
          <div className="w-16 h-16 bg-[var(--brand-secondary)] text-[var(--accent-text)] rounded-full flex items-center justify-center mx-auto shadow-lg">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="font-heading text-2xl font-bold text-[var(--brand-primary)]">
            Your Inquiry Has Been Received
          </h3>
          <p className="text-sm text-[var(--text-primary)]/80 max-w-md mx-auto leading-relaxed">
            Thank you, <strong>{formData.name || 'Traveler'}</strong>! We’ll reply by email.
          </p>
          <button
            onClick={onDone}
            className="te-button te-button--secondary mt-4 px-8 py-3 font-bold"
          >
            {doneLabel}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <div className="inline-flex items-center space-x-2 text-xs uppercase tracking-widest font-bold text-[var(--brand-primary)] bg-[var(--brand-secondary)]/10 px-3 py-1 rounded-full mb-2">
              <Compass className="w-3.5 h-3.5" />
              <span>Custom Trip Planner</span>
            </div>
            <h3 className="font-heading text-2xl font-bold text-[var(--brand-primary)]">
              Plan Your Sri Lanka Journey
            </h3>
            <p className="text-sm text-[var(--text-primary)]/70 mt-1">
              Tell us about your dream trip and our local travel designers will assemble your personalized travel experience.
            </p>
          </div>

          <form aria-busy={sending} onSubmit={handleSubmit} className="space-y-4">
            {/* Spam trap: off-screen, hidden from screen readers and the Tab key. Must stay the first child. */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
              <label>
                Leave this field empty
                <input type="text" name="leave_blank_hp" tabIndex={-1} autoComplete="off" value={formData.website} onChange={(e) => setFormdata({ ...formData, website: e.target.value })} />
              </label>
            </div>
            <div className="space-y-1">
              <label htmlFor={`${id}-name`} className="text-xs font-bold uppercase text-[var(--brand-primary)]">Your Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-[var(--brand-primary)]/50 absolute left-3.5 top-3.5" />
                <input
                  id={`${id}-name`} name="name" autoComplete="name" maxLength={120}
                  type="text"
                  required
                  placeholder="e.g. Elena Rostova"
                  value={formData.name}
                  onChange={(e) => setFormdata({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border-strong)]/50 text-base font-medium focus:outline-none focus:border-[var(--inverse-raised)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor={`${id}-email`} className="text-xs font-bold uppercase text-[var(--brand-primary)]">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[var(--brand-primary)]/50 absolute left-3.5 top-3.5" />
                  <input
                    id={`${id}-email`} name="email" autoComplete="email" maxLength={254}
                    type="email"
                    required
                    placeholder="elena@example.com"
                    value={formData.email}
                    onChange={(e) => setFormdata({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border-strong)]/50 text-base font-medium focus:outline-none focus:border-[var(--inverse-raised)]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor={`${id}-phone`} className="text-xs font-bold uppercase text-[var(--brand-primary)]">Phone / WhatsApp</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[var(--brand-primary)]/50 absolute left-3.5 top-3.5" />
                  <input
                    id={`${id}-phone`} name="phone" autoComplete="tel" maxLength={40}
                    type="tel"
                    placeholder="+1 (555) 019-2834"
                    value={formData.phone}
                    onChange={(e) => setFormdata({ ...formData, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border-strong)]/50 text-base font-medium focus:outline-none focus:border-[var(--inverse-raised)]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor={`${id}-travelers`} className="text-xs font-bold uppercase text-[var(--brand-primary)]">Travelers</label>
                <select id={`${id}-travelers`} name="travelers"
                  value={formData.travelers}
                  onChange={(e) => setFormdata({ ...formData, travelers: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border-strong)]/50 text-base font-medium focus:outline-none focus:border-[var(--inverse-raised)]"
                >
                  <option value="Solo Traveler">Solo Traveler</option>
                  <option value="2 Adults">2 Adults (Couple)</option>
                  <option value="Family with Kids">Family with Kids</option>
                  <option value="Small Group (3-6)">Small Group (3-6)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor={`${id}-dates`} className="text-xs font-bold uppercase text-[var(--brand-primary)]">Travel Window</label>
                <select id={`${id}-dates`} name="dates"
                  value={formData.dates}
                  onChange={(e) => setFormdata({ ...formData, dates: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border-strong)]/50 text-base font-medium focus:outline-none focus:border-[var(--inverse-raised)]"
                >
                  <option value="Next 3 Months">Next 3 Months</option>
                  <option value="4-6 Months Out">4-6 Months Out</option>
                  <option value="Late 2026">Late 2026 / 2027</option>
                  <option value="Flexible Dates">Flexible Dates</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor={`${id}-message`} className="text-xs font-bold uppercase text-[var(--brand-primary)]">Notes & Specific Requests</label>
              <textarea id={`${id}-message`} name="message" maxLength={5000}
                rows={prefilledMessage ? 8 : 3}
                placeholder="Tell us about places you want to visit or preferred pace..."
                value={formData.message}
                onChange={(e) => setFormdata({ ...formData, message: e.target.value })}
                className="w-full p-3 rounded-xl bg-[var(--background)] border border-[var(--border-strong)]/50 text-base font-medium focus:outline-none focus:border-[var(--inverse-raised)]"
              />
            </div>

            {error && (
              <div role="alert" className="flex items-start space-x-2 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 px-3 py-2.5 text-[var(--danger)]">
                <AlertCircle className="w-4 h-4 mt-px shrink-0" />
                <p className="text-sm font-medium leading-relaxed">
                  We couldn’t send your request. {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={sending}
              data-keep-clear
              className="te-button te-button--primary w-full py-4 font-bold flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Your Request…</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Travel Request</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
};
