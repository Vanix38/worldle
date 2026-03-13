"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  closeLabel?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  closeLabel = "Fermer",
}: ModalProps) {
  const previousActiveRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      previousActiveRef.current = document.activeElement as HTMLElement | null;
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousActiveRef.current) {
        previousActiveRef.current.focus();
      }
    };
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <motion.div
            className="fixed inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 w-full max-w-lg rounded-xl border border-gray-600 bg-gray-900 p-4 shadow-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2
                id="modal-title"
                className="text-xl font-bold text-white sm:text-2xl"
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[2.75rem] min-w-[2.75rem] rounded-lg text-gray-400 transition hover:bg-gray-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                aria-label={closeLabel}
              >
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>
            <div className="text-gray-300">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
