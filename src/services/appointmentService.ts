import { supabase } from '../api/supabase';

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
  async fetchAvailableSlots(date: string) {
    const { data, error } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('available', true)
      .gte('start_time', `${date}T00:00:00`)
      .lte('start_time', `${date}T23:59:59`);

    if (error) throw error;
    return data;
  },

  async saveAppointment(data: Partial<Appointment>) {
    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert([
        { 
          ...data, 
          status: data.status || 'Agendado'
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return appointment;
  },

  async updateAppointmentStatus(id: string, status: string) {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
