import { useState, useRef, useEffect } from 'react';
import { Clock, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  value: string; // HH:mm
  onChange: (time: string) => void;
  placeholder?: string;
  className?: string;
}

export const PremiumTimePicker = ({ value, onChange, placeholder = '00:00', className = '' }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minuteScrollRef = useRef<HTMLDivElement>(null);

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  const [selectedHour, setSelectedHour] = useState(value ? value.split(':')[0] : '08');
  const [selectedMinute, setSelectedMinute] = useState(value ? value.split(':')[1] : '00');

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      setSelectedHour(h);
      setSelectedMinute(m);
    }
  }, [value]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-scroll to selected values when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const hourEl = hourScrollRef.current?.querySelector(`[data-hour="${selectedHour}"]`);
        const minuteEl = minuteScrollRef.current?.querySelector(`[data-minute="${selectedMinute}"]`);
        
        hourEl?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        minuteEl?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 100);
    }
  }, [isOpen]);

  const handleSelect = (h: string, m: string) => {
    onChange(`${h}:${m}`);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 w-full bg-white/40 backdrop-blur-md border border-ocl-primary/10 rounded-2xl px-4 py-3 cursor-pointer hover:bg-white/60 transition-all group shadow-sm"
      >
        <Clock className={`w-4 h-4 transition-colors ${isOpen ? 'text-brand-accent' : 'text-brand-text/30'}`} />
        <span className={`text-xs font-bold flex-1 ${value ? 'text-ocl-primary' : 'text-brand-text/30'}`}>
          {value || placeholder}
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
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 5, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            style={{ zIndex: 1000 }}
            className="absolute top-full left-0 mt-2 w-56 bg-white border border-ocl-primary/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden origin-top"
          >
            <div className="flex h-72 relative">
              {/* Gradient Masks */}
              <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />

              {/* Hours Column */}
              <div 
                ref={hourScrollRef}
                className="flex-1 overflow-y-auto no-scrollbar py-12 px-2 border-r border-ocl-primary/5 select-none"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <div className="text-[8px] font-black uppercase text-brand-text/20 text-center mb-4 tracking-widest">Hora</div>
                {hours.map(h => {
                  const isSelected = selectedHour === h;
                  return (
                    <button
                      key={h}
                      data-hour={h}
                      onClick={() => { setSelectedHour(h); handleSelect(h, selectedMinute); }}
                      className={`
                        w-full py-3 rounded-xl text-xs font-black transition-all mb-1
                        ${isSelected 
                          ? 'bg-ocl-primary text-white shadow-lg scale-110' 
                          : 'hover:bg-ocl-primary/5 text-ocl-primary/30 hover:text-ocl-primary'}
                      `}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>

              {/* Minutes Column */}
              <div 
                ref={minuteScrollRef}
                className="flex-1 overflow-y-auto no-scrollbar py-12 px-2 select-none"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <div className="text-[8px] font-black uppercase text-brand-text/20 text-center mb-4 tracking-widest">Min</div>
                {minutes.map(m => {
                  const isSelected = selectedMinute === m;
                  return (
                    <button
                      key={m}
                      data-minute={m}
                      onClick={() => { setSelectedMinute(m); handleSelect(selectedHour, m); }}
                      className={`
                        w-full py-3 rounded-xl text-xs font-black transition-all mb-1
                        ${isSelected 
                          ? 'bg-brand-accent text-white shadow-lg scale-110' 
                          : 'hover:bg-ocl-primary/5 text-ocl-primary/30 hover:text-ocl-primary'}
                      `}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="p-4 bg-ocl-primary/[0.02] border-t border-ocl-primary/5">
              <button 
                onClick={() => setIsOpen(false)}
                className="w-full py-3.5 bg-ocl-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-ocl-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Confirmar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
