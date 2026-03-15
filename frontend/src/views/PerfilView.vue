<template>
  <ion-page>
    <ion-content :fullscreen="true" class="perfil-content">
      <div class="grain"></div>
      <div class="atm-glow"></div>

      <!-- Top bar -->
      <div class="top-bar">
        <button class="back-btn" @click="router.back()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <span class="top-title">{{ isConductor ? 'Perfil del conductor' : 'Perfil del pasajero' }}</span>
        <div style="width:34px"></div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="empty-state">
        <div class="spinner"></div>
        <p>Cargando perfil...</p>
      </div>

      <template v-else-if="perfil">

        <!-- Avatar + nombre -->
        <div class="profile-section">
          <div class="big-avatar" :style="`background:${avatarColor(perfil.name)}`">
            {{ initial(perfil.name) }}
          </div>
          <div class="profile-info">
            <div class="profile-name">{{ perfil.name }}</div>
            <div class="profile-city">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {{ perfil.city }}
            </div>
            <span class="badge" :class="isConductor ? 'badge-red' : 'badge-gray'">
              {{ isConductor ? '🚗 Conductor' : '👤 Pasajero' }}
            </span>
          </div>
        </div>

        <!-- Info card -->
        <div class="info-card">
          <div v-if="isConductor && perfil.car_model" class="info-row">
            <div class="info-icon">🚗</div>
            <div class="info-col">
              <span class="info-lbl">Vehículo</span>
              <span class="info-val">{{ perfil.car_model }} · {{ perfil.plate }}</span>
            </div>
          </div>
          <div v-if="isConductor && perfil.vehicle_type" class="info-row">
            <div class="info-icon">🏷️</div>
            <div class="info-col">
              <span class="info-lbl">Tipo</span>
              <span class="info-val">{{ perfil.vehicle_type === 'moto' ? 'Moto' : 'Carro' }} · {{ perfil.capacity }} cupos</span>
            </div>
          </div>
          <div v-if="!isConductor && perfil.university" class="info-row">
            <div class="info-icon">🎓</div>
            <div class="info-col">
              <span class="info-lbl">Universidad</span>
              <span class="info-val">{{ perfil.university }}</span>
            </div>
          </div>
          <div class="info-row">
            <div class="info-icon">✉️</div>
            <div class="info-col">
              <span class="info-lbl">Correo</span>
              <span class="info-val">{{ perfil.email }}</span>
            </div>
          </div>
        </div>

        <!-- Horario hoy -->
        <div class="today-card">
          <div class="today-title">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Horario de hoy — {{ diaHoyLabel }}
          </div>
          <div v-if="getHorario('ida') || getHorario('vuelta')" class="today-times">
            <div v-if="getHorario('ida')" class="time-chip">
              <div class="time-label">Ida</div>
              <div class="time-val">{{ getHorario('ida') }}</div>
            </div>
            <div v-if="getHorario('vuelta')" class="time-chip">
              <div class="time-label">Vuelta</div>
              <div class="time-val">{{ getHorario('vuelta') }}</div>
            </div>
          </div>
          <div v-else class="no-horario">Sin horario para hoy</div>
        </div>

        <!-- Ruta hoy (solo conductor) -->
        <div v-if="isConductor && getRuta()" class="ruta-card">
          <div class="ruta-title">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            Ruta de hoy
          </div>
          <div class="stops">
            <div v-for="(stop, i) in getRuta()" :key="i" class="stop-item">
              <div class="stop-dot" :class="i === 0 ? 'start' : i === getRuta()!.length - 1 ? 'end' : 'mid'"></div>
              <span class="stop-label">{{ stop }}</span>
            </div>
          </div>
        </div>

        <!-- Acciones -->
        <div class="actions">
          <button class="btn-primary" @click="enviarSolicitud()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            {{ myRole === 'pasajero' ? 'Solicitar cupo' : 'Invitar a viajar' }}
          </button>
          <button v-if="perfil.phone" class="btn-wpp" @click="contactarWpp(perfil.phone)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.853L0 24l6.335-1.521A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.645-.52-5.148-1.422l-.369-.218-3.763.904.937-3.666-.242-.381A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
            Contactar por WhatsApp
          </button>
        </div>

      </template>

      <!-- Toast -->
      <div class="toast" :class="{ show: toast.show, success: toast.type === 'success', error: toast.type === 'error' }">
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

