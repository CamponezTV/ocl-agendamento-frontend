import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
}

export const PremiumDatePicker = ({ value, onChange, placeholder = 'Selecione uma data', className = '' }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value or use today
  const initialDate = value ? new Date(value + 'T12:00:00Z') : new Date();
  const [viewDate, setViewDate] = useState(initialDate);

  // Localized names
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const daysShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format YYYY-MM-DD to DD/MM/AAAA for display
  const formatDisplay = (val: string) => {
    if (!val) return '';
    const [year, month, day] = val.split('-');
    return `${day}/${month}/${year}`;
  };

  // Calendar logic
  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(viewDate.getMonth(), viewDate.getFullYear());
  const firstDay = getFirstDayOfMonth(viewDate.getMonth(), viewDate.getFullYear());

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 w-full bg-white/40 backdrop-blur-md border border-ocl-primary/10 rounded-2xl px-4 py-3 cursor-pointer hover:bg-white/60 transition-all group"
      >
        <CalendarIcon className={`w-4 h-4 transition-colors ${isOpen ? 'text-brand-accent' : 'text-brand-text/30'}`} />
        <span className={`text-xs font-bold flex-1 ${value ? 'text-ocl-primary' : 'text-brand-text/30'}`}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        {value && (
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            className="p-1 hover:bg-brand-bg rounded-lg text-brand-text/20 hover:text-brand-danger transition-all opacity-0 group-hover:opacity-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 5, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            style={{ zIndex: 1000 }}
            className="absolute top-full left-0 mt-2 w-72 bg-white border border-ocl-primary/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-4 origin-top"
          >
            <div className="flex items-center justify-between mb-4 px-1">
              <button 
                onClick={handlePrevMonth}
                className="p-2 hover:bg-ocl-primary/5 rounded-xl text-ocl-primary/60 hover:text-ocl-primary transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="text-center">
                <span className="text-xs font-black uppercase tracking-widest text-ocl-primary">
                  {months[viewDate.getMonth()]}
                </span>
                <span className="text-[10px] font-black opacity-30 block -mt-1">
                  {viewDate.getFullYear()}
                </span>
              </div>

              <button 
                onClick={handleNextMonth}
                className="p-2 hover:bg-ocl-primary/5 rounded-xl text-ocl-primary/60 hover:text-ocl-primary transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {daysShort.map(d => (
                <div key={d} className="text-[8px] font-black uppercase text-brand-text/30 text-center py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {emptyDays.map(i => <div key={`empty-${i}`} />)}
              {days.map(day => {
                const isSelected = value === `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = new Date().toDateString() === new Date(viewDate.getFullYear(), viewDate.getMonth(), day).toDateString();

                return (
                  <button
                    key={day}
                    onClick={() => handleSelectDay(day)}
                    className={`
                      aspect-square rounded-xl text-[10px] font-black transition-all flex items-center justify-center relative
                      ${isSelected 
                        ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20 scale-110' 
                        : 'hover:bg-ocl-primary hover:text-white text-ocl-primary/60'}
                    `}
                  >
                    {day}
                    {isToday && !isSelected && (
                      <div className="absolute bottom-1 w-1 h-1 bg-brand-accent rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
};
