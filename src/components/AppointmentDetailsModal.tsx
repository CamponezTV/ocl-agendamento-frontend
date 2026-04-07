import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Phone, User, DollarSign, Calendar, Clock, UserCheck, Copy, Check } from 'lucide-react';
import type { Appointment } from '../services/appointmentService';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface Props {
  isOpen: boolean;
  appointment: Appointment | null;
  onClose: () => void;
}

const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="flex items-start gap-4 p-4 rounded-2xl bg-brand-bg border border-ocl-primary/5">
    <div className="p-2 rounded-xl bg-ocl-primary/5 shrink-0">
      <Icon className="w-4 h-4 text-brand-accent" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/30 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-ocl-primary break-words leading-tight">{value || '—'}</p>
    </div>
  </div>
);

export const AppointmentDetailsModal = ({ isOpen, appointment, onClose }: Props) => {
  useBodyScrollLock(isOpen);
  const [copied, setCopied] = useState(false);

  if (!appointment) return null;

  const date = new Date(appointment.appointment_date);
  const formattedDate = date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const handleCopy = () => {
    const text = `DETALHES DO AGENDAMENTO
Data: ${formattedDate}
Horário: ${formattedTime}
Contrato: ${appointment.contract}
Telefone: ${appointment.phone}
Responsável: ${appointment.responsible_name} (${appointment.responsible_type})
Recuperador: ${appointment.recovery_name}
Valores: R$ ${appointment.agreed_values}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-ocl-dark/80 backdrop-blur-md z-[8000] flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="h-1.5 w-full bg-gradient-to-r from-ocl-primary via-brand-accent to-ocl-primary shrink-0" />

            <div className="flex items-start justify-between p-8 pb-4 shrink-0">
              <div>
                <h2 className="text-2xl font-black text-ocl-primary tracking-tight">Detalhes do Agendamento</h2>
                <p className="text-xs text-brand-text/40 font-medium mt-1">Informações registradas pelo negociador</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-brand-text/30 hover:text-brand-danger hover:bg-brand-danger/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-8 pb-8 space-y-3 overflow-y-auto custom-scrollbar">
              <InfoRow icon={Calendar} label="Data" value={formattedDate} />
              <InfoRow icon={Clock} label="Horário" value={formattedTime} />
              <InfoRow icon={FileText} label="Contrato" value={appointment.contract} />
              <InfoRow icon={Phone} label="Telefone" value={appointment.phone} />
              <InfoRow icon={User} label="Tipo de Responsável" value={appointment.responsible_type} />
              {appointment.responsible_type === 'Terceiro' && (
                <InfoRow icon={UserCheck} label="Nome do Responsável" value={appointment.responsible_name} />
              )}
              <InfoRow icon={UserCheck} label="Recuperador" value={appointment.recovery_name} />
              <InfoRow icon={DollarSign} label="Valores Acordados" value={`R$ ${appointment.agreed_values}`} />

              {/* Histórico / Timeline */}
              {appointment.appointment_history && appointment.appointment_history.length > 0 && (
                <div className="pt-6 space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <Clock className="w-3.5 h-3.5 text-brand-accent shadow-[0_0_8px_rgba(56,189,248,0.3)]" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-ocl-primary/40">Histórico de Alterações</h3>
                  </div>
                  
                  <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-ocl-primary/5">
                    {appointment.appointment_history.map((h, i) => (
                      <div key={h.id} className="relative pl-8 group">
                        <div className="absolute left-0 top-1.5 w-[23px] h-[23px] rounded-full bg-white border border-ocl-primary/10 flex items-center justify-center z-10 transition-all group-hover:border-brand-accent/30 group-hover:scale-110 shadow-sm">
                          <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-brand-accent animate-pulse shadow-[0_0_6px_rgba(56,189,248,0.6)]' : 'bg-ocl-primary/20'}`} />
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-ocl-primary leading-none uppercase tracking-tight">
                              {h.old_status ? `${h.old_status} → ${h.new_status}` : `Início: ${h.new_status}`}
                            </span>
                            <span className="text-[8px] font-bold text-brand-text/20 uppercase tracking-widest leading-none">
                              {new Date(h.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          
                          {h.details?.comment && (
                            <div className="mt-1 p-3 bg-brand-bg rounded-xl border border-ocl-primary/5 italic text-xs font-medium text-brand-text/60 leading-relaxed relative">
                              <div className="absolute -left-1.5 top-2 w-3 h-3 bg-brand-bg border-l border-t border-ocl-primary/5 rotate-[-45deg]" />
                              "{h.details.comment}"
                            </div>
                          )}
                          
                          <p className="text-[8px] font-black text-brand-text/20 uppercase tracking-widest mt-0.5 ml-1">
                            Por: {h.users?.name || h.users?.email?.split('@')[0] || 'Sistema'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  onClick={handleCopy}
                  className={`flex-1 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${copied ? 'bg-brand-success text-white' : 'bg-ocl-primary text-white hover:bg-ocl-primary/90 shadow-lg shadow-ocl-primary/20'}`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copiado!' : 'Copiar Dados'}
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3.5 border border-ocl-primary/10 rounded-2xl font-black text-xs uppercase tracking-widest text-brand-text/40 hover:bg-brand-bg transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
