<template>
  <ion-page>
    <ion-content :fullscreen="true" class="feed-content">
      <div class="grain"></div>
      <div class="atm-glow"></div>

      <!-- Header -->
      <div class="header">
        <div class="header-top">
          <div class="brand"><span class="go">go</span><span class="tog">Together</span></div>
          <div class="city-badge">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {{ user?.city || 'Tu ciudad' }}
          </div>
        </div>
        <div class="search-bar">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(237,233,230,0.3)" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input v-model="searchQuery" type="text" :placeholder="isConductor ? 'Buscar pasajero...' : 'Buscar conductor...'" class="search-input" />
          <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button class="tab-btn" :class="{ active: activeTab === 'feed' }" @click="activeTab = 'feed'">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          {{ isConductor ? 'Pasajeros' : 'Conductores' }}
          <span class="tab-count">{{ filteredUsuarios.length }}</span>
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'solicitudes' }" @click="activeTab = 'solicitudes'; fetchSolicitudes()">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Solicitudes
          <span v-if="pendientesCount > 0" class="tab-count red">{{ pendientesCount }}</span>
        </button>
      </div>

      <!-- FEED TAB -->
      <div v-if="activeTab === 'feed'" class="feed">
        <div v-if="loading" class="empty-state">
          <div class="spinner"></div>
          <p>Cargando...</p>
        </div>
        <div v-else-if="filteredUsuarios.length === 0" class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <p>No hay {{ isConductor ? 'pasajeros' : 'conductores' }} disponibles</p>
        </div>
        <div v-else v-for="(u, i) in filteredUsuarios" :key="u.id" class="card" :style="`animation-delay:${i*0.06}s`" @click="verPerfil(u)">
          <div class="card-top">
            <div class="card-avatar" :style="`background:${avatarColor(u.name)}`">{{ initial(u.name) }}</div>
            <div class="card-meta">
              <div class="card-name">{{ u.name }}</div>
              <div class="card-sub">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {{ u.city }}<span v-if="!isConductor && u.car_model"> · {{ u.car_model }}</span><span v-if="isConductor && u.university"> · {{ u.university }}</span>
              </div>
            </div>
            <span class="badge" :class="isConductor ? 'badge-gray' : 'badge-red'">
              {{ isConductor ? '👤 Pasajero' : '🚗 Conductor' }}
            </span>
          </div>

          <div class="card-divider"></div>

          <div class="card-info">
            <div v-if="!isConductor && u.car_model" class="info-row">
              🚗 <span class="info-val">{{ u.car_model }} · {{ u.plate }}</span>
            </div>
            <div v-if="isConductor && u.university" class="info-row">
              🎓 <span class="info-val">{{ u.university }}</span>
            </div>
          </div>

          <div class="card-schedule">
            <span class="sched-label">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Hoy — {{ diaHoyLabel }}:
            </span>
            <div class="sched-chips">
              <span v-if="getHorario(u,'ida')" class="sched-chip on">↑ {{ getHorario(u,'ida') }}</span>
              <span v-if="getHorario(u,'vuelta')" class="sched-chip on">↓ {{ getHorario(u,'vuelta') }}</span>
              <span v-if="!getHorario(u,'ida') && !getHorario(u,'vuelta')" class="sched-chip">Sin horario hoy</span>
              <span v-if="!isConductor && u.capacity" class="sched-chip">{{ u.capacity }} cupos</span>
            </div>
          </div>

          <div class="card-bottom">
            <div class="compat">
              <div class="compat-dot" :class="getHorario(u,'ida') ? 'on' : 'off'"></div>
              {{ getHorario(u,'ida') ? 'Disponible hoy' : 'Sin horario hoy' }}
            </div>
            <div class="btns">
              <button v-if="u.phone" class="btn-wpp" @click.stop="contactarWpp(u.phone)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.853L0 24l6.335-1.521A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.645-.52-5.148-1.422l-.369-.218-3.763.904.937-3.666-.242-.381A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
              </button>
              <button class="btn-main" @click.stop="enviarSolicitud(u)">
                {{ isConductor ? 'Invitar a viajar' : 'Solicitar cupo' }}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- SOLICITUDES TAB -->
      <div v-if="activeTab === 'solicitudes'" class="feed">
        <div v-if="loadingSolicitudes" class="empty-state">
          <div class="spinner"></div>
          <p>Cargando...</p>
        </div>
        <div v-else-if="solicitudes.length === 0" class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
          <p>No tienes solicitudes aún</p>
        </div>
        <div v-else v-for="(s, i) in solicitudes" :key="s.id" class="card" :style="`animation-delay:${i*0.06}s`" :class="`card-${s.estado}`">
          <div class="card-top">
            <div class="card-avatar" :style="`background:${avatarColor(isConductor ? s.pasajero_name : s.conductor_name)}`">
              {{ initial(isConductor ? s.pasajero_name : s.conductor_name) }}
            </div>
            <div class="card-meta">
              <div class="card-name">{{ isConductor ? s.pasajero_name : s.conductor_name }}</div>
              <div class="card-sub">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {{ isConductor ? s.pasajero_city : s.conductor_city }}
                <span v-if="isConductor && s.pasajero_university"> · {{ s.pasajero_university }}</span>
                <span v-if="!isConductor && s.car_model"> · {{ s.car_model }}</span>
              </div>
            </div>
            <div class="estado-badge" :class="`estado-${s.estado}`">
              <div class="estado-dot"></div>
              {{ s.estado === 'pendiente' ? 'Pendiente' : s.estado === 'aceptada' ? 'Aceptada' : 'Rechazada' }}
            </div>
          </div>

          <div class="card-divider"></div>

          <div class="sol-fecha">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {{ formatFecha(s.created_at) }}
          </div>

          <!-- Conductor: botones aceptar/rechazar si pendiente -->
          <div v-if="isConductor && s.estado === 'pendiente'" class="sol-actions">
            <button class="sol-btn accept" @click="responderSolicitud(s.id, 'aceptada')">✓ Aceptar</button>
            <button class="sol-btn reject" @click="responderSolicitud(s.id, 'rechazada')">✕ Rechazar</button>
            <button v-if="s.pasajero_phone" class="sol-btn wpp" @click="contactarWpp(s.pasajero_phone)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.853L0 24l6.335-1.521A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.645-.52-5.148-1.422l-.369-.218-3.763.904.937-3.666-.242-.381A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
              WApp
            </button>
          </div>

          <!-- Conductor: ya respondida, solo WhatsApp si aceptada -->
          <div v-if="isConductor && s.estado === 'aceptada'" class="sol-actions">
            <button v-if="s.pasajero_phone" class="sol-btn wpp wpp-full" @click="contactarWpp(s.pasajero_phone)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.853L0 24l6.335-1.521A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.645-.52-5.148-1.422l-.369-.218-3.763.904.937-3.666-.242-.381A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
              Contactar por WhatsApp
            </button>
          </div>

          <!-- Pasajero: solo ver estado + WhatsApp si aceptada -->
          <div v-if="!isConductor && s.estado === 'aceptada'" class="sol-actions">
            <button v-if="s.conductor_phone" class="sol-btn wpp wpp-full" @click="contactarWpp(s.conductor_phone)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.853L0 24l6.335-1.521A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.645-.52-5.148-1.422l-.369-.218-3.763.904.937-3.666-.242-.381A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
              Contactar por WhatsApp
            </button>
          </div>

        </div>
      </div>

      <!-- Toast -->
      <div class="toast" :class="{ show: toast.show, success: toast.type === 'success', error: toast.type === 'error' }">
        {{ toast.msg }}
      </div>

      <!-- Nav Bar -->
      <div class="bottom-nav">
        <button class="nav-item" @click="router.push('/inicio')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          <span>Inicio</span>
        </button>
        <button class="nav-item active">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <span>Explorar</span>
          <div class="nav-dot"></div>
        </button>
        <button class="nav-item" @click="router.push('/solicitudes')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span>Solicitudes</span>
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
import { useRouter, useRoute } from 'vue-router';
import { IonPage, IonContent } from '@ionic/vue';
import { useAuthStore } from '@/stores/authStore';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const user = computed(() => authStore.user);
const isConductor = computed(() => user.value?.role === 'conductor');

