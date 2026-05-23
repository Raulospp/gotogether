<template>
  <ion-page>
    <ion-content class="notif-content" :scroll-events="false">
      <div class="grain"></div>
      <div class="atm-glow"></div>

      <div class="screen">
        <!-- ── Header ──────────────────────────────────────────────────────── -->
        <div class="header">
          <div>
            <div class="brand">go<span>Together</span></div>
            <div class="titulo">Notificaciones</div>
          </div>
          <div class="header-actions">
            <button v-if="notificaciones.length" class="action-btn" title="Marcar todas leídas" @click="marcarTodas">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>
            <button v-if="notificaciones.length" class="action-btn danger" title="Limpiar historial" @click="showAlert = true">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- ── Skeleton ────────────────────────────────────────────────────── -->
        <div v-if="cargando" class="lista">
          <div v-for="i in 4" :key="i" class="notif-card skeleton">
            <div class="sk-icon"></div>
            <div class="sk-body">
              <div class="sk-line w55"></div>
              <div class="sk-line w80"></div>
              <div class="sk-line w30"></div>
            </div>
          </div>
        </div>

        <!-- ── Vacío ───────────────────────────────────────────────────────── -->
        <div v-else-if="!notificaciones.length" class="empty">
          <div class="empty-icon">
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          </div>
          <p class="empty-title">Sin notificaciones</p>
          <p class="empty-sub">Aquí aparecerán tus alertas de solicitudes y viajes.</p>
        </div>

        <!-- ── Lista ───────────────────────────────────────────────────────── -->
        <div v-else class="lista">
          <div
            v-for="(notif, i) in notificaciones"
            :key="notif.id"
            class="notif-card"
            :class="{ 'no-leida': !notif.leida }"
            @click="irASolicitud(notif)"
          >
            <!-- Icono según tipo -->
            <div class="notif-icon" :class="colorClass(notif.tipo)">
              <!-- solicitud_recibida -->
              <svg v-if="notif.tipo === 'solicitud_recibida'" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
              <!-- solicitud_aceptada -->
              <svg v-else-if="notif.tipo === 'solicitud_aceptada'" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <!-- solicitud_rechazada -->
              <svg v-else-if="notif.tipo === 'solicitud_rechazada'" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              <!-- solicitud_cancelada -->
              <svg v-else-if="notif.tipo === 'solicitud_cancelada'" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
              <!-- viaje_iniciado -->
              <svg v-else-if="notif.tipo === 'viaje_iniciado'" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
              <!-- viaje_finalizado -->
              <svg v-else-if="notif.tipo === 'viaje_finalizado'" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
              </svg>
              <!-- nueva_resena -->
              <svg v-else-if="notif.tipo === 'nueva_resena'" width="17" height="17" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <!-- default -->
              <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>

            <!-- Texto -->
            <div class="notif-body">
              <div class="notif-titulo" :class="{ bold: !notif.leida }">{{ notif.titulo }}</div>
              <div class="notif-mensaje">{{ notif.mensaje }}</div>
              <div class="notif-tiempo">{{ tiempoRelativo(notif.created_at) }}</div>
            </div>

            <!-- Indicadores derecha -->
            <div class="notif-right">
              <div v-if="!notif.leida" class="punto-rojo"></div>
              <button class="delete-btn" @click.stop="eliminar(notif.id)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div style="height:90px"></div>
      </div>

      <!-- ── Bottom Nav ──────────────────────────────────────────────────────── -->
      <div class="bottom-nav">
        <button class="nav-item" @click="router.push('/inicio')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          <span>Inicio</span>
        </button>
        <button class="nav-item" @click="router.push('/feed')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <span>Explorar</span>
        </button>
        <button class="nav-item" @click="router.push('/solicitudes')" style="position:relative">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span>Solicitudes</span>
          <div v-if="pendientesCount > 0" class="nav-badge">{{ pendientesCount }}</div>
        </button>
        <button class="nav-item active" style="position:relative">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span>Alertas</span>
          <div class="nav-dot"></div>
        </button>
        <button class="nav-item" @click="router.push('/home')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>Perfil</span>
        </button>
      </div>

    </ion-content>

    <!-- Alert confirmar eliminar todas -->
    <ion-alert
      :is-open="showAlert"
      header="Limpiar historial"
      message="¿Deseas eliminar todas tus notificaciones?"
      :buttons="alertBtns"
      @didDismiss="showAlert = false"
    />

  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonContent, IonAlert } from '@ionic/vue';
