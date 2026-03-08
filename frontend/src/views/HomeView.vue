<template>
  <ion-page>
    <ion-content :fullscreen="true" class="home-content">
      <div class="grain"></div>
      <div class="atm-glow"></div>

      <div class="top-bar">
        <div class="brand-name"><span class="go">go</span><span class="tog">Together</span></div>
        <button class="icon-btn" @click="handleLogout"><ion-icon :icon="logOutOutline" /></button>
      </div>

      <div class="profile-hero">
        <div class="avatar-wrap" @click="triggerPhotoUpload">
          <img v-if="profilePhoto" :src="profilePhoto" class="avatar-img" />
          <div v-else class="avatar">{{ userInitial }}</div>
          <div class="avatar-badge"><ion-icon :icon="cameraOutline" /></div>
          <input ref="photoInput" type="file" accept="image/*" style="display:none" @change="onPhotoChange" />
        </div>
        <div class="stats-row">
          <div class="stat"><span class="stat-n">0</span><span class="stat-l">Viajes</span></div>
          <div v-if="isConductor" class="stat"><span class="stat-n">{{ reviews.length }}</span><span class="stat-l">Reseñas</span></div>
          <div v-if="isConductor && reviews.length > 0" class="stat"><span class="stat-n">{{ avgRating }}</span><span class="stat-l">Rating</span></div>
          <div v-if="!isConductor" class="stat"><span class="stat-n">{{ user?.university || '—' }}</span><span class="stat-l">Uni</span></div>
        </div>
      </div>

      <div class="profile-meta">
        <div class="meta-name-row">
          <span class="meta-name">{{ user?.name }}</span>
          <span class="badge" :class="isConductor ? 'badge-red' : 'badge-gray'">
            <ion-icon :icon="isConductor ? carOutline : personOutline" />
            {{ isConductor ? 'Conductor' : 'Pasajero' }}
          </span>
        </div>
        <div class="meta-city"><ion-icon :icon="locationOutline" />{{ user?.city || '—' }}</div>
        <div v-if="!editingBio" class="bio-wrap" @click="editingBio = true">
          <p class="bio-text">{{ bio || '+ Agrega una descripción...' }}</p>
          <ion-icon :icon="createOutline" class="bio-edit-icon" />
        </div>
        <div v-else class="bio-edit">
          <textarea v-model="bio" placeholder="Cuéntanos sobre ti..." rows="3" @blur="saveBio" />
        </div>
        <button class="edit-profile-btn">Editar perfil</button>
      </div>

      <div class="tabs">
        <button v-for="tab in tabs" :key="tab.id" class="tab"
          :class="{ on: activeTab === tab.id }" @click="activeTab = tab.id">
          <ion-icon :icon="tab.icon" />
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <!-- Info -->
      <div v-if="activeTab === 'info'" class="tab-content">
        <div class="info-card">
          <div class="info-row">
            <div class="info-icon-wrap"><ion-icon :icon="personOutline" /></div>
            <div class="info-col"><span class="info-lbl">Nombre</span><span class="info-val">{{ user?.name }}</span></div>
          </div>
          <div class="info-row">
            <div class="info-icon-wrap"><ion-icon :icon="mailOutline" /></div>
            <div class="info-col"><span class="info-lbl">Correo</span><span class="info-val">{{ user?.email }}</span></div>
          </div>
          <div v-if="!isConductor" class="info-row">
            <div class="info-icon-wrap"><ion-icon :icon="schoolOutline" /></div>
            <div class="info-col"><span class="info-lbl">Universidad</span><span class="info-val">{{ user?.university || '—' }}</span></div>
          </div>
          <div class="info-row">
            <div class="info-icon-wrap"><ion-icon :icon="locationOutline" /></div>
            <div class="info-col"><span class="info-lbl">Ciudad</span><span class="info-val">{{ user?.city || '—' }}</span></div>
          </div>
          <template v-if="isConductor">
            <div class="info-row">
              <div class="info-icon-wrap"><ion-icon :icon="carOutline" /></div>
              <div class="info-col"><span class="info-lbl">Vehículo</span><span class="info-val">{{ user?.car_model || '—' }}</span></div>
            </div>
            <div class="info-row">
              <div class="info-icon-wrap"><ion-icon :icon="cardOutline" /></div>
              <div class="info-col"><span class="info-lbl">Placa</span><span class="info-val">{{ user?.plate || '—' }}</span></div>
            </div>
            <div class="info-row">
              <div class="info-icon-wrap"><ion-icon :icon="speedometerOutline" /></div>
              <div class="info-col"><span class="info-lbl">Tipo</span><span class="info-val">{{ user?.vehicle_type === 'moto' ? 'Moto' : 'Carro' }}</span></div>
            </div>
          </template>
        </div>
      </div>

      <!-- Horarios -->
      <div v-if="activeTab === 'schedule'" class="tab-content">
        <div v-for="dia in dias" :key="dia.key" class="day-card">
          <button class="day-card-header" @click="toggleDia('schedule', dia.key)">
            <span class="day-name">{{ dia.label }}</span>
            <div class="day-chips">
              <span v-if="schedule[dia.key].ida" class="day-chip">↑ {{ schedule[dia.key].ida }}</span>
              <span v-if="schedule[dia.key].vuelta" class="day-chip">↓ {{ schedule[dia.key].vuelta }}</span>
            </div>
            <ion-icon :icon="openDias.schedule[dia.key] ? chevronUpOutline : chevronDownOutline" class="day-chevron" />
          </button>
          <div v-if="openDias.schedule[dia.key]" class="day-card-body">
            <div class="day-field-row">
              <div class="day-field">
                <span class="day-field-label">Ida</span>
                <input v-model="schedule[dia.key].ida" type="text" placeholder="6:30 AM" class="schedule-day-input" @input="saveSchedule" />
              </div>
              <div class="day-field">
                <span class="day-field-label">Vuelta</span>
                <input v-model="schedule[dia.key].vuelta" type="text" placeholder="5:00 PM" class="schedule-day-input" @input="saveSchedule" />
              </div>
            </div>
            <button class="btn-save-sm" @click="saveSchedule"><ion-icon :icon="checkmarkOutline" /> Guardar</button>
          </div>
        </div>
      </div>

      <!-- Ruta -->
      <div v-if="activeTab === 'route'" class="tab-content">
        <div class="vehicle-card">
          <div class="vehicle-icon-wrap"><ion-icon :icon="carOutline" /></div>
          <div class="vehicle-info">
            <span class="vehicle-model">{{ user?.car_model || 'Vehículo no registrado' }}</span>
            <span class="vehicle-sub">{{ user?.plate || '— — —' }}</span>
          </div>
        </div>
        <div v-for="dia in dias" :key="dia.key" class="day-card">
          <button class="day-card-header" @click="toggleDia('route', dia.key)">
            <span class="day-name">{{ dia.label }}</span>
            <div class="day-chips">
              <span v-if="routes[dia.key].stops.filter((s:string) => s).length > 0" class="day-chip">
                {{ routes[dia.key].stops.filter((s:string) => s).length }} paradas
              </span>
            </div>
            <ion-icon :icon="openDias.route[dia.key] ? chevronUpOutline : chevronDownOutline" class="day-chevron" />
          </button>
          <div v-if="openDias.route[dia.key]" class="day-card-body">
            <div class="stops-list">
              <div v-for="(stop, i) in routes[dia.key].stops" :key="i" class="stop-row">
                <div class="stop-dot" :class="i === 0 ? 'start' : i === routes[dia.key].stops.length - 1 ? 'end' : 'mid'"></div>
                <input v-model="routes[dia.key].stops[i]" type="text"
                  :placeholder="i === 0 ? 'Punto de partida' : i === routes[dia.key].stops.length - 1 ? 'Destino final' : `Parada ${i}`"
                  class="stop-input" />
                <button v-if="routes[dia.key].stops.length > 2" class="btn-remove" @click="removeStop(dia.key, Number(i))">
                  <ion-icon :icon="closeOutline" />
                </button>
              </div>
            </div>
            <div class="day-actions">
              <button class="btn-add" @click="addStop(dia.key)"><ion-icon :icon="addOutline" /> Parada</button>
              <button class="btn-save-sm" @click="saveRoutes"><ion-icon :icon="checkmarkOutline" /> Guardar</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Reseñas -->
      <div v-if="activeTab === 'reviews'" class="tab-content">
        <div v-if="reviews.length === 0" class="empty-state">
          <ion-icon :icon="starOutline" class="empty-icon" />
          <p>Aún no tienes reseñas</p>
        </div>
      </div>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonContent, IonIcon } from '@ionic/vue';