const activeTab = ref('feed');
const searchQuery = ref('');
const loading = ref(false);
const loadingSolicitudes = ref(false);
const usuarios = ref<any[]>([]);
const solicitudes = ref<any[]>([]);

const API = 'http://localhost:3000';

const diasMap: Record<number, string> = {
  0: 'domingo', 1: 'lunes', 2: 'martes', 3: 'miercoles',
  4: 'jueves', 5: 'viernes', 6: 'sabado'
};
const diasLabel: Record<number, string> = {
  0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles',
  4: 'Jueves', 5: 'Viernes', 6: 'Sábado'
};
const diaHoy = diasMap[new Date().getDay()];
const diaHoyLabel = diasLabel[new Date().getDay()];

function getToken() { return localStorage.getItem('token') || ''; }

async function fetchUsuarios() {
  loading.value = true;
  try {
    const token = getToken();
    if (!token) { router.replace('/welcome'); return; }
    const endpoint = isConductor.value
      ? `${API}/api/users/pasajeros`
      : `${API}/api/users/conductores`;
    const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { showToast('Error al cargar usuarios', 'error'); return; }
    const data = await res.json();
    // Asegurarse que schedule y routes sean objetos, no strings
    usuarios.value = data.map((u: any) => ({
      ...u,
      schedule: typeof u.schedule === 'string' ? JSON.parse(u.schedule) : (u.schedule || {}),
      routes: typeof u.routes === 'string' ? JSON.parse(u.routes) : (u.routes || {}),
    }));
  } catch (e) {
    console.error(e);
    showToast('No se pudo conectar al servidor', 'error');
  } finally {
    loading.value = false;
  }
}

