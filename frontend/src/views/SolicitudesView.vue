<template>
  <ion-page>
    <ion-content :fullscreen="true" class="sol-content">
      <div class="grain"></div>
      <div class="atm-glow"></div>

      <div class="header">
        <div class="brand">go<span>Together</span></div>
        <div class="header-title">Solicitudes</div>
      </div>

      <div class="tabs">
        <button class="tab-btn" :class="{ active: activeTab === 'recibidas' }" @click="activeTab = 'recibidas'">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
          Recibidas
          <span v-if="recibidas.length > 0" class="tab-count" :class="{ red: recibidasPendientes > 0 }">{{ recibidas.length }}</span>
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'enviadas' }" @click="activeTab = 'enviadas'">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Enviadas
          <span v-if="enviadas.length > 0" class="tab-count">{{ enviadas.length }}</span>
        </button>
      </div>

      <div v-if="loading" class="empty-state">
        <div class="spinner"></div>
        <p>Cargando...</p>
      </div>

      <template v-else>

        <!-- RECIBIDAS -->
        <div v-if="activeTab === 'recibidas'" class="feed">
          <div v-if="recibidas.length === 0" class="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="opacity:0.2"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
            <p>No has recibido solicitudes aún</p>
          </div>
          <div v-else v-for="(s, i) in recibidas" :key="s.id" class="card" :class="`card-${s.estado}`" :style="`animation-delay:${i*0.06}s`">
            <div class="card-top">
              <div class="card-avatar" :style="`background:${avatarColor(nombreRemitente(s))}`">{{ initial(nombreRemitente(s)) }}</div>
              <div class="card-meta">
                <div class="card-name">{{ nombreRemitente(s) }}</div>
                <div class="card-sub">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {{ ciudadRemitente(s) }}
                  <span v-if="infoExtra(s)"> · {{ infoExtra(s) }}</span>
                </div>
              </div>
              <div class="estado-badge" :class="`estado-${s.estado}`">
                <div class="estado-dot"></div>
                {{ estadoLabel(s.estado) }}
              </div>
            </div>
            <div class="card-divider"></div>
            <div class="sol-fecha">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {{ formatFecha(s.created_at) }}
            </div>
            <!-- Pendiente: aceptar o rechazar -->
            <div v-if="s.estado === 'pendiente'" class="sol-actions">
              <button class="sol-btn accept" @click="responder(s.id, 'aceptada')">✓ Aceptar</button>
              <button class="sol-btn reject" @click="responder(s.id, 'rechazada')">✕ Rechazar</button>
              <button v-if="telefonoRemitente(s)" class="sol-btn wpp" @click="wpp(telefonoRemitente(s))">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.853L0 24l6.335-1.521A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.645-.52-5.148-1.422l-.369-.218-3.763.904.937-3.666-.242-.381A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                WApp
              </button>
            </div>
            <!-- Aceptada: WhatsApp -->
            <div v-if="s.estado === 'aceptada'" class="sol-actions">
              <button class="sol-btn wpp wpp-full" @click="wpp(telefonoRemitente(s))">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.853L0 24l6.335-1.521A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.645-.52-5.148-1.422l-.369-.218-3.763.904.937-3.666-.242-.381A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                Contactar por WhatsApp
              </button>
            </div>
          </div>
        </div>

        <!-- ENVIADAS -->
        <div v-if="activeTab === 'enviadas'" class="feed">
          <div v-if="enviadas.length === 0" class="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="opacity:0.2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            <p>No has enviado solicitudes aún</p>
            <button class="btn-explorar" @click="router.push('/feed')">Explorar usuarios</button>
          </div>
          <div v-else v-for="(s, i) in enviadas" :key="s.id" class="card" :class="`card-${s.estado}`" :style="`animation-delay:${i*0.06}s`">
            <div class="card-top">
              <div class="card-avatar" :style="`background:${avatarColor(nombreDestinatario(s))}`">{{ initial(nombreDestinatario(s)) }}</div>
              <div class="card-meta">
                <div class="card-name">{{ nombreDestinatario(s) }}</div>
                <div class="card-sub">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {{ ciudadDestinatario(s) }}
                </div>
              </div>
              <div class="estado-badge" :class="`estado-${s.estado}`">
                <div class="estado-dot"></div>
                {{ estadoLabel(s.estado) }}
              </div>
            </div>
            <div class="card-divider"></div>
            <div class="sol-fecha">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {{ formatFecha(s.created_at) }}
            </div>
            <!-- Pendiente: solo cancelar -->
            <div v-if="s.estado === 'pendiente'" class="sol-actions">
              <button class="sol-btn cancel" @click="cancelar(s.id)">Cancelar solicitud</button>
            </div>
            <!-- Aceptada: WhatsApp -->
            <div v-if="s.estado === 'aceptada'" class="sol-actions">
              <button class="sol-btn wpp wpp-full" @click="wpp(telefonoDestinatario(s))">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.853L0 24l6.335-1.521A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.645-.52-5.148-1.422l-.369-.218-3.763.904.937-3.666-.242-.381A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                Contactar por WhatsApp
              </button>
            </div>
          </div>
        </div>

      </template>

      <div style="height:100px"></div>
      <div class="toast" :class="{ show: toast.show, success: toast.type==='success', error: toast.type==='error' }">{{ toast.msg }}</div>

      <div class="bottom-nav">
        <button class="nav-item" @click="router.push('/inicio')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          <span>Inicio</span>
        </button>
        <button class="nav-item" @click="router.push('/feed')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <span>Explorar</span>
        </button>
        <button class="nav-item active">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span>Solicitudes</span>
          <div class="nav-dot"></div>
        </button>
        <button class="nav-item" @click="router.push('/home')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>Perfil</span>
        </button>
      </div>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonContent } from '@ionic/vue';
