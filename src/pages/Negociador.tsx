import { useState, useEffect, useMemo } from 'react';
import { useAppointments } from '../hooks/useAppointments';
import { useSocket } from '../hooks/useSocket';
import { appointmentService } from '../services/appointmentService';
import { NotificationModal } from '../components/NotificationModal';
import { BookingFormModal } from '../components/BookingFormModal';
import type { BookingFormData } from '../components/BookingFormModal';
import { User, CheckCircle2, Loader2, Sun, Sunset } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Negociador = () => {
  const { createAppointment } = useAppointments();
  const { socket } = useSocket();

  const getAllowedDays = () => {
    const days = [];
    let current = new Date();
    while (days.length < 3) {
      const dayOfWeek = current.getUTCDay();
      if (dayOfWeek !== 0) {
        days.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const allowedDays = useMemo(() => getAllowedDays(), []);
  const [selectedDate, setSelectedDate] = useState(allowedDays[0].toISOString().split('T')[0]);
  const [slots, setSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [notifModal, setNotifModal] = useState({
    isOpen: false,
    type: 'success' as 'success' | 'error',
    title: '',
    message: ''
  });

  const currentMonth = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(selectedDate + 'T12:00:00Z'));
  const dayNamesShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  useEffect(() => {
    const loadSlots = async () => {
      try {
        setLoadingSlots(true);
        const available = await appointmentService.fetchAvailability(selectedDate);
        setSlots(available);
        setSelectedSlot(null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSlots(false);
      }
    };
    loadSlots();
  }, [selectedDate]);

  // Real-time: recarregar slots quando outro agendamento for criado ou excluído
  useEffect(() => {
    const handleUpdate = async () => {
      try {
        const available = await appointmentService.fetchAvailability(selectedDate);
        setSlots(available);
      } catch (err) {
        console.error('[Socket] Erro ao recarregar slots:', err);
      }
    };
    socket.on('appointments:updated', handleUpdate);
    return () => { socket.off('appointments:updated', handleUpdate); };
  }, [socket, selectedDate]);

  const morningSlots = useMemo(() => slots.filter(s => parseInt(s.time.split(':')[0]) < 12), [slots]);
  const afternoonSlots = useMemo(() => slots.filter(s => parseInt(s.time.split(':')[0]) >= 12), [slots]);

  // Abre o modal de formulário após selecionar o horário
  const handleConfirmClick = () => {
    if (!selectedSlot) {
      setNotifModal({
        isOpen: true,
        type: 'error',
        title: 'Atenção',
        message: 'Por favor, selecione um horário antes de confirmar.'
      });
      return;
    }
    setShowFormModal(true);
  };

  // Chamado pelo modal após preencher o formulário e validar
  const handleFormConfirm = async (formData: BookingFormData) => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const [hour, minute] = selectedSlot.time.split(':').map(Number);
    const dateObj = new Date(year, month - 1, day, hour, minute);

    const appointment = {
      contract: formData.contract,
      phone: formData.phone,
      responsible_type: formData.responsible_type,
      responsible_name: formData.responsible_name,
      agreed_values: formData.agreed_values,
      appointment_date: dateObj.toISOString(),
      operador_id: selectedSlot.operatorId,
      status: 'Pendente'
    };

    await createAppointment(appointment);

    setShowFormModal(false);
    setNotifModal({
      isOpen: true,
      type: 'success',
      title: 'Agendamento Confirmado!',
      message: `Seu atendimento está marcado para ${selectedSlot.time} com ${selectedSlot.operatorName}.`
    });

    // Recarregar slots (socket já faz isso, mas fazemos imediato também)
    const available = await appointmentService.fetchAvailability(selectedDate);
    setSlots(available);
    setSelectedSlot(null);
  };

  return (
    <div className="min-h-screen p-8 bg-brand-bg text-brand-text">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto pt-10"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="ocl-card p-6 border-l-4 border-l-brand-accent">
              <div className="flex justify-between items-center mb-6">
                <label className="block text-[10px] font-black text-brand-text/30 uppercase tracking-widest">
                  1. Selecione o Dia
                </label>
                <span className="text-[10px] font-black text-brand-accent uppercase tracking-widest bg-brand-accent/10 px-2 py-1 rounded-md">
                  {currentMonth}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {allowedDays.map((dateObj) => {
                  const dateStr = dateObj.toISOString().split('T')[0];
                  const isActive = selectedDate === dateStr;
                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-1 ${
                        isActive
                          ? 'bg-ocl-primary border-ocl-primary text-white shadow-xl shadow-ocl-primary/20 scale-[1.05]'
                          : 'bg-white border-ocl-primary/5 text-ocl-primary hover:border-brand-accent/30'
                      }`}
                    >
                      <span className={`text-[9px] font-black uppercase ${isActive ? 'text-white/40' : 'text-brand-text/30'}`}>
                        {dayNamesShort[dateObj.getUTCDay()]}
                      </span>
                      <span className="text-xl font-black">
                        {dateObj.getUTCDate()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="ocl-card p-6">
              <label className="block text-sm font-bold text-brand-text/50 uppercase tracking-wider mb-6 border-b border-ocl-primary/5 pb-2">
                2. Horários Disponíveis
              </label>

              {loadingSlots ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-12 text-brand-text/40 italic">
                  Nenhum horário disponível para esta data.
                </div>
              ) : (
                <div className="space-y-8">
                  {morningSlots.length > 0 && (
                    <div>
                      <h3 className="text-brand-text/40 text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Sun className="w-4 h-4 text-brand-accent" /> Período da Manhã
                      </h3>
                      <div className="grid grid-cols-4 gap-2">
                        {morningSlots.map((slot, i) => (
                          <button
                            key={`morning-${i}`}
                            onClick={() => setSelectedSlot(slot)}
                            className={`p-2.5 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                              selectedSlot?.time === slot.time && selectedSlot?.operatorId === slot.operatorId
                                ? 'bg-brand-accent border-brand-accent text-white scale-95 shadow-lg shadow-brand-accent/20'
                                : 'bg-white border-ocl-primary/10 text-ocl-primary hover:border-brand-accent hover:bg-brand-accent/5'
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
                      <h3 className="text-brand-text/40 text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Sunset className="w-4 h-4 text-brand-accent" /> Período da Tarde
                      </h3>
                      <div className="grid grid-cols-4 gap-2">
                        {afternoonSlots.map((slot, i) => (
                          <button
                            key={`afternoon-${i}`}
                            onClick={() => setSelectedSlot(slot)}
                            className={`p-2.5 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                              selectedSlot?.time === slot.time && selectedSlot?.operatorId === slot.operatorId
                                ? 'bg-brand-accent border-brand-accent text-white scale-95 shadow-lg shadow-brand-accent/20'
                                : 'bg-white border-ocl-primary/10 text-ocl-primary hover:border-brand-accent hover:bg-brand-accent/5'
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
          </div>

          <div className="space-y-6">
            <div className="ocl-card p-8 bg-ocl-primary/5 border-ocl-primary/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 rounded-full -mr-16 -mt-16 blur-3xl" />
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-ocl-primary">
                <CheckCircle2 className="w-6 h-6 text-brand-accent" />
                Resumo
              </h2>

              <div className="space-y-4 mb-8">
                <div className="p-4 rounded-xl bg-white border border-ocl-primary/5 shadow-sm">
                  <p className="text-[10px] text-brand-text/40 uppercase font-black tracking-widest mb-1">Data do Agendamento</p>
                  <p className="text-lg font-bold text-ocl-primary">
                    {new Date(selectedDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                  </p>
                </div>

                <AnimatePresence mode="wait">
                  {selectedSlot ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-4 rounded-xl bg-brand-accent/10 border border-brand-accent/30 shadow-inner"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] text-brand-accent uppercase font-black tracking-widest mb-1">Horário</p>
                          <p className="text-3xl font-black text-ocl-primary">{selectedSlot.time}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-brand-accent uppercase font-black tracking-widest mb-1">Pós-atendente</p>
                          <p className="text-md font-bold text-ocl-primary">{selectedSlot.operatorName}</p>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="p-4 rounded-xl bg-white/50 border border-ocl-primary/5 border-dashed text-brand-text/40 italic text-sm text-center py-10">
                      Selecione um horário disponível ao lado
                    </div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={handleConfirmClick}
                disabled={!selectedSlot || loadingSlots}
                className="ocl-button w-full disabled:opacity-50 disabled:grayscale transition-all py-4 text-md font-black uppercase tracking-widest shadow-xl shadow-brand-accent/10 hover:shadow-brand-accent/30"
              >
                Confirmar Agora
              </button>
            </div>

            <div className="ocl-card p-6 bg-white border-dashed border-ocl-primary/10">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-brand-accent/10">
                  <User className="w-5 h-5 text-brand-accent" />
                </div>
                <div>
                  <p className="font-bold text-ocl-primary text-sm">Disponibilidade Real</p>
                  <p className="text-xs text-brand-text/60 leading-relaxed mt-1 font-medium">
                    Os horários acima são sincronizados em tempo real com a escala ativa dos Pós-atendentes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modal de formulário de agendamento */}
      <BookingFormModal
        isOpen={showFormModal}
        selectedDate={selectedDate}
        selectedSlot={selectedSlot}
        onClose={() => setShowFormModal(false)}
        onConfirm={handleFormConfirm}
      />

      <NotificationModal
        {...notifModal}
        onClose={() => setNotifModal({ ...notifModal, isOpen: false })}
      />
    </div>
  );
};

export default Negociador;