async function fetchSolicitudes() {
  loadingSolicitudes.value = true;
  try {
    const res = await fetch(`${API}/api/solicitudes/mis-solicitudes`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (!res.ok) { showToast('Error al cargar solicitudes', 'error'); return; }
    solicitudes.value = await res.json();
  } catch (e) {
    console.error(e);
    showToast('Error al cargar solicitudes', 'error');
  } finally {
    loadingSolicitudes.value = false;
  }
}

onMounted(() => {
  fetchUsuarios();
  // Si viene con ?tab=solicitudes abrir directo esa tab
  if (route.query.tab === 'solicitudes') {
    activeTab.value = 'solicitudes';
    fetchSolicitudes();
  }
});

const pendientesCount = computed(() =>
  solicitudes.value.filter(s => s.estado === 'pendiente').length
);

function getHorario(u: any, tipo: 'ida' | 'vuelta') {
  return u.schedule?.[diaHoy]?.[tipo] || '';
}

function initial(name: string) { return name?.charAt(0).toUpperCase() || '?'; }

const avatarColors = [
  'linear-gradient(135deg,#8B1A1A,#4a0e0e)',
  'linear-gradient(135deg,#1a3a8B,#0e1f4a)',
  'linear-gradient(135deg,#1a6b3a,#0e3a1f)',
  'linear-gradient(135deg,#6b1a6b,#3a0e3a)',
  'linear-gradient(135deg,#2a2a6b,#1a1a3a)',
  'linear-gradient(135deg,#5a3a1a,#3a200e)',
];
function avatarColor(name: string) {
  return avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length];
}

function contactarWpp(phone: string) {
  if (!phone) return;
  window.open(`https://wa.me/57${phone}`, '_blank');
}

