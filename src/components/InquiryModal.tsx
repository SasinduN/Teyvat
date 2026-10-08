import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
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

          <InquiryForm key={prefilledSubject} prefilledSubject={prefilledSubject} onDone={onClose} />

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
