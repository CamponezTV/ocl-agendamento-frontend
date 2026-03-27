import { useAppointments } from '../hooks/useAppointments';
import { ClipboardCheck, Search, Filter } from 'lucide-react';

const Gestao = () => {
  const { appointments, updateStatus } = useAppointments();

  return (
    <div className="min-h-screen p-8 bg-zinc-950 text-white">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 flex items-center gap-3">
          <ClipboardCheck className="w-10 h-10 text-emerald-500" />
          Pós-Atendimento (Gestão)
        </h1>

        <div className="flex gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Buscar agendamentos..." 
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <button className="px-6 py-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-2 hover:bg-zinc-800 transition-colors">
            <Filter className="w-5 h-5" />
            Filtros
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="p-4 font-semibold">Cliente</th>
                <th className="p-4 font-semibold">Horário</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-zinc-500">Nenhum agendamento encontrado.</td>
                </tr>
              ) : (
                appointments.map((app) => (
                  <tr key={app.id} className="border-b border-zinc-800 hover:bg-white/5 transition-colors">
                    <td className="p-4">Usuário {app.operador_id?.slice(0, 8) || 'Sem Operador'}</td>
                    <td className="p-4">{app.created_at ? new Date(app.created_at).toLocaleString() : 'Sem data'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                        app.status === 'Agendado' ? 'bg-blue-500/20 text-blue-500' : 
                        app.status === 'Pendente' ? 'bg-orange-500/20 text-orange-500' :
                        'bg-zinc-700 text-zinc-300'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <button 
                        onClick={() => updateStatus(app.id, 'Finalizado')}
                        className="text-sm font-medium text-emerald-500 hover:underline"
                      >
                        Finalizar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Gestao;
