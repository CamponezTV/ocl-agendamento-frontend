import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, X, Copy, Check } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error';
  title: string;
  message: string;
  copyText?: string;
}

export const NotificationModal = ({ isOpen, onClose, type, title, message, copyText }: NotificationModalProps) => {
  useBodyScrollLock(isOpen);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-ocl-dark/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden relative border border-white/20"
          >
            {/* Header accent bar */}
            <div className={`h-1.5 w-full shrink-0 ${
              type === 'success' ? 'bg-brand-success' : 'bg-brand-danger'
            } bg-gradient-to-r ${
              type === 'success' 
                ? 'from-brand-success via-emerald-400 to-brand-success' 
                : 'from-brand-danger via-rose-400 to-brand-danger'
            }`} />

            <div className={`h-32 flex items-center justify-center relative ${
              type === 'success' ? 'bg-brand-success/5' : 'bg-brand-danger/5'
            }`}>
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-xl text-brand-text/20 hover:text-brand-text/40 hover:bg-black/5 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
              >
                {type === 'success' ? (
                  <div className="p-4 rounded-full bg-brand-success/10">
                    <CheckCircle2 className="w-12 h-12 text-brand-success" />
                  </div>
                ) : (
                  <div className="p-4 rounded-full bg-brand-danger/10">
                    <XCircle className="w-12 h-12 text-brand-danger" />
                  </div>
                )}
              </motion.div>
            </div>

            <div className="p-8 pt-6 text-center">
              <h3 className={`text-2xl font-black mb-3 tracking-tight ${
                type === 'success' ? 'text-brand-success' : 'text-brand-danger'
              }`}>
                {title}
              </h3>
              <p className="text-brand-text/50 font-medium leading-relaxed text-sm px-2">
                {message}
              </p>
              
              <div className="mt-8 flex flex-col gap-3">
                {type === 'success' && copyText && (
                  <>
                    <div className="bg-brand-bg/50 border border-ocl-primary/5 rounded-2xl p-4 text-left mb-2 max-h-48 overflow-y-auto custom-scrollbar">
                      <p className="text-[9px] font-black uppercase text-brand-text/30 tracking-widest mb-3 border-b border-ocl-primary/5 pb-2">Detalhes do Agendamento</p>
                      <pre className="text-[11px] font-bold text-ocl-primary leading-relaxed font-sans whitespace-pre-wrap">
                        {copyText}
                      </pre>
                    </div>
                    <button
                      onClick={handleCopy}
                      className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-brand-success/20 text-brand-success hover:bg-brand-success/5 flex items-center justify-center gap-2 group shadow-sm active:scale-95"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" /> Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 group-hover:scale-110 transition-transform" /> Copiar Dados
                        </>
                      )}
                    </button>
                  </>
                )}
                
                <button
                  onClick={onClose}
                  className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 ${
                    type === 'success' 
                    ? 'bg-brand-success text-white shadow-brand-success/20 hover:bg-brand-success/90' 
                    : 'bg-brand-danger text-white shadow-brand-danger/20 hover:bg-brand-danger/90'
                  }`}
                >
                  Continuar
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
