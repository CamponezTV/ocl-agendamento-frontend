import { useState, useEffect } from 'react';
import { appointmentService } from '../services/appointmentService';
import type { Appointment } from '../services/appointmentService';
import { supabase } from '../api/supabase';

export const useAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('appointments')
        .select('*');
      
      if (fetchError) throw fetchError;
      setAppointments(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createAppointment = async (appointmentData: Partial<Appointment>) => {
    try {
      const newAppointment = await appointmentService.saveAppointment(appointmentData);
      setAppointments((prev) => [...prev, newAppointment]);
      return newAppointment;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const updated = await appointmentService.updateAppointmentStatus(id, status);
      setAppointments((prev) =>
        prev.map((app) => (app.id === id ? updated : app))
      );
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  return {
    appointments,
    loading,
    error,
    createAppointment,
    updateStatus,
    refreshAppointments: fetchAppointments
  };
};
