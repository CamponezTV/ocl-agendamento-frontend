import { useState, useEffect } from 'react';
import { useAppointments } from '../hooks/useAppointments';
import { useSocket } from '../hooks/useSocket';
import type { Operator, OperatorSchedule } from '../services/operatorService';
import { operatorService } from '../services/operatorService';
import { appointmentService } from '../services/appointmentService';
import type { Appointment } from '../services/appointmentService';
import { NotificationModal } from '../components/NotificationModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { AppointmentDetailsModal } from '../components/AppointmentDetailsModal';
import { RescheduleModal } from '../components/RescheduleModal';
import { Save, User, Clock, CheckCircle, XCircle, AlertCircle, Trash2, Power, Calendar as CalendarIcon, UserPlus, Edit2, Plus, X, Eye, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PosAtendimento = () => {
  const { appointments, deleteAppointment, refreshAppointments, loading: loadingApps } = useAppointments();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState<'appointments' | 'schedules' | 'calendar'>('appointments');
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loadingOps, setLoadingOps] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newOp, setNewOp] = useState({ name: '', email: '' });
  const [editingOp, setEditingOp] = useState<Operator | null>(null);
  const [addingSlotTo, setAddingSlotTo] = useState<string | null>(null);
  const [newSlotData, setNewSlotData] = useState<any>({ 
    specific_date: new Date().toISOString().split('T')[0], 
    start_time: '08:20', 
    end_time: '13:40',
    is_active: true
  });
  const [pendingChanges, setPendingChanges] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Modal States
  const [notifModal, setNotifModal] = useState({ isOpen: false, type: 'success' as 'success' | 'error', title: '', message: '' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  // Novos estados para modais de detalhe e reagendamento
  const [detailsApp, setDetailsApp] = useState<Appointment | null>(null);
  const [rescheduleApp, setRescheduleApp] = useState<Appointment | null>(null);

  useEffect(() => {
    loadOperators();
  }, [activeTab]);

  // Real-time: recarregar agendamentos quando houver atualização
  useEffect(() => {
    socket.on('appointments:updated', () => {
      refreshAppointments();
    });
    return () => { socket.off('appointments:updated'); };
  }, [socket]);

  const loadOperators = async () => {
    try {
      setLoadingOps(true);
      const data = await operatorService.fetchOperators();
      setOperators(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOps(false);
    }
  };

  const handleGridUpdate = (opId: string, date: string, dayOfWeek: number, specific: OperatorSchedule | undefined, defaultDay: OperatorSchedule | undefined, field: 'start_time' | 'end_time' | 'is_active', value: string | boolean) => {
    const baseSchedule = specific || defaultDay;
    if (!baseSchedule) return;

    const newStart = field === 'start_time' ? (value as string) : baseSchedule.start_time;
    const newEnd = field === 'end_time' ? (value as string) : baseSchedule.end_time;
    const newActive = field === 'is_active' ? (value as boolean) : baseSchedule.is_active;

    let action: any = null;
    const tempId = `temp-${opId}-${date}`;

    if (specific && !specific.id.startsWith('temp-')) {
      action = { action: 'update', id: specific.id, start_time: newStart, end_time: newEnd, is_active: newActive };
    } else {
      action = { action: 'create', tempId, operador_id: opId, specific_date: date, day_of_week: dayOfWeek, start_time: newStart, end_time: newEnd, is_active: newActive };
    }

    setPendingChanges(prev => {
       if (action.action === 'update') {
           const existing = prev.find(p => p.action === 'update' && p.id === action.id);
           if (existing) return prev.map(p => p.id === action.id ? { ...p, ...action } : p);
           return [...prev, action];
       } else {
           const existing = prev.find(p => p.action === 'create' && p.specific_date === date && p.operador_id === opId);
           if (existing) return prev.map(p => p.tempId === existing.tempId ? { ...p, ...action } : p);
           return [...prev, action];
       }
    });

    setOperators(prev => prev.map(op => {
      if (op.id !== opId) return op;
      let newSchedules = [...op.operator_schedules];
      if (specific) {
         newSchedules = newSchedules.map(s => s.id === specific.id ? { ...s, start_time: newStart, end_time: newEnd, is_active: newActive } : s);
      } else {
         newSchedules.push({
            id: action.tempId,
            operador_id: opId,
            day_of_week: dayOfWeek,
            specific_date: date,
            start_time: newStart,
            end_time: newEnd,
            is_active: newActive
         });
      }
      return { ...op, operator_schedules: newSchedules };
    }));
  };

  const handleGridDelete = (opId: string, scheduleId: string) => {
     if (!window.confirm('Remover esta exceção e voltar ao horário padrão deste dia?')) return;
     
     setPendingChanges(prev => {
        if (scheduleId.startsWith('temp-')) return prev.filter(p => !(p.action === 'create' && p.tempId === scheduleId));
        return [...prev, { action: 'delete', id: scheduleId }];
     });

     setOperators(prev => prev.map(op => {
        if (op.id === opId) return { ...op, operator_schedules: op.operator_schedules.filter(s => s.id !== scheduleId) };
        return op;
     }));
  };

  const saveBatchUpdate = async () => {
    if (pendingChanges.length === 0) return;
    setIsSaving(true);
    try {
      await operatorService.batchUpdateSchedules(pendingChanges);
      setPendingChanges([]);
      await loadOperators();
      setNotifModal({ isOpen: true, type: 'success', title: 'Atualizado!', message: 'As escalas foram salvas com sucesso.' });
    } catch (err) {
      setNotifModal({ isOpen: true, type: 'error', title: 'Erro ao Salvar', message: 'Não foi possível salvar as alterações de escala.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSlot = () => {
    if (!addingSlotTo) return;
    const date = newSlotData.specific_date;
    const opId = addingSlotTo;
    const dObj = new Date(date + 'T12:00:00Z');
    
    const op = operators.find(o => o.id === opId);
    if (!op) return;
    const specific = op.operator_schedules.find(s => s.specific_date?.startsWith(date));
    const defaultDay = op.operator_schedules.find(s => s.day_of_week === dObj.getUTCDay() && !s.specific_date);
    
    if (specific || defaultDay) {
       handleGridUpdate(opId, date, dObj.getUTCDay(), specific, defaultDay, 'start_time', newSlotData.start_time);
       handleGridUpdate(opId, date, dObj.getUTCDay(), specific, defaultDay, 'end_time', newSlotData.end_time);
       handleGridUpdate(opId, date, dObj.getUTCDay(), specific, defaultDay, 'is_active', newSlotData.is_active || true);
    } else {
       const tempId = `temp-${opId}-${date}`;
       setPendingChanges(prev => [...prev.filter(p => !(p.action === 'create' && p.specific_date === date)), {
          action: 'create', tempId, operador_id: opId, specific_date: date, start_time: newSlotData.start_time, end_time: newSlotData.end_time, is_active: newSlotData.is_active ?? true, day_of_week: dObj.getUTCDay()
       }]);
       setOperators(prev => prev.map(o => {
          if (o.id !== opId) return o;
          return { ...o, operator_schedules: [...o.operator_schedules, { id: tempId, operador_id: opId, day_of_week: dObj.getUTCDay(), specific_date: date, start_time: newSlotData.start_time, end_time: newSlotData.end_time, is_active: newSlotData.is_active ?? true }] };
       }));
    }
    setAddingSlotTo(null);
  };

  const handleToggleAll = async (id: string, currentStatus: boolean) => {
    // Optimistic Update
    setOperators(prev => prev.map(op => {
      if (op.id === id) {
        return {
          ...op,
          operator_schedules: op.operator_schedules.map(s => ({ ...s, is_active: !currentStatus }))
        };
      }
      return op;
    }));

    try {
      await operatorService.toggleAllSchedules(id, !currentStatus);
      const data = await operatorService.fetchOperators();
      setOperators(data);
      setNotifModal({ isOpen: true, type: 'success', title: 'Status Alterado', message: 'O status da escala foi atualizado.' });
    } catch (err) {
      setNotifModal({ isOpen: true, type: 'error', title: 'Erro', message: 'Falha ao atualizar status da escala.' });
      loadOperators();
    }
  };

  const handleUpdateOperator = async () => {
    if (!editingOp) return;
    try {
      await operatorService.updateOperator(editingOp.id, { name: editingOp.name || '', email: editingOp.email });
      setShowEditModal(false);
      await loadOperators();
      setNotifModal({ isOpen: true, type: 'success', title: 'Sucesso', message: 'Atendente atualizado com sucesso.' });
    } catch (err) {
      setNotifModal({ isOpen: true, type: 'error', title: 'Erro', message: 'Não foi possível atualizar os dados do atendente.' });
    }
  };

  const handleAddOperator = async () => {
    if (!newOp.name || !newOp.email) return;
    try {
      await operatorService.createOperator(newOp.email, newOp.name);
      setShowAddModal(false);
      setNewOp({ name: '', email: '' });
      await loadOperators();
      setNotifModal({ isOpen: true, type: 'success', title: 'Criado!', message: 'Novo atendente registrado com sucesso.' });
    } catch (err: any) {
      setNotifModal({ isOpen: true, type: 'error', title: 'Erro ao Criar', message: err.message || 'Falha ao registrar novo atendente.' });
    }
  };

  const toggleDayAvailability = (userId: string, date: string, currentStatus: boolean) => {
     const op = operators.find(o => o.id === userId);
     if (!op) return;
     const d = new Date(date + 'T12:00:00Z');
     const specific = op.operator_schedules.find(s => s.specific_date?.startsWith(date));
     const defaultDay = op.operator_schedules.find(s => s.day_of_week === d.getUTCDay() && !s.specific_date);
     
     if (specific || defaultDay) {
        handleGridUpdate(userId, date, d.getUTCDay(), specific, defaultDay, 'is_active', !currentStatus);
     } else {
        const tempId = `temp-${userId}-${date}`;
        setPendingChanges(prev => [...prev.filter(p => !(p.action === 'create' && p.specific_date === date)), {
           action: 'create', tempId, operador_id: userId, specific_date: date, start_time: '08:20', end_time: '13:40', is_active: !currentStatus, day_of_week: d.getUTCDay()
        }]);
        setOperators(prev => prev.map(o => {
           if (o.id !== userId) return o;
           return { ...o, operator_schedules: [...o.operator_schedules, { id: tempId, operador_id: userId, day_of_week: d.getUTCDay(), specific_date: date, start_time: '08:20', end_time: '13:40', is_active: !currentStatus }] };
        }));
     }
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Agendamento',
      message: 'Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          await deleteAppointment(id);
          setNotifModal({ isOpen: true, type: 'success', title: 'Excluído', message: 'O agendamento foi removido.' });
        } catch (err: any) {
          setNotifModal({ isOpen: true, type: 'error', title: 'Erro ao Excluir', message: err.message || 'Falha ao remover agendamento.' });
        }
      }
    });
  };

  const handleConfirmAppointment = async (app: Appointment) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Agendamento',
      message: `Confirmar o agendamento de ${app.responsible_name} para ${new Date(app.appointment_date).toLocaleString('pt-BR')}?`,
      onConfirm: async () => {
        try {
          await appointmentService.updateAppointmentStatus(app.id, 'Agendado');
          refreshAppointments();
          setNotifModal({ isOpen: true, type: 'success', title: 'Confirmado!', message: 'O agendamento foi confirmado com sucesso.' });
        } catch (err: any) {
          setNotifModal({ isOpen: true, type: 'error', title: 'Erro', message: err.message || 'Falha ao confirmar.' });
        }
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Agendado': return 'bg-brand-success/10 text-brand-success border-brand-success/20';
      case 'Pendente': return 'bg-brand-accent/10 text-brand-accent border-brand-accent/20';
      case 'Finalizado': return 'bg-brand-success/10 text-brand-success border-brand-success/20';
      case 'Cancelado': return 'bg-brand-danger/10 text-brand-danger border-brand-danger/20';
      default: return 'bg-brand-bg text-brand-text/40 border-ocl-primary/10';
    }
  };

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const statusIcons: Record<string, any> = {
    'Agendado': Clock,
    'Pendente': AlertCircle,
    'Finalizado': CheckCircle,
    'Cancelado': XCircle,
  };

  const getRolling7Days = () => {
    const dates = [];
    let current = new Date();
    while (dates.length < 7) {
      if (current.getUTCDay() !== 0) { // Pula Domingo
        dates.push({
          date: current.toISOString().split('T')[0],
          dayOfWeek: current.getUTCDay(),
          label: current.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
        });
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const rolling7Days = getRolling7Days();

  const getNext30Days = () => {
    const dates = [];
    let current = new Date();
    while (dates.length < 30) {
      if (current.getUTCDay() !== 0) { // Pula Domingo
        dates.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const next30Days = getNext30Days();

  return (
    <div className="min-h-screen p-8 bg-brand-bg text-brand-text">
      <div className="max-w-6xl mx-auto pt-4">
        <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
          <div className="flex bg-white/50 backdrop-blur-sm border border-ocl-primary/10 p-1.5 rounded-2xl overflow-x-auto whitespace-nowrap shadow-sm w-fit">
          <button 
            onClick={() => setActiveTab('appointments')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'appointments' ? 'bg-ocl-primary text-white shadow-lg' : 'text-brand-text/40 hover:text-ocl-primary'}`}
          >
            Atendimentos
          </button>
          <button 
            onClick={() => setActiveTab('schedules')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'schedules' ? 'bg-ocl-primary text-white shadow-lg' : 'text-brand-text/40 hover:text-ocl-primary'}`}
          >
            Escalas
          </button>
          <button 
            onClick={() => setActiveTab('calendar')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'calendar' ? 'bg-ocl-primary text-white shadow-lg' : 'text-brand-text/40 hover:text-ocl-primary'}`}
          >
            Calendário (D+30)
          </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'appointments' && (
            <motion.div key="apps" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="ocl-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-ocl-primary border-b border-ocl-primary/10">
                        <th className="p-5 text-[10px] uppercase font-black tracking-widest text-white/60">Cliente / Contrato</th>
                        <th className="p-5 text-[10px] uppercase font-black tracking-widest text-white/60">Data e Horário</th>
                        <th className="p-5 text-[10px] uppercase font-black tracking-widest text-white/60">Status</th>
                        <th className="p-5 text-[10px] uppercase font-black tracking-widest text-white/60 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ocl-primary/5">
                      {loadingApps ? <tr><td colSpan={4} className="p-20 text-center text-brand-text/40 font-medium">Carregando...</td></tr> : appointments.length === 0 ? <tr><td colSpan={4} className="p-20 text-center text-brand-text/40 italic">Nenhum agendamento encontrado</td></tr> : appointments.map(app => {
                        const Icon = statusIcons[app.status] || AlertCircle;
                        return (
                          <tr key={app.id} className="hover:bg-brand-bg/50 transition-colors">
                            <td className="p-5 font-bold text-ocl-primary">{app.responsible_name} <span className="block text-[10px] font-black opacity-30 tracking-tight uppercase">{app.contract}</span></td>
                            <td className="p-5 font-medium text-brand-text/70">
                              {new Date(app.appointment_date).toLocaleDateString('pt-BR')}
                              <span className="block text-xs font-black text-brand-accent mt-1">
                                {new Date(app.appointment_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </td>
                            <td className="p-5"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusColor(app.status)}`}><Icon className="w-3.5 h-3.5" />{app.status}</span></td>
                            <td className="p-5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {/* Visualizar */}
                                <button
                                  onClick={() => setDetailsApp(app)}
                                  title="Ver detalhes"
                                  className="p-2.5 text-ocl-primary bg-ocl-primary/5 rounded-xl hover:bg-ocl-primary hover:text-white hover:shadow-lg hover:shadow-ocl-primary/20 transition-all"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {/* Reagendar */}
                                <button
                                  onClick={() => setRescheduleApp(app)}
                                  title="Reagendar"
                                  className="p-2.5 text-brand-accent bg-brand-accent/10 rounded-xl hover:bg-brand-accent hover:text-white hover:shadow-lg hover:shadow-brand-accent/20 transition-all"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                                {/* Confirmar */}
                                {app.status !== 'Agendado' && app.status !== 'Finalizado' && (
                                  <button
                                    onClick={() => handleConfirmAppointment(app)}
                                    title="Confirmar agendamento"
                                    className="p-2.5 text-brand-success bg-brand-success/10 rounded-xl hover:bg-brand-success hover:text-white hover:shadow-lg hover:shadow-brand-success/20 transition-all"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                )}
                                {/* Excluir */}
                                <button
                                  onClick={() => handleDelete(app.id)}
                                  title="Excluir"
                                  className="p-2.5 text-brand-danger bg-brand-danger/10 rounded-xl hover:bg-brand-danger hover:text-white hover:shadow-lg hover:shadow-brand-danger/20 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'schedules' && (
            <motion.div key="scales" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="flex justify-end">
                <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-6 py-3 bg-ocl-primary text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-ocl-primary/20 hover:scale-105 active:scale-95 transition-all">
                  <UserPlus className="w-5 h-5" />
                  Novo Atendente
                </button>
              </div>
              {loadingOps ? <div className="p-20 text-center text-brand-text/40">Carregando escalas...</div> : operators.filter(op => op.email.toLowerCase().includes('posatendente')).map(op => {
                const someActive = op.operator_schedules.some(s => s.day_of_week !== null && s.is_active);
                return (
                  <div key={op.id} className="ocl-card p-6 space-y-6">
                    <div className="flex items-center justify-between border-b border-ocl-primary/5 pb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-ocl-primary/5 flex items-center justify-center text-ocl-primary"><User className="w-7 h-7" /></div>
                        <div>
                          <div className="flex items-center gap-2">
                             <h3 className="text-xl font-bold tracking-tight text-ocl-primary">{op.name || op.email.split('@')[0].toUpperCase()}</h3>
                             <button onClick={() => { setEditingOp(op); setShowEditModal(true); }} className="p-1.5 text-brand-text/30 hover:text-brand-accent transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                          </div>
                          <p className="text-sm text-brand-text/40 font-medium">{op.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase text-brand-text/30">Escala Geral</span>
                        <button 
                          onClick={() => handleToggleAll(op.id, someActive)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${someActive ? 'bg-brand-success/10 text-brand-success border-brand-success/20' : 'bg-brand-danger/10 text-brand-danger border-brand-danger/20'}`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          {someActive ? 'Ativo' : 'Inativo'}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 pt-6 px-1">
                      {rolling7Days.map(day => {
                        const specific = op.operator_schedules.find(s => s.specific_date?.startsWith(day.date));
                        const defaultDay = op.operator_schedules.find(s => s.day_of_week === day.dayOfWeek && !s.specific_date);
                        
                        const schedule = specific || defaultDay;
                        const isRealException = specific && (
                          specific.start_time !== defaultDay?.start_time || 
                          specific.end_time !== defaultDay?.end_time || 
                          specific.is_active !== defaultDay?.is_active
                        );
                        
                        return (
                          <div key={day.date} className={`p-4 rounded-xl border transition-all relative group ${schedule?.is_active ? 'bg-white border-ocl-primary/5 shadow-sm' : 'bg-brand-bg border-transparent opacity-40 grayscale shadow-inner'}`}>
                            {schedule && (
                              <button onClick={() => handleGridDelete(op.id, schedule.id)} className="absolute -top-3 -right-2 p-1.5 bg-brand-danger text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"><X className="w-2.5 h-2.5" /></button>
                            )}
                            <div className="flex justify-between items-center mb-3">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest text-brand-text/30">{day.label}</span>
                                {isRealException && <span className="text-[8px] font-black uppercase text-brand-accent">Exceção</span>}
                              </div>
                              {schedule && (
                                <button onClick={() => handleGridUpdate(op.id, day.date, day.dayOfWeek, specific, defaultDay, 'is_active', !schedule.is_active)} className={`p-2 rounded-lg transition-all ${schedule.is_active ? 'text-brand-success bg-brand-success/10' : 'text-brand-text/20 bg-brand-bg/50 border border-brand-text/5'}`}><Power className="w-3.5 h-3.5" /></button>
                              )}
                            </div>
                            {schedule ? (
                              <div className="space-y-2">
                                <input type="text" defaultValue={schedule.start_time} onBlur={e => handleGridUpdate(op.id, day.date, day.dayOfWeek, specific, defaultDay, 'start_time', e.target.value)} className="w-full bg-brand-bg border border-ocl-primary/5 rounded-lg px-1 py-2 text-[10px] font-black text-ocl-primary focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent outline-none transition-all shadow-inner text-center" />
                                <input type="text" defaultValue={schedule.end_time} onBlur={e => handleGridUpdate(op.id, day.date, day.dayOfWeek, specific, defaultDay, 'end_time', e.target.value)} className="w-full bg-brand-bg border border-ocl-primary/5 rounded-lg px-1 py-2 text-[10px] font-black text-ocl-primary focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent outline-none transition-all shadow-inner text-center" />
                              </div>
                            ) : (
                              <div className="py-5 text-center text-[10px] text-brand-text/10 font-black uppercase tracking-tighter">Sem Escala</div>
                            )}
                          </div>
                        );
                      })}
                      <button 
                        onClick={() => setAddingSlotTo(op.id)}
                        className="rounded-xl border-2 border-dashed border-ocl-primary/10 flex flex-col items-center justify-center text-brand-text/20 hover:text-brand-accent hover:border-brand-accent/30 transition-all group min-h-[120px]"
                      >
                        <Plus className="w-6 h-6 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase">Novo</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {activeTab === 'calendar' && (
            <motion.div key="calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="ocl-card p-6 overflow-hidden bg-white/40 backdrop-blur-md">
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-2xl font-black text-ocl-primary flex items-center gap-3"><CalendarIcon className="w-8 h-8 text-brand-accent" /> Calendário de Disponibilidade</h3>
                   <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-brand-success shadow-sm shadow-brand-success/20"></div><span className="text-[10px] font-black uppercase text-brand-text/40 tracking-wider">Ativo</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-brand-danger shadow-sm shadow-brand-danger/20"></div><span className="text-[10px] font-black uppercase text-brand-text/40 tracking-wider">Bloqueado</span></div>
                   </div>
                </div>
                
                <div className="overflow-x-auto">
                   <div className="flex gap-4 pb-6 min-w-max">
                      {next30Days.map(date => {
                        const d = new Date(date + 'T12:00:00Z');
                        const isToday = new Date().toISOString().split('T')[0] === date;
                        return (
                          <div key={date} className={`w-40 flex-shrink-0 space-y-3 rounded-3xl p-4 transition-all ${isToday ? 'bg-ocl-primary shadow-2xl shadow-ocl-primary/30 ring-4 ring-ocl-primary/10' : 'bg-white border border-ocl-primary/5 shadow-sm'}`}>
                             <div className="text-center pb-3 border-b border-ocl-primary/5">
                                <p className={`text-[10px] font-black uppercase tracking-widest ${isToday ? 'text-white/40' : 'text-brand-text/30'}`}>{dayNames[d.getUTCDay()]}</p>
                                <p className={`text-2xl font-black ${isToday ? 'text-white' : 'text-ocl-primary'}`}>{d.getUTCDate().toString().padStart(2, '0')}</p>
                             </div>
                             <div className="space-y-2">
                                {operators.filter(op => op.email.toLowerCase().includes('posatendente')).map(op => {
                                   const exception = op.operator_schedules.find(s => s.specific_date?.startsWith(date));
                                   const activeSchedule = op.operator_schedules.filter(s => s.day_of_week === d.getUTCDay());
                                   const isActiveByDefault = activeSchedule.some(s => s.is_active);
                                   const isActive = exception ? exception.is_active : isActiveByDefault;
                                   
                                   return (
                                     <button 
                                      key={op.id} 
                                      onClick={() => toggleDayAvailability(op.id, date, isActive)}
                                      className={`w-full p-2.5 rounded-xl flex items-center justify-between group transition-all ${isActive ? 'bg-brand-success/5 hover:bg-brand-success/10' : 'bg-brand-danger/5 hover:bg-brand-danger/10'}`}
                                     >
                                        <span className={`text-[9px] font-black uppercase whitespace-nowrap truncate mr-2 ${isToday ? 'text-white/60' : 'text-brand-text/50'}`}>{op.name || op.email.split('@')[0]}</span>
                                        <div className={`w-2 h-2 rounded-full shadow-sm group-hover:scale-125 transition-transform ${isActive ? 'bg-brand-success' : 'bg-brand-danger'}`}></div>
                                     </button>
                                   );
                                })}
                             </div>
                          </div>
                        );
                      })}
                   </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {showAddModal && (
          <div className="fixed inset-0 bg-ocl-dark/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-10 rounded-3xl max-w-md w-full shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-2 bg-brand-accent"></div>
              <h3 className="text-3xl font-black mb-8 flex items-center gap-3 text-ocl-primary"><UserPlus className="w-8 h-8 text-brand-accent" /> Novo Pós-atendente</h3>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-brand-text/30 uppercase tracking-widest mb-2 block">Nome Identificador</label>
                  <input type="text" value={newOp.name} onChange={e => setNewOp({...newOp, name: e.target.value})} placeholder="Ex: Pós 01" className="w-full bg-brand-bg border border-ocl-primary/10 rounded-2xl px-5 py-4 text-sm font-bold text-ocl-primary focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent outline-none transition-all shadow-inner" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-brand-text/30 uppercase tracking-widest mb-2 block">E-mail de Acesso</label>
                  <input type="email" value={newOp.email} onChange={e => setNewOp({...newOp, email: e.target.value})} placeholder="usuario@empresa.com" className="w-full bg-brand-bg border border-ocl-primary/10 rounded-2xl px-5 py-4 text-sm font-bold text-ocl-primary focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent outline-none transition-all shadow-inner" />
                </div>
                <div className="flex gap-4 pt-6">
                  <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 border border-ocl-primary/10 rounded-2xl font-black text-xs uppercase tracking-widest text-brand-text/40 hover:bg-brand-bg transition-all">Sair</button>
                  <button onClick={handleAddOperator} className="flex-1 py-4 bg-ocl-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-ocl-primary/20 hover:scale-[1.05] active:scale-[0.95] transition-all">Criar</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showEditModal && editingOp && (
          <div className="fixed inset-0 bg-ocl-dark/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-10 rounded-3xl max-w-md w-full shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-2 bg-ocl-primary"></div>
              <h3 className="text-3xl font-black mb-8 flex items-center gap-3 text-ocl-primary"><Edit2 className="w-7 h-7" /> Editar Atendente</h3>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-brand-text/30 uppercase tracking-widest mb-2 block">Nome</label>
                  <input type="text" value={editingOp.name || ''} onChange={e => setEditingOp({...editingOp, name: e.target.value} as any)} className="w-full bg-brand-bg border border-ocl-primary/10 rounded-2xl px-5 py-4 text-sm font-bold text-ocl-primary focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent outline-none transition-all shadow-inner" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-brand-text/30 uppercase tracking-widest mb-2 block">E-mail</label>
                  <input type="email" value={editingOp.email} onChange={e => setEditingOp({...editingOp, email: e.target.value} as any)} className="w-full bg-brand-bg border border-ocl-primary/10 rounded-2xl px-5 py-4 text-sm font-bold text-ocl-primary focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent outline-none transition-all shadow-inner" />
                </div>
                <div className="flex gap-4 pt-6">
                  <button onClick={() => setShowEditModal(false)} className="flex-1 py-4 border border-ocl-primary/10 rounded-2xl font-black text-xs uppercase tracking-widest text-brand-text/40 hover:bg-brand-bg transition-all">Sair</button>
                  <button onClick={handleUpdateOperator} className="flex-1 py-4 bg-ocl-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-ocl-primary/20 hover:scale-[1.05] active:scale-[0.95] transition-all">Salvar</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {addingSlotTo && (
          <div className="fixed inset-0 bg-ocl-dark/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-10 rounded-3xl max-w-sm w-full shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-2 bg-brand-accent"></div>
              <h3 className="text-2xl font-black mb-8 flex items-center gap-3 text-ocl-primary"><Plus className="w-7 h-7" /> Adicionar Horário</h3>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-brand-text/30 uppercase tracking-widest mb-2 block">Selecione a Data (Próximos 30 dias)</label>
                  <select 
                    value={newSlotData.specific_date} 
                    onChange={e => setNewSlotData({...newSlotData, specific_date: e.target.value})}
                    className="w-full bg-brand-bg border border-ocl-primary/10 rounded-2xl px-5 py-4 text-sm font-bold text-ocl-primary outline-none focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent appearance-none transition-all shadow-inner"
                  >
                    {next30Days.map(date => (
                      <option key={date} value={date}>
                        {new Date(date + 'T12:00:00Z').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-brand-text/30 uppercase tracking-widest mb-2 flex items-center justify-between">
                    Status Padrão
                    <button 
                      onClick={() => setNewSlotData({...newSlotData, is_active: !newSlotData.is_active})}
                      className={`w-10 h-5 rounded-full relative transition-all ${newSlotData.is_active ? 'bg-brand-success' : 'bg-brand-text/20'}`}
                    >
                      <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all ${newSlotData.is_active ? 'left-6' : 'left-0.5'}`}></div>
                    </button>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-brand-text/30 uppercase tracking-widest mb-2 block">Início</label>
                    <input type="text" value={newSlotData.start_time} onChange={e => setNewSlotData({...newSlotData, start_time: e.target.value})} className="w-full bg-brand-bg border border-ocl-primary/10 rounded-2xl px-4 py-4 text-sm font-black text-ocl-primary outline-none focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent transition-all shadow-inner" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-brand-text/30 uppercase tracking-widest mb-2 block">Fim</label>
                    <input type="text" value={newSlotData.end_time} onChange={e => setNewSlotData({...newSlotData, end_time: e.target.value})} className="w-full bg-brand-bg border border-ocl-primary/10 rounded-2xl px-4 py-4 text-sm font-black text-ocl-primary outline-none focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent transition-all shadow-inner" />
                  </div>
                </div>
                <div className="flex gap-4 pt-6">
                  <button onClick={() => setAddingSlotTo(null)} className="flex-1 py-4 border border-ocl-primary/10 rounded-2xl font-black text-xs uppercase tracking-widest text-brand-text/40 hover:bg-brand-bg transition-all">Sair</button>
                  <button onClick={handleAddSlot} className="flex-1 py-4 bg-ocl-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-ocl-primary/20 hover:scale-[1.05] active:scale-[0.95] transition-all">Adicionar</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
      <AnimatePresence>
        {pendingChanges.length > 0 && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-8 left-8 z-[100]"
          >
            <button 
              onClick={saveBatchUpdate}
              disabled={isSaving}
              className="bg-brand-success hover:bg-brand-success/90 text-white shadow-2xl shadow-brand-success/30 px-8 py-5 rounded-3xl font-black text-sm uppercase tracking-widest flex items-center gap-3 active:scale-95 transition-all group"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Save className="w-6 h-6 group-hover:scale-110 transition-transform" />
              )}
              Salvar Alterações
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs ml-2">{pendingChanges.length}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <NotificationModal
        {...notifModal}
        onClose={() => setNotifModal({ ...notifModal, isOpen: false })}
      />

      <ConfirmationModal
        {...confirmModal}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />

      {/* Modal de detalhes */}
      <AppointmentDetailsModal
        isOpen={!!detailsApp}
        appointment={detailsApp}
        onClose={() => setDetailsApp(null)}
      />

      {/* Modal de reagendamento */}
      <RescheduleModal
        isOpen={!!rescheduleApp}
        appointment={rescheduleApp}
        onClose={() => setRescheduleApp(null)}
        onSuccess={() => {
          refreshAppointments();
          setNotifModal({ isOpen: true, type: 'success', title: 'Reagendado!', message: 'O agendamento foi reagendado com sucesso.' });
        }}
      />
    </div>
  );
};

export default PosAtendimento;
