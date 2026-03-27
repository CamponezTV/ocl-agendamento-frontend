import { useAppointments } from '../hooks/useAppointments';
import { ClipboardCheck, Search, Filter, Loader2, User, Clock, CheckCircle, XCircle, AlertCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Gestao = () => {
  const { appointments, updateStatus, deleteAppointment, loading, error } = useAppointments();

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este agendamento?')) {
      try {
        await deleteAppointment(id);
      } catch (err: any) {
        alert('Erro ao excluir: ' + err.message);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Agendado': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Pendente': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'Finalizado': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Cancelado': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  const statusIcons: Record<string, any> = {
    'Agendado': Clock,
    'Pendente': AlertCircle,
    'Finalizado': CheckCircle,
    'Cancelado': XCircle,
  };

  return (
    <div className="min-h-screen p-8 bg-zinc-950 text-white">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <ClipboardCheck className="w-10 h-10 text-ocl-accent" />
              Gestão de <span className="text-ocl-accent">Agendamentos</span>
            </h1>
            <p className="text-zinc-500 mt-1">Acompanhe e gerencie todos os atendimentos da OCL.</p>
          </div>
          
          <div className="flex gap-3">
            <button className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-2 hover:bg-zinc-800 transition-all font-medium text-sm">
              <Filter className="w-4 h-4" />
              Filtrar
            </button>
          </div>
        </header>

        <div className="flex gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Pesquisar por cliente, contrato ou status..." 
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-ocl-accent/40 focus:ring-1 focus:ring-ocl-accent/20 transition-all"
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <div className="ocl-card overflow-hidden shadow-2xl shadow-black/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-ocl-primary/30 border-b border-zinc-800">
                  <th className="p-5 text-xs uppercase font-bold tracking-wider text-zinc-400">Cliente / Contrato</th>
                  <th className="p-5 text-xs uppercase font-bold tracking-wider text-zinc-400">Data e Horário</th>
                  <th className="p-5 text-xs uppercase font-bold tracking-wider text-zinc-400">Status</th>
                  <th className="p-5 text-xs uppercase font-bold tracking-wider text-zinc-400 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-ocl-accent animate-spin" />
                        <p className="text-zinc-500 font-medium tracking-wide">Carregando dados...</p>
                      </div>
                    </td>
                  </tr>
                ) : appointments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-20 text-center text-zinc-500">
                      Nenhum agendamento encontrado para os critérios selecionados.
                    </td>
                  </tr>
                ) : (
                  <AnimatePresence mode='popLayout'>
                    {appointments.map((app, index) => {
                      const Icon = statusIcons[app.status] || AlertCircle;
                      return (
                        <motion.tr 
                          key={app.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="p-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-ocl-primary/50 flex items-center justify-center text-ocl-accent font-bold">
                                <User className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-semibold text-zinc-100">{app.responsible_name}</p>
                                <p className="text-xs text-zinc-500 font-mono tracking-tighter">{app.contract}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-5">
                            <p className="text-zinc-300 font-medium">
                              {new Date(app.appointment_date).toLocaleDateString('pt-BR')}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {app.created_at ? new Date(app.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </p>
                          </td>
                          <td className="p-5">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(app.status)}`}>
                              <Icon className="w-3 h-3" />
                              {app.status}
                            </span>
                          </td>
                          <td className="p-5 text-right">
                            <div className="flex justify-end gap-2">
                              {app.status === 'Pendente' && (
                                <button 
                                  onClick={() => updateStatus(app.id, 'Agendado')}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-400 hover:text-ocl-accent transition-colors"
                                >
                                  Agendar
                                </button>
                              )}
                              <button 
                                onClick={() => updateStatus(app.id, 'Finalizado')}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-xs font-bold transition-all"
                              >
                                Finalizar
                              </button>
                              <button 
                                onClick={() => handleDelete(app.id)}
                                className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all ml-2"
                                title="Excluir Agendamento"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Gestao;
