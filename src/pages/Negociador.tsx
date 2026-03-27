import { useAppointments } from '../hooks/useAppointments';
import { Calendar, Clock, User } from 'lucide-react';

const Negociador = () => {
  const { createAppointment } = useAppointments();

  const handleBooking = async () => {
    try {
      // Mock data for simulation with valid UUID formats
      const mockAppointment = {
        contract: 'CTR-123456',
        phone: '11988776655',
        responsible_type: 'Titular',
        responsible_name: 'Arthur Mock Client',
        agreed_values: 'R$ 1.500,00',
        appointment_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // D+2
        operador_id: null, // Set to null for simulation to avoid FK errors
        slot_id: null, // Set to null for simulation to avoid FK errors
        status: 'Pendente'
      };
      
      await createAppointment(mockAppointment);
      alert('Agendamento realizado com sucesso!');
    } catch (err: any) {
      console.error('Error during booking simulation:', err);
      const errorMsg = err.message || 'Erro ao agendar.';
      alert('v2: ' + errorMsg);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 flex items-center gap-3">
          <Calendar className="w-10 h-10 text-blue-500" />
          Área do Negociador
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 transition-all">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-zinc-400" />
              Horários Disponíveis
            </h2>
            <p className="text-zinc-500 mb-6">Selecione um horário para agendar o atendimento (D+2).</p>
            <button 
              onClick={handleBooking}
              className="w-full py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 font-medium transition-colors"
            >
              Simular Agendamento (20 min)
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-zinc-400" />
              Dados do Cliente
            </h2>
            <div className="space-y-4">
              <div className="h-10 bg-zinc-800 rounded-lg animate-pulse" />
              <div className="h-10 bg-zinc-800 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Negociador;