import {
  logOutOutline, cameraOutline, createOutline, checkmarkOutline,
  addOutline, closeOutline, starOutline, carOutline, personOutline,
  mailOutline, schoolOutline, locationOutline, cardOutline, timeOutline,
  mapOutline, speedometerOutline, chevronUpOutline, chevronDownOutline,
} from 'ionicons/icons';
import { useAuthStore } from '@/stores/authStore';

const router = useRouter();
const authStore = useAuthStore();
const user = computed(() => authStore.user);
const isConductor = computed(() => user.value?.role === 'conductor');
const userInitial = computed(() => user.value?.name?.charAt(0).toUpperCase() || '?');

// Clave única por usuario
const k = (key: string) => `user_${user.value?.id || 'guest'}_${key}`;

const profilePhoto = ref<string | null>(localStorage.getItem(k('profilePhoto')));
const photoInput = ref<HTMLInputElement | null>(null);
function triggerPhotoUpload() { photoInput.value?.click(); }
function onPhotoChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    profilePhoto.value = ev.target?.result as string;
    localStorage.setItem(k('profilePhoto'), profilePhoto.value);
  };
  reader.readAsDataURL(file);
}

const bio = ref(localStorage.getItem(k('bio')) || '');
const editingBio = ref(false);
function saveBio() { editingBio.value = false; localStorage.setItem(k('bio'), bio.value); }