const userId = Number(route.params.id);
const isConductor = route.params.role === 'conductor'; // rol del perfil que se está viendo
const myRole = authStore.user?.role;

const perfil = ref<any>(null);
const loading = ref(false);
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

async function fetchPerfil() {
  loading.value = true;
  try {
    // Buscar en la lista correcta según el rol del perfil
    const endpoint = isConductor
      ? `${API}/api/users/conductores`
      : `${API}/api/users/pasajeros`;
    const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) return;
    const lista = await res.json();
    perfil.value = lista.find((u: any) => u.id === userId) || null;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchPerfil);

function getHorario(tipo: 'ida' | 'vuelta') {
  return perfil.value?.schedule?.[diaHoy]?.[tipo] || '';
}

function getRuta(): string[] | null {
  const stops = perfil.value?.routes?.[diaHoy]?.stops;
  if (!stops || stops.length === 0) return null;
  return stops.filter(Boolean);
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
  window.open(`https://wa.me/57${phone}`, '_blank');
}

const toast = ref({ show: false, msg: '', type: 'success' });
function showToast(msg: string, type: 'success' | 'error' = 'success') {
  toast.value = { show: true, msg, type };
  setTimeout(() => { toast.value.show = false; }, 2500);
}

async function enviarSolicitud() {
  if (!perfil.value) return;
  try {
    const body = myRole === 'pasajero'
      ? { conductor_id: perfil.value.id }
      : { pasajero_id: perfil.value.id };
    const res = await fetch(`${API}/api/solicitudes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.message || 'Error', 'error'); return; }
    showToast(myRole === 'pasajero' ? '¡Cupo solicitado!' : '¡Invitación enviada!', 'success');
  } catch {
    showToast('Error al enviar solicitud', 'error');
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

.perfil-content { --background: #070707; }

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

.top-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px 14px; position: relative; z-index: 1;
}
.back-btn {
  width: 36px; height: 36px; background: #171717;
  border: 1px solid rgba(255,255,255,0.1); border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: rgba(237,233,230,0.6); cursor: pointer;
}
.top-title { font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 700; color: #ede9e6; }

.profile-section {
  display: flex; align-items: center; gap: 16px;
  padding: 4px 20px 20px; position: relative; z-index: 1;
}
.big-avatar {
  width: 72px; height: 72px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 800;
  color: #ede9e6; box-shadow: 0 0 28px rgba(139,26,26,0.3); flex-shrink: 0;
}
.profile-info { flex: 1; }
.profile-name { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 800; color: #ede9e6; margin-bottom: 4px; }
.profile-city { display: flex; align-items: center; gap: 4px; color: rgba(237,233,230,0.4); font-size: 12px; margin-bottom: 8px; }
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  border-radius: 20px; padding: 4px 10px; font-size: 10px; font-weight: 600;
  font-family: 'Outfit', sans-serif;
}
.badge-red { background: rgba(139,26,26,0.14); border: 1px solid rgba(139,26,26,0.28); color: #a32020; }
.badge-gray { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: rgba(237,233,230,0.55); }

.info-card {
  background: #111111; border: 1px solid rgba(255,255,255,0.07);
  border-radius: 16px; margin: 0 18px 12px; overflow: hidden;
  position: relative; z-index: 1;
}
.info-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); }
.info-row:last-child { border-bottom: none; }
.info-icon { width: 32px; height: 32px; background: #1a1a1a; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
.info-col { display: flex; flex-direction: column; }
.info-lbl { color: rgba(237,233,230,0.28); font-size: 9px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; }
.info-val { color: #ede9e6; font-size: 13px; font-weight: 500; margin-top: 2px; }

.today-card {
  background: rgba(139,26,26,0.1); border: 1px solid rgba(139,26,26,0.25);
  border-radius: 16px; margin: 0 18px 12px; padding: 14px 16px;
  position: relative; z-index: 1;
}
.today-title { display: flex; align-items: center; gap: 6px; color: #a32020; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px; font-family: 'Outfit', sans-serif; }
.today-times { display: flex; gap: 10px; }
.time-chip { flex: 1; background: rgba(139,26,26,0.18); border: 1px solid rgba(139,26,26,0.28); border-radius: 10px; padding: 10px 12px; text-align: center; }
.time-label { color: rgba(237,233,230,0.4); font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.time-val { color: #ede9e6; font-family: 'Outfit', sans-serif; font-size: 17px; font-weight: 700; margin-top: 3px; }
.no-horario { color: rgba(237,233,230,0.3); font-size: 13px; text-align: center; padding: 8px 0; }

.ruta-card {
  background: #111111; border: 1px solid rgba(255,255,255,0.07);
  border-radius: 16px; margin: 0 18px 12px; padding: 14px 16px;
  position: relative; z-index: 1;
}
.ruta-title { display: flex; align-items: center; gap: 6px; color: rgba(237,233,230,0.5); font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px; font-family: 'Outfit', sans-serif; }
.stops { display: flex; flex-direction: column; gap: 0; }
.stop-item { display: flex; align-items: center; gap: 10px; padding: 6px 0; position: relative; }
.stop-item:not(:last-child)::after { content: ''; position: absolute; left: 5px; top: 18px; width: 2px; height: 14px; background: rgba(139,26,26,0.3); }
.stop-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; z-index: 1; }
.stop-dot.start { background: #8B1A1A; box-shadow: 0 0 8px rgba(139,26,26,0.6); }
.stop-dot.mid { background: rgba(255,255,255,0.2); border: 1.5px solid rgba(255,255,255,0.15); }
.stop-dot.end { background: rgba(237,233,230,0.5); }
.stop-label { color: rgba(237,233,230,0.7); font-size: 13px; }

.actions { padding: 4px 18px 40px; display: flex; flex-direction: column; gap: 10px; position: relative; z-index: 1; }
.btn-primary {
  width: 100%; padding: 16px; background: #8B1A1A; border: none;
  border-radius: 14px; color: #ede9e6; font-family: 'Outfit', sans-serif;
  font-size: 14px; font-weight: 700; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  box-shadow: 0 8px 24px rgba(139,26,26,0.4);
}
.btn-wpp {
  width: 100%; padding: 14px; background: rgba(37,211,102,0.12);
  border: 1px solid rgba(37,211,102,0.25); border-radius: 14px;
  color: #25d366; font-family: 'Outfit', sans-serif;
  font-size: 13px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}

.empty-state {
  display: flex; flex-direction: column; align-items: center;
  gap: 10px; padding: 80px 0; color: rgba(237,233,230,0.25);
  font-family: 'DM Sans', sans-serif; font-size: 14px; position: relative; z-index: 1;
}
.spinner {
  width: 32px; height: 32px; border-radius: 50%;
  border: 3px solid rgba(139,26,26,0.2); border-top-color: #8B1A1A;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.toast {
  position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%) translateY(20px);
  background: #1a1a1a; border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px; padding: 10px 20px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
  color: #ede9e6; z-index: 999; opacity: 0;
  transition: all 0.3s ease; pointer-events: none; white-space: nowrap;
}
.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
.toast.success { border-color: rgba(37,211,102,0.3); color: #25d366; }
.toast.error { border-color: rgba(139,26,26,0.28); color: #a32020; }
</style>