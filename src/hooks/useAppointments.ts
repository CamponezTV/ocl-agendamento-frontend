import { useState, useEffect } from 'react';
import { appointmentService } from '../services/appointmentService';
import type { Appointment } from '../services/appointmentService';
import { getVisitorId } from '../utils/visitorId';

export const useAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const visitorId = getVisitorId();
      const data = await appointmentService.fetchAppointments({ session_id: visitorId });
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

  const deleteAppointment = async (id: string) => {
    try {
      await appointmentService.deleteAppointment(id);
      setAppointments((prev) => prev.filter((app) => app.id !== id));
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
    deleteAppointment,
    refreshAppointments: fetchAppointments
  };
};