import { useNotificacionStore } from '@/stores/notificacionStore';
import type { Notificacion } from '@/services/notificacionService';

const router = useRouter();
const store  = useNotificacionStore();

const notificaciones = computed(() => store.notificaciones);
const cargando       = computed(() => store.cargando);

// Badge solicitudes (igual que en las otras vistas)
const API = 'https://gotogether-api.onrender.com';
const pendientesCount = ref(0);
async function fetchPendientesCount() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`${API}/api/solicitudes/pendientes-count`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) { const d = await res.json(); pendientesCount.value = d.count; }
  } catch (_) {}
}

// Alert
const showAlert = ref(false);
const alertBtns = [
  { text: 'Cancelar', role: 'cancel' },
  { text: 'Eliminar todo', role: 'destructive', handler: () => store.eliminarTodas() },
];

// Acciones
async function marcarTodas()       { await store.marcarTodasLeidas(); }
async function eliminar(id: number){ await store.eliminarNotificacion(id); }

function irASolicitud(notif: Notificacion) {
  store.marcarLeida(notif.id);
  if (notif.solicitud_id) router.push('/solicitudes');
}

// Helpers
function tiempoRelativo(fecha: string): string {
  const diff = Date.now() - new Date(fecha).getTime();
  const min  = Math.floor(diff / 60_000);
  const hrs  = Math.floor(min / 60);
  const dias = Math.floor(hrs / 24);
  if (min < 1)  return 'Ahora mismo';
  if (min < 60) return `Hace ${min} min`;
  if (hrs < 24) return `Hace ${hrs}h`;
  return `Hace ${dias} día${dias > 1 ? 's' : ''}`;
}

const colorMap: Record<string, string> = {
  solicitud_recibida:  'icon-primary',
  solicitud_aceptada:  'icon-success',
  solicitud_rechazada: 'icon-danger',
  solicitud_cancelada: 'icon-muted',
  viaje_iniciado:      'icon-warning',
  viaje_finalizado:    'icon-tertiary',
  nueva_resena:        'icon-star',
};
function colorClass(tipo: string) { return colorMap[tipo] || 'icon-primary'; }

