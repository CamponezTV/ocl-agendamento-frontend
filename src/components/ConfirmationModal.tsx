import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

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
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ocl-dark/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden relative border border-white/20"
          >
            <div className="h-24 flex items-center justify-center bg-brand-danger/10 relative">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 transition-colors"
              >
                <X className="w-5 h-5 text-brand-text/40" />
              </button>
              
              <motion.div
                initial={{ rotate: -20, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                className="bg-brand-danger/20 p-3 rounded-2xl"
              >
                <AlertTriangle className="w-10 h-10 text-brand-danger" />
              </motion.div>
            </div>

            <div className="p-8 pt-6">
              <h3 className="text-2xl font-black mb-3 text-ocl-primary">
                {title}
              </h3>
              <p className="text-brand-text/60 font-medium leading-relaxed">
                {message}
              </p>
              
              <div className="flex gap-4 mt-8">
                <button
                  onClick={onClose}
                  className="flex-1 py-4 rounded-2xl font-bold uppercase tracking-widest text-brand-text/40 border border-ocl-primary/10 hover:bg-brand-bg transition-all active:scale-95"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="flex-1 py-4 rounded-2xl font-bold uppercase tracking-widest bg-brand-danger text-white shadow-lg shadow-brand-danger/20 hover:bg-brand-danger/90 transition-all active:scale-95"
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
