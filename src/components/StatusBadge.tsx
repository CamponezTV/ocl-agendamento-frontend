interface StatusBadgeProps {
  status: string;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Pendente':
        return {
          dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
          bg: 'bg-amber-50/80',
          text: 'text-amber-700',
          border: 'border-amber-200/50',
          label: 'Pendente'
        };
      case 'Em andamento':
        return {
          dot: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]',
          bg: 'bg-blue-50/80',
          text: 'text-blue-700',
          border: 'border-blue-200/50',
          label: 'Em andamento'
        };
      case 'Concluído':
        return {
          dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
          bg: 'bg-emerald-50/80',
          text: 'text-emerald-700',
          border: 'border-emerald-200/50',
          label: 'Concluído'
        };
      case 'Não realizado':
        return {
          dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]',
          bg: 'bg-rose-50/80',
          text: 'text-rose-700',
          border: 'border-rose-200/50',
          label: 'Não realizado'
        };
      case 'Não Tratado':
        return {
          dot: 'bg-slate-500 shadow-[0_0_8px_rgba(100,116,139,0.5)]',
          bg: 'bg-slate-50/80',
          text: 'text-slate-700',
          border: 'border-slate-200/50',
          label: 'Não Tratado'
        };
      default:
        return {
          dot: 'bg-slate-400',
          bg: 'bg-slate-50',
          text: 'text-slate-600',
          border: 'border-slate-200',
          label: status
        };
    }
  };

  const styles = getStatusStyles(status);

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border backdrop-blur-sm transition-all duration-300 ${styles.bg} ${styles.text} ${styles.border}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${styles.dot}`}></div>
      {styles.label}
    </span>
  );
};
