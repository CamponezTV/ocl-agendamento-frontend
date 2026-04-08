import { useState, useEffect, useMemo } from 'react';
import { useAppointments } from '../hooks/useAppointments';
import { useSocket } from '../hooks/useSocket';
import { appointmentService } from '../services/appointmentService';
import type { Appointment } from '../services/appointmentService';
import { NotificationModal } from '../components/NotificationModal';
import { BookingFormModal } from '../components/BookingFormModal';
import type { BookingFormData } from '../components/BookingFormModal';
import { StatusBadge } from '../components/StatusBadge';
import { CheckCircle2, Loader2, Sun, Sunset, Search, Filter, Clock, Eye, RotateCcw } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import { AppointmentDetailsModal } from '../components/AppointmentDetailsModal';
import { PremiumDatePicker } from '../components/PremiumDatePicker';
import { PremiumSelect } from '../components/PremiumSelect';

import { useAuth } from '../contexts/AuthContext';
import { getVisitorId } from '../utils/visitorId';

const Negociador = () => {
  const { profile } = useAuth();
  const { createAppointment } = useAppointments(undefined, { skipAutoFetch: true });
  const { socket } = useSocket();

  const [activeTab, setActiveTab] = useState<'booking' | 'history'>('booking');
  
  // States for Booking
  const getAllowedDays = () => {
    const days = [];
    let current = new Date();
    while (days.length < 5) {
      const dayOfWeek = current.getUTCDay();
      if (dayOfWeek !== 0) days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const allowedDays = useMemo(() => getAllowedDays(), []);
  
  const [daysStatus, setDaysStatus] = useState<Record<string, { hasSlots: boolean, loaded: boolean }>>({});
  
  const [selectedDate, setSelectedDate] = useState(allowedDays[0].toISOString().split('T')[0]);
  const [slots, setSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [showFormModal, setShowFormModal] = useState(false);

  const refreshDayStatuses = async () => {
    const statuses: Record<string, { hasSlots: boolean, loaded: boolean }> = {};
    await Promise.all(
      allowedDays.map(async (d) => {
        const dateStr = d.toISOString().split('T')[0];
        try {
          const daySlots = await appointmentService.fetchAvailability(dateStr);
          statuses[dateStr] = { hasSlots: daySlots.length > 0, loaded: true };
        } catch {
          statuses[dateStr] = { hasSlots: false, loaded: true };
        }
      })
    );
    return statuses;
  };

  useEffect(() => {
    let isMounted = true;
    refreshDayStatuses().then((statuses) => {
      if (isMounted) {
        setDaysStatus(statuses);
        
        const validWithSlots = allowedDays
          .map(d => d.toISOString().split('T')[0])
          .filter(ds => statuses[ds]?.hasSlots);
        
        setSelectedDate(prev => {
          if (validWithSlots.length > 0 && !validWithSlots.slice(0, 3).includes(prev)) {
            return validWithSlots[0];
          }
          return prev;
        });
      }
    });
    return () => { isMounted = false; };
  }, [allowedDays]);

  const validDatesWithSlots = allowedDays
    .map(d => d.toISOString().split('T')[0])
    .filter(dateStr => daysStatus[dateStr]?.hasSlots);
  const selectableDates = validDatesWithSlots.slice(0, 3);


  // States for History
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const [notifModal, setNotifModal] = useState({
    isOpen: false,
    type: 'success' as 'success' | 'error',
    title: '',
    message: '',
    copyText: ''
  });

  const [selectedApp, setSelectedApp] = useState<Appointment | null>(null);

  // Local Filter Logic
  const filteredHistory = useMemo(() => {
    if (!Array.isArray(myAppointments)) return [];
    return myAppointments.filter(app => {
      const matchesSearch = searchTerm === '' || 
        app.responsible_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.contract.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.phone.includes(searchTerm) ||
        app.recovery_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === '' || app.status === statusFilter;
      const matchesDate = dateFilter === '' || app.appointment_date.startsWith(dateFilter);

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [myAppointments, searchTerm, statusFilter, dateFilter]);

  const currentMonth = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(selectedDate + 'T12:00:00Z'));
  const dayNamesShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Load slots for booking
  useEffect(() => {
    if (activeTab !== 'booking') return;
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
  }, [selectedDate, activeTab]);

  // Load history
  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const visitorId = getVisitorId();
      const filters: any = { session_id: visitorId };
      
      if (profile?.id) {
        filters.negociador_id = profile.id;
      }

      const data = await appointmentService.fetchAppointments(filters);
      setMyAppointments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load all only on tab mount or login
  useEffect(() => {
    if (activeTab === 'history') {
       loadHistory();
    }
  }, [activeTab, profile?.id]);

  const handleSocketUpdate = () => {
    if (activeTab === 'booking') {
      appointmentService.fetchAvailability(selectedDate).then(setSlots);
    } else {
      loadHistory();
    }
  };

  useEffect(() => {
    socket.on('appointments:updated', handleSocketUpdate);
    return () => { socket.off('appointments:updated', handleSocketUpdate); };
  }, [socket, selectedDate, activeTab, profile?.id]);

  const morningSlots = useMemo(() => slots.filter(s => parseInt(s.time.split(':')[0]) < 12), [slots]);
  const afternoonSlots = useMemo(() => slots.filter(s => parseInt(s.time.split(':')[0]) >= 12), [slots]);

  const handleConfirmClick = () => {
    if (!selectedSlot) {
      setNotifModal({
        isOpen: true,
        type: 'error',
        title: 'Atenção',
        message: 'Por favor, selecione um horário antes de confirmar.',
        copyText: ''
      });
      return;
    }
    setShowFormModal(true);
  };

  const handleFormConfirm = async (formData: BookingFormData) => {
    try {
      const [year, month, day] = selectedDate.split('-').map(Number);
      const [hour, minute] = selectedSlot.time.split(':').map(Number);
      const dateObj = new Date(year, month - 1, day, hour, minute);

      const appointment = {
        contract: formData.contract,
        phone: formData.phone,
        responsible_type: formData.responsible_type,
        responsible_name: formData.responsible_name,
        recovery_name: formData.recovery_name,
        agreed_values: formData.agreed_values,
        appointment_date: dateObj.toISOString(),
        operador_id: selectedSlot.operatorId,
        negociador_id: formData.negociador_id,
        session_id: getVisitorId(),
        status: 'Pendente'
      };

      await createAppointment(appointment);
      setShowFormModal(false);

      const copySummary = `RESUMO DO AGENDAMENTO\nContrato: ${formData.contract}\nData: ${dateObj.toLocaleDateString('pt-BR')} às ${selectedSlot.time}\nResponsável: ${formData.responsible_name} (${formData.responsible_type})\nTelefone: ${formData.phone}\nAtendente: ${selectedSlot.operatorName}`;

      setNotifModal({
        isOpen: true,
        type: 'success',
        title: 'Agendamento Confirmado!',
        message: `Atendimento marcado para ${selectedSlot.time} com ${selectedSlot.operatorName}.`,
        copyText: copySummary
      });

      handleSocketUpdate();
      setSelectedSlot(null);
      
      // Atualizar silenciosamente o calendário das abas para refletir se e quando o dia se esgotou
      setTimeout(() => {
        refreshDayStatuses().then(st => setDaysStatus(st));
      }, 500);
    } catch (err: any) {
      setNotifModal({
        isOpen: true,
        type: 'error',
        title: 'Falha no Agendamento',
        message: err.message || 'Erro ao realizar agendamento.',
        copyText: ''
      });
    }
  };

  return (
    <div className="min-h-screen p-8 bg-brand-bg text-brand-text">
      <div className="max-w-6xl mx-auto space-y-8 pt-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
           <m.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-1">
             <h1 className="text-4xl font-black text-ocl-primary italic flex items-center gap-3">
               Olá, {profile?.full_name?.split(' ')[0] || 'Negociador'} 
             </h1>
             <p className="text-xs font-black text-brand-text/30 uppercase tracking-[0.3em] pl-1">Sistema de Agendamento OCL</p>
           </m.div>

           <div className="flex bg-white/50 backdrop-blur-sm border border-ocl-primary/10 p-1.5 rounded-2xl shadow-sm">
             <button 
               onClick={() => setActiveTab('booking')}
               className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'booking' ? 'bg-ocl-primary text-white shadow-lg' : 'text-brand-text/40 hover:text-ocl-primary'}`}
             >
               Novo Agendamento
             </button>
             <button 
               onClick={() => setActiveTab('history')}
               className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-ocl-primary text-white shadow-lg' : 'text-brand-text/40 hover:text-ocl-primary'}`}
             >
               Meus Agendamentos
             </button>
           </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'booking' ? (
            <m.div key="booking" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="ocl-card p-6 border-l-4 border-l-brand-accent">
                  <div className="flex justify-between items-center mb-6">
                    <label className="text-[10px] font-black text-brand-text/30 uppercase tracking-widest">1. Selecione o Dia</label>
                    <span className="text-[10px] font-black text-brand-accent uppercase tracking-widest bg-brand-accent/10 px-2 py-1 rounded-md">{currentMonth}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-3">
                    {allowedDays.map((dateObj) => {
                      const dateStr = dateObj.toISOString().split('T')[0];
                      const status = daysStatus[dateStr];
                      const isLoaded = status?.loaded;
                      const hasSlots = status?.hasSlots;
                      
                      const isSelectable = isLoaded && selectableDates.includes(dateStr);
                      const isNoSlots = isLoaded && !hasSlots;
                      const isBeyondLimit = isLoaded && hasSlots && !selectableDates.includes(dateStr);
                      
                      const isActive = selectedDate === dateStr;

                      return (
                        <button
                          key={dateStr}
                          onClick={() => isSelectable && setSelectedDate(dateStr)}
                          disabled={!isSelectable}
                          title={isNoSlots ? "Sem horários neste dia" : isBeyondLimit ? "Fora do limite de 3 dias operacionais" : ""}
                          className={`relative p-3 rounded-2xl border transition-all flex flex-col items-center gap-1 overflow-hidden 
                            ${!isLoaded ? 'bg-brand-bg animate-pulse border-transparent' : 
                              isNoSlots ? 'bg-[#FFF5F5] border-brand-danger/10 opacity-70 cursor-not-allowed' :
                              isBeyondLimit ? 'bg-brand-bg border-ocl-primary/5 opacity-50 cursor-not-allowed' :
                              isActive ? 'bg-ocl-primary border-ocl-primary text-white shadow-xl scale-[1.02] z-10' : 
                              'bg-white border-ocl-primary/5 text-ocl-primary hover:border-brand-accent/30 hover:shadow-md'}`}
                        >
                          {!isLoaded ? (
                             <div className="w-5 h-5 border-2 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin my-2" />
                          ) : (
                            <>
                              <span className={`text-[8px] font-black uppercase ${isActive ? 'text-white/40' : 
                                isNoSlots ? 'text-brand-danger/40' : 
                                'text-brand-text/30'}`}>{dayNamesShort[dateObj.getUTCDay()]}</span>
                              <span className={`text-lg font-black ${isNoSlots ? 'text-brand-danger/30' : ''}`}>{dateObj.getUTCDate()}</span>
                              
                              {isNoSlots && (
                                <div className="absolute top-1 right-1 text-brand-danger bg-brand-danger/10 p-1 rounded-full shadow-sm">
                                  <Clock className="w-2.5 h-2.5" />
                                </div>
                              )}
                              
                              {isBeyondLimit && !isNoSlots && (
                                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1.5px] flex items-center justify-center">
                                  <span className="text-[7.5px] font-black uppercase text-brand-text/30 tracking-widest px-1.5 py-0.5 bg-brand-bg rounded-md border border-ocl-primary/10">Limite</span>
                                </div>
                              )}
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="ocl-card p-6">
                  <label className="block text-sm font-bold text-brand-text/50 uppercase tracking-wider mb-6 border-b border-ocl-primary/5 pb-2">2. Horários Disponíveis</label>
                  {loadingSlots ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-brand-accent animate-spin" /></div>
                  ) : slots.length === 0 ? (
                    <div className="text-center py-12 text-brand-text/40 italic">Nenhum horário disponível.</div>
                  ) : (
                    <div className="space-y-8">
                      {morningSlots.length > 0 && (
                        <div>
                          <h3 className="text-brand-text/40 text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2"><Sun className="w-4 h-4 text-brand-accent" /> Manhã</h3>
                          <div className="grid grid-cols-4 gap-2">
                            {morningSlots.map((slot, i) => (
                              <button key={i} onClick={() => setSelectedSlot(slot)} className={`p-2.5 rounded-xl text-xs font-bold transition-all border ${selectedSlot?.time === slot.time && selectedSlot?.operatorId === slot.operatorId ? 'bg-brand-accent border-brand-accent text-white shadow-lg' : 'bg-white border-ocl-primary/10 text-ocl-primary hover:bg-brand-accent/5'}`}>{slot.time}</button>
                            ))}
                          </div>
                        </div>
                      )}
                      {afternoonSlots.length > 0 && (
                        <div>
                          <h3 className="text-brand-text/40 text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2"><Sunset className="w-4 h-4 text-brand-accent" /> Tarde</h3>
                          <div className="grid grid-cols-4 gap-2">
                            {afternoonSlots.map((slot, i) => (
                              <button key={i} onClick={() => setSelectedSlot(slot)} className={`p-2.5 rounded-xl text-xs font-bold transition-all border ${selectedSlot?.time === slot.time && selectedSlot?.operatorId === slot.operatorId ? 'bg-brand-accent border-brand-accent text-white shadow-lg' : 'bg-white border-ocl-primary/10 text-ocl-primary hover:bg-brand-accent/5'}`}>{slot.time}</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="ocl-card p-8 bg-white border border-ocl-primary/10 relative overflow-hidden h-fit">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-ocl-primary"><CheckCircle2 className="w-6 h-6 text-brand-accent" /> Resumo</h2>
                <div className="space-y-4 mb-8">
                  <div className="p-4 rounded-xl bg-brand-bg border border-ocl-primary/5">
                    <p className="text-[10px] text-brand-text/40 uppercase font-black tracking-widest mb-1">Data selecionada</p>
                    <p className="text-lg font-bold text-ocl-primary">{new Date(selectedDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                  </div>
                  {selectedSlot ? (
                    <div className="p-4 rounded-xl bg-brand-accent/10 border border-brand-accent/30">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] text-brand-accent uppercase font-black mb-1">Horário</p>
                          <p className="text-3xl font-black text-ocl-primary">{selectedSlot.time}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-brand-accent uppercase font-black mb-1">Atendente</p>
                          <p className="text-md font-bold text-ocl-primary">{selectedSlot.operatorName}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 rounded-xl bg-white/50 border border-dashed text-brand-text/40 text-sm text-center">Selecione um horário disponível</div>
                  )}
                </div>
                <button
                  onClick={handleConfirmClick}
                  disabled={!selectedSlot || loadingSlots}
                  className="ocl-button w-full disabled:opacity-50 py-4 text-md font-black uppercase tracking-widest"
                >
                  Agendar Agora
                </button>
              </div>
            </m.div>
          ) : (
            <m.div key="history" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-white border border-ocl-primary/10 rounded-3xl shadow-sm mb-8 relative z-40">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/30" />
                  <input 
                    type="text" 
                    placeholder="Buscar contrato, cliente ou celular..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-ocl-primary/5 rounded-2xl pl-12 pr-4 py-3 text-xs font-bold text-ocl-primary focus:ring-2 focus:ring-brand-accent/20 outline-none transition-all placeholder:text-brand-text/20"
                  />
                </div>
                <div className="md:col-span-1">
                  <PremiumSelect
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={[
                      { value: 'Pendente', label: 'Pendente' },
                      { value: 'Em andamento', label: 'Em andamento' },
                      { value: 'Concluído', label: 'Concluído' },
                      { value: 'Não realizado', label: 'Não realizado' },
                      { value: 'Não Tratado', label: 'Não Tratado' }
                    ]}
                    placeholder="Todos Status"
                    icon={<Filter className="w-4 h-4" />}
                  />
                </div>
                <div className="md:col-span-1">
                  <PremiumDatePicker 
                    value={dateFilter}
                    onChange={setDateFilter}
                    placeholder="Filtrar por Data"
                  />
                </div>
                
                <AnimatePresence>
                  {(searchTerm || statusFilter || dateFilter) && (
                    <m.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="md:col-span-3 flex justify-end"
                    >
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setStatusFilter('');
                          setDateFilter('');
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-brand-danger hover:bg-brand-danger/5 rounded-xl transition-all border border-brand-danger/10 shadow-sm"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Limpar Filtros
                      </button>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="ocl-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-ocl-primary border-b border-ocl-primary/10">
                        <th className="p-5 text-[10px] uppercase font-black tracking-widest text-white/60">Cliente / Contrato</th>
                        <th className="p-5 text-[10px] uppercase font-black tracking-widest text-white/60">Agendamento</th>
                        <th className="p-5 text-[10px] uppercase font-black tracking-widest text-white/60">Atendente</th>
                        <th className="p-5 text-[10px] uppercase font-black tracking-widest text-white/60">Status</th>
                        <th className="p-5 text-right text-[10px] uppercase font-black tracking-widest text-white/60">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ocl-primary/5">
                      {loadingHistory ? (
                        <tr><td colSpan={5} className="p-20 text-center text-brand-text/40"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" /> Carregando histórico...</td></tr>
                      ) : filteredHistory.length === 0 ? (
                        <tr><td colSpan={5} className="p-20 text-center text-brand-text/40 italic text-sm">{searchTerm || statusFilter || dateFilter ? 'Nenhum resultado para estes filtros.' : 'Você ainda não possui agendamentos.'}</td></tr>
                      ) : (
                        filteredHistory.map((app) => (
                          <tr key={app.id} className="hover:bg-brand-bg/50 transition-colors group">
                            <td className="p-5">
                              <span className="font-bold text-ocl-primary block">{app.responsible_name}</span>
                              <span className="text-[10px] font-black opacity-30 uppercase tracking-tight italic">C: {app.contract}</span>
                            </td>
                            <td className="p-5">
                              <div className="flex flex-col">
                                <span className="font-medium text-brand-text/70">{new Date(app.appointment_date).toLocaleDateString('pt-BR')}</span>
                                <span className="text-xs font-black text-brand-accent flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(app.appointment_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </td>
                            <td className="p-5 text-sm font-bold text-ocl-primary/60">{app.users?.name || 'Sistema'}</td>
                            <td className="p-5"><StatusBadge status={app.status} /></td>
                            <td className="p-5 text-right">
                              <button 
                                onClick={() => setSelectedApp(app)}
                                className="p-2 text-ocl-primary bg-ocl-primary/5 rounded-lg opacity-40 group-hover:opacity-100 hover:bg-ocl-primary hover:text-white transition-all"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      <BookingFormModal isOpen={showFormModal} selectedDate={selectedDate} selectedSlot={selectedSlot} onClose={() => setShowFormModal(false)} onConfirm={handleFormConfirm} />
      <NotificationModal {...notifModal} onClose={() => setNotifModal({ ...notifModal, isOpen: false })} />
      <AppointmentDetailsModal isOpen={!!selectedApp} appointment={selectedApp} onClose={() => setSelectedApp(null)} />
    </div>
  );
};

export default Negociador;
