import { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X, FileText, Phone, User, DollarSign, AlertCircle, Loader2 } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useAuth } from '../contexts/AuthContext';

export interface BookingFormData {
  contract: string;
  phone: string;
  responsible_type: 'Titular' | 'Terceiro';
  responsible_name: string;
  recovery_name: string;
  agreed_values: string;
  negociador_id?: string;
}

interface BookingFormModalProps {
  isOpen: boolean;
  selectedDate: string;
  selectedSlot: { time: string; operatorName: string } | null;
  onClose: () => void;
  onConfirm: (data: BookingFormData) => Promise<void>;
}

interface FieldError {
  contract?: string;
  phone?: string;
  responsible_type?: string;
  responsible_name?: string;
  recovery_name?: string;
  agreed_values?: string;
}

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const formatContract = (value: string) => {
  return value.replace(/\D/g, '').slice(0, 11); // Somente números e no máximo 11 dígitos
};

export const BookingFormModal = ({ isOpen, selectedDate, selectedSlot, onClose, onConfirm }: BookingFormModalProps) => {
  useBodyScrollLock(isOpen);
  const { profile } = useAuth();
  const [form, setForm] = useState<BookingFormData>({
    contract: '',
    phone: '',
    responsible_type: 'Titular',
    responsible_name: '',
    recovery_name: '',
    agreed_values: '',
  });
  const [errors, setErrors] = useState<FieldError>({});
  const [loading, setLoading] = useState(false);
  const [fixsiUsers, setFixsiUsers] = useState<string[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Carregar usuários da Fixsi
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsFetchingUsers(true);
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL.replace('/admin', '')}/fixsi-users`);
        if (response.ok) {
          const data = await response.json();
          if (data.users && Array.isArray(data.users)) {
            setFixsiUsers(data.users);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar usuários da Fixsi:', err);
      } finally {
        setIsFetchingUsers(false);
      }
    };
    if (isOpen) fetchUsers();
  }, [isOpen]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrar usuários conforme digita
  useEffect(() => {
    if (form.recovery_name.trim() === '') {
      setFilteredUsers([]);
      return;
    }
    const filtered = fixsiUsers.filter(user => 
      user.toLowerCase().includes(form.recovery_name.toLowerCase())
    ).slice(0, 10); // Mostrar apenas os 10 primeiros para manter a performance
    setFilteredUsers(filtered);
  }, [form.recovery_name, fixsiUsers]);

  const validate = (): boolean => {
    const newErrors: FieldError = {};

    if (form.contract.length !== 11) newErrors.contract = 'Contrato deve ter 11 dígitos.';
    
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (phoneDigits.length !== 11) newErrors.phone = 'Telefone deve ter 11 dígitos.';

    if (!form.responsible_type) newErrors.responsible_type = 'Tipo de responsável é obrigatório.';

    if (form.responsible_type === 'Terceiro' && !form.responsible_name.trim()) {
      newErrors.responsible_name = 'Nome do responsável é obrigatório para Terceiro.';
    }

    if (!form.recovery_name.trim()) {
      newErrors.recovery_name = 'Nome do recuperador é obrigatório.';
    } else if (fixsiUsers.length > 0 && !fixsiUsers.includes(form.recovery_name)) {
      newErrors.recovery_name = 'Por favor, selecione um recuperador válido na lista.';
    }

    if (!form.agreed_values.trim()) newErrors.agreed_values = 'Valores acordados são obrigatórios.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const dataToSubmit: BookingFormData = {
        ...form,
        responsible_name: form.responsible_type === 'Titular'
          ? ('Titular' as string)
          : form.responsible_name,
        phone: form.phone.replace(/\D/g, ''),
        negociador_id: profile?.id,
      };
      await onConfirm(dataToSubmit);
      setForm({ contract: '', phone: '', responsible_type: 'Titular', responsible_name: '', recovery_name: '', agreed_values: '' });
      setErrors({});
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setForm({ contract: '', phone: '', responsible_type: 'Titular', responsible_name: '', recovery_name: '', agreed_values: '' });
    setErrors({});
    onClose();
  };

  const formattedDate = selectedDate
    ? new Date(selectedDate + 'T12:00:00Z').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
    : '';

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-ocl-dark/80 backdrop-blur-md z-[8000] flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <m.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="h-1.5 w-full bg-gradient-to-r from-ocl-primary via-brand-accent to-ocl-primary shrink-0" />

            <div className="flex items-start justify-between p-8 pb-0 shrink-0">
              <div>
                <h2 className="text-2xl font-black text-ocl-primary tracking-tight">Dados do Agendamento</h2>
                <p className="text-xs text-brand-text/40 font-medium mt-1">Preencha as informações para confirmar</p>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="p-2 rounded-xl text-brand-text/30 hover:text-brand-danger hover:bg-brand-danger/10 transition-all disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {selectedSlot && (
                <div className="mx-8 mt-5 p-4 rounded-2xl bg-ocl-primary/5 border border-ocl-primary/10 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/30 mb-0.5">Horário Selecionado</p>
                    <p className="text-lg font-black text-ocl-primary">{selectedSlot.time} <span className="text-sm font-bold text-brand-text/50">— {formattedDate}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/30 mb-0.5">Pós-atendente</p>
                    <p className="text-sm font-bold text-brand-accent">{selectedSlot.operatorName}</p>
                  </div>
                </div>
              )}

              <div className="p-8 space-y-5">

                <div>
                  <label className="text-[10px] font-black text-brand-text/40 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <FileText className="w-3 h-3" /> Número do Contrato
                  </label>
                  <input
                    id="booking-contract"
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    value={form.contract}
                    onChange={e => { setForm(f => ({ ...f, contract: formatContract(e.target.value) })); setErrors(er => ({ ...er, contract: undefined })); }}
                    placeholder="Contrato (11 dígitos)"
                    className={`w-full bg-brand-bg border rounded-2xl px-5 py-3.5 text-sm font-bold text-ocl-primary placeholder:font-normal placeholder:text-brand-text/30 focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent outline-none transition-all ${errors.contract ? 'border-brand-danger' : 'border-ocl-primary/10'}`}
                  />
                  {errors.contract && (
                    <p className="text-brand-danger text-[10px] font-bold mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.contract}</p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-black text-brand-text/40 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <Phone className="w-3 h-3" /> Telefone (com DDD)
                  </label>
                  <input
                    id="booking-phone"
                    type="tel"
                    value={form.phone}
                    onChange={e => { setForm(f => ({ ...f, phone: formatPhone(e.target.value) })); setErrors(er => ({ ...er, phone: undefined })); }}
                    placeholder="(11) 99999-9999"
                    className={`w-full bg-brand-bg border rounded-2xl px-5 py-3.5 text-sm font-bold text-ocl-primary placeholder:font-normal placeholder:text-brand-text/30 focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent outline-none transition-all ${errors.phone ? 'border-brand-danger' : 'border-ocl-primary/10'}`}
                  />
                  {errors.phone && (
                    <p className="text-brand-danger text-[10px] font-bold mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.phone}</p>
                  )}
                </div>

                <div className="relative" ref={dropdownRef}>
                  <label className="text-[10px] font-black text-brand-text/40 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <User className="w-3 h-3" /> Nome do Recuperador
                  </label>
                  <div className="relative group">
                    <input
                      id="booking-recovery-name"
                      type="text"
                      autoComplete="off"
                      value={form.recovery_name}
                      onFocus={() => setShowDropdown(true)}
                      onChange={e => { 
                        setForm(f => ({ ...f, recovery_name: e.target.value })); 
                        setErrors(er => ({ ...er, recovery_name: undefined }));
                        setShowDropdown(true);
                      }}
                      placeholder="Pesquise o nome do recuperador..."
                      className={`w-full bg-brand-bg border rounded-2xl px-5 py-3.5 text-sm font-bold text-ocl-primary placeholder:font-normal placeholder:text-brand-text/30 focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent outline-none transition-all ${errors.recovery_name ? 'border-brand-danger' : 'border-ocl-primary/10'}`}
                    />
                    {isFetchingUsers && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 text-brand-accent animate-spin" />
                      </div>
                    )}
                  </div>

                  <AnimatePresence>
                    {showDropdown && filteredUsers.length > 0 && (
                      <m.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 5, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute z-[100] w-full left-0 bg-white/80 backdrop-blur-xl border border-ocl-primary/10 rounded-2xl shadow-2xl shadow-ocl-primary/20 overflow-hidden max-h-[250px] overflow-y-auto custom-scrollbar"
                      >
                        <div className="p-2 space-y-1">
                          {filteredUsers.map((user, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setForm(f => ({ ...f, recovery_name: user }));
                                setShowDropdown(false);
                              }}
                              className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold text-ocl-primary hover:bg-ocl-primary hover:text-white transition-all flex items-center gap-3 group/item"
                            >
                              <div className="w-8 h-8 rounded-full bg-ocl-primary/5 flex items-center justify-center text-[10px] group-hover/item:bg-white/20">
                                {user.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                              </div>
                              {user}
                            </button>
                          ))}
                        </div>
                      </m.div>
                    )}
                  </AnimatePresence>

                  {errors.recovery_name && (
                    <p className="text-brand-danger text-[10px] font-bold mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.recovery_name}</p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-black text-brand-text/40 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <User className="w-3 h-3" /> Tipo de Responsável
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['Titular', 'Terceiro'] as const).map(type => (
                      <button
                        key={type}
                        id={`booking-type-${type.toLowerCase()}`}
                        type="button"
                        onClick={() => { setForm(f => ({ ...f, responsible_type: type, responsible_name: '' })); setErrors(er => ({ ...er, responsible_type: undefined, responsible_name: undefined })); }}
                        className={`py-3 rounded-2xl border text-sm font-black transition-all ${
                          form.responsible_type === type
                            ? 'bg-ocl-primary text-white border-ocl-primary shadow-lg shadow-ocl-primary/20'
                            : 'bg-brand-bg border-ocl-primary/10 text-brand-text/50 hover:border-brand-accent/30 hover:text-ocl-primary'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  {errors.responsible_type && (
                    <p className="text-brand-danger text-[10px] font-bold mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.responsible_type}</p>
                  )}
                </div>

                <AnimatePresence>
                  {form.responsible_type === 'Terceiro' && (
                    <m.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <label className="text-[10px] font-black text-brand-text/40 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                        <User className="w-3 h-3" /> Nome do Terceiro
                      </label>
                      <input
                        id="booking-responsible-name"
                        type="text"
                        value={form.responsible_name}
                        onChange={e => { setForm(f => ({ ...f, responsible_name: e.target.value })); setErrors(er => ({ ...er, responsible_name: undefined })); }}
                        placeholder="Nome completo do terceiro"
                        className={`w-full bg-brand-bg border rounded-2xl px-5 py-3.5 text-sm font-bold text-ocl-primary placeholder:font-normal placeholder:text-brand-text/30 focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent outline-none transition-all ${errors.responsible_name ? 'border-brand-danger' : 'border-brand-accent/30'}`}
                      />
                      {errors.responsible_name && (
                        <p className="text-brand-danger text-[10px] font-bold mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.responsible_name}</p>
                      )}
                    </m.div>
                  )}
                </AnimatePresence>

                <div>
                  <label className="text-[10px] font-black text-brand-text/40 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <DollarSign className="w-3 h-3" /> Valores Acordados
                  </label>
                  <div className="relative">
                    <input
                      id="booking-values"
                      type="text"
                      value={form.agreed_values}
                      onChange={e => { setForm(f => ({ ...f, agreed_values: e.target.value })); setErrors(er => ({ ...er, agreed_values: undefined })); }}
                      placeholder="Ex: R$ 199,18 de entrada + 30x de R$ 1.730,24"
                      className={`w-full bg-brand-bg border rounded-2xl px-5 py-3.5 text-sm font-bold text-ocl-primary placeholder:font-normal placeholder:text-brand-text/30 focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent outline-none transition-all ${errors.agreed_values ? 'border-brand-danger' : 'border-ocl-primary/10'}`}
                    />
                  </div>
                  {errors.agreed_values && (
                    <p className="text-brand-danger text-[10px] font-bold mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.agreed_values}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleClose}
                    disabled={loading}
                    className="flex-1 py-4 border border-ocl-primary/10 rounded-2xl font-black text-xs uppercase tracking-widest text-brand-text/40 hover:bg-brand-bg hover:border-brand-text/20 transition-all disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    id="booking-submit"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 py-4 bg-brand-accent text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:scale-100"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Confirmando...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                         Confirmar Agendamento
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
};
