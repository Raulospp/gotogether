import { defineStore } from 'pinia';
import { ref } from 'vue';
import { notificacionService, type Notificacion } from '@/services/notificacionService';

export const useNotificacionStore = defineStore('notificacion', () => {
  // ── Estado ─────────────────────────────────────────────────────────────────
  const noLeidasCount = ref(0);
  const notificaciones = ref<Notificacion[]>([]);
  const cargando = ref(false);

  let _poll: ReturnType<typeof setInterval> | null = null;

  // ── Acciones ───────────────────────────────────────────────────────────────

  async function fetchCount() {
    try {
      noLeidasCount.value = await notificacionService.getNoLeidasCount();
    } catch (_) { /* silencioso */ }
  }

  async function fetchNotificaciones() {
    cargando.value = true;
    try {
      notificaciones.value = await notificacionService.getMisNotificaciones();
      noLeidasCount.value = notificaciones.value.filter(n => !n.leida).length;
    } catch (e) {
      console.error('[Notificaciones] Error al cargar:', e);
    } finally {
      cargando.value = false;
    }
  }

  async function marcarLeida(id: number) {
    try {
      await notificacionService.marcarLeida(id);
      const n = notificaciones.value.find(n => n.id === id);
      if (n && !n.leida) {
        n.leida = true;
        noLeidasCount.value = Math.max(0, noLeidasCount.value - 1);
      }
    } catch (_) {}
  }

  async function marcarTodasLeidas() {
    try {
      await notificacionService.marcarTodasLeidas();
      notificaciones.value.forEach(n => (n.leida = true));
      noLeidasCount.value = 0;
    } catch (_) {}
  }

  async function eliminarNotificacion(id: number) {
    try {
      await notificacionService.eliminarNotificacion(id);
      const idx = notificaciones.value.findIndex(n => n.id === id);
      if (idx !== -1) {
        const eraNoLeida = !notificaciones.value[idx].leida;
        notificaciones.value.splice(idx, 1);
        if (eraNoLeida) noLeidasCount.value = Math.max(0, noLeidasCount.value - 1);
      }
    } catch (_) {}
  }

  async function eliminarTodas() {
    try {
      await notificacionService.eliminarTodas();
      notificaciones.value = [];
      noLeidasCount.value = 0;
    } catch (_) {}
  }

  // ── Polling ────────────────────────────────────────────────────────────────

  function startPolling(ms = 30_000) {
    stopPolling();
    fetchCount();
    _poll = setInterval(fetchCount, ms);
  }

  function stopPolling() {
    if (_poll) { clearInterval(_poll); _poll = null; }
  }

  return {
    noLeidasCount, notificaciones, cargando,
    fetchCount, fetchNotificaciones,
    marcarLeida, marcarTodasLeidas,
    eliminarNotificacion, eliminarTodas,
    startPolling, stopPolling,
  };
});
