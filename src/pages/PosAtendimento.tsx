import { useState, useEffect, useRef, useMemo } from 'react';
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
import { StatusBadge } from '../components/StatusBadge';
import { PremiumDatePicker } from '../components/PremiumDatePicker';
import { PremiumSelect } from '../components/PremiumSelect';
import { PremiumTimePicker } from '../components/PremiumTimePicker';
import { 
  User as UserIcon, Clock, Trash2, Power, 
  UserPlus, Eye, RefreshCw, ChevronRight, ChevronLeft, Search, Filter, RotateCcw, Coffee
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const PosAtendimento = () => {
  const { appointments, deleteAppointment, refreshAppointments, loading: loadingApps } = useAppointments();
  const { socket } = useSocket();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'escalas' | 'calendario' | 'atendimentos'>('escalas');
  
  // Lists
  const [operators, setOperators] = useState<Operator[]>([]);
  const [negotiators, setNegotiators] = useState<any[]>([]);
  
  // Filters
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [negociadorFilter, setNegociadorFilter] = useState('');
  const [operadorFilter, setOperadorFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const [loadingOps, setLoadingOps] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newOp, setNewOp] = useState({ name: '', email: '' });
  const [editingOp, setEditingOp] = useState<Operator | null>(null);
  const [pendingChanges, setPendingChanges] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const [notifModal, setNotifModal] = useState({ isOpen: false, type: 'success' as 'success' | 'error', title: '', message: '', copyText: '' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [detailsApp, setDetailsApp] = useState<Appointment | null>(null);
  const [rescheduleApp, setRescheduleApp] = useState<Appointment | null>(null);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [currentOpForBreak, setCurrentOpForBreak] = useState<Operator | null>(null);
  const [newBreakForm, setNewBreakForm] = useState({ start: '', end: '', day: '' });
  
  const calendarConstraintsRef = useRef<HTMLDivElement>(null);
  const calendarContentRef = useRef<HTMLDivElement>(null);
  const calendarX = useMotionValue(0);

  // Load negotiators for filter
  useEffect(() => {
    const loadNegotiators = async () => {
      try {
        const response = await fetch('http://localhost:3000/negotiators');
        if (response.ok) {
          const data = await response.json();
          setNegotiators(data);
        }
      } catch (err) {
        console.error('Erro ao carregar negociadores:', err);
      }
    };
    loadNegotiators();
  }, []);

  // Filtered appointments
  const filteredApps = useMemo(() => {
    return appointments.filter(app => {
      const matchesSearch = searchTerm === '' || 
        app.responsible_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.contract.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.phone.includes(searchTerm) ||
        (app.recovery_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
      
      const matchesStatus = statusFilter === '' || app.status === statusFilter;
      const matchesNegociador = negociadorFilter === '' || app.negociador_id === negociadorFilter;
      const matchesOperador = operadorFilter === '' || app.operador_id === operadorFilter;
      const matchesDate = dateFilter === '' || app.appointment_date.startsWith(dateFilter);

      return matchesSearch && matchesStatus && matchesNegociador && matchesOperador && matchesDate;
    });
  }, [appointments, searchTerm, statusFilter, negociadorFilter, operadorFilter, dateFilter]);

  const scrollCalendar = (direction: 'left' | 'right') => {
    if (!calendarConstraintsRef.current || !calendarContentRef.current) return;
    const container = calendarConstraintsRef.current.offsetWidth;
    const content = calendarContentRef.current.offsetWidth;
    const maxScroll = Math.min(0, -(content - container)); 
    
    let targetX = calendarX.get() + (direction === 'left' ? 320 : -320);
    if (targetX > 0) targetX = 0;
    if (targetX < maxScroll) targetX = maxScroll;

    animate(calendarX, targetX, {
      type: 'spring',
      stiffness: 200,
      damping: 25
    });
  };

  useEffect(() => {
    loadOperators();
  }, []); 

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

  const saveBatchUpdate = async () => {
    if (pendingChanges.length === 0) return;
    setIsSaving(true);
    try {
      await operatorService.batchUpdateSchedules(pendingChanges);
      setPendingChanges([]);
      await loadOperators();
      setNotifModal({ isOpen: true, type: 'success', title: 'Atualizado!', message: 'As escalas foram salvas com sucesso.', copyText: '' });
    } catch (err) {
      setNotifModal({ isOpen: true, type: 'error', title: 'Erro ao Salvar', message: 'Não foi possível salvar as alterações de escala.', copyText: '' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAll = (id: string) => {
    const op = operators.find(o => o.id === id);
    if (!op) return;

    const rolling7 = getRolling7Days();
    const isAnyInactive = rolling7.some(day => {
      const specific = op.operator_schedules.find(s => s.specific_date?.startsWith(day.date));
      const defaultDay = op.operator_schedules.find(s => s.day_of_week === day.dayOfWeek && !s.specific_date);
      const base = specific || defaultDay;
      return !base?.is_active;
    });

    const newStatus = isAnyInactive;
    const newChanges: any[] = [];

    rolling7.forEach(day => {
      const specific = op.operator_schedules.find(s => s.specific_date?.slice(0, 10) === day.date);
      const defaultDay = op.operator_schedules.find(s => s.day_of_week === day.dayOfWeek && !s.specific_date);
      const base = specific || defaultDay;
      if (!base) return;

      if (specific && !specific.id.startsWith('temp-')) {
        newChanges.push({ action: 'update', id: specific.id, start_time: specific.start_time, end_time: specific.end_time, is_active: newStatus });
      } else {
        const tempId = `temp-${id}-${day.date}`;
        newChanges.push({ action: 'create', tempId, operador_id: id, specific_date: day.date, day_of_week: day.dayOfWeek, start_time: base.start_time, end_time: base.end_time, is_active: newStatus });
      }
    });

    setOperators(prev => prev.map(o => {
      if (o.id !== id) return o;
      let newSchedules = [...o.operator_schedules];
      newChanges.forEach(change => {
        if (change.action === 'update') {
          newSchedules = newSchedules.map(s => s.id === change.id ? { ...s, is_active: newStatus } : s);
        } else {
          const idx = newSchedules.findIndex(s => s.id === change.tempId);
          const entry = { id: change.tempId, operador_id: id, day_of_week: change.day_of_week, specific_date: change.specific_date, start_time: change.start_time, end_time: change.end_time, is_active: newStatus };
          if (idx !== -1) newSchedules[idx] = entry;
          else newSchedules.push(entry);
        }
      });
      return { ...o, operator_schedules: newSchedules };
    }));

    setPendingChanges(prev => {
      let next = [...prev];
      newChanges.forEach(change => {
        if (change.action === 'update') {
          const idx = next.findIndex(p => p.action === 'update' && p.id === change.id);
          if (idx !== -1) next[idx] = { ...next[idx], ...change };
          else next.push(change);
        } else {
          const idx = next.findIndex(p => p.action === 'create' && p.specific_date === change.specific_date && p.operador_id === id);
          if (idx !== -1) next[idx] = { ...next[idx], ...change };
          else next.push(change);
        }
      });
      return next;
    });
  };

  const handleClearOverrides = (opId: string) => {
    const op = operators.find(o => o.id === opId);
    if (!op) return;
    setConfirmModal({
      isOpen: true,
      title: 'Limpar Exceções',
      message: `Remover alterações de ${op.name || op.email}?`,
      onConfirm: async () => {
        try {
          const overrides = op.operator_schedules.filter(s => s.specific_date && !s.id.startsWith('temp-'));
          if (overrides.length > 0) {
            await operatorService.batchUpdateSchedules(overrides.map(s => ({ action: 'delete', id: s.id })));
          }
          setPendingChanges(prev => prev.filter(p => p.operador_id !== opId));
          await loadOperators();
          setNotifModal({ isOpen: true, type: 'success', title: 'Restaurado!', message: 'Sucesso.', copyText: '' });
        } catch (err) {
          setNotifModal({ isOpen: true, type: 'error', title: 'Erro', message: 'Falha.', copyText: '' });
        }
      }
    });
  };

  const toggleDayAvailability = (userId: string, date: string, currentStatus: boolean) => {
     const op = operators.find(o => o.id === userId);
     if (!op) return;
     const d = new Date(date + 'T12:00:00Z');
     const specific = op.operator_schedules.find(s => s.specific_date?.startsWith(date));
     const defaultDay = op.operator_schedules.find(s => s.day_of_week === d.getUTCDay() && !s.specific_date);
     handleGridUpdate(userId, date, d.getUTCDay(), specific, defaultDay, 'is_active', !currentStatus);
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir',
      message: 'Tem certeza?',
      onConfirm: async () => {
        try {
          await deleteAppointment(id);
          setNotifModal({ isOpen: true, type: 'success', title: 'Excluído', message: 'Sucesso.', copyText: '' });
        } catch (err: any) {
          setNotifModal({ isOpen: true, type: 'error', title: 'Erro', message: err.message || 'Falha.', copyText: '' });
        }
      }
    });
  };

  const handleUpdateStatus = async (appId: string, newStatus: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Alterar Status',
      message: `Deseja realmente alterar o status deste agendamento para "${newStatus}"?`,
      onConfirm: async () => {
        try {
          await appointmentService.updateAppointmentStatus(appId, newStatus, profile?.id);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          refreshAppointments();
          setNotifModal({ isOpen: true, type: 'success', title: 'Status Atualizado', message: `O agendamento agora está como ${newStatus}.`, copyText: '' });
        } catch (err: any) {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setNotifModal({ isOpen: true, type: 'error', title: 'Erro', message: err.message || 'Falha ao atualizar.', copyText: '' });
        }
      }
    });
  };
  const handleUpdateOperator = async () => {
    if (!editingOp) return;
    try {
      await operatorService.updateOperator(editingOp.id, { name: editingOp.name || '', email: editingOp.email });
      setShowEditModal(false);
      await loadOperators();
      setNotifModal({ isOpen: true, type: 'success', title: 'Sucesso', message: 'Atendente atualizado com sucesso.', copyText: '' });
    } catch (err) {
      setNotifModal({ isOpen: true, type: 'error', title: 'Erro', message: 'Não foi possível atualizar.', copyText: '' });
    }
  };

  const handleAddOperator = async () => {
    if (!newOp.name || !newOp.email) return;
    try {
      await operatorService.createOperator(newOp.email, newOp.name);
      setShowAddModal(false);
      setNewOp({ name: '', email: '' });
      await loadOperators();
      setNotifModal({ isOpen: true, type: 'success', title: 'Criado!', message: 'Atendente adicionado com sucesso.', copyText: '' });
    } catch (err: any) {
      setNotifModal({ isOpen: true, type: 'error', title: 'Erro', message: err.message || 'Falha ao criar.', copyText: '' });
    }
  };

  const handleDeleteOperator = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Atendente',
      message: 'Tem certeza que deseja excluir permanentemente este atendente e todas as suas escalas? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          await operatorService.deleteOperator(id);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          await loadOperators();
          setNotifModal({ isOpen: true, type: 'success', title: 'Excluído', message: 'Atendente removido com sucesso.', copyText: '' });
        } catch (err: any) {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setNotifModal({ isOpen: true, type: 'error', title: 'Erro', message: err.message || 'Falha ao excluir.', copyText: '' });
        }
      }
    });
  };

  const handleAddBreak = async () => {
    if (!currentOpForBreak || !newBreakForm.start || !newBreakForm.end) return;
    try {
      await operatorService.updateBreak({
        start_time: newBreakForm.start,
        end_time: newBreakForm.end,
        day_of_week: newBreakForm.day ? parseInt(newBreakForm.day) : undefined,
        operador_id: currentOpForBreak.id
      });
      const updatedOperators = await operatorService.fetchOperators();
      setOperators(updatedOperators);
      
      const updatedOp = updatedOperators.find(o => o.id === currentOpForBreak.id);
      if (updatedOp) setCurrentOpForBreak(updatedOp);
      
      setNewBreakForm({ start: '', end: '', day: '' });
      setNotifModal({ isOpen: true, type: 'success', title: 'Sucesso', message: 'Intervalo adicionado.', copyText: '' });
    } catch (err: any) {
      setNotifModal({ isOpen: true, type: 'error', title: 'Erro', message: err.message || 'Falha ao adicionar.', copyText: '' });
    }
  };

  const handleDeleteBreak = async (breakId: string) => {
    try {
      await operatorService.deleteBreak(breakId);
      const updatedOperators = await operatorService.fetchOperators();
      setOperators(updatedOperators);
      
      if (currentOpForBreak) {
         const updatedOp = updatedOperators.find(o => o.id === currentOpForBreak.id);
         if (updatedOp) setCurrentOpForBreak(updatedOp);
      }
      setNotifModal({ isOpen: true, type: 'success', title: 'Sucesso', message: 'Intervalo removido.', copyText: '' });
    } catch (err: any) {
      setNotifModal({ isOpen: true, type: 'error', title: 'Erro', message: err.message || 'Falha ao remover.', copyText: '' });
    }
  };

  const getRolling30Days = () => {
    const dates = [];
    let current = new Date();
    while (dates.length < 30) {
      if (current.getUTCDay() !== 0) { 
        dates.push({
          date: current.toISOString().split('T')[0],
          dayOfWeek: current.getUTCDay(),
          label: current.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace(/\.|\,/g, '').toUpperCase()
        });
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const getRolling7Days = () => {
    const dates = [];
    let current = new Date();
    while (dates.length < 7) {
      if (current.getUTCDay() !== 0) { 
        dates.push({
          date: current.toISOString().split('T')[0],
          dayOfWeek: current.getUTCDay(),
          label: current.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace(/\.|\,/g, '').toUpperCase()
        });
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const rolling7Days = getRolling7Days();
  const rolling30Days = getRolling30Days();

  return (
    <div className="min-h-screen p-8 bg-brand-bg text-brand-text">
      <div className="max-w-6xl mx-auto pt-4">
        <div className="flex items-center justify-between mb-10 border-b border-ocl-primary/5 pb-6">
          <div className="flex bg-white/50 backdrop-blur-sm border border-ocl-primary/10 p-1 rounded-2xl shadow-sm">
            {(['atendimentos', 'escalas', 'calendario'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-ocl-primary text-white shadow-lg' : 'text-brand-text/40 hover:text-ocl-primary'}`}>
                {tab === 'atendimentos' ? 'Atendimentos' : tab === 'escalas' ? 'Escalas' : 'Calendário'}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'atendimentos' && (
            <motion.div key="apps" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-white border border-ocl-primary/10 rounded-3xl shadow-sm mb-8 relative z-40">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/30" />
                  <input 
                    type="text" 
                    placeholder="Nome, contrato, celular..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="w-full bg-white border border-ocl-primary/5 rounded-2xl pl-12 pr-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-accent/20 transition-all placeholder:text-brand-text/20" 
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
                      { value: 'Não realizado', label: 'Não realizado' }
                    ]}
                    placeholder="Todos Status"
                    icon={<Filter className="w-4 h-4" />}
                  />
                </div>
                <div className="md:col-span-1">
                  <PremiumSelect
                    value={negociadorFilter}
                    onChange={setNegociadorFilter}
                    options={negotiators.map(n => ({ value: n.id, label: n.full_name }))}
                    placeholder="Todos Recuperadores"
                    icon={<UserIcon className="w-4 h-4" />}
                  />
                </div>
                <div className="md:col-span-1">
                  <PremiumSelect
                    value={operadorFilter}
                    onChange={setOperadorFilter}
                    options={operators.map(op => ({ value: op.id, label: op.name || op.email.split('@')[0] }))}
                    placeholder="Todos Pós-atendentes"
                    icon={<UserIcon className="w-4 h-4" />}
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
                  {(searchTerm || statusFilter || dateFilter || negociadorFilter || operadorFilter) && (
                    <div className="md:col-span-4 flex justify-end">
                      <motion.button
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        onClick={() => {
                          setSearchTerm('');
                          setStatusFilter('');
                          setDateFilter('');
                          setNegociadorFilter('');
                          setOperadorFilter('');
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-brand-danger hover:bg-brand-danger/5 rounded-xl transition-all border border-brand-danger/10 shadow-sm"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Limpar Filtros
                      </motion.button>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              <div className="bg-white/60 backdrop-blur-lg border border-ocl-primary/10 rounded-[2rem] shadow-xl shadow-ocl-primary/5 overflow-hidden">
                <AnimatePresence>
                  {selectedIds.length > 0 && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-brand-accent/10 border-b border-brand-accent/20 px-8 py-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-accent/20 flex items-center justify-center">
                          <Filter className="w-4 h-4 text-brand-accent" />
                        </div>
                        <span className="text-sm font-bold text-brand-accent">
                          {selectedIds.length} agendamentos selecionados
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setSelectedIds([])}
                          className="px-4 py-2 text-xs font-bold text-brand-text/40 hover:text-brand-text/60 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: 'Excluir em Massa',
                              message: `Tem certeza que deseja excluir ${selectedIds.length} agendamentos selecionados? Esta ação não pode ser desfeita.`,
                              onConfirm: async () => {
                                try {
                                  const response = await fetch('http://localhost:3000/bulk', {
                                    method: 'DELETE',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ ids: selectedIds })
                                  });
                                  if (response.ok) {
                                    setNotifModal({
                                      isOpen: true,
                                      type: 'success',
                                      title: 'Sucesso',
                                      message: `${selectedIds.length} agendamentos foram excluídos.`,
                                      copyText: ''
                                    });
                                    setSelectedIds([]);
                                    refreshAppointments();
                                  } else {
                                    throw new Error();
                                  }
                                } catch (err) {
                                  setNotifModal({
                                    isOpen: true,
                                    type: 'error',
                                    title: 'Erro',
                                    message: 'Não foi possível excluir os agendamentos selecionados.',
                                    copyText: ''
                                  });
                                }
                              }
                            });
                          }}
                          className="flex items-center gap-2 bg-brand-danger text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-danger/20 hover:scale-105 active:scale-95 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                          Excluir Selecionados
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-ocl-primary/95 text-white/60 border-b border-ocl-primary/10">
                        <th className="p-6 text-left w-10">
                          <input 
                            type="checkbox"
                            className="rounded border-white/20 bg-white/5 text-ocl-accent focus:ring-ocl-accent focus:ring-offset-ocl-primary"
                            checked={filteredApps.length > 0 && selectedIds.length === filteredApps.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds(filteredApps.map(a => a.id));
                              } else {
                                setSelectedIds([]);
                              }
                            }}
                          />
                        </th>
                        <th className="p-6 text-[10px] uppercase font-black tracking-[0.2em]">Cliente / Contrato</th>
                        <th className="p-6 text-[10px] uppercase font-black tracking-[0.2em]">Agendamento</th>
                        <th className="p-6 text-[10px] uppercase font-black tracking-[0.2em]">Recuperador</th>
                        <th className="p-6 text-[10px] uppercase font-black tracking-[0.2em]">Pós-Atendente</th>
                        <th className="p-6 text-[10px] uppercase font-black tracking-[0.2em]">Estado Atual</th>
                        <th className="p-6 text-right text-[10px] uppercase font-black tracking-[0.2em]">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ocl-primary/5">
                      {loadingApps ? (
                        <tr><td colSpan={6} className="p-20 text-center text-brand-text/40 font-medium flex items-center justify-center gap-2 italic"><RefreshCw className="w-4 h-4 animate-spin" /> Sincronizando dados...</td></tr>
                      ) : filteredApps.length === 0 ? (
                        <tr><td colSpan={6} className="p-20 text-center text-brand-text/30 italic font-medium">Nenhum agendamento encontrado para os filtros selecionados.</td></tr>
                      ) : (
                        filteredApps.map((app) => (
                          <motion.tr 
                            key={app.id} 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }}
                            className={`group hover:bg-ocl-primary/[0.02] transition-all duration-300 ${selectedIds.includes(app.id) ? 'bg-brand-accent/5' : ''}`}
                          >
                            <td className="p-6">
                              <input 
                                type="checkbox"
                                className="rounded border-white/10 bg-white/5 text-ocl-accent focus:ring-ocl-accent focus:ring-offset-ocl-primary"
                                checked={selectedIds.includes(app.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedIds(prev => [...prev, app.id]);
                                  } else {
                                    setSelectedIds(prev => prev.filter(id => id !== app.id));
                                  }
                                }}
                              />
                            </td>
                            <td className="p-6">
                              <span className="font-extrabold text-ocl-primary block text-sm group-hover:text-brand-accent transition-colors">{app.responsible_name}</span>
                              <span className="text-[10px] font-black text-brand-text/20 uppercase tracking-tight italic">Contrato: {app.contract}</span>
                            </td>
                            <td className="p-6">
                              <div className="flex flex-col">
                                <span className="font-bold text-brand-text/70 text-xs">{new Date(app.appointment_date).toLocaleDateString('pt-BR')}</span>
                                <span className="text-[10px] font-black text-brand-accent flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> {new Date(app.appointment_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </td>
                            <td className="p-6">
                              <span className="text-[10px] font-black uppercase text-ocl-primary/40 leading-none">{app.recovery_name || app.negociador?.full_name || 'Sistema'}</span>
                              <span className="block text-[8px] font-bold text-brand-text/20 uppercase mt-0.5">Perfil: {app.negociador_id ? (app.negociador?.role || 'Negociador') : 'Visitante'}</span>
                            </td>
                            <td className="p-6">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-ocl-primary/10 flex items-center justify-center">
                                  <UserIcon className="w-3 h-3 text-ocl-primary/40" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-black uppercase text-ocl-primary/70 leading-none">{app.users?.name || app.users?.email?.split('@')[0] || 'Não atribuído'}</span>
                                  <span className="text-[8px] font-bold text-brand-text/20 uppercase mt-0.5">Pós-atendente</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-6">
                              <div className="flex flex-col gap-2">
                                <StatusBadge status={app.status} />
                                <select 
                                  value={app.status} 
                                  onChange={e => handleUpdateStatus(app.id, e.target.value)} 
                                  className="w-fit bg-transparent text-[8px] font-black uppercase outline-none text-ocl-primary/20 hover:text-brand-accent transition-all cursor-pointer"
                                >
                                  <option value="Pendente">Alterar Status</option>
                                  <option value="Pendente">Pendente</option>
                                  <option value="Em andamento">Em andamento</option>
                                  <option value="Concluído">Concluído</option>
                                  <option value="Não realizado">Não realizado</option>
                                </select>
                              </div>
                            </td>
                            <td className="p-6 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setDetailsApp(app)} className="p-2.5 text-ocl-primary bg-ocl-primary/5 rounded-xl hover:bg-ocl-primary hover:text-white hover:scale-110 transition-all duration-300 shadow-sm"><Eye className="w-4 h-4" /></button>
                                <button onClick={() => setRescheduleApp(app)} className="p-2.5 text-brand-accent bg-brand-accent/5 rounded-xl hover:bg-brand-accent hover:text-white hover:scale-110 transition-all duration-300 shadow-sm"><RefreshCw className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(app.id)} className="p-2.5 text-brand-danger bg-brand-danger/5 rounded-xl hover:bg-brand-danger hover:text-white hover:scale-110 transition-all duration-300 shadow-sm"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'escalas' && (
            <motion.div 
              key="scales" 
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.98 }} 
              className="space-y-8"
            >
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h2 className="text-2xl font-black text-ocl-primary">Gestão de Escalas</h2>
                  <p className="text-xs font-bold text-brand-text/40 uppercase tracking-tighter">Configure os horários de atendimento dos seus operadores</p>
                </div>
                <button 
                  onClick={() => setShowAddModal(true)} 
                  className="flex items-center gap-3 px-8 py-4 bg-ocl-primary text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-ocl-primary/20 hover:scale-105 active:scale-95 transition-all group"
                >
                  <UserPlus className="w-5 h-5 group-hover:rotate-12 transition-transform" /> 
                  Novo Atendente
                </button>
              </div>

              {loadingOps ? (
                <div className="p-32 text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-ocl-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-xs font-black uppercase tracking-widest text-brand-text/30">Processando operadores...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-8">
                  {operators.map((op, idx) => (
                    <motion.div 
                      key={op.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="ocl-card group overflow-hidden border-none ring-1 ring-ocl-primary/5 bg-white/70 backdrop-blur-xl"
                    >
                      <div className="bg-gradient-to-r from-ocl-primary via-ocl-primary to-ocl-secondary p-6 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                            <UserIcon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-white leading-tight uppercase tracking-tight">{op.name || op.email.split('@')[0]}</h3>
                            <p className="text-[10px] font-bold text-white/50 lowercase tracking-wide">{op.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => handleClearOverrides(op.id)} 
                            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/5 active:scale-90"
                            title="Resetar para Escala Padrão"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setCurrentOpForBreak(op);
                              setShowBreakModal(true);
                            }} 
                            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/5 active:scale-90"
                            title="Gerenciar Pausas/Intervalos"
                          >
                            <Coffee className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteOperator(op.id)} 
                            className="p-3 bg-white/10 hover:bg-brand-danger text-white rounded-xl transition-all border border-white/5 active:scale-90"
                            title="Excluir Atendente Permanentemente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleToggleAll(op.id)} 
                            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-lg ${
                              rolling7Days.some(day => {
                                const specific = op.operator_schedules.find(s => s.specific_date?.startsWith(day.date));
                                const defaultDay = op.operator_schedules.find(s => s.day_of_week === day.dayOfWeek && !s.specific_date);
                                const base = specific || defaultDay;
                                return !base?.is_active;
                              }) 
                              ? 'bg-white/10 hover:bg-white text-white hover:text-ocl-primary border-white/10' 
                              : 'bg-brand-danger text-white border-brand-danger/20 hover:bg-brand-danger/80'
                            }`}
                          >
                            {rolling7Days.some(day => {
                              const specific = op.operator_schedules.find(s => s.specific_date?.startsWith(day.date));
                              const defaultDay = op.operator_schedules.find(s => s.day_of_week === day.dayOfWeek && !s.specific_date);
                              const base = specific || defaultDay;
                              return !base?.is_active;
                            }) ? 'Ativar Semana' : 'Desativar Semana'}
                          </button>
                        </div>
                      </div>

                      <div className="p-8">
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
                          {rolling7Days.map((day) => {
                            const specific = op.operator_schedules.find(s => s.specific_date?.startsWith(day.date));
                            const defaultDay = op.operator_schedules.find(s => s.day_of_week === day.dayOfWeek && !s.specific_date);
                            const schedule = specific || defaultDay;
                            const isActive = schedule?.is_active ?? false;

                            return (
                              <div 
                                key={day.date} 
                                className={`relative p-5 rounded-2xl border-2 transition-all duration-300 ${isActive ? 'bg-white border-ocl-primary/5 shadow-sm' : 'bg-brand-bg/50 border-transparent grayscale opacity-50 overflow-hidden'}`}
                              >
                                {!isActive && <div className="absolute inset-0 bg-ocl-dark/5 pointer-events-none" />}
                                <div className="text-center mb-4">
                                  <span className="text-[9px] font-black text-brand-text/30 block mb-0.5">{day.label.split(' ')[0]}</span>
                                  <span className="text-xs font-black text-ocl-primary/80">{day.label.split(' ')[1]}</span>
                                </div>

                                {schedule && (
                                  <div className="space-y-3 relative z-10">
                                    <div className="group/time relative">
                                      <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-ocl-primary/20 pointer-events-none" />
                                      <input 
                                        type="text" 
                                        defaultValue={schedule.start_time} 
                                        onBlur={e => handleGridUpdate(op.id, day.date, day.dayOfWeek, specific, defaultDay, 'start_time', e.target.value)} 
                                        className="w-full text-center text-[10px] font-black py-2.5 pl-4 bg-brand-bg/50 border-none rounded-xl focus:ring-2 focus:ring-brand-accent/20 outline-none transition-all" 
                                      />
                                    </div>
                                    <div className="group/time relative">
                                      <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-ocl-primary/20 pointer-events-none" />
                                      <input 
                                        type="text" 
                                        defaultValue={schedule.end_time} 
                                        onBlur={e => handleGridUpdate(op.id, day.date, day.dayOfWeek, specific, defaultDay, 'end_time', e.target.value)} 
                                        className="w-full text-center text-[10px] font-black py-2.5 pl-4 bg-brand-bg/50 border-none rounded-xl focus:ring-2 focus:ring-brand-accent/20 outline-none transition-all" 
                                      />
                                    </div>
                                    <button 
                                      onClick={() => handleGridUpdate(op.id, day.date, day.dayOfWeek, specific, defaultDay, 'is_active', !schedule.is_active)} 
                                      className={`w-full py-2.5 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-brand-success/10 text-brand-success hover:bg-brand-success hover:text-white' : 'bg-brand-danger/10 text-brand-danger hover:bg-brand-danger hover:text-white'}`}
                                    >
                                      <Power className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'calendario' && (
            <motion.div 
              key="calendar" 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }} 
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-ocl-primary">Visão de Disponibilidade</h2>
                  <p className="text-xs font-bold text-brand-text/40 uppercase tracking-tighter">Status rápido dos próximos 30 dias de operação</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => scrollCalendar('left')} className="p-3 bg-white border border-ocl-primary/10 rounded-xl hover:bg-ocl-primary hover:text-white transition-all shadow-sm"><ChevronLeft className="w-5 h-5" /></button>
                  <button onClick={() => scrollCalendar('right')} className="p-3 bg-white border border-ocl-primary/10 rounded-xl hover:bg-ocl-primary hover:text-white transition-all shadow-sm"><ChevronRight className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="relative group/calendar">
                <div 
                  ref={calendarConstraintsRef}
                  className="overflow-hidden pb-8 pt-2"
                >
                  <motion.div 
                    ref={calendarContentRef}
                    style={{ x: calendarX }}
                    drag="x"
                    dragConstraints={calendarConstraintsRef}
                    className="flex gap-6 px-4 cursor-grab active:cursor-grabbing w-max"
                  >
                    {rolling30Days.map((day, dIdx) => (
                      <motion.div 
                        key={day.date} 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: dIdx * 0.02 }}
                        className="w-48 flex-shrink-0 relative"
                      >
                        <div className="absolute -top-2 -left-2 w-full h-full bg-ocl-primary/5 rounded-[2.5rem] -rotate-1 z-0"></div>
                        <div className="relative z-10 bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-premium hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group/card overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-ocl-primary/5 rounded-full -mr-12 -mt-12 transition-transform group-hover/card:scale-150 duration-700"></div>
                          
                          <div className="text-center mb-6 relative">
                            <p className="text-[10px] font-black text-brand-text/20 uppercase tracking-[0.2em] mb-1">{day.label.split(' ')[0]}</p>
                            <p className="text-3xl font-black text-ocl-primary tracking-tighter">{day.label.split(' ')[1]}</p>
                            <div className="w-6 h-1 bg-brand-accent/30 mx-auto mt-2 rounded-full"></div>
                          </div>

                          <div className="space-y-2 relative">
                            {operators.map(op => {
                              const exception = op.operator_schedules.find(s => s.specific_date?.startsWith(day.date));
                              const daily = op.operator_schedules.find(s => s.day_of_week === day.dayOfWeek && !s.specific_date);
                              const active = exception ? exception.is_active : (daily?.is_active ?? false);
                              
                              return (
                                <button 
                                  key={op.id} 
                                  onClick={() => toggleDayAvailability(op.id, day.date, active)} 
                                  className={`w-full p-3 rounded-2xl text-[9px] font-black uppercase flex justify-between items-center transition-all group/btn ${active ? 'bg-brand-success/5 text-brand-success border border-brand-success/10 hover:bg-brand-success hover:text-white' : 'bg-brand-danger/5 text-brand-danger border border-brand-danger/10 hover:bg-brand-danger hover:text-white opacity-60'}`}
                                >
                                  <span className="truncate mr-2">{op.name || op.email.split('@')[0]}</span>
                                  <div className={`w-2 h-2 rounded-full ${active ? 'bg-brand-success group-hover/btn:bg-white animate-pulse' : 'bg-brand-danger group-hover/btn:bg-white'}`}></div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
                
                <div className="absolute top-0 left-0 h-full w-20 bg-gradient-to-r from-brand-bg to-transparent pointer-events-none opacity-0 group-hover/calendar:opacity-100 transition-opacity"></div>
                <div className="absolute top-0 right-0 h-full w-20 bg-gradient-to-l from-brand-bg to-transparent pointer-events-none opacity-0 group-hover/calendar:opacity-100 transition-opacity"></div>
              </div>

              <div className="flex justify-center gap-4 mt-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-brand-text/30">
                  <div className="w-2 h-2 rounded-full bg-brand-success animate-pulse"></div> Disponível
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-brand-text/30">
                  <div className="w-2 h-2 rounded-full bg-brand-danger"></div> Indisponível
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {showAddModal && (
          <div className="fixed inset-0 bg-ocl-dark/90 backdrop-blur-md z-50 flex items-center justify-center p-6"><motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-10 rounded-3xl max-w-md w-full shadow-2xl relative overflow-hidden"><div className="absolute top-0 left-0 w-full h-2 bg-brand-accent"></div><h3 className="text-3xl font-black mb-8 text-ocl-primary">Novo Pós-atendente</h3><div className="space-y-6"><div><label className="text-[10px] font-black text-brand-text/30 uppercase mb-2 block">Nome</label><input type="text" value={newOp.name} onChange={e => setNewOp({...newOp, name: e.target.value})} className="w-full bg-brand-bg border rounded-2xl px-5 py-4 text-sm font-bold" /></div><div><label className="text-[10px] font-black text-brand-text/30 uppercase mb-2 block">E-mail</label><input type="email" value={newOp.email} onChange={e => setNewOp({...newOp, email: e.target.value})} className="w-full bg-brand-bg border rounded-2xl px-5 py-4 text-sm font-bold" /></div><div className="flex gap-4 pt-4"><button onClick={() => setShowAddModal(false)} className="flex-1 py-4 border rounded-2xl font-black text-xs uppercase">Sair</button><button onClick={handleAddOperator} className="flex-1 py-4 bg-ocl-primary text-white rounded-2xl font-black text-xs uppercase shadow-lg">Criar</button></div></div></motion.div></div>
        )}

        {showEditModal && editingOp && (
          <div className="fixed inset-0 bg-ocl-dark/90 backdrop-blur-md z-50 flex items-center justify-center p-6"><motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-10 rounded-3xl max-w-md w-full shadow-2xl relative overflow-hidden"><div className="absolute top-0 left-0 w-full h-2 bg-ocl-primary"></div><h3 className="text-3xl font-black mb-8 text-ocl-primary">Editar Atendente</h3><div className="space-y-6"><div><label className="text-[10px] font-black text-brand-text/30 uppercase mb-2 block">Nome</label><input type="text" value={editingOp.name || ''} onChange={e => setEditingOp({...editingOp, name: e.target.value} as any)} className="w-full bg-brand-bg border rounded-2xl px-5 py-4 text-sm font-bold" /></div><div><label className="text-[10px] font-black text-brand-text/30 uppercase mb-2 block">E-mail</label><input type="email" value={editingOp.email} onChange={e => setEditingOp({...editingOp, email: e.target.value} as any)} className="w-full bg-brand-bg border rounded-2xl px-5 py-4 text-sm font-bold" /></div><div className="flex gap-4 pt-4"><button onClick={() => setShowEditModal(false)} className="flex-1 py-4 border rounded-2xl font-black text-xs uppercase">Sair</button><button onClick={handleUpdateOperator} className="flex-1 py-4 bg-ocl-primary text-white rounded-2xl font-black text-xs uppercase shadow-lg">Salvar</button></div></div></motion.div></div>
        )}
      </div>

      <AnimatePresence>
        {pendingChanges.length > 0 && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-8 left-8 z-[100]"><button onClick={saveBatchUpdate} disabled={isSaving} className="bg-brand-success hover:scale-105 text-white shadow-2xl px-8 py-5 rounded-3xl font-black text-xs uppercase tracking-widest flex items-center gap-3 active:scale-95 transition-all">{isSaving ? 'Salvando...' : 'Salvar Alterações'}<span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">{pendingChanges.length}</span></button></motion.div>
        )}
      </AnimatePresence>

      <NotificationModal {...notifModal} onClose={() => setNotifModal({ ...notifModal, isOpen: false })} />
      <ConfirmationModal {...confirmModal} onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })} />
      <AppointmentDetailsModal isOpen={!!detailsApp} appointment={detailsApp} onClose={() => setDetailsApp(null)} />
      <RescheduleModal isOpen={!!rescheduleApp} appointment={rescheduleApp} onClose={() => setRescheduleApp(null)} onSuccess={() => { refreshAppointments(); setNotifModal({ isOpen: true, type: 'success', title: 'Sucesso', message: 'Reagendado.', copyText: '' }); }} />

      <AnimatePresence>
        {showBreakModal && currentOpForBreak && (
          <div className="fixed inset-0 bg-ocl-dark/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] max-w-2xl w-full shadow-2xl relative overflow-hidden flex flex-col h-auto max-h-[85vh]"
            >
              <div className="p-8 border-b border-ocl-primary/5 bg-ocl-primary/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-ocl-primary">Intervalos & Pausas</h3>
                  <p className="text-[9px] font-bold text-brand-text/30 uppercase tracking-widest">{currentOpForBreak.name || currentOpForBreak.email}</p>
                </div>
                <button onClick={() => setShowBreakModal(false)} className="p-3 hover:bg-brand-danger/10 text-brand-text/20 hover:text-brand-danger rounded-2xl transition-all">
                  Sair
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
                {/* List of Breaks */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-text/30 flex items-center gap-2">
                    <Coffee className="w-3.5 h-3.5 text-brand-accent" />
                    Pausas Ativas
                  </h4>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {currentOpForBreak.operator_breaks?.length === 0 ? (
                       <div className="p-6 border-2 border-dashed border-ocl-primary/5 rounded-2xl text-center italic text-brand-text/20 text-[10px]">
                         Nenhuma pausa configurada
                       </div>
                    ) : (
                      currentOpForBreak.operator_breaks?.map(b => (
                        <div key={b.id} className="flex items-center justify-between p-5 bg-brand-bg/30 rounded-2xl border border-ocl-primary/5 hover:border-brand-accent/20 transition-all group">
                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-ocl-primary/5 shadow-sm">
                              <Clock className="w-3.5 h-3.5 text-brand-accent" />
                              <span className="text-xs font-black text-ocl-primary">{b.start_time} - {b.end_time}</span>
                            </div>
                            <span className="text-[10px] font-black uppercase text-brand-text/40 tracking-wider">
                              {b.specific_date ? new Date(b.specific_date).toLocaleDateString('pt-BR') : `Toda ${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][b.day_of_week || 0]}`}
                            </span>
                          </div>
                          <button 
                            onClick={() => handleDeleteBreak(b.id)}
                            className="p-2.5 text-brand-danger/40 hover:text-brand-danger hover:bg-brand-danger/10 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Form to Add Break */}
                <div className="p-6 bg-ocl-primary/[0.02] rounded-[1.5rem] border border-ocl-primary/5 space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-ocl-primary">Adicionar Novo Intervalo</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                     <div>
                       <label className="text-[9px] font-black uppercase text-brand-text/30 mb-2 block">Início</label>
                       <PremiumTimePicker 
                        value={newBreakForm.start}
                        onChange={v => setNewBreakForm({...newBreakForm, start: v})}
                       />
                     </div>
                     <div>
                       <label className="text-[9px] font-black uppercase text-brand-text/30 mb-2 block">Fim</label>
                       <PremiumTimePicker 
                        value={newBreakForm.end}
                        onChange={v => setNewBreakForm({...newBreakForm, end: v})}
                       />
                     </div>
                     <div className="md:col-span-2">
                       <label className="text-[9px] font-black uppercase text-brand-text/30 mb-2 block">Dia da Semana (Recorrente)</label>
                       <PremiumSelect
                        value={newBreakForm.day}
                        onChange={v => setNewBreakForm({...newBreakForm, day: v})}
                        options={[
                          { value: '', label: 'Não recorrente' },
                          { value: '1', label: 'Segunda-feira' },
                          { value: '2', label: 'Terça-feira' },
                          { value: '3', label: 'Quarta-feira' },
                          { value: '4', label: 'Quinta-feira' },
                          { value: '5', label: 'Sexta-feira' },
                          { value: '6', label: 'Sábado' },
                        ]}
                        placeholder="Selecione a recorrência"
                        icon={<RotateCcw className="w-4 h-4" />}
                       />
                     </div>
                  </div>
                  <button 
                    onClick={handleAddBreak}
                    className="w-full py-3 bg-ocl-primary text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-ocl-primary/10 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                    disabled={!newBreakForm.start || !newBreakForm.end}
                  >
                    Salvar Intervalo
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PosAtendimento;
