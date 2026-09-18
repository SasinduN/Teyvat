import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Send, Compass, User, Mail, Phone, Loader2, AlertCircle } from 'lucide-react';
import { submitInquiry } from '@/lib/api/inquiries';
import { describeError } from '@/lib/supabase';

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledSubject?: string;
}

const blankForm = (subject: string) => ({
  name: '',
  email: '',
  phone: '',
  travelers: '2 Adults',
  dates: 'Next 3 Months',
  message: subject ? `I would like to inquire about: ${subject}` : ''
});

export const InquiryModal: React.FC<InquiryModalProps> = ({
  isOpen,
  onClose,
  prefilledSubject = 'General Sri Lanka Trip Inquiry'
}) => {
  // Hooks run unconditionally; the `isOpen` early-return sits below them so
  // opening the modal cannot change the hook count.
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormdata] = useState(() => blankForm(prefilledSubject));

  // The modal stays mounted across opens, so re-seed it each time it is opened
  // with a new subject (e.g. "Experience: Safari in Yala").
  useEffect(() => {
    if (!isOpen) return;
    setSubmitted(false);
    setSending(false);
    setError(null);
    setFormdata(blankForm(prefilledSubject));
  }, [isOpen, prefilledSubject]);

  if (!isOpen) return null;

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

  const handleResetAndClose = () => {
    setSubmitted(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#D4C3B5]/60 relative text-[#1A1A1A]"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-9 h-9 bg-[#F5EFEB] text-[#0F2E23] rounded-full flex items-center justify-center hover:bg-[#0F2E23] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {submitted ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-[#1C4737] text-[#D4AF37] rounded-full flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-heading text-2xl font-bold text-[#0F2E23]">
                Your Inquiry Has Been Received
              </h3>
              <p className="text-sm text-[#1A1A1A]/80 font-light max-w-md mx-auto leading-relaxed">
                Thank you, <strong>{formData.name || 'Traveler'}</strong>! A Travel Eye Sri Lanka travel specialist will review your request and get back to you within 12 hours with a bespoke itinerary.
              </p>
              <button
                onClick={handleResetAndClose}
                className="mt-4 px-8 py-3 bg-[#0F2E23] text-white font-bold rounded-2xl text-xs shadow-md"
              >
                Back to Travel Eye
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="inline-flex items-center space-x-2 text-xs uppercase tracking-widest font-bold text-[#1C4737] bg-[#1C4737]/10 px-3 py-1 rounded-full mb-2">
                  <Compass className="w-3.5 h-3.5" />
                  <span>Custom Trip Planner</span>
                </div>
                <h3 className="font-heading text-2xl sm:text-3xl font-bold text-[#0F2E23]">
                  Plan Your Sri Lanka Journey
                </h3>
                <p className="text-xs text-[#1A1A1A]/70 font-light mt-1">
                  Tell us about your dream trip and our local travel designers will assemble your personalized travel experience.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-[#1C4737]">Your Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#1C4737]/50 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Elena Rostova"
                      value={formData.name}
                      onChange={(e) => setFormdata({ ...formData, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FBF9F6] border border-[#D4C3B5]/50 text-xs font-medium focus:outline-none focus:border-[#1C4737]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-[#1C4737]">Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#1C4737]/50 absolute left-3.5 top-3.5" />
                      <input
                        type="email"
                        required
                        placeholder="elena@example.com"
                        value={formData.email}
                        onChange={(e) => setFormdata({ ...formData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FBF9F6] border border-[#D4C3B5]/50 text-xs font-medium focus:outline-none focus:border-[#1C4737]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-[#1C4737]">Phone / WhatsApp</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#1C4737]/50 absolute left-3.5 top-3.5" />
                      <input
                        type="tel"
                        placeholder="+1 (555) 019-2834"
                        value={formData.phone}
                        onChange={(e) => setFormdata({ ...formData, phone: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FBF9F6] border border-[#D4C3B5]/50 text-xs font-medium focus:outline-none focus:border-[#1C4737]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-[#1C4737]">Travelers</label>
                    <select
                      value={formData.travelers}
                      onChange={(e) => setFormdata({ ...formData, travelers: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#FBF9F6] border border-[#D4C3B5]/50 text-xs font-medium focus:outline-none focus:border-[#1C4737]"
                    >
                      <option value="Solo Traveler">Solo Traveler</option>
                      <option value="2 Adults">2 Adults (Couple)</option>
                      <option value="Family with Kids">Family with Kids</option>
                      <option value="Small Group (3-6)">Small Group (3-6)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-[#1C4737]">Travel Window</label>
                    <select
                      value={formData.dates}
                      onChange={(e) => setFormdata({ ...formData, dates: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#FBF9F6] border border-[#D4C3B5]/50 text-xs font-medium focus:outline-none focus:border-[#1C4737]"
                    >
                      <option value="Next 3 Months">Next 3 Months</option>
                      <option value="4-6 Months Out">4-6 Months Out</option>
                      <option value="Late 2026">Late 2026 / 2027</option>
                      <option value="Flexible Dates">Flexible Dates</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-[#1C4737]">Notes & Specific Requests</label>
                  <textarea
                    rows={3}
                    placeholder="Tell us about places you want to visit or preferred pace..."
                    value={formData.message}
                    onChange={(e) => setFormdata({ ...formData, message: e.target.value })}
                    className="w-full p-3 rounded-xl bg-[#FBF9F6] border border-[#D4C3B5]/50 text-xs font-medium focus:outline-none focus:border-[#1C4737]"
                  />
                </div>

                {error && (
                  <div className="flex items-start space-x-2 rounded-xl bg-[#B3261E]/10 border border-[#B3261E]/30 px-3 py-2.5 text-[#B3261E]">
                    <AlertCircle className="w-4 h-4 mt-px shrink-0" />
                    <p className="text-xs font-medium leading-relaxed">
                      We couldn’t send your request. {error}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-4 bg-[#D4AF37] hover:bg-[#C5A059] text-[#0F2E23] font-bold rounded-2xl text-xs shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
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

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
