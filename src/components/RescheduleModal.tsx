import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, User, Loader2, RefreshCw } from 'lucide-react';
import { appointmentService } from '../services/appointmentService';
import { operatorService } from '../services/operatorService';
import type { Appointment } from '../services/appointmentService';
import type { Operator } from '../services/operatorService';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface Props {
  isOpen: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  onSuccess: () => void;
}

// Gera próximos 30 dias úteis (sem domingo)
const getNext30Days = () => {
  const dates: string[] = [];
  const current = new Date();
  while (dates.length < 30) {
    if (current.getUTCDay() !== 0) {
      dates.push(current.toISOString().split('T')[0]);
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

export const RescheduleModal = ({ isOpen, appointment, onClose, onSuccess }: Props) => {
  useBodyScrollLock(isOpen);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const constraintsRef = useRef<HTMLDivElement>(null);
  const next30Days = getNext30Days();

  // Pré-selecionar data atual do agendamento
  useEffect(() => {
    if (isOpen && appointment) {
      const appDate = new Date(appointment.appointment_date).toISOString().split('T')[0];
      const validDay = next30Days.includes(appDate) ? appDate : next30Days[0];
      setSelectedDate(validDay);
      setSelectedSlot(null);
      setSelectedOperatorId(appointment.operador_id || '');
      setError('');
    }
  }, [isOpen, appointment]);

  // Carregar operadores
  useEffect(() => {
    if (isOpen) {
      operatorService.fetchOperators().then(ops => {
        setOperators(ops.filter(op => op.email.toLowerCase().includes('posatendente')));
      });
    }
  }, [isOpen]);

  // Carregar slots disponíveis para a data selecionada
  useEffect(() => {
    if (!selectedDate || !isOpen) return;
    const load = async () => {
      setLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const available = await appointmentService.fetchAvailability(selectedDate);
        setSlots(available);
      } catch {
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    load();
  }, [selectedDate, isOpen]);

  const handleConfirm = async () => {
    if (!appointment) return;
    if (!selectedSlot && !selectedOperatorId) {
      setError('Selecione um horário disponível ou defina o operador e horário manualmente.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      let isoDate: string;
      let operadorId: string | null = null;

      if (selectedSlot) {
        const [year, month, day] = selectedDate.split('-').map(Number);
        const [hour, minute] = selectedSlot.time.split(':').map(Number);
        const d = new Date(year, month - 1, day, hour, minute);
        isoDate = d.toISOString();
        operadorId = selectedSlot.operatorId;
      } else {
        // Manter horário original, só trocar operador
        isoDate = appointment.appointment_date;
        operadorId = selectedOperatorId || null;
      }

      await appointmentService.rescheduleAppointment(appointment.id, isoDate, operadorId);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao reagendar.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!appointment) return null;

  const morningSlots = slots.filter(s => parseInt(s.time.split(':')[0]) < 12);
  const afternoonSlots = slots.filter(s => parseInt(s.time.split(':')[0]) >= 12);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-ocl-dark/80 backdrop-blur-md z-[8000] flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && !submitting && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header accent bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-ocl-primary via-brand-accent to-ocl-primary shrink-0" />

            {/* Header */}
            <div className="flex items-start justify-between p-8 pb-4 shrink-0">
              <div>
                <h2 className="text-2xl font-black text-ocl-primary tracking-tight flex items-center gap-2">
                  <RefreshCw className="w-6 h-6 text-brand-accent" /> Reagendar
                </h2>
                <p className="text-xs text-brand-text/40 font-medium mt-1">
                  Contrato: <span className="font-black text-ocl-primary">{appointment.contract}</span>
                </p>
              </div>
              <button
                onClick={() => !submitting && onClose()}
                className="p-2 rounded-xl text-brand-text/30 hover:text-brand-danger hover:bg-brand-danger/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto overflow-x-hidden px-8 pb-8 space-y-6 custom-scrollbar">
              {/* Data Strip Container */}
              <div className="relative -mx-8 pt-4">
                <label className="text-[10px] font-black text-brand-text/40 uppercase tracking-widest flex items-center gap-1.5 mb-2 px-8">
                  <Calendar className="w-3 h-3" /> Selecione a Nova Data
                </label>
                
                {/* Modern CSS Mask for Fade Edge - Eliminates 'flash' overlays */}
                <div 
                  className="relative select-none overflow-hidden"
                  ref={constraintsRef}
                  style={{ 
                    cursor: 'grab',
                    maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)'
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.cursor = 'grabbing')}
                  onMouseUp={(e) => (e.currentTarget.style.cursor = 'grab')}
                >
                  <motion.div 
                    drag="x"
                    dragConstraints={constraintsRef}
                    dragElastic={0.15}
                    dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
                    className="flex gap-4 w-max px-12 py-8" // Increased vertical padding for shadows
                  >
                    {next30Days.map(date => {
                      const dateObj = new Date(date + 'T12:00:00Z');
                      const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
                      const dayNum = dateObj.toLocaleDateString('pt-BR', { day: '2-digit' });
                      const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
                      const isActive = selectedDate === date;

                      return (
                        <motion.button
                          key={date}
                          onTap={() => setSelectedDate(date)}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          className={`flex-shrink-0 w-[78px] py-5 rounded-[2.2rem] border transition-all flex flex-col items-center gap-2 pointer-events-auto ${
                            isActive
                              ? 'bg-ocl-primary border-ocl-primary text-white shadow-[0_20px_40px_-12px_rgba(0,51,102,0.4)] scale-[1.12] z-20'
                              : 'bg-white border-ocl-primary/5 text-brand-text/40 hover:border-brand-accent/30 hover:shadow-lg'
                          }`}
                        >
                          <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-white/60' : 'text-brand-text/30'}`}>
                            {dayName}
                          </span>
                          <span className="text-2xl font-black leading-none tracking-tighter">
                            {dayNum}
                          </span>
                          <span className={`text-[10px] font-bold uppercase ${isActive ? 'text-white/40' : 'text-brand-text/20'}`}>
                            {monthName}
                          </span>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </div>
              </div>

              {/* Slots */}
              <div>
                <label className="text-[10px] font-black text-brand-text/40 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                  <Clock className="w-3 h-3" /> Horário Disponível
                </label>

                {loadingSlots ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-6 h-6 text-brand-accent animate-spin" />
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-center text-brand-text/30 text-sm italic py-4">Nenhum horário disponível nesta data.</p>
                ) : (
                  <div className="space-y-4">
                    {morningSlots.length > 0 && (
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-brand-text/30 mb-2">Manhã</p>
                        <div className="grid grid-cols-5 gap-2">
                          {morningSlots.map((slot, i) => (
                            <button
                              key={i}
                              onClick={() => setSelectedSlot(slot)}
                              className={`p-2 rounded-xl text-[11px] font-bold border transition-all ${
                                selectedSlot?.time === slot.time && selectedSlot?.operatorId === slot.operatorId
                                  ? 'bg-brand-accent border-brand-accent text-white shadow-md shadow-brand-accent/20'
                                  : 'bg-brand-bg border-ocl-primary/10 text-ocl-primary hover:border-brand-accent/40'
                              }`}
                            >
                              {slot.time}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {afternoonSlots.length > 0 && (
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-brand-text/30 mb-2">Tarde</p>
                        <div className="grid grid-cols-5 gap-2">
                          {afternoonSlots.map((slot, i) => (
                            <button
                              key={i}
                              onClick={() => setSelectedSlot(slot)}
                              className={`p-2 rounded-xl text-[11px] font-bold border transition-all ${
                                selectedSlot?.time === slot.time && selectedSlot?.operatorId === slot.operatorId
                                  ? 'bg-brand-accent border-brand-accent text-white shadow-md shadow-brand-accent/20'
                                  : 'bg-brand-bg border-ocl-primary/10 text-ocl-primary hover:border-brand-accent/40'
                              }`}
                            >
                              {slot.time}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Operador manual (se não selecionar slot) */}
              {!selectedSlot && (
                <div>
                  <label className="text-[10px] font-black text-brand-text/40 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                    <User className="w-3 h-3" /> Pós-atendente (ou manter atual)
                  </label>
                  <select
                    value={selectedOperatorId}
                    onChange={e => setSelectedOperatorId(e.target.value)}
                    className="w-full bg-brand-bg border border-ocl-primary/10 rounded-2xl px-5 py-3.5 text-sm font-bold text-ocl-primary outline-none focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent appearance-none transition-all"
                  >
                    <option value="">Manter atual</option>
                    {operators.map(op => (
                      <option key={op.id} value={op.id}>
                        {op.name || op.email.split('@')[0]}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedSlot && (
                <div className="p-4 rounded-2xl bg-brand-accent/5 border border-brand-accent/20">
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-accent mb-1">Novo Horário Selecionado</p>
                  <p className="text-xl font-black text-ocl-primary">{selectedSlot.time} <span className="text-sm font-bold text-brand-text/50">— {selectedSlot.operatorName}</span></p>
                </div>
              )}

              {error && (
                <p className="text-brand-danger text-xs font-bold bg-brand-danger/5 border border-brand-danger/20 rounded-xl px-4 py-3">
                  {error}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => !submitting && onClose()}
                  disabled={submitting}
                  className="flex-1 py-4 border border-ocl-primary/10 rounded-2xl font-black text-xs uppercase tracking-widest text-brand-text/40 hover:bg-brand-bg transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={submitting || (!selectedSlot && !selectedOperatorId)}
                  className="flex-1 py-4 bg-ocl-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-ocl-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Reagendando...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Confirmar Reagendamento
                    </span>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
