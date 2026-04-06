import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
  isClearable?: boolean;
}

export const PremiumSelect = ({ 
  value, 
  onChange, 
  options, 
  placeholder = 'Selecione...', 
  icon,
  className = '',
  isClearable = true
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 w-full bg-white/40 backdrop-blur-md border border-ocl-primary/10 rounded-2xl px-4 py-3 cursor-pointer hover:bg-white/60 transition-all group"
      >
        {icon && (
          <div className={`transition-colors ${isOpen ? 'text-brand-accent' : 'text-brand-text/30'}`}>
            {icon}
          </div>
        )}
        <span className={`text-xs font-bold flex-1 ${value ? 'text-ocl-primary' : 'text-brand-text/30'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        
        {value && isClearable && (
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(''); setIsOpen(false); }}
            className="p-1 hover:bg-brand-bg rounded-lg text-brand-text/20 hover:text-brand-danger transition-all opacity-0 group-hover:opacity-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-accent' : 'text-brand-text/20'}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 5, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            style={{ zIndex: 1000 }}
            className="absolute top-full left-0 mt-2 w-full min-w-[220px] bg-white border border-ocl-primary/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden origin-top"
          >
            <div className="max-h-64 overflow-y-auto custom-scrollbar p-2">
              {options.length === 0 ? (
                <div className="p-4 text-center text-xs font-bold text-brand-text/30 italic">Nenhuma opção.</div>
              ) : (
                options.map(option => {
                  const isSelected = value === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => { onChange(option.value); setIsOpen(false); }}
                      className={`
                        w-full text-left px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-between
                        ${isSelected 
                          ? 'bg-ocl-primary text-white shadow-lg' 
                          : 'hover:bg-ocl-primary/5 text-ocl-primary/60 hover:text-ocl-primary'}
                      `}
                    >
                      {option.label}
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
