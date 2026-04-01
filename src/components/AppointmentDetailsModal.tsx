import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Phone, User, DollarSign, Calendar, Clock, UserCheck } from 'lucide-react';
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
  if (!appointment) return null;

  const date = new Date(appointment.appointment_date);
  const formattedDate = date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-ocl-dark/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Accent bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-ocl-primary via-brand-accent to-ocl-primary shrink-0" />

            {/* Header */}
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

            {/* Content - Scrollable area */}
            <div className="px-8 pb-8 space-y-3 overflow-y-auto custom-scrollbar">
              <InfoRow icon={Calendar} label="Data" value={formattedDate} />
              <InfoRow icon={Clock} label="Horário" value={formattedTime} />
              <InfoRow icon={FileText} label="Contrato" value={appointment.contract} />
              <InfoRow icon={Phone} label="Telefone" value={appointment.phone} />
              <InfoRow icon={User} label="Tipo de Responsável" value={appointment.responsible_type} />
              {appointment.responsible_type === 'Terceiro' && (
                <InfoRow icon={UserCheck} label="Nome do Responsável" value={appointment.responsible_name} />
              )}
              <InfoRow icon={DollarSign} label="Valores Acordados" value={`R$ ${appointment.agreed_values}`} />

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="w-full py-3.5 border border-ocl-primary/10 rounded-2xl font-black text-xs uppercase tracking-widest text-brand-text/40 hover:bg-brand-bg transition-all"
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
