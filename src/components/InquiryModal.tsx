import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useModalFocus } from '@/hooks/useModalFocus';
import { InquiryForm } from './InquiryForm';

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledSubject?: string;
}

export const InquiryModal: React.FC<InquiryModalProps> = ({
  isOpen,
  onClose,
  prefilledSubject = 'General Sri Lanka Trip Inquiry'
}) => {
  // Keyboard focus stays in the dialog, the page behind is inert and doesn't
  // scroll, Escape closes, and focus goes back to what opened it.
  const dialogRef = useModalFocus(isOpen, onClose);
  // Unmounted while closed, so each opening starts with a fresh form.
  if (!isOpen) return null;

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
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Plan your Sri Lanka journey"
          tabIndex={-1}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="te-modal-panel bg-[var(--surface)] rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[var(--border-strong)]/60 relative text-[var(--text-primary)]"
        >
          <button
            type="button" aria-label="Close enquiry"
            onClick={onClose}
            className="te-button te-button--icon absolute top-4 right-4 z-20"
          >
            <X className="w-5 h-5" />
          </button>

          <InquiryForm key={prefilledSubject} prefilledSubject={prefilledSubject} onDone={onClose} />

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