import { useAuthStore } from '@/stores/authStore';

const router = useRouter();
const authStore = useAuthStore();
const myId = computed(() => authStore.user?.id);
const isConductor = computed(() => authStore.user?.role === 'conductor');

const API = 'http://localhost:3000';
const loading = ref(false);
const activeTab = ref('recibidas');
const todasSolicitudes = ref<any[]>([]);

function getToken() { return localStorage.getItem('token') || ''; }

async function fetchSolicitudes() {
  loading.value = true;
  try {
    const res = await fetch(`${API}/api/solicitudes/mis-solicitudes`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (res.ok) todasSolicitudes.value = await res.json();
  } catch(e) { console.error(e); }
  finally { loading.value = false; }
}

onMounted(fetchSolicitudes);

// Recibidas: yo NO la inicié
const recibidas = computed(() =>
  todasSolicitudes.value.filter(s => s.iniciado_por !== myId.value)
);

// Enviadas: yo SÍ la inicié
const enviadas = computed(() =>
  todasSolicitudes.value.filter(s => s.iniciado_por === myId.value)
);

const recibidasPendientes = computed(() =>
  recibidas.value.filter(s => s.estado === 'pendiente').length
);

// Helpers para mostrar el nombre correcto según quién soy yo
function nombreRemitente(s: any) {
  // El remitente es quien inició — si yo soy conductor y el pasajero inició → pasajero
  return s.iniciado_por === s.pasajero_id ? s.pasajero_name : s.conductor_name;
}
function ciudadRemitente(s: any) {
  return s.iniciado_por === s.pasajero_id ? s.pasajero_city : s.conductor_city;
}
function infoExtra(s: any) {
  return s.iniciado_por === s.pasajero_id ? s.pasajero_university : s.car_model;
}
function telefonoRemitente(s: any) {
  return s.iniciado_por === s.pasajero_id ? s.pasajero_phone : s.conductor_phone;
}

function nombreDestinatario(s: any) {
  // El destinatario es quien NO inició
  return s.iniciado_por === s.pasajero_id ? s.conductor_name : s.pasajero_name;
}
function ciudadDestinatario(s: any) {
  return s.iniciado_por === s.pasajero_id ? s.conductor_city : s.pasajero_city;
}
function telefonoDestinatario(s: any) {
  return s.iniciado_por === s.pasajero_id ? s.conductor_phone : s.pasajero_phone;
}

function estadoLabel(e: string) {
  return e === 'pendiente' ? 'Pendiente' : e === 'aceptada' ? 'Aceptada' : 'Rechazada';
}

async function responder(id: number, estado: string) {
  try {
    const res = await fetch(`${API}/api/solicitudes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ estado }),
    });
    if (res.ok) {
      showToast(estado === 'aceptada' ? '¡Solicitud aceptada!' : 'Solicitud rechazada', estado === 'aceptada' ? 'success' : 'error');
      if (estado === 'rechazada') {
        todasSolicitudes.value = todasSolicitudes.value.filter((s: any) => s.id !== id);
      } else {
        // Actualizar estado localmente
        const sol = todasSolicitudes.value.find((s: any) => s.id === id);
        if (sol) sol.estado = 'aceptada';
      }
    }
  } catch { showToast('Error', 'error'); }
}

async function cancelar(id: number) {
  try {
    const res = await fetch(`${API}/api/solicitudes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) {
      showToast('Solicitud cancelada', 'error');
      todasSolicitudes.value = todasSolicitudes.value.filter(s => s.id !== id);
    }
  } catch { showToast('Error al cancelar', 'error'); }
}

function wpp(phone: string) {
  if (!phone) return;
  window.open(`https://wa.me/57${phone}`, '_blank');
}

function formatFecha(f: string) {
  return new Date(f).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function initial(name: string) { return name?.charAt(0).toUpperCase() || '?'; }
const avatarColors = ['linear-gradient(135deg,#8B1A1A,#4a0e0e)','linear-gradient(135deg,#1a3a8B,#0e1f4a)','linear-gradient(135deg,#1a6b3a,#0e3a1f)','linear-gradient(135deg,#6b1a6b,#3a0e3a)','linear-gradient(135deg,#2a2a6b,#1a1a3a)','linear-gradient(135deg,#5a3a1a,#3a200e)'];
function avatarColor(name: string) { return avatarColors[(name?.charCodeAt(0)||0) % avatarColors.length]; }

const toast = ref({ show: false, msg: '', type: 'success' });
function showToast(msg: string, type: 'success'|'error' = 'success') {
  toast.value = { show: true, msg, type };
  setTimeout(() => { toast.value.show = false; }, 2500);
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
.sol-content { --background: #070707; }
.grain { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.04'/%3E%3C/svg%3E"); }
.atm-glow { position: fixed; width: 350px; height: 350px; background: radial-gradient(circle, rgba(139,26,26,0.12) 0%, transparent 70%); top: -100px; left: 50%; transform: translateX(-50%); filter: blur(60px); pointer-events: none; z-index: 0; }
.header { padding: 22px 20px 4px; position: relative; z-index: 1; }
.brand { font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700; color: rgba(237,233,230,0.35); margin-bottom: 4px; }
.brand span { color: #a32020; }
.header-title { font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 800; color: #ede9e6; }
.tabs { display: flex; gap: 8px; padding: 16px 20px 0; position: relative; z-index: 1; }
.tab-btn { display: flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 20px; font-family: 'Outfit', sans-serif; font-size: 12.5px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; }
.tab-btn.active { background: #8B1A1A; color: #ede9e6; box-shadow: 0 4px 14px rgba(139,26,26,0.4); }
.tab-btn:not(.active) { background: #171717; border: 1px solid rgba(255,255,255,0.07); color: rgba(237,233,230,0.4); }
.tab-count { background: rgba(255,255,255,0.15); border-radius: 10px; padding: 1px 7px; font-size: 10px; }
.tab-count.red { background: rgba(139,26,26,0.4); color: #ff8080; }
.feed { padding: 12px 18px 0; display: flex; flex-direction: column; gap: 10px; position: relative; z-index: 1; }
.card { background: #111111; border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; overflow: hidden; animation: fadeUp 0.45s ease both; }
.card-pendiente { border-color: rgba(139,26,26,0.2); }
.card-aceptada { border-color: rgba(37,211,102,0.2); }
.card-rechazada { opacity: 0.5; }
@keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
.card-top { display: flex; align-items: center; gap: 12px; padding: 14px 16px 10px; }
.card-avatar { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Outfit', sans-serif; font-size: 19px; font-weight: 800; color: #ede9e6; flex-shrink: 0; }
.card-meta { flex: 1; min-width: 0; }
.card-name { font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 700; color: #ede9e6; margin-bottom: 3px; }
.card-sub { display: flex; align-items: center; gap: 4px; color: rgba(237,233,230,0.38); font-size: 11.5px; }
.estado-badge { display: flex; align-items: center; gap: 5px; font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; flex-shrink: 0; }
.estado-dot { width: 7px; height: 7px; border-radius: 50%; }
.estado-pendiente .estado-dot { background: #c9a227; box-shadow: 0 0 5px rgba(201,162,39,0.5); }
.estado-pendiente { color: #c9a227; }
.estado-aceptada .estado-dot { background: #25d366; box-shadow: 0 0 5px rgba(37,211,102,0.5); }
.estado-aceptada { color: #25d366; }
.estado-rechazada .estado-dot { background: rgba(255,80,80,0.6); }
.estado-rechazada { color: rgba(255,80,80,0.6); }
.card-divider { height: 1px; background: rgba(255,255,255,0.07); margin: 0 16px; }
.sol-fecha { display: flex; align-items: center; gap: 6px; padding: 8px 16px 4px; font-size: 11px; color: rgba(237,233,230,0.3); }
.sol-actions { display: flex; gap: 7px; padding: 8px 16px 14px; }
.sol-btn { flex: 1; padding: 9px; border-radius: 9px; font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; border: none; display: flex; align-items: center; justify-content: center; gap: 5px; }
.sol-btn.accept { background: rgba(37,211,102,0.12); color: #25d366; border: 1px solid rgba(37,211,102,0.25); }
.sol-btn.reject { background: rgba(255,60,60,0.08); color: rgba(255,100,100,0.7); border: 1px solid rgba(255,60,60,0.15); }
.sol-btn.cancel { background: rgba(255,60,60,0.08); color: rgba(255,100,100,0.7); border: 1px solid rgba(255,60,60,0.15); }
.sol-btn.wpp { background: rgba(37,211,102,0.12); color: #25d366; border: 1px solid rgba(37,211,102,0.25); flex: 0.6; }
.sol-btn.wpp-full { flex: 1; }
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 70px 0; color: rgba(237,233,230,0.25); font-family: 'DM Sans', sans-serif; font-size: 14px; position: relative; z-index: 1; }
.btn-explorar { background: #8B1A1A; border: none; border-radius: 12px; color: #ede9e6; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700; padding: 10px 20px; cursor: pointer; margin-top: 4px; }
.spinner { width: 32px; height: 32px; border-radius: 50%; border: 3px solid rgba(139,26,26,0.2); border-top-color: #8B1A1A; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.toast { position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%) translateY(20px); background: #1a1a1a; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 10px 20px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: #ede9e6; z-index: 999; opacity: 0; transition: all 0.3s ease; pointer-events: none; white-space: nowrap; }
.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
.toast.success { border-color: rgba(37,211,102,0.3); color: #25d366; }
.toast.error { border-color: rgba(139,26,26,0.28); color: #a32020; }
.bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; z-index: 100; background: rgba(7,7,7,0.96); backdrop-filter: blur(20px); border-top: 1px solid rgba(255,255,255,0.07); display: flex; padding: 10px 0 20px; }
.nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: rgba(237,233,230,0.22); cursor: pointer; border: none; background: transparent; }
.nav-item.active { color: #a32020; }
.nav-dot { width: 4px; height: 4px; border-radius: 50%; background: #a32020; margin-top: -2px; }
</style>