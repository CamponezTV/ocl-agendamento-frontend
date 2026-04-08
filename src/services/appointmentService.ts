const API_URL = 'http://localhost:3000';

export interface Appointment {
  id: string;
  contract: string;
  phone: string;
  status: string;
  operador_id?: string | null;
  responsible_type: string;
  responsible_name: string;
  agreed_values: string;
  appointment_date: string;
  slot_id?: string | null;
  created_at?: string;
}

export const appointmentService = {
  async fetchAvailableSlots() {
    const response = await fetch(`${API_URL}/agenda`);
    if (!response.ok) throw new Error('Erro ao buscar agenda');
    const data = await response.json();
    return data;
  },

  async saveAppointment(data: Partial<Appointment>) {
    const response = await fetch(`${API_URL}/agendamento`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details?.[0] || errorData.error || 'Erro ao salvar agendamento');
    }
    return response.json();
  },

  async updateAppointmentStatus(id: string, status: string) {
    const response = await fetch(`${API_URL}/status/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao atualizar status');
    }
    return response.json();
  },

  async fetchAllAppointments() {
    const response = await fetch(`${API_URL}/agenda`);
    if (!response.ok) throw new Error('Erro ao buscar agendamentos');
    return response.json();
  },

  async deleteAppointment(id: string) {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao excluir agendamento');
    }
    return response.json();
  }
};
