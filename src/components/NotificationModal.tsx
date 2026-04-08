import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, X } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error';
  title: string;
  message: string;
}

export const NotificationModal = ({ isOpen, onClose, type, title, message }: NotificationModalProps) => {
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
            {/* Header com cor de fundo baseada no tipo */}
            <div className={`h-32 flex items-center justify-center relative ${
              type === 'success' ? 'bg-brand-success/10' : 'bg-brand-danger/10'
            }`}>
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 transition-colors"
              >
                <X className="w-5 h-5 text-brand-text/40" />
              </button>
              
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
              >
                {type === 'success' ? (
                  <CheckCircle2 className="w-16 h-16 text-brand-success" />
                ) : (
                  <XCircle className="w-16 h-16 text-brand-danger" />
                )}
              </motion.div>
            </div>

            <div className="p-8 pt-6 text-center">
              <h3 className={`text-2xl font-black mb-3 ${
                type === 'success' ? 'text-brand-success' : 'text-brand-danger'
              }`}>
                {title}
              </h3>
              <p className="text-brand-text/60 font-medium leading-relaxed">
                {message}
              </p>
              
              <button
                onClick={onClose}
                className={`mt-8 w-full py-4 rounded-2xl font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95 ${
                  type === 'success' 
                  ? 'bg-brand-success text-white shadow-brand-success/20 hover:bg-brand-success/90' 
                  : 'bg-brand-danger text-white shadow-brand-danger/20 hover:bg-brand-danger/90'
                }`}
              >
                Continuar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
