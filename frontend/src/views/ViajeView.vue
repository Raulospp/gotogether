<template>
  <ion-page>
    <ion-content :fullscreen="true" class="viaje-content">
      <div class="grain"></div>
      <div class="atm-glow"></div>

      <!-- Top bar -->
      <div class="top-bar">
        <button class="back-btn" @click="router.back()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <span class="top-title">Viaje de hoy</span>
        <div v-if="viaje" class="estado-pill" :class="`estado-${viaje.estado}`">
          <div class="estado-dot"></div>
          {{ viaje.estado === 'en_curso' ? 'En curso' : viaje.estado === 'pendiente' ? 'Pendiente' : 'Confirmado' }}
        </div>
      </div>

      <div v-if="loading" class="empty-state">
        <div class="spinner"></div>
        <p>Cargando viaje...</p>
      </div>

      <template v-else-if="viaje">

        <!-- Mapa -->
        <div class="mapa-wrap">
          <MapaViaje
            :pickups="todosPickups"
            :mi-solicitud-id="!isConductor ? viaje.solicitud_id : null"
            :altura="220"
            @ubicacion-compartida="onUbicacionCompartida"
          />
        </div>

        <!-- Banner pendiente (pasajero esperando confirmación) -->
        <div v-if="!isConductor && viaje.estado === 'pendiente'" class="pendiente-banner">
          <div class="pendiente-dot"></div>
          Solicitud enviada — esperando que el conductor acepte
        </div>

        <!-- Banner en curso (pasajero) -->
        <div v-if="!isConductor && viaje.estado === 'en_curso'" class="en-curso-banner">
          <div class="en-curso-dot"></div>
          El conductor ya inició el viaje — está en camino
        </div>

        <!-- Lista pasajeros (conductor) -->
        <div v-if="isConductor && pasajeros.length > 0" class="pasajeros-list">
          <div class="pasajeros-title">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            Pasajeros ({{ pasajeros.length }})
          </div>
          <div v-for="p in pasajeros" :key="p.solicitud_id" class="pasajero-row">
            <div class="pas-av" :style="`background:${avatarColor(p.pasajero_name)}`">{{ initial(p.pasajero_name) }}</div>
            <div class="pas-info">
              <div class="pas-name">{{ p.pasajero_name }}</div>
              <div class="pas-dir" :class="p.pickup_direccion ? '' : 'sin-dir'">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/></svg>
                {{ p.pickup_direccion || 'Esperando ubicación...' }}
              </div>
            </div>
            <button v-if="p.pasajero_phone" class="pas-wpp" @click="contactarWpp(p.pasajero_phone)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.853L0 24l6.335-1.521A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.645-.52-5.148-1.422l-.369-.218-3.763.904.937-3.666-.242-.381A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
            </button>
          </div>
        </div>

        <!-- Info conductor (pasajero) -->
        <div v-if="!isConductor" class="persona-card">
          <div class="persona-top">
            <div class="persona-av" :style="`background:${avatarColor(viaje.conductor_name)}`">{{ initial(viaje.conductor_name) }}</div>
            <div class="persona-info">
              <div class="persona-name">{{ viaje.conductor_name }}</div>
              <div class="persona-sub">{{ viaje.car_model }} · {{ viaje.conductor_city }}</div>
            </div>
            <div v-if="precio" class="precio-box">
              <div class="precio-val">${{ Number(precio).toLocaleString('es-CO') }}</div>
              <div class="precio-lbl">Precio</div>
            </div>
          </div>
        </div>

        <!-- Horario -->
        <div v-if="horario.ida || horario.vuelta" class="horario-row">
          <div v-if="horario.ida" class="hora-chip">
            <div class="hora-lbl">Salida</div>
            <div class="hora-val">{{ horario.ida.split(' ')[0] }}<span class="hora-ampm">{{ horario.ida.split(' ')[1] }}</span></div>
          </div>
          <div v-if="horario.vuelta" class="hora-chip">
            <div class="hora-lbl">Regreso</div>
            <div class="hora-val">{{ horario.vuelta.split(' ')[0] }}<span class="hora-ampm">{{ horario.vuelta.split(' ')[1] }}</span></div>
          </div>
        </div>

        <!-- Acciones -->
        <div class="actions">
          <button v-if="!isConductor && telefonoOtro" class="btn-wpp" @click="contactarWpp(telefonoOtro)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.853L0 24l6.335-1.521A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.645-.52-5.148-1.422l-.369-.218-3.763.904.937-3.666-.242-.381A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
            Contactar por WhatsApp
          </button>

          <template v-if="isConductor">
            <button v-if="viaje.estado === 'aceptada'" class="btn-iniciar" @click="iniciarViaje">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Iniciar viaje
            </button>
            <button v-if="viaje.estado === 'en_curso'" class="btn-finalizar" @click="finalizarViaje">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
              Finalizar viaje
            </button>
          </template>

          <button v-if="viaje.estado === 'aceptada'" class="btn-cancel" @click="cancelarViaje">
            Cancelar viaje
          </button>
        </div>

      </template>

      <div v-else class="empty-state">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="opacity:0.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <p>Viaje no encontrado</p>
      </div>

      <div class="toast" :class="{ show: toast.show, success: toast.type==='success', error: toast.type==='error' }">{{ toast.msg }}</div>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { IonPage, IonContent } from '@ionic/vue';