function formatFecha(fecha: string) {
  if (!fecha) return '';
  return new Date(fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

const filteredUsuarios = computed(() => {
  const q = searchQuery.value.toLowerCase();
  if (!q) return usuarios.value;
  return usuarios.value.filter(u =>
    u.name?.toLowerCase().includes(q) ||
    u.city?.toLowerCase().includes(q) ||
    u.university?.toLowerCase().includes(q) ||
    u.car_model?.toLowerCase().includes(q)
  );
});

const toast = ref({ show: false, msg: '', type: 'success' });
function showToast(msg: string, type: 'success' | 'error' = 'success') {
  toast.value = { show: true, msg, type };
  setTimeout(() => { toast.value.show = false; }, 2500);
}

function verPerfil(u: any) {
  const role = isConductor.value ? 'pasajero' : 'conductor';
  router.push(`/perfil/${role}/${u.id}`);
}

async function enviarSolicitud(u: any) {
  try {
    const body = isConductor.value ? { pasajero_id: u.id } : { conductor_id: u.id };
    const res = await fetch(`${API}/api/solicitudes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.message || 'Error al enviar', 'error'); return; }
    showToast(isConductor.value ? `¡Invitación enviada a ${u.name}!` : `¡Cupo solicitado a ${u.name}!`, 'success');
  } catch {
    showToast('Error al enviar solicitud', 'error');
  }
}

async function responderSolicitud(id: number, estado: string) {
  try {
    const res = await fetch(`${API}/api/solicitudes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ estado }),
    });
    if (!res.ok) { showToast('Error al responder', 'error'); return; }
    showToast(estado === 'aceptada' ? '¡Solicitud aceptada!' : 'Solicitud rechazada', estado === 'aceptada' ? 'success' : 'error');
    await fetchSolicitudes();
  } catch {
    showToast('Error al responder', 'error');
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

.feed-content { --background: #070707; }

.grain {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.04'/%3E%3C/svg%3E");
}
.atm-glow {
  position: fixed; width: 350px; height: 350px;
  background: radial-gradient(circle, rgba(139,26,26,0.13) 0%, transparent 70%);
  top: -100px; left: 50%; transform: translateX(-50%);
  filter: blur(60px); pointer-events: none; z-index: 0;
}

.header {
  position: sticky; top: 0; z-index: 100;
  background: rgba(7,7,7,0.94); backdrop-filter: blur(20px);
  padding: 18px 20px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}
.header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.brand { font-family: 'Outfit', sans-serif; font-size: 19px; font-weight: 800; }
.brand .go { color: #ede9e6; }
.brand .tog { color: #a32020; }
.city-badge {
  display: flex; align-items: center; gap: 5px;
  background: #171717; border: 1px solid rgba(255,255,255,0.07);
  border-radius: 20px; padding: 5px 11px;
  font-size: 11px; color: rgba(237,233,230,0.4); font-family: 'DM Sans', sans-serif;
}
.search-bar {
  display: flex; align-items: center; gap: 8px;
  background: #171717; border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px; padding: 10px 14px;
}
.search-input {
  background: transparent; border: none; outline: none;
  color: #ede9e6; font-family: 'DM Sans', sans-serif; font-size: 13px; width: 100%;
}
.search-input::placeholder { color: rgba(237,233,230,0.2); }
.clear-btn { background: transparent; border: none; color: rgba(237,233,230,0.38); cursor: pointer; display: flex; }

.tabs {
  display: flex; gap: 8px; padding: 14px 20px 0;
  position: relative; z-index: 1;
}
.tab-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 9px 16px; border-radius: 20px;
  font-family: 'Outfit', sans-serif; font-size: 12.5px; font-weight: 600;
  cursor: pointer; border: none; transition: all 0.2s;
}
.tab-btn.active { background: #8B1A1A; color: #ede9e6; box-shadow: 0 4px 14px rgba(139,26,26,0.4); }
.tab-btn:not(.active) { background: #171717; border: 1px solid rgba(255,255,255,0.07); color: rgba(237,233,230,0.4); }
.tab-count {
  background: rgba(255,255,255,0.15); border-radius: 10px;
  padding: 1px 7px; font-size: 10px;
}
.tab-count.red { background: rgba(139,26,26,0.4); color: #ff6b6b; }

.feed { padding: 12px 18px 110px; display: flex; flex-direction: column; gap: 10px; position: relative; z-index: 1; }

.card {
  background: #111111; border: 1px solid rgba(255,255,255,0.07);
  border-radius: 18px; overflow: hidden;
  animation: fadeUp 0.45s ease both;
  transition: border-color 0.2s, transform 0.15s;
  cursor: pointer;
}
.card:active { transform: scale(0.99); }
.card-pendiente { border-color: rgba(139,26,26,0.2); }
.card-aceptada { border-color: rgba(37,211,102,0.2); }
.card-rechazada { opacity: 0.5; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}

.card-top { display: flex; align-items: center; gap: 12px; padding: 14px 16px 10px; }
.card-avatar {
  width: 50px; height: 50px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 800;
  color: #ede9e6; flex-shrink: 0;
}
.card-meta { flex: 1; min-width: 0; }
.card-name { font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 700; color: #ede9e6; margin-bottom: 3px; }
.card-sub { display: flex; align-items: center; gap: 4px; color: rgba(237,233,230,0.38); font-size: 11.5px; }

.badge {
  display: inline-flex; align-items: center; gap: 4px;
  border-radius: 20px; padding: 4px 10px; font-size: 10px; font-weight: 600;
  flex-shrink: 0; font-family: 'Outfit', sans-serif;
}
.badge-red { background: rgba(139,26,26,0.14); border: 1px solid rgba(139,26,26,0.28); color: #a32020; }
.badge-gray { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: rgba(237,233,230,0.55); }

.estado-badge {
  display: flex; align-items: center; gap: 5px;
  font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.5px;
}
.estado-dot { width: 7px; height: 7px; border-radius: 50%; }
.estado-pendiente .estado-dot { background: #c9a227; box-shadow: 0 0 5px rgba(201,162,39,0.5); }
.estado-pendiente { color: #c9a227; }
.estado-aceptada .estado-dot { background: #25d366; box-shadow: 0 0 5px rgba(37,211,102,0.5); }
.estado-aceptada { color: #25d366; }
.estado-rechazada .estado-dot { background: rgba(255,80,80,0.6); }
.estado-rechazada { color: rgba(255,80,80,0.6); }

.card-divider { height: 1px; background: rgba(255,255,255,0.07); margin: 0 16px; }

.card-info { padding: 9px 16px 4px; }
.info-row { display: flex; align-items: center; gap: 7px; font-size: 12px; color: rgba(237,233,230,0.6); }
.info-val { color: rgba(237,233,230,0.75); font-weight: 500; }

.card-schedule { padding: 8px 16px; }
.sched-label { display: flex; align-items: center; gap: 5px; color: rgba(237,233,230,0.38); font-size: 11px; margin-bottom: 6px; }
.sched-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.sched-chip { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 3px 9px; font-size: 10.5px; color: rgba(237,233,230,0.45); }
.sched-chip.on { background: rgba(139,26,26,0.14); border-color: rgba(139,26,26,0.28); color: #a32020; font-weight: 600; }

.card-bottom { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px 14px; gap: 8px; }
.compat { display: flex; align-items: center; gap: 5px; font-size: 11px; color: rgba(237,233,230,0.38); }
.compat-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.compat-dot.on { background: #25d366; box-shadow: 0 0 6px rgba(37,211,102,0.5); }
.compat-dot.off { background: rgba(255,255,255,0.15); }

.btns { display: flex; gap: 6px; align-items: center; }
.btn-main {
  display: flex; align-items: center; gap: 5px;
  background: #8B1A1A; border: none; border-radius: 10px;
  color: #ede9e6; font-family: 'Outfit', sans-serif;
  font-size: 11.5px; font-weight: 700; padding: 8px 13px;
  cursor: pointer; box-shadow: 0 4px 12px rgba(139,26,26,0.35); white-space: nowrap;
}
.btn-wpp {
  display: flex; align-items: center; justify-content: center;
  background: rgba(37,211,102,0.12); border: 1px solid rgba(37,211,102,0.25);
  border-radius: 10px; color: #25d366;
  width: 36px; height: 36px; cursor: pointer; flex-shrink: 0;
}

.sol-fecha { display: flex; align-items: center; gap: 6px; padding: 8px 16px 4px; font-size: 11px; color: rgba(237,233,230,0.3); }

.sol-actions { display: flex; gap: 7px; padding: 8px 16px 14px; }
.sol-btn {
  flex: 1; padding: 9px; border-radius: 9px;
  font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 700;
  cursor: pointer; border: none; display: flex; align-items: center; justify-content: center; gap: 5px;
}
.sol-btn.accept { background: rgba(37,211,102,0.12); color: #25d366; border: 1px solid rgba(37,211,102,0.25); }
.sol-btn.reject { background: rgba(255,60,60,0.08); color: rgba(255,100,100,0.7); border: 1px solid rgba(255,60,60,0.15); }
.sol-btn.wpp { background: rgba(37,211,102,0.12); color: #25d366; border: 1px solid rgba(37,211,102,0.25); flex: 0.6; }
.sol-btn.wpp-full { flex: 1; }

.empty-state {
  display: flex; flex-direction: column; align-items: center;
  gap: 10px; padding: 60px 0; color: rgba(237,233,230,0.25);
  font-family: 'DM Sans', sans-serif; font-size: 14px; position: relative; z-index: 1;
}
.spinner {
  width: 32px; height: 32px; border-radius: 50%;
  border: 3px solid rgba(139,26,26,0.2); border-top-color: #8B1A1A;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.toast {
  position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%) translateY(20px);
  background: #1a1a1a; border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px; padding: 10px 20px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
  color: #ede9e6; z-index: 999; opacity: 0;
  transition: all 0.3s ease; pointer-events: none; white-space: nowrap;
}
.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
.toast.success { border-color: rgba(37,211,102,0.3); color: #25d366; }
.toast.error { border-color: rgba(139,26,26,0.28); color: #a32020; }

.bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
  background: rgba(7,7,7,0.96); backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255,255,255,0.07);
  display: flex; padding: 10px 0 20px;
}
.nav-item {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px;
  font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 600;
  letter-spacing: 0.5px; text-transform: uppercase;
  color: rgba(237,233,230,0.22); cursor: pointer; border: none; background: transparent;
}
.nav-item.active { color: #a32020; }
.nav-dot { width: 4px; height: 4px; border-radius: 50%; background: #a32020; margin-top: -2px; }
</style>