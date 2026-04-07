import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, CheckCircle2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (comment: string) => void;
  oldStatus: string;
  newStatus: string;
  isLoading?: boolean;
}

export const StatusChangeModal = ({ isOpen, onClose, onConfirm, oldStatus, newStatus, isLoading }: Props) => {
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-ocl-dark/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden border border-ocl-primary/5"
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-brand-accent via-ocl-primary to-brand-accent shrink-0" />
          
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-black text-ocl-primary tracking-tight uppercase">Alterar Status</h2>
                <p className="text-[10px] font-bold text-brand-text/30 uppercase tracking-widest mt-1">Confirme a mudança e adicione observações</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-xl text-brand-text/20 hover:text-brand-danger hover:bg-brand-danger/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-4 mb-10 p-4 bg-brand-bg/50 rounded-2xl border border-ocl-primary/5">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[8px] font-black text-brand-text/20 uppercase tracking-widest">ATUAL</span>
                <StatusBadge status={oldStatus} />
              </div>
              <div className="w-8 h-px bg-ocl-primary/10 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-brand-accent shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[8px] font-black text-brand-text/20 uppercase tracking-widest">NOVO</span>
                <StatusBadge status={newStatus} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-brand-accent" />
                  <label className="text-[10px] font-black text-brand-text/40 uppercase tracking-widest">Observação (Opcional)</label>
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Digite aqui detalhes sobre o atendimento..."
                  className="w-full h-32 bg-brand-bg border border-ocl-primary/5 rounded-2xl p-4 text-xs font-medium text-ocl-primary focus:ring-2 focus:ring-brand-accent/20 outline-none transition-all placeholder:text-brand-text/20 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-brand-text/40 hover:bg-brand-bg rounded-2xl transition-all border border-transparent hover:border-ocl-primary/5"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => onConfirm(comment)}
                  disabled={isLoading}
                  className="flex-1 py-4 bg-ocl-primary text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-ocl-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirmar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