const dias = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
];

const defaultSchedule = () => Object.fromEntries(dias.map(d => [d.key, { ida: '', vuelta: '' }]));
const schedule = ref(JSON.parse(localStorage.getItem(k('schedule')) || 'null') || defaultSchedule());
function saveSchedule() { localStorage.setItem(k('schedule'), JSON.stringify(schedule.value)); }

const defaultRoutes = () => Object.fromEntries(dias.map(d => [d.key, { stops: ['', ''] }]));
const routes = ref(JSON.parse(localStorage.getItem(k('routes')) || 'null') || defaultRoutes());
function addStop(diaKey: string) { routes.value[diaKey].stops.splice(routes.value[diaKey].stops.length - 1, 0, ''); }
function removeStop(diaKey: string, i: number) { routes.value[diaKey].stops.splice(i, 1); }
function saveRoutes() { localStorage.setItem(k('routes'), JSON.stringify(routes.value)); }

// Recargar datos si el usuario cambia
watch(user, () => {
  profilePhoto.value = localStorage.getItem(k('profilePhoto'));
  bio.value = localStorage.getItem(k('bio')) || '';
  schedule.value = JSON.parse(localStorage.getItem(k('schedule')) || 'null') || defaultSchedule();
  routes.value = JSON.parse(localStorage.getItem(k('routes')) || 'null') || defaultRoutes();
});

const openDias = reactive({
  schedule: Object.fromEntries(dias.map(d => [d.key, false])),
  route: Object.fromEntries(dias.map(d => [d.key, false])),
});
function toggleDia(tab: string, key: string) {
  (openDias as any)[tab][key] = !(openDias as any)[tab][key];
}

const reviews = ref<{name: string; rating: number; comment: string}[]>([]);
const avgRating = computed(() => {
  if (!reviews.value.length) return null;
  return (reviews.value.reduce((a, r) => a + r.rating, 0) / reviews.value.length).toFixed(1);
});

const tabs = computed(() => {
  const base = [
    { id: 'info', label: 'Info', icon: personOutline },
    { id: 'schedule', label: 'Horarios', icon: timeOutline },
  ];
  if (isConductor.value) {
    base.push({ id: 'route', label: 'Ruta', icon: mapOutline });
    base.push({ id: 'reviews', label: 'Reseñas', icon: starOutline });
  }
  return base;
});
const activeTab = ref('info');

function handleLogout() { authStore.logout(); router.replace('/welcome'); }
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

