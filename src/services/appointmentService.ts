const API_URL = 'http://localhost:3000';

export interface Appointment {
  id: string;
  contract: string;
  phone: string;
  status: string;
  operador_id?: string | null;
  negociador_id?: string | null;
  responsible_type: string;
  responsible_name: string;
  recovery_name: string;
  agreed_values: string;
  appointment_date: string;
  slot_id?: string | null;
  created_at?: string;
  users?: {
    name: string;
    email: string;
  } | null;
  negociador?: {
    full_name: string;
    role: string;
  } | null;
}

export const appointmentService = {
  async fetchAvailability(date: string) {
    const response = await fetch(`${API_URL}/disponibilidade?date=${date}`);
    if (!response.ok) throw new Error('Erro ao buscar disponibilidade');
    return response.json();
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

  async fetchAppointments(filters?: {
    status?: string;
    negociador_id?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Appointment[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    const response = await fetch(`${API_URL}/appointments?${params.toString()}`);
    return response.json();
  },

  async fetchAllAppointments() {
    return this.fetchAppointments();
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
  },

  async rescheduleAppointment(id: string, appointment_date: string, operador_id?: string | null) {
    const response = await fetch(`${API_URL}/agendamento/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment_date, operador_id }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao reagendar agendamento');
    }
    return response.json();
  }
};
