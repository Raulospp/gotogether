<template>
  <ion-page>
    <ion-content :fullscreen="true" class="inicio-content">
      <div class="grain"></div>
      <div class="atm-glow"></div>

      <div class="screen">

        <!-- Header -->
        <div class="header">
          <div class="header-left">
            <div class="brand">go<span>Together</span></div>
            <div class="saludo">{{ saludoHora }},<br>{{ primerNombre }}</div>
            <div class="fecha">{{ fechaHoy }}</div>
          </div>
          <div class="avatar-sm">{{ initial(user?.name || '') }}</div>
        </div>

        <!-- Ticket horario -->
        <div class="ticket">
          <div class="ticket-header">
            <div class="ticket-title">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Tu horario de hoy
            </div>
            <div class="ticket-day">{{ diaHoyLabel }}</div>
          </div>

          <div v-if="horarioHoy.ida || horarioHoy.vuelta" class="ticket-body">
            <div class="ticket-slot">
              <div class="slot-dir">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                Salida
              </div>
              <div class="slot-time">
                {{ horarioHoy.ida ? horarioHoy.ida.split(' ')[0] : '—' }}<span class="slot-ampm">{{ horarioHoy.ida ? horarioHoy.ida.split(' ')[1] : '' }}</span>
              </div>
            </div>
            <div class="ticket-slot">
              <div class="slot-dir">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                Regreso
              </div>
              <div class="slot-time">
                {{ horarioHoy.vuelta ? horarioHoy.vuelta.split(' ')[0] : '—' }}<span class="slot-ampm">{{ horarioHoy.vuelta ? horarioHoy.vuelta.split(' ')[1] : '' }}</span>
              </div>
            </div>
          </div>

          <div v-else class="ticket-empty">
            Sin horario para hoy —
            <span @click="router.push('/home')">configúralo en tu perfil</span>
          </div>

          <div v-if="rutaHoy.length > 0" class="ticket-footer">
            <div class="route-stops">
              <div class="route-dot s"></div>
              <span class="route-label">{{ rutaHoy[0] }}</span>
              <div class="route-line"></div>
              <div class="route-dot e"></div>
              <span class="route-label">{{ rutaHoy[rutaHoy.length - 1] }}</span>
            </div>
          </div>
        </div>

        <!-- Solicitudes pendientes -->
        <div class="sec">
          <div class="sec-title">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Solicitudes
            <span v-if="solicitudesPendientes.length > 0" class="sec-badge">{{ solicitudesPendientes.length }}</span>
          </div>
          <div class="sec-link" @click="router.push('/solicitudes')">Ver todas</div>
        </div>

        <div v-if="loadingSolicitudes" class="empty-row">
          <div class="spinner-sm"></div> Cargando...
        </div>
        <div v-else-if="solicitudesPendientes.length === 0" class="empty-row">
          Sin solicitudes pendientes por ahora
        </div>
        <div v-else v-for="s in solicitudesPendientes.slice(0,3)" :key="s.id" class="sol-card">
          <div class="sol-av" :style="`background:${avatarColor(isConductor ? s.pasajero_name : s.conductor_name)}`">
            {{ initial(isConductor ? s.pasajero_name : s.conductor_name) }}
          </div>
          <div class="sol-info">
            <div class="sol-name">{{ isConductor ? s.pasajero_name : s.conductor_name }}</div>
            <div class="sol-sub">{{ isConductor ? s.pasajero_university : s.car_model }} · {{ isConductor ? s.pasajero_city : s.conductor_city }}</div>
          </div>
          <div v-if="isConductor" class="sol-btns">
            <button class="sol-btn ok" @click="responder(s.id, 'aceptada')">✓</button>
            <button class="sol-btn no" @click="responder(s.id, 'rechazada')">✕</button>
          </div>
          <div v-else class="estado-pill">Pendiente</div>
        </div>

        <!-- Disponibles hoy -->
        <div class="sec">
          <div class="sec-title">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            {{ isConductor ? 'Pasajeros disponibles' : 'Conductores disponibles' }}
          </div>
          <div class="sec-link" @click="router.push('/feed')">Ver todos</div>
        </div>

        <div v-if="loadingFeed" class="empty-row">
          <div class="spinner-sm"></div> Cargando...
        </div>
        <div v-else-if="usuariosHoy.length === 0" class="empty-row">
          Sin {{ isConductor ? 'pasajeros' : 'conductores' }} disponibles hoy
        </div>
        <div v-else class="mini-feed">
          <div v-for="u in usuariosHoy" :key="u.id" class="mini-card" @click="verPerfil(u)">
            <div class="mc-top">
              <div class="mc-av" :style="`background:${avatarColor(u.name)}`">{{ initial(u.name) }}</div>
              <div>
                <div class="mc-name">{{ u.name.split(' ')[0] }} {{ u.name.split(' ')[1]?.charAt(0) || '' }}.</div>
                <div class="mc-sub">{{ !isConductor ? u.car_model : u.university }} · {{ u.city }}</div>
              </div>
            </div>
            <div class="mc-times">
              <span v-if="getHorario(u,'ida')" class="mc-chip">↑ {{ getHorario(u,'ida') }}</span>
              <span v-if="getHorario(u,'vuelta')" class="mc-chip">↓ {{ getHorario(u,'vuelta') }}</span>
            </div>
          </div>
        </div>

        <!-- Mis Viajes -->
        <div class="sec">
          <div class="sec-title">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Mis viajes de hoy
          </div>
        </div>

        <div v-if="loadingViajes" class="empty-row">
          <div class="spinner-sm"></div> Cargando...
        </div>
        <div v-else-if="viajesHoy.length === 0" class="empty-row">
          Sin viajes confirmados hoy
        </div>

        <div v-else v-for="v in viajesHoy" :key="v.solicitud_id" class="viaje-card" @click="viajeAbierto = viajeAbierto === v.solicitud_id ? null : v.solicitud_id">
          <!-- Header del viaje -->
          <div class="viaje-top">
            <div class="viaje-avatar" :style="`background:${avatarColor(isConductor ? v.pasajero_name : v.conductor_name)}`">
              {{ initial(isConductor ? v.pasajero_name : v.conductor_name) }}
            </div>
            <div class="viaje-info">
              <div class="viaje-name">{{ isConductor ? v.pasajero_name : v.conductor_name }}</div>
              <div class="viaje-sub">{{ isConductor ? v.pasajero_university : v.car_model }} · {{ isConductor ? v.pasajero_city : v.conductor_city }}</div>
            </div>
            <div class="viaje-right">
              <div v-if="getPrecioHoy(v)" class="viaje-precio">${{ getPrecioHoy(v) }}</div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :style="viajeAbierto === v.solicitud_id ? 'transform:rotate(180deg)' : ''"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>

          <!-- Detalle expandible -->
          <div v-if="viajeAbierto === v.solicitud_id" class="viaje-detail">
            <div class="viaje-divider"></div>

            <!-- Horario del día -->
            <div class="viaje-horario">
              <div class="viaje-slot" v-if="getHorarioViaje(v, 'ida')">
                <span class="slot-dir">↑ Salida</span>
                <span class="slot-time">{{ getHorarioViaje(v, 'ida') }}</span>
              </div>
              <div class="viaje-slot" v-if="getHorarioViaje(v, 'vuelta')">
                <span class="slot-dir">↓ Regreso</span>
                <span class="slot-time">{{ getHorarioViaje(v, 'vuelta') }}</span>
              </div>
            </div>

            <!-- Ruta -->
            <div v-if="getRutaViaje(v).length > 0" class="viaje-ruta">
              <div v-for="(stop, i) in getRutaViaje(v)" :key="i" class="viaje-stop">
                <div class="vstop-dot" :class="i === 0 ? 'start' : i === getRutaViaje(v).length-1 ? 'end' : 'mid'"></div>
                <span class="vstop-label">{{ stop }}</span>
              </div>
            </div>

            <!-- Precio -->
            <div v-if="getPrecioHoy(v)" class="viaje-precio-row">
              <span>Valor del viaje</span>
              <span class="precio-val">${{ Number(getPrecioHoy(v)).toLocaleString('es-CO') }}</span>
            </div>

            <!-- WhatsApp -->
            <button v-if="(isConductor ? v.pasajero_phone : v.conductor_phone)" class="btn-wpp-viaje"
              @click.stop="wppViaje(isConductor ? v.pasajero_phone : v.conductor_phone)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.853L0 24l6.335-1.521A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.645-.52-5.148-1.422l-.369-.218-3.763.904.937-3.666-.242-.381A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
              Contactar por WhatsApp
            </button>
          </div>
        </div>

        <div style="height:20px"></div>

      </div>

      <!-- Toast -->
      <div class="toast" :class="{ show: toast.show, success: toast.type==='success', error: toast.type==='error' }">
        {{ toast.msg }}
      </div>

      <!-- Nav Bar -->
      <div class="bottom-nav">
        <button class="nav-item active">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          <span>Inicio</span>
          <div class="nav-dot"></div>
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
const user = computed(() => authStore.user);
const isConductor = computed(() => user.value?.role === 'conductor');