.home-content { --background: #070707; font-family: 'DM Sans', sans-serif; }
.grain { position: fixed; inset: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.04'/%3E%3C/svg%3E"); pointer-events: none; z-index: 0; }
.atm-glow { position: fixed; width: 300px; height: 300px; background: radial-gradient(circle, rgba(139,26,26,0.14) 0%, transparent 70%); top: -80px; left: 50%; transform: translateX(-50%); filter: blur(50px); pointer-events: none; z-index: 0; }

.top-bar { position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: center; padding: 18px 22px 0; }
.brand-name { font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 800; letter-spacing: -0.5px; }
.go { color: #ede9e6; } .tog { color: #a32020; }
.icon-btn { width: 34px; height: 34px; background: #171717; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: rgba(237,233,230,0.45); font-size: 17px; cursor: pointer; }

.profile-hero { position: relative; z-index: 1; padding: 20px 22px 16px; display: flex; align-items: center; gap: 22px; }
.avatar-wrap { position: relative; flex-shrink: 0; cursor: pointer; }
.avatar-img { width: 68px; height: 68px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(139,26,26,0.4); }
.avatar { width: 68px; height: 68px; border-radius: 50%; background: linear-gradient(135deg, #8B1A1A 0%, #4a0e0e 100%); display: flex; align-items: center; justify-content: center; font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 800; color: #ede9e6; box-shadow: 0 0 28px rgba(139,26,26,0.3); }
.avatar-badge { position: absolute; bottom: -2px; right: -2px; width: 22px; height: 22px; background: #171717; border: 1.5px solid rgba(255,255,255,0.12); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; color: rgba(237,233,230,0.5); }
.stats-row { display: flex; gap: 20px; }
.stat { display: flex; flex-direction: column; align-items: center; }
.stat-n { font-family: 'Outfit', sans-serif; font-size: 17px; font-weight: 800; color: #ede9e6; }
.stat-l { color: rgba(237,233,230,0.3); font-size: 9px; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase; }

.profile-meta { position: relative; z-index: 1; padding: 0 22px 16px; }
.meta-name-row { display: flex; align-items: center; gap: 10px; margin-bottom: 5px; }
.meta-name { font-family: 'Outfit', sans-serif; font-size: 17px; font-weight: 700; letter-spacing: -0.3px; color: #ede9e6; }
.badge { display: inline-flex; align-items: center; gap: 5px; border-radius: 20px; padding: 3px 10px; font-size: 10px; font-weight: 600; font-family: 'DM Sans', sans-serif; }
.badge ion-icon { font-size: 10px; }
.badge-red { background: rgba(139,26,26,0.14); border: 1px solid rgba(139,26,26,0.28); color: #a32020; }
.badge-gray { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); color: rgba(237,233,230,0.6); }
.meta-city { color: rgba(237,233,230,0.35); font-size: 12px; margin-bottom: 10px; display: flex; align-items: center; gap: 5px; }
.meta-city ion-icon { font-size: 12px; }
.bio-wrap { display: flex; align-items: flex-start; gap: 6px; cursor: pointer; margin-bottom: 12px; }
.bio-text { color: rgba(237,233,230,0.5); font-size: 13px; line-height: 1.55; flex: 1; }
.bio-edit-icon { color: rgba(237,233,230,0.2); font-size: 13px; flex-shrink: 0; margin-top: 2px; }
.bio-edit textarea { width: 100%; background: #171717; border: 1px solid rgba(139,26,26,0.3); border-radius: 12px; color: #ede9e6; font-family: 'DM Sans', sans-serif; font-size: 13px; padding: 12px 14px; resize: none; outline: none; box-sizing: border-box; margin-bottom: 12px; }
.edit-profile-btn { width: 100%; padding: 10px; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: #ede9e6; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; }

.tabs { position: relative; z-index: 1; display: flex; border-top: 1px solid rgba(255,255,255,0.06); border-bottom: 1px solid rgba(255,255,255,0.06); }
.tab { flex: 1; padding: 11px 4px; display: flex; flex-direction: column; align-items: center; gap: 4px; color: rgba(237,233,230,0.25); font-size: 9px; font-weight: 600; font-family: 'DM Sans', sans-serif; letter-spacing: 0.8px; text-transform: uppercase; border: none; background: transparent; border-bottom: 2px solid transparent; cursor: pointer; transition: color 0.2s, border-color 0.2s; }
.tab ion-icon { font-size: 16px; }
.tab.on { color: #a32020; border-bottom-color: #8B1A1A; }

.tab-content { position: relative; z-index: 1; padding: 16px 20px 48px; display: flex; flex-direction: column; gap: 8px; }

.info-card { background: #111111; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; overflow: hidden; }
.info-row { display: flex; align-items: center; gap: 14px; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); }
.info-row:last-child { border-bottom: none; }
.info-icon-wrap { width: 30px; height: 30px; background: #1a1a1a; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 15px; color: #a32020; flex-shrink: 0; }
.info-col { display: flex; flex-direction: column; }
.info-lbl { color: rgba(237,233,230,0.28); font-size: 9px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; }
.info-val { color: #ede9e6; font-size: 13px; font-weight: 500; margin-top: 1px; }

/* Day cards */
.day-card { background: #111111; border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; overflow: hidden; }
.day-card-header { width: 100%; display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: transparent; border: none; cursor: pointer; }
.day-name { font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 700; color: #ede9e6; min-width: 72px; text-align: left; }
.day-chips { display: flex; gap: 6px; flex: 1; flex-wrap: wrap; }
.day-chip { background: rgba(139,26,26,0.15); border: 1px solid rgba(139,26,26,0.25); border-radius: 6px; color: #a32020; font-size: 10px; font-weight: 600; padding: 2px 8px; font-family: 'DM Sans', sans-serif; }
.day-chevron { color: rgba(237,233,230,0.25); font-size: 16px; flex-shrink: 0; }
.day-card-body { padding: 0 16px 14px; border-top: 1px solid rgba(255,255,255,0.04); }
.day-field-row { display: flex; gap: 10px; margin-top: 12px; }
.day-field { display: flex; flex-direction: column; gap: 6px; flex: 1; }
.day-field-label { color: rgba(237,233,230,0.28); font-size: 9px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
.schedule-day-input { background: #1a1a1a; border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; color: #ede9e6; font-family: 'DM Sans', sans-serif; font-size: 13px; padding: 9px 12px; outline: none; width: 100%; }
.schedule-day-input::placeholder { color: rgba(237,233,230,0.18); font-size: 11px; }

/* Vehicle */
.vehicle-card { display: flex; align-items: center; gap: 14px; background: #111111; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 16px; }
.vehicle-icon-wrap { width: 44px; height: 44px; background: rgba(139,26,26,0.12); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #a32020; flex-shrink: 0; }
.vehicle-info { display: flex; flex-direction: column; }
.vehicle-model { color: #ede9e6; font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 700; }
.vehicle-sub { color: rgba(237,233,230,0.35); font-size: 11px; margin-top: 2px; }

/* Stops */
.stops-list { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.stop-row { display: flex; align-items: center; gap: 10px; }
.stop-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.stop-dot.start { background: #8B1A1A; box-shadow: 0 0 8px rgba(139,26,26,0.5); }
.stop-dot.mid { background: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.15); }
.stop-dot.end { background: rgba(237,233,230,0.5); }
.stop-input { flex: 1; background: #1a1a1a; border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; color: #ede9e6; font-family: 'DM Sans', sans-serif; font-size: 13px; padding: 9px 12px; outline: none; }
.stop-input::placeholder { color: rgba(237,233,230,0.18); }
.btn-remove { background: rgba(255,60,60,0.08); border: none; border-radius: 6px; color: rgba(255,100,100,0.6); font-size: 15px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }

.day-actions { display: flex; gap: 8px; margin-top: 10px; }
.btn-add { background: rgba(139,26,26,0.12); border: 1px solid rgba(139,26,26,0.25); border-radius: 8px; color: #a32020; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600; padding: 7px 12px; cursor: pointer; display: flex; align-items: center; gap: 4px; }
.btn-save-sm { display: flex; align-items: center; gap: 5px; background: #8B1A1A; border: none; border-radius: 8px; color: #ede9e6; font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 600; padding: 7px 14px; cursor: pointer; box-shadow: 0 4px 12px rgba(139,26,26,0.3); }

.empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 28px 0; color: rgba(237,233,230,0.25); }
.empty-icon { font-size: 32px; }
</style>