import { useAuthStore } from '@/stores/authStore';
import MapaViaje from '@/views/MapaViaje.vue';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const isConductor = computed(() => authStore.user?.role === 'conductor');
const solicitudId = Number(route.params.id);
const API = 'https://gotogether-api.onrender.com';
const loading = ref(true);
const viaje = ref<any>(null);

let pollingInterval: any = null;

function getToken() { return localStorage.getItem('token') || ''; }

const diasMap: Record<number,string> = { 0:'domingo',1:'lunes',2:'martes',3:'miercoles',4:'jueves',5:'viernes',6:'sabado' };
const diaHoy = diasMap[new Date().getDay()];

async function fetchViaje() {
  try {
    // Carga el viaje específico (para estado, info conductor/pasajero, etc.)
    const res = await fetch(`${API}/api/viajes/${solicitudId}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (!res.ok) {
      // Para el conductor: intentar cargar directamente sus viajes del día
      if (isConductor.value) {
        const resMis = await fetch(`${API}/api/viajes/mis-viajes`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        if (resMis.ok) {
          const mis = await resMis.json();
          if (mis.length > 0) {
            // Construir objeto viaje con todos los pasajeros
            viaje.value = {
              solicitud_id: mis[0].solicitud_id,
              estado: mis[0].estado,
              fecha_viaje: mis[0].fecha_viaje,
              schedule: mis[0].schedule,
              routes: mis[0].routes,
              precio: mis[0].precio,
              pasajeros: mis,
            };
          } else {
            router.replace('/inicio');
          }
        } else {
          router.replace('/inicio');
        }
        return;
      }
      if (res.status === 404) { router.replace('/inicio'); return; }
      return;
    }
    viaje.value = await res.json();

    // El servidor ya devuelve viaje.pasajeros para el conductor (array completo)
    // No necesitamos una segunda llamada a mis-viajes
  } catch(e) { console.error(e); }
  finally { loading.value = false; }
}

onMounted(() => {
  fetchViaje();
  pollingInterval = setInterval(fetchViaje, 5000);
});
onUnmounted(() => { if (pollingInterval) clearInterval(pollingInterval); });

// FIX: pasajeros usa todosLosPasajeros cuando es conductor
const pasajeros = computed(() => {
  if (!isConductor.value || !viaje.value) return [];
  // Formato nuevo: servidor devuelve viaje.pasajeros como array
  if (Array.isArray(viaje.value.pasajeros) && viaje.value.pasajeros.length > 0) {
    return viaje.value.pasajeros;
  }
  // Formato actual: servidor devuelve fila plana con pasajero_name etc. en la raíz
  if (viaje.value.pasajero_name) {
    return [{
      solicitud_id:       viaje.value.solicitud_id,
      pasajero_id:        viaje.value.pasajero_id,
      pasajero_name:      viaje.value.pasajero_name,
      pasajero_phone:     viaje.value.pasajero_phone,
      pickup_lat:         viaje.value.pickup_lat,
      pickup_lon:         viaje.value.pickup_lon,
      pickup_direccion:   viaje.value.pickup_direccion,
      pickup_universidad: viaje.value.pickup_universidad,
      destino_lat:        viaje.value.destino_lat,
      destino_lon:        viaje.value.destino_lon,
    }];
  }
  return [];
});

// FIX: incluir destino_lat, destino_lon, pickup_universidad que antes faltaban
const todosPickups = computed(() => pasajeros.value.map((p: any) => ({
  lat:          p.pickup_lat       ? Number(p.pickup_lat)   : null,
  lon:          p.pickup_lon       ? Number(p.pickup_lon)   : null,
  destino_lat:  p.destino_lat      ? Number(p.destino_lat)  : null,
  destino_lon:  p.destino_lon      ? Number(p.destino_lon)  : null,
  direccion:    p.pickup_direccion  || '',
  universidad:  p.pickup_universidad || '',
  nombre:       p.pasajero_name,
})));

const telefonoOtro = computed(() => {
  if (!viaje.value) return '';
  return isConductor.value ? '' : viaje.value.conductor_phone;
});

const horario = computed(() => ({
  ida: viaje.value?.schedule?.[diaHoy]?.ida || '',
  vuelta: viaje.value?.schedule?.[diaHoy]?.vuelta || '',
}));

const precio = computed(() => viaje.value?.precio?.[diaHoy] || '');

function initial(name: string) { return name?.charAt(0).toUpperCase() || '?'; }
const avatarColors = ['linear-gradient(135deg,#8B1A1A,#4a0e0e)','linear-gradient(135deg,#1a3a8B,#0e1f4a)','linear-gradient(135deg,#1a6b3a,#0e3a1f)','linear-gradient(135deg,#6b1a6b,#3a0e3a)','linear-gradient(135deg,#2a2a6b,#1a1a3a)','linear-gradient(135deg,#5a3a1a,#3a200e)'];
function avatarColor(name: string) { return avatarColors[(name?.charCodeAt(0)||0) % avatarColors.length]; }
function contactarWpp(phone: string) { window.open(`https://wa.me/57${phone}`, '_blank'); }

const toast = ref({ show: false, msg: '', type: 'success' });
function showToast(msg: string, type: 'success'|'error' = 'success') {
  toast.value = { show: true, msg, type };
  setTimeout(() => { toast.value.show = false; }, 2500);
}

// Cuando el pasajero comparte su ubicación
async function onUbicacionCompartida(data: { lat: number; lon: number; direccion: string; universidad: string; destino_lat: number; destino_lon: number }) {
  try {
    const res = await fetch(`${API}/api/solicitudes/${solicitudId}/pickup`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({
        pickup_lat:        data.lat,
        pickup_lon:        data.lon,
        pickup_direccion:  data.direccion,
        pickup_universidad: data.universidad,
        destino_lat:       data.destino_lat,
        destino_lon:       data.destino_lon,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[pickup] error:', res.status, err);
      showToast('Error al guardar ubicación', 'error');
      return;
    }
    showToast('Ubicación compartida con el conductor', 'success');
    await fetchViaje();
  } catch(e) {
    console.error('[pickup] excepcion:', e);
    showToast('Error al compartir ubicación', 'error');
  }
}

async function iniciarViaje() {
  const res = await fetch(`${API}/api/viajes/${solicitudId}/iniciar`, { method: 'PATCH', headers: { Authorization: `Bearer ${getToken()}` } });
  if (res.ok) { viaje.value.estado = 'en_curso'; showToast('¡Viaje iniciado!', 'success'); }
}

async function finalizarViaje() {
  const res = await fetch(`${API}/api/viajes/${solicitudId}/finalizar`, { method: 'PATCH', headers: { Authorization: `Bearer ${getToken()}` } });
  if (res.ok) { showToast('¡Viaje finalizado!', 'success'); setTimeout(() => router.replace('/inicio'), 1000); }
}

async function cancelarViaje() {
  const res = await fetch(`${API}/api/solicitudes/${solicitudId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
  if (res.ok) { showToast('Viaje cancelado', 'error'); setTimeout(() => router.replace('/inicio'), 1000); }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
.viaje-content { --background: #070707; }
.grain { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.04'/%3E%3C/svg%3E"); }
.atm-glow { position: fixed; width: 350px; height: 350px; background: radial-gradient(circle, rgba(139,26,26,0.12) 0%, transparent 70%); top: -100px; left: 50%; transform: translateX(-50%); filter: blur(60px); pointer-events: none; z-index: 0; }
.top-bar { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 14px; position: relative; z-index: 1; }
.back-btn { width: 36px; height: 36px; background: #171717; border: 1px solid rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: rgba(237,233,230,0.6); cursor: pointer; }
.top-title { font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 700; color: #ede9e6; }
.estado-pill { border-radius: 20px; padding: 4px 10px; font-size: 10px; font-weight: 700; font-family: 'Outfit', sans-serif; display: flex; align-items: center; gap: 5px; }
.estado-pendiente { background: rgba(201,162,39,0.1); border: 1px solid rgba(201,162,39,0.25); color: #c9a227; }
.estado-aceptada { background: rgba(37,211,102,0.1); border: 1px solid rgba(37,211,102,0.25); color: #25d366; }
.estado-en_curso { background: rgba(139,26,26,0.14); border: 1px solid rgba(139,26,26,0.28); color: #a32020; }
.estado-dot { width: 6px; height: 6px; border-radius: 50%; animation: pulse 1.5s ease infinite; }
.estado-aceptada .estado-dot { background: #25d366; }
.estado-en_curso .estado-dot { background: #a32020; }
@keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
.mapa-wrap { margin: 0 18px 14px; border: 1px solid rgba(37,211,102,0.15); border-radius: 16px; overflow: hidden; position: relative; z-index: 1; }
.pendiente-banner { margin: 0 18px 12px; background: rgba(201,162,39,0.1); border: 1px solid rgba(201,162,39,0.22); border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; gap: 10px; font-size: 13px; color: #c9a227; font-weight: 600; font-family: 'Outfit', sans-serif; position: relative; z-index: 1; }
.pendiente-dot { width: 10px; height: 10px; border-radius: 50%; background: #c9a227; flex-shrink: 0; animation: pulse 1s ease infinite; }
.en-curso-banner { margin: 0 18px 12px; background: rgba(139,26,26,0.12); border: 1px solid rgba(139,26,26,0.25); border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; gap: 10px; font-size: 13px; color: #a32020; font-weight: 600; font-family: 'Outfit', sans-serif; position: relative; z-index: 1; }
.en-curso-dot { width: 10px; height: 10px; border-radius: 50%; background: #a32020; flex-shrink: 0; animation: pulse 1s ease infinite; }
.pasajeros-list { margin: 0 18px 12px; background: #111; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; overflow: hidden; position: relative; z-index: 1; }
.pasajeros-title { display: flex; align-items: center; gap: 6px; padding: 10px 14px; font-size: 10px; font-weight: 700; color: rgba(237,233,230,0.35); text-transform: uppercase; letter-spacing: 1px; font-family: 'Outfit', sans-serif; border-bottom: 1px solid rgba(255,255,255,0.05); }
.pasajero-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); }
.pasajero-row:last-child { border-bottom: none; }
.pas-av { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 800; color: #ede9e6; flex-shrink: 0; }
.pas-info { flex: 1; min-width: 0; }
.pas-name { font-size: 13px; font-weight: 600; color: #ede9e6; font-family: 'Outfit', sans-serif; }
.pas-dir { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #ffcc00; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pas-dir.sin-dir { color: rgba(237,233,230,0.2); }
.pas-wpp { width: 32px; height: 32px; background: rgba(37,211,102,0.1); border: 1px solid rgba(37,211,102,0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #25d366; cursor: pointer; flex-shrink: 0; }
.persona-card { margin: 0 18px 12px; background: #111; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 14px; position: relative; z-index: 1; }
.persona-top { display: flex; align-items: center; gap: 12px; }
.persona-av { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 800; color: #ede9e6; flex-shrink: 0; }
.persona-info { flex: 1; }
.persona-name { font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 700; color: #ede9e6; }
.persona-sub { font-size: 11px; color: rgba(237,233,230,0.38); margin-top: 2px; }
.precio-box { text-align: center; background: rgba(37,211,102,0.1); border: 1px solid rgba(37,211,102,0.22); border-radius: 10px; padding: 6px 10px; }
.precio-val { font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 800; color: #25d366; }
.precio-lbl { font-size: 8px; color: rgba(37,211,102,0.5); text-transform: uppercase; }
.horario-row { display: flex; gap: 8px; margin: 0 18px 12px; position: relative; z-index: 1; }
.hora-chip { flex: 1; background: rgba(139,26,26,0.1); border: 1px solid rgba(139,26,26,0.25); border-radius: 12px; padding: 10px; text-align: center; }
.hora-lbl { font-size: 9px; color: rgba(237,233,230,0.35); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
.hora-val { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 800; color: #ede9e6; }
.hora-ampm { font-size: 11px; color: rgba(237,233,230,0.4); margin-left: 2px; }
.actions { padding: 4px 18px 40px; display: flex; flex-direction: column; gap: 10px; position: relative; z-index: 1; }
.btn-wpp { width: 100%; padding: 15px; background: rgba(37,211,102,0.12); border: 1px solid rgba(37,211,102,0.25); border-radius: 14px; color: #25d366; font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
.btn-iniciar { width: 100%; padding: 16px; background: #25d366; border: none; border-radius: 14px; color: #070707; font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 8px 24px rgba(37,211,102,0.35); }
.btn-finalizar { width: 100%; padding: 16px; background: #8B1A1A; border: none; border-radius: 14px; color: #ede9e6; font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 8px 24px rgba(139,26,26,0.4); }
.btn-cancel { width: 100%; padding: 13px; background: rgba(255,60,60,0.06); border: 1px solid rgba(255,60,60,0.12); border-radius: 14px; color: rgba(255,100,100,0.6); font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; }
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 80px 0; color: rgba(237,233,230,0.25); font-family: 'DM Sans', sans-serif; font-size: 14px; position: relative; z-index: 1; }
.spinner { width: 32px; height: 32px; border-radius: 50%; border: 3px solid rgba(139,26,26,0.2); border-top-color: #8B1A1A; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.toast { position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%) translateY(20px); background: #1a1a1a; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 10px 20px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #ede9e6; z-index: 999; opacity: 0; transition: all 0.3s; pointer-events: none; white-space: nowrap; }
.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
.toast.success { border-color: rgba(37,211,102,0.3); color: #25d366; }
.toast.error { border-color: rgba(139,26,26,0.28); color: #a32020; }
</style>