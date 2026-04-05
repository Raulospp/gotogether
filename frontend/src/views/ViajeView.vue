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
        <div class="estado-pill">
          <div class="estado-dot"></div>
          Confirmado
        </div>
      </div>

      <div v-if="loading" class="empty-state">
        <div class="spinner"></div>
        <p>Cargando viaje...</p>
      </div>

      <template v-else-if="viaje">

        <!-- Mapa placeholder -->
        <div class="mapa-placeholder">
          <div class="mapa-grid"></div>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(37,211,102,0.35)" stroke-width="1.5" style="position:relative;z-index:1"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          <div class="mapa-label">Mapa disponible próximamente</div>
        </div>

        <!-- Ruta -->
        <div v-if="ruta.length > 0" class="seccion">
          <div class="sec-title">Ruta del viaje</div>
          <div class="ruta-card">
            <div v-for="(stop, i) in ruta" :key="i" class="stop-row">
              <div class="stop-dot" :class="i === 0 ? 'start' : i === ruta.length-1 ? 'end' : 'mid'"></div>
              <div class="stop-info">
                <div class="stop-name">{{ stop }}</div>
                <div class="stop-tag">{{ i === 0 ? 'Punto de salida' : i === ruta.length-1 ? 'Destino final' : 'Parada' }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Horario -->
        <div class="horario-row">
          <div v-if="horario.ida" class="hora-chip">
            <div class="hora-lbl">Salida</div>
            <div class="hora-val">
              {{ horario.ida.split(' ')[0] }}<span class="hora-ampm">{{ horario.ida.split(' ')[1] }}</span>
            </div>
          </div>
          <div v-if="horario.vuelta" class="hora-chip">
            <div class="hora-lbl">Regreso</div>
            <div class="hora-val">
              {{ horario.vuelta.split(' ')[0] }}<span class="hora-ampm">{{ horario.vuelta.split(' ')[1] }}</span>
            </div>
          </div>
        </div>

        <!-- Info conductor/pasajero -->
        <div class="persona-card">
          <div class="persona-top">
            <div class="persona-av" :style="`background:${avatarColor(nombreOtro)}`">
              {{ initial(nombreOtro) }}
            </div>
            <div class="persona-info">
              <div class="persona-name">{{ nombreOtro }}</div>
              <div class="persona-sub">{{ subOtro }}</div>
            </div>
            <div v-if="precio" class="precio-box">
              <div class="precio-val">${{ Number(precio).toLocaleString('es-CO') }}</div>
              <div class="precio-lbl">{{ isConductor ? 'Cobrar' : 'Precio' }}</div>
            </div>
          </div>
          <div class="persona-chips">
            <span v-if="!isConductor && viaje.car_model" class="chip">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><path d="m16 8 4 4-4 4V8z"/></svg>
              {{ viaje.car_model }} · {{ viaje.plate }}
            </span>
            <span v-if="isConductor && viaje.pasajero_university" class="chip">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
              {{ viaje.pasajero_university }}
            </span>
            <span class="chip">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {{ isConductor ? viaje.pasajero_city : viaje.conductor_city }}
            </span>
          </div>
        </div>

        <!-- Acciones -->
        <div class="actions">
          <button v-if="telefonoOtro" class="btn-wpp" @click="contactarWpp(telefonoOtro)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.853L0 24l6.335-1.521A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.645-.52-5.148-1.422l-.369-.218-3.763.904.937-3.666-.242-.381A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
            Contactar por WhatsApp
          </button>
          <button class="btn-cancel" @click="cancelarViaje">Cancelar viaje</button>
        </div>

      </template>

      <div v-else class="empty-state">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="opacity:0.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <p>Viaje no encontrado</p>
      </div>

      <!-- Toast -->
      <div class="toast" :class="{ show: toast.show, success: toast.type==='success', error: toast.type==='error' }">
        {{ toast.msg }}
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
const isConductor = computed(() => authStore.user?.role === 'conductor');

const solicitudId = Number(route.params.id);
const API = 'http://localhost:3000';
const loading = ref(false);
const viaje = ref<any>(null);

function getToken() { return localStorage.getItem('token') || ''; }

// Día actual
const diasMap: Record<number,string> = {
  0:'domingo',1:'lunes',2:'martes',3:'miercoles',4:'jueves',5:'viernes',6:'sabado'
};
const diaHoy = diasMap[new Date().getDay()];

async function fetchViaje() {
  loading.value = true;
  try {
    const res = await fetch(`${API}/api/viajes/mis-viajes`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (!res.ok) return;
    const lista = await res.json();
    viaje.value = lista.find((v: any) => v.solicitud_id === solicitudId) || null;
  } catch(e) { console.error(e); }
  finally { loading.value = false; }
}

onMounted(fetchViaje);

// Helpers
const nombreOtro = computed(() => {
  if (!viaje.value) return '';
  return isConductor.value ? viaje.value.pasajero_name : viaje.value.conductor_name;
});

const subOtro = computed(() => {
  if (!viaje.value) return '';
  if (isConductor.value) return `${viaje.value.pasajero_university || ''} · ${viaje.value.pasajero_city || ''}`;
  return `${viaje.value.car_model || ''} · ${viaje.value.conductor_city || ''}`;
});

const telefonoOtro = computed(() => {
  if (!viaje.value) return '';
  return isConductor.value ? viaje.value.pasajero_phone : viaje.value.conductor_phone;
});

const horario = computed(() => {
  if (!viaje.value) return { ida: '', vuelta: '' };
  return {
    ida: viaje.value.schedule?.[diaHoy]?.ida || '',
    vuelta: viaje.value.schedule?.[diaHoy]?.vuelta || '',
  };
});

const ruta = computed(() => {
  if (!viaje.value) return [];
  return (viaje.value.routes?.[diaHoy]?.stops || []).filter(Boolean);
});

const precio = computed(() => {
  if (!viaje.value) return '';
  return viaje.value.precio?.[diaHoy] || '';
});

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
  return avatarColors[(name?.charCodeAt(0)||0) % avatarColors.length];
}

function contactarWpp(phone: string) {
  window.open(`https://wa.me/57${phone}`, '_blank');
}

const toast = ref({ show: false, msg: '', type: 'success' });
function showToast(msg: string, type: 'success'|'error' = 'success') {
  toast.value = { show: true, msg, type };
  setTimeout(() => { toast.value.show = false; }, 2500);
}

async function cancelarViaje() {
  try {
    const res = await fetch(`${API}/api/solicitudes/${solicitudId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) {
      showToast('Viaje cancelado', 'error');
      setTimeout(() => router.replace('/inicio'), 1000);
    } else {
      showToast('No puedes cancelar este viaje', 'error');
    }
  } catch {
    showToast('Error al cancelar', 'error');
  }
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
.estado-pill { background: rgba(37,211,102,0.1); border: 1px solid rgba(37,211,102,0.25); border-radius: 20px; padding: 4px 10px; font-size: 10px; font-weight: 700; color: #25d366; font-family: 'Outfit', sans-serif; display: flex; align-items: center; gap: 5px; }
.estado-dot { width: 6px; height: 6px; border-radius: 50%; background: #25d366; animation: pulse 1.5s ease infinite; }
@keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }

.mapa-placeholder { margin: 0 18px 14px; height: 170px; background: #0a140a; border: 1px solid rgba(37,211,102,0.15); border-radius: 18px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; position: relative; z-index: 1; overflow: hidden; }
.mapa-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(37,211,102,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(37,211,102,0.04) 1px, transparent 1px); background-size: 28px 28px; }
.mapa-label { font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 600; color: rgba(37,211,102,0.35); letter-spacing: 1px; text-transform: uppercase; position: relative; z-index: 1; }

.seccion { padding: 0 18px; margin-bottom: 12px; position: relative; z-index: 1; }
.sec-title { font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 700; color: rgba(237,233,230,0.35); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }

.ruta-card { background: #111111; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 12px 14px; }
.stop-row { display: flex; align-items: center; gap: 12px; padding: 5px 0; position: relative; }
.stop-row:not(:last-child)::after { content: ''; position: absolute; left: 5px; top: 18px; width: 2px; height: 16px; background: rgba(139,26,26,0.3); }
.stop-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; z-index: 1; }
.stop-dot.start { background: #8B1A1A; box-shadow: 0 0 8px rgba(139,26,26,0.6); }
.stop-dot.mid { background: rgba(255,255,255,0.2); border: 1.5px solid rgba(255,255,255,0.15); }
.stop-dot.end { background: rgba(237,233,230,0.5); }
.stop-info { flex: 1; }
.stop-name { font-size: 13px; color: #ede9e6; font-weight: 500; }
.stop-tag { font-size: 9px; color: rgba(237,233,230,0.3); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 1px; }

.horario-row { display: flex; gap: 8px; margin: 0 18px 12px; position: relative; z-index: 1; }
.hora-chip { flex: 1; background: rgba(139,26,26,0.1); border: 1px solid rgba(139,26,26,0.25); border-radius: 12px; padding: 12px; text-align: center; }
.hora-lbl { font-size: 9px; color: rgba(237,233,230,0.35); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
.hora-val { font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 800; color: #ede9e6; }
.hora-ampm { font-size: 12px; font-weight: 500; color: rgba(237,233,230,0.4); margin-left: 2px; }

.persona-card { margin: 0 18px 12px; background: #111111; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 14px 16px; position: relative; z-index: 1; }
.persona-top { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.persona-av { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 800; color: #ede9e6; flex-shrink: 0; }
.persona-info { flex: 1; min-width: 0; }
.persona-name { font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 800; color: #ede9e6; margin-bottom: 3px; }
.persona-sub { font-size: 11.5px; color: rgba(237,233,230,0.38); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.precio-box { text-align: center; flex-shrink: 0; background: rgba(37,211,102,0.1); border: 1px solid rgba(37,211,102,0.22); border-radius: 10px; padding: 8px 12px; }
.precio-val { font-family: 'Outfit', sans-serif; font-size: 17px; font-weight: 800; color: #25d366; }
.precio-lbl { font-size: 8px; color: rgba(37,211,102,0.5); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 1px; }
.persona-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 4px 10px; font-size: 10.5px; color: rgba(237,233,230,0.45); display: flex; align-items: center; gap: 5px; }

.actions { padding: 4px 18px 40px; display: flex; flex-direction: column; gap: 10px; position: relative; z-index: 1; }
.btn-wpp { width: 100%; padding: 15px; background: rgba(37,211,102,0.12); border: 1px solid rgba(37,211,102,0.25); border-radius: 14px; color: #25d366; font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
.btn-cancel { width: 100%; padding: 13px; background: rgba(255,60,60,0.06); border: 1px solid rgba(255,60,60,0.12); border-radius: 14px; color: rgba(255,100,100,0.6); font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; }

.empty-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 80px 0; color: rgba(237,233,230,0.25); font-family: 'DM Sans', sans-serif; font-size: 14px; position: relative; z-index: 1; }
.spinner { width: 32px; height: 32px; border-radius: 50%; border: 3px solid rgba(139,26,26,0.2); border-top-color: #8B1A1A; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.toast { position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%) translateY(20px); background: #1a1a1a; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 10px 20px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: #ede9e6; z-index: 999; opacity: 0; transition: all 0.3s ease; pointer-events: none; white-space: nowrap; }
.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
.toast.success { border-color: rgba(37,211,102,0.3); color: #25d366; }
.toast.error { border-color: rgba(139,26,26,0.28); color: #a32020; }
</style>