import { authFetch } from './apiClient';

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/admin`;

export interface OperatorSchedule {
  id: string;
  operador_id: string;
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface OperatorBreak {
  id: string;
  operador_id: string;
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string;
  end_time: string;
}

export interface Operator {
  id: string;
  email: string;
  name: string | null;
  role: string;
  operator_schedules: OperatorSchedule[];
  operator_breaks: OperatorBreak[];
}

export const operatorService = {
  async fetchOperators(): Promise<Operator[]> {
    const response = await authFetch(`${API_URL}/operadores`);
    if (!response.ok) throw new Error('Erro ao buscar operadores');
    return response.json();
  },

  async updateOperator(id: string, data: { email: string; name: string }) {
    const response = await authFetch(`${API_URL}/operadores/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Erro ao atualizar atendente');
    return response.json();
  },

  async toggleAllSchedules(id: string, is_active: boolean) {
    const response = await authFetch(`${API_URL}/operadores/${id}/toggle-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active }),
    });
    if (!response.ok) throw new Error('Erro ao atualizar escalas');
    return response.json();
  },

  async updateSchedule(data: Partial<OperatorSchedule>) {
    const response = await authFetch(`${API_URL}/operadores/escala`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Erro ao atualizar escala');
    return response.json();
  },

  async deleteSchedule(id: string) {
    const response = await authFetch(`${API_URL}/operadores/escala/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Erro ao remover horário');
    return response.json();
  },

  async batchUpdateSchedules(changes: any[]) {
    const response = await authFetch(`${API_URL}/operadores/escala/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changes }),
    });
    if (!response.ok) throw new Error('Erro ao salvar lote de horários');
    return response.json();
  },

  async createOverride(data: Partial<OperatorSchedule>) {
    const response = await authFetch(`${API_URL}/operadores/escala`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Erro ao criar exceção');
    return response.json();
  },

  async createOperator(email: string, name: string): Promise<Operator> {
    const response = await authFetch(`${API_URL}/operadores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name }),
    });
    if (!response.ok) throw new Error('Erro ao criar atendente');
    return response.json();
  },
  
  async deleteOperator(id: string) {
    const response = await authFetch(`${API_URL}/operadores/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Erro ao excluir atendente');
    return response.json();
  },

  async updateBreak(data: Partial<OperatorBreak>) {
    const response = await authFetch(`${API_URL}/operadores/pausa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Erro ao atualizar intervalo');
    return response.json();
  },

  async deleteBreak(id: string) {
    const response = await authFetch(`${API_URL}/operadores/pausa/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Erro ao remover intervalo');
    return response.json();
  }
};
