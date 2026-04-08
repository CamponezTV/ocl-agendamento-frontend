import { m, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmLabel = 'Confirmar', 
  cancelLabel = 'Cancelar' 
}: ConfirmationModalProps) => {
  useBodyScrollLock(isOpen);
  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-ocl-dark/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <m.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden relative border border-white/20"
          >
            <div className="h-1.5 w-full bg-gradient-to-r from-brand-danger via-rose-400 to-brand-danger shrink-0" />

            <div className="h-32 flex items-center justify-center bg-brand-danger/5 relative">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-xl text-brand-text/20 hover:text-brand-text/40 hover:bg-black/5 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              
              <m.div
                initial={{ rotate: -20, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                className="bg-brand-danger/10 p-4 rounded-full"
              >
                <AlertTriangle className="w-10 h-10 text-brand-danger" />
              </m.div>
            </div>

            <div className="p-8 pt-6">
              <h3 className="text-2xl font-black mb-3 text-ocl-primary tracking-tight">
                {title}
              </h3>
              <p className="text-brand-text/50 font-medium leading-relaxed text-sm">
                {message}
              </p>
              
              <div className="flex gap-4 mt-8">
                <button
                  onClick={onClose}
                  className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-brand-text/40 border border-ocl-primary/10 hover:bg-brand-bg transition-all active:scale-95"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-brand-danger text-white shadow-xl shadow-brand-danger/20 hover:bg-brand-danger/90 transition-all active:scale-95"
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
};