onMounted(() => {
  store.fetchNotificaciones();
  fetchPendientesCount();
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

.notif-content { --background: #070707; }
.grain { position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.04'/%3E%3C/svg%3E"); }
.atm-glow { position: fixed; width: 350px; height: 350px;
  background: radial-gradient(circle, rgba(139,26,26,0.13) 0%, transparent 70%);
  top: -100px; left: 50%; transform: translateX(-50%); filter: blur(60px);
  pointer-events: none; z-index: 0; }
.screen { position: relative; z-index: 1; }

/* Header */
.header { padding: 22px 22px 0; display: flex; justify-content: space-between; align-items: flex-start; }
.brand { font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700; color: rgba(237,233,230,0.38); letter-spacing: 0.5px; margin-bottom: 6px; }
.brand span { color: #a32020; }
.titulo { font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 800; color: #ede9e6; letter-spacing: -0.5px; }
.header-actions { display: flex; gap: 8px; padding-top: 10px; }
.action-btn { width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.1); background: #111; color: rgba(237,233,230,0.5); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.action-btn.danger { border-color: rgba(163,32,32,0.35); color: #a32020; }

/* Lista */
.lista { padding: 18px 16px 0; display: flex; flex-direction: column; gap: 8px; }

/* Card */
.notif-card { display: flex; align-items: flex-start; gap: 12px; background: #111111; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 14px 12px; cursor: pointer; transition: background 0.15s; }
.notif-card:active { background: #181818; }
.notif-card.no-leida { background: rgba(139,26,26,0.08); border-color: rgba(139,26,26,0.22); }

/* Iconos */
.notif-icon { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.icon-primary  { background: rgba(139,26,26,0.25);  color: #c94040; }
.icon-success  { background: rgba(34,197,94,0.15);   color: #22c55e; }
.icon-danger   { background: rgba(239,68,68,0.15);   color: #ef4444; }
.icon-muted    { background: rgba(255,255,255,0.07); color: rgba(237,233,230,0.35); }
.icon-warning  { background: rgba(234,179,8,0.15);   color: #eab308; }
.icon-tertiary { background: rgba(99,102,241,0.15);  color: #818cf8; }
.icon-star     { background: rgba(234,179,8,0.18);   color: #f59e0b; }

/* Body texto */
.notif-body { flex: 1; min-width: 0; }
.notif-titulo { font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 600; color: #ede9e6; margin-bottom: 3px; }
.notif-titulo.bold { font-weight: 800; }
.notif-mensaje { font-family: 'DM Sans', sans-serif; font-size: 12px; color: rgba(237,233,230,0.52); line-height: 1.45; margin-bottom: 5px; }
.notif-tiempo  { font-family: 'DM Sans', sans-serif; font-size: 10px; color: rgba(237,233,230,0.28); }

/* Derecha */
.notif-right { display: flex; flex-direction: column; align-items: center; gap: 8px; flex-shrink: 0; }
.punto-rojo { width: 8px; height: 8px; border-radius: 50%; background: #a32020; }
.delete-btn { width: 24px; height: 24px; border-radius: 6px; border: none; background: transparent; color: rgba(237,233,230,0.2); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.delete-btn:active { color: #a32020; }

/* Skeleton */
.sk-icon { width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.06); flex-shrink: 0; animation: pulse 1.5s ease-in-out infinite; }
.sk-body { flex: 1; display: flex; flex-direction: column; gap: 7px; padding-top: 3px; }
.sk-line { height: 10px; border-radius: 6px; background: rgba(255,255,255,0.06); animation: pulse 1.5s ease-in-out infinite; }
.w55 { width: 55%; } .w80 { width: 80%; } .w30 { width: 30%; }
@keyframes pulse { 0%,100%{opacity:.45} 50%{opacity:1} }

/* Vacío */
.empty { display: flex; flex-direction: column; align-items: center; padding: 72px 32px; text-align: center; }
.empty-icon { width: 72px; height: 72px; border-radius: 50%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); display: flex; align-items: center; justify-content: center; color: rgba(237,233,230,0.2); margin-bottom: 16px; }
.empty-title { font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 700; color: rgba(237,233,230,0.55); margin: 0 0 6px; }
.empty-sub   { font-family: 'DM Sans', sans-serif; font-size: 13px; color: rgba(237,233,230,0.28); margin: 0; }

/* Bottom nav — idéntico al resto de vistas */
.bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; z-index: 100; background: rgba(7,7,7,0.96); backdrop-filter: blur(20px); border-top: 1px solid rgba(255,255,255,0.07); display: flex; padding: 10px 0 20px; }
.nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: rgba(237,233,230,0.22); cursor: pointer; border: none; background: transparent; }
.nav-item.active { color: #a32020; }
.nav-dot  { width: 4px; height: 4px; border-radius: 50%; background: #a32020; margin-top: -2px; }
.nav-badge { position: absolute; top: 2px; right: 14px; background: #a32020; color: #ede9e6; border-radius: 10px; font-size: 8px; font-weight: 700; padding: 1px 5px; min-width: 14px; text-align: center; }
</style>