const API = 'http://localhost:3000';
const pendientesCount = ref(0);

async function fetchPendientesCount() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`${API}/api/solicitudes/pendientes-count`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) { const data = await res.json(); pendientesCount.value = data.count; }
  } catch(e) {}
}
const loadingSolicitudes = ref(false);
const loadingFeed = ref(false);
const solicitudes = ref<any[]>([]);
const usuariosFeed = ref<any[]>([]);

// ── Día y fecha ───────────────────────────────────────────────────────────────
const diasMap: Record<number,string> = { 0:'domingo',1:'lunes',2:'martes',3:'miercoles',4:'jueves',5:'viernes',6:'sabado' };
const diasLabel: Record<number,string> = { 0:'Domingo',1:'Lunes',2:'Martes',3:'Miércoles',4:'Jueves',5:'Viernes',6:'Sábado' };
const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const now = new Date();
const diaHoy = diasMap[now.getDay()];
const diaHoyLabel = diasLabel[now.getDay()];
const fechaHoy = `${diasLabel[now.getDay()]}, ${now.getDate()} de ${meses[now.getMonth()]}`;
const hora = now.getHours();
const saludoHora = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';
const primerNombre = computed(() => user.value?.name?.split(' ')[0] || '');

// ── Horario y ruta del usuario logueado ──────────────────────────────────────
const userId = computed(() => user.value?.id);
const horarioHoy = computed(() => {
  if (!userId.value) return { ida: '', vuelta: '' };
  try {
    const raw = localStorage.getItem(`user_${userId.value}_schedule`);
    return raw ? (JSON.parse(raw)[diaHoy] || { ida:'', vuelta:'' }) : { ida:'', vuelta:'' };
  } catch { return { ida:'', vuelta:'' }; }
});
const rutaHoy = computed(() => {
  if (!userId.value) return [];
  try {
    const raw = localStorage.getItem(`user_${userId.value}_routes`);
    return raw ? ((JSON.parse(raw)[diaHoy]?.stops || []).filter(Boolean)) : [];
  } catch { return []; }
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem('token') || ''; }

const loadingViajes = ref(false);
const viajes = ref<any[]>([]);
const viajeAbierto = ref<number|null>(null);

async function fetchViajes() {
  loadingViajes.value = true;
  try {
    // Limpiar viajes pasados primero
    await fetch(`${API}/api/viajes/limpiar-pasados`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` }
    }).catch(() => {});

    const res = await fetch(`${API}/api/viajes/mis-viajes`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (res.ok) viajes.value = await res.json();
  } catch(e) { console.error(e); }
  finally { loadingViajes.value = false; }
}

// Solo viajes de hoy
const viajesHoy = computed(() => viajes.value);

function getHorarioViaje(v: any, tipo: 'ida'|'vuelta', dia?: string) {
  const d = dia || diaHoy;
  return v.schedule?.[d]?.[tipo] || '';
}
function getRutaViaje(v: any, dia?: string) {
  const d = dia || diaHoy;
  return (v.routes?.[d]?.stops || []).filter(Boolean);
}
function getPrecioHoy(v: any, dia?: string) {
  const d = dia || diaHoy;
  return v.precio?.[d] || '';
}
function wppViaje(phone: string) {
  if (phone) window.open(`https://wa.me/57${phone}`, '_blank');
}

async function fetchSolicitudes() {
  loadingSolicitudes.value = true;
  try {
    const res = await fetch(`${API}/api/solicitudes/mis-solicitudes`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (res.ok) solicitudes.value = await res.json();
  } catch(e) { console.error(e); }
  finally { loadingSolicitudes.value = false; }
}

async function fetchFeed() {
  loadingFeed.value = true;
  try {
    const endpoint = isConductor.value ? `${API}/api/users/pasajeros` : `${API}/api/users/conductores`;
    const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) usuariosFeed.value = await res.json();
  } catch(e) { console.error(e); }
  finally { loadingFeed.value = false; }
}

onMounted(() => { fetchSolicitudes(); fetchFeed(); fetchPendientesCount(); fetchViajes(); });

// ── Computeds ─────────────────────────────────────────────────────────────────
const solicitudesPendientes = computed(() => solicitudes.value.filter(s => s.estado === 'pendiente'));
const usuariosHoy = computed(() => usuariosFeed.value.filter(u => u.schedule?.[diaHoy]?.ida).slice(0, 6));

function getHorario(u: any, tipo: 'ida'|'vuelta') { return u.schedule?.[diaHoy]?.[tipo] || ''; }

// ── Helpers ───────────────────────────────────────────────────────────────────
function initial(name: string) { return name?.charAt(0).toUpperCase() || '?'; }
const avatarColors = ['linear-gradient(135deg,#8B1A1A,#4a0e0e)','linear-gradient(135deg,#1a3a8B,#0e1f4a)','linear-gradient(135deg,#1a6b3a,#0e3a1f)','linear-gradient(135deg,#6b1a6b,#3a0e3a)','linear-gradient(135deg,#2a2a6b,#1a1a3a)','linear-gradient(135deg,#5a3a1a,#3a200e)'];
function avatarColor(name: string) { return avatarColors[(name?.charCodeAt(0)||0) % avatarColors.length]; }

function verPerfil(u: any) {
  const role = isConductor.value ? 'pasajero' : 'conductor';
  router.push(`/perfil/${role}/${u.id}`);
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
      await fetchSolicitudes();
    }
  } catch { showToast('Error', 'error'); }
}

const toast = ref({ show: false, msg: '', type: 'success' });
function showToast(msg: string, type: 'success'|'error' = 'success') {
  toast.value = { show: true, msg, type };
  setTimeout(() => { toast.value.show = false; }, 2500);
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

.inicio-content { --background: #070707; }
.grain { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.04'/%3E%3C/svg%3E"); }
.atm-glow { position: fixed; width: 350px; height: 350px; background: radial-gradient(circle, rgba(139,26,26,0.13) 0%, transparent 70%); top: -100px; left: 50%; transform: translateX(-50%); filter: blur(60px); pointer-events: none; z-index: 0; }

.screen { position: relative; z-index: 1; padding-bottom: 100px; }

/* Header */
.header { padding: 22px 22px 0; display: flex; justify-content: space-between; align-items: flex-start; }
.brand { font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700; color: rgba(237,233,230,0.38); letter-spacing: 0.5px; margin-bottom: 8px; }
.brand span { color: #a32020; }
.saludo { font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 800; color: #ede9e6; letter-spacing: -0.5px; line-height: 1.2; }
.fecha { font-size: 11px; color: rgba(237,233,230,0.35); margin-top: 5px; }
.avatar-sm { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg,#8B1A1A,#4a0e0e); display: flex; align-items: center; justify-content: center; font-family: 'Outfit', sans-serif; font-size: 17px; font-weight: 800; color: #ede9e6; box-shadow: 0 0 18px rgba(139,26,26,0.35); flex-shrink: 0; }

/* Ticket */
.ticket { margin: 20px 18px 0; background: #111111; border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; overflow: hidden; }
.ticket-header { background: linear-gradient(135deg, rgba(139,26,26,0.22), rgba(139,26,26,0.08)); border-bottom: 1px solid rgba(139,26,26,0.25); padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; }
.ticket-title { font-family: 'Outfit', sans-serif; font-size: 11px; font-weight: 700; color: #a32020; letter-spacing: 1px; text-transform: uppercase; display: flex; align-items: center; gap: 6px; }
.ticket-day { font-family: 'Outfit', sans-serif; font-size: 11px; font-weight: 600; color: rgba(237,233,230,0.3); }
.ticket-body { display: flex; }
.ticket-slot { flex: 1; padding: 16px 18px; }
.ticket-slot:first-child { border-right: 1px dashed rgba(255,255,255,0.08); }
.slot-dir { font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: rgba(237,233,230,0.4); margin-bottom: 5px; display: flex; align-items: center; gap: 5px; }
.slot-time { font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 800; color: #ede9e6; letter-spacing: -1px; }
.slot-ampm { font-size: 13px; font-weight: 500; color: rgba(237,233,230,0.45); margin-left: 2px; }
.ticket-empty { padding: 20px 18px; font-size: 13px; color: rgba(237,233,230,0.3); }
.ticket-empty span { color: #a32020; cursor: pointer; font-weight: 600; }
.ticket-footer { border-top: 1px dashed rgba(255,255,255,0.07); padding: 10px 18px; }
.route-stops { display: flex; align-items: center; gap: 6px; overflow: hidden; }
.route-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.route-dot.s { background: #8B1A1A; box-shadow: 0 0 5px rgba(139,26,26,0.5); }
.route-dot.e { background: rgba(237,233,230,0.4); }
.route-line { flex: 1; height: 1px; background: repeating-linear-gradient(90deg, rgba(255,255,255,0.15) 0, rgba(255,255,255,0.15) 4px, transparent 4px, transparent 8px); }
.route-label { font-size: 10.5px; color: rgba(237,233,230,0.45); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90px; }

/* Section */
.sec { display: flex; justify-content: space-between; align-items: center; padding: 20px 20px 10px; }
.sec-title { font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 700; color: rgba(237,233,230,0.45); letter-spacing: 0.8px; text-transform: uppercase; display: flex; align-items: center; gap: 6px; }
.sec-badge { background: rgba(139,26,26,0.3); color: #ff8080; border-radius: 10px; padding: 2px 8px; font-size: 10px; font-weight: 700; }
.sec-link { font-size: 11px; color: #a32020; font-weight: 600; cursor: pointer; }

/* Solicitud */
.sol-card { margin: 0 18px 8px; background: #111111; border: 1px solid rgba(139,26,26,0.2); border-radius: 14px; padding: 12px 14px; display: flex; align-items: center; gap: 10px; }
.sol-av { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 800; color: #ede9e6; flex-shrink: 0; }
.sol-info { flex: 1; min-width: 0; }
.sol-name { font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700; color: #ede9e6; margin-bottom: 2px; }
.sol-sub { font-size: 11px; color: rgba(237,233,230,0.38); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sol-btns { display: flex; gap: 6px; }
.sol-btn { width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; }
.sol-btn.ok { background: rgba(37,211,102,0.12); border: 1px solid rgba(37,211,102,0.25); color: #25d366; }
.sol-btn.no { background: rgba(255,60,60,0.08); border: 1px solid rgba(255,60,60,0.15); color: rgba(255,100,100,0.7); }
.estado-pill { font-size: 10px; font-weight: 600; font-family: 'Outfit', sans-serif; padding: 4px 10px; border-radius: 20px; background: rgba(201,162,39,0.12); border: 1px solid rgba(201,162,39,0.25); color: #c9a227; white-space: nowrap; }

/* Mini feed */
.mini-feed { display: flex; gap: 10px; padding: 0 18px; overflow-x: auto; scrollbar-width: none; }
.mini-feed::-webkit-scrollbar { display: none; }
.mini-card { background: #111111; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 12px 14px; min-width: 145px; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; cursor: pointer; transition: border-color 0.2s; }
.mini-card:active { border-color: rgba(139,26,26,0.3); transform: scale(0.98); }
.mc-top { display: flex; align-items: center; gap: 8px; }
.mc-av { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 800; color: #ede9e6; flex-shrink: 0; }
.mc-name { font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 700; color: #ede9e6; }
.mc-sub { font-size: 10px; color: rgba(237,233,230,0.38); }
.mc-times { display: flex; gap: 4px; }
.mc-chip { background: rgba(139,26,26,0.14); border: 1px solid rgba(139,26,26,0.25); border-radius: 5px; padding: 2px 7px; font-size: 9.5px; color: #a32020; font-weight: 600; }

/* Empty row */
.empty-row { display: flex; align-items: center; gap: 8px; padding: 12px 20px; font-size: 12px; color: rgba(237,233,230,0.25); font-family: 'DM Sans', sans-serif; }
.spinner-sm { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(139,26,26,0.2); border-top-color: #8B1A1A; animation: spin 0.8s linear infinite; flex-shrink: 0; }

.viaje-dia-header { display: flex; align-items: center; gap: 8px; padding: 14px 20px 6px; }
.viaje-dia-label { font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700; color: rgba(237,233,230,0.5); text-transform: uppercase; letter-spacing: 0.5px; }
.viaje-dia-tag { font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 10px; font-family: 'Outfit', sans-serif; background: rgba(255,255,255,0.06); color: rgba(237,233,230,0.3); }
.viaje-dia-tag.hoy { background: rgba(139,26,26,0.2); color: #a32020; }
.viaje-dia-header.pasado .viaje-dia-label { color: rgba(237,233,230,0.25); }
.viaje-card.pasado { opacity: 0.45; }
.viaje-card { margin: 0 18px 8px; background: #111111; border: 1px solid rgba(37,211,102,0.2); border-radius: 14px; overflow: hidden; cursor: pointer; position: relative; z-index: 1; transition: border-color 0.2s; }
.viaje-fecha-bar { display: flex; align-items: center; gap: 6px; padding: 8px 14px 4px; font-size: 10.5px; color: rgba(237,233,230,0.3); border-bottom: 1px solid rgba(255,255,255,0.04); }
.viaje-dia-badge { font-family: 'Outfit', sans-serif; font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 6px; background: rgba(37,211,102,0.1); border: 1px solid rgba(37,211,102,0.2); color: #25d366; text-transform: uppercase; letter-spacing: 0.5px; }
.viaje-dia-badge.hoy { background: rgba(139,26,26,0.2); border-color: rgba(139,26,26,0.3); color: #a32020; }
.viaje-card:active { transform: scale(0.99); }
.viaje-top { display: flex; align-items: center; gap: 10px; padding: 12px 14px; }
.viaje-avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 800; color: #ede9e6; flex-shrink: 0; }
.viaje-info { flex: 1; min-width: 0; }
.viaje-name { font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700; color: #ede9e6; margin-bottom: 2px; }
.viaje-sub { font-size: 11px; color: rgba(237,233,230,0.38); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.viaje-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.viaje-precio { background: rgba(37,211,102,0.1); border: 1px solid rgba(37,211,102,0.2); border-radius: 8px; padding: 3px 8px; font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 700; color: #25d366; }
.viaje-detail { padding: 0 14px 14px; }
.viaje-divider { height: 1px; background: rgba(255,255,255,0.06); margin-bottom: 12px; }
.viaje-horario { display: flex; gap: 10px; margin-bottom: 10px; }
.viaje-slot { flex: 1; background: rgba(139,26,26,0.1); border: 1px solid rgba(139,26,26,0.2); border-radius: 8px; padding: 8px 10px; text-align: center; }
.slot-dir { display: block; font-size: 9px; color: rgba(237,233,230,0.35); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
.slot-time { font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 700; color: #ede9e6; }
.viaje-ruta { margin-bottom: 10px; }
.viaje-stop { display: flex; align-items: center; gap: 8px; padding: 4px 0; position: relative; }
.viaje-stop:not(:last-child)::after { content: ''; position: absolute; left: 5px; top: 16px; width: 2px; height: 12px; background: rgba(139,26,26,0.3); }
.vstop-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; z-index: 1; }
.vstop-dot.start { background: #8B1A1A; box-shadow: 0 0 6px rgba(139,26,26,0.5); }
.vstop-dot.mid { background: rgba(255,255,255,0.15); border: 1.5px solid rgba(255,255,255,0.1); }
.vstop-dot.end { background: rgba(237,233,230,0.4); }
.vstop-label { font-size: 12px; color: rgba(237,233,230,0.65); }
.viaje-precio-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.05); margin-top: 4px; font-size: 12px; color: rgba(237,233,230,0.4); }
.precio-val { font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 800; color: #25d366; }
.btn-wpp-viaje { width: 100%; margin-top: 10px; padding: 10px; background: rgba(37,211,102,0.1); border: 1px solid rgba(37,211,102,0.22); border-radius: 10px; color: #25d366; font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Toast */
.toast { position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%) translateY(20px); background: #1a1a1a; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 10px 20px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: #ede9e6; z-index: 999; opacity: 0; transition: all 0.3s ease; pointer-events: none; white-space: nowrap; }
.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
.toast.success { border-color: rgba(37,211,102,0.3); color: #25d366; }
.toast.error { border-color: rgba(139,26,26,0.28); color: #a32020; }

/* Nav */
.bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; z-index: 100; background: rgba(7,7,7,0.96); backdrop-filter: blur(20px); border-top: 1px solid rgba(255,255,255,0.07); display: flex; padding: 10px 0 20px; }
.nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: rgba(237,233,230,0.22); cursor: pointer; border: none; background: transparent; }
.nav-item.active { color: #a32020; }
.nav-dot { width: 4px; height: 4px; border-radius: 50%; background: #a32020; margin-top: -2px; }
.nav-badge { position: absolute; top: 2px; right: 14px; background: #a32020; color: #ede9e6; border-radius: 10px; font-size: 8px; font-weight: 700; padding: 1px 5px; min-width: 14px; text-align: center; }
</style>