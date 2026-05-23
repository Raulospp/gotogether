import { api } from '@/services/authService';

export interface Notificacion {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  solicitud_id: number | null;
  created_at: string;
}

export const notificacionService = {
  async getMisNotificaciones(): Promise<Notificacion[]> {
    const res = await api.get('/api/notificaciones');
    return res.data;
  },

  async getNoLeidasCount(): Promise<number> {
    const res = await api.get('/api/notificaciones/no-leidas-count');
    return res.data.count ?? 0;
  },

  async marcarLeida(id: number): Promise<void> {
    await api.patch(`/api/notificaciones/${id}/leer`);
  },

  async marcarTodasLeidas(): Promise<void> {
    await api.patch('/api/notificaciones/leer-todas');
  },

  async eliminarNotificacion(id: number): Promise<void> {
    await api.delete(`/api/notificaciones/${id}`);
  },

  async eliminarTodas(): Promise<void> {
    await api.delete('/api/notificaciones');
  },
};
