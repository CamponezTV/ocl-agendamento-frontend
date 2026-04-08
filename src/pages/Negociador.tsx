import { useAppointments } from '../hooks/useAppointments';
import { Calendar, Clock, User, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const Negociador = () => {
  const { createAppointment } = useAppointments();

  const handleBooking = async () => {
    try {
      const mockAppointment = {
        contract: 'CTR-' + Math.floor(Math.random() * 1000000),
        phone: '119' + Math.floor(Math.random() * 100000000),
        responsible_type: 'Titular',
        responsible_name: 'Cliente Simulado',
        agreed_values: '1.500,00',
        appointment_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        operador_id: null,
        slot_id: null,
        status: 'Pendente'
      };
      
      await createAppointment(mockAppointment);
      alert('Agendamento realizado com sucesso!');
    } catch (err: any) {
      console.error('Error during booking simulation:', err);
      alert('Erro ao agendar: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-zinc-950 text-white">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <header className="mb-12">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Calendar className="w-10 h-10 text-ocl-accent" />
            Área do <span className="text-ocl-accent">Negociador</span>
          </h1>
          <p className="text-zinc-400">Gerencie e realize novos agendamentos com facilidade.</p>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="ocl-card p-8"
          >
            <div className="w-12 h-12 rounded-full bg-ocl-primary/20 flex items-center justify-center mb-6">
              <Clock className="w-6 h-6 text-ocl-accent" />
            </div>
            <h2 className="text-2xl font-semibold mb-4">Simular Agendamento</h2>
            <p className="text-zinc-400 mb-8 leading-relaxed">
              Realize um agendamento rápido utilizando dados simulados para validar o fluxo do sistema. 
              Respeitamos a regra de antecedência mínima de 2 dias (D+2).
            </p>
            <button 
              onClick={handleBooking}
              className="ocl-button w-full flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Agendar Agora
            </button>
          </motion.div>

          <div className="ocl-card p-8 space-y-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <User className="w-6 h-6 text-zinc-400" />
              Dados do Próximo Cliente
            </h2>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-800">
                <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Contrato</p>
                <p className="text-lg font-mono">CTR-778899</p>
              </div>
              <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-800">
                <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Status do Lead</p>
                <p className="text-lg font-semibold text-emerald-400">Qualificado</p>
              </div>
              <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-800 animate-pulse">
                <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Carregando detalhes...</p>
                <div className="h-6 w-3/4 bg-zinc-700/50 rounded mt-1" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Negociador;
