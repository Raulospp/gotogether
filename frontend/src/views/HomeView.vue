<template>
  <ion-page>
    <ion-content :fullscreen="true" class="home-content">
      <div class="bg-glow bg-glow-1"></div>
      <div class="bg-glow bg-glow-2"></div>

      <div class="profile-header">
        <div class="header-top">
          <div class="logo-text"><span class="go">go</span><span class="together">Together</span></div>
          <button class="btn-logout" @click="handleLogout">
            <ion-icon :icon="logOutOutline" />
          </button>
        </div>

        <div class="profile-top">
          <div class="avatar-wrap" @click="triggerPhotoUpload">
            <img v-if="profilePhoto" :src="profilePhoto" class="avatar-img" />
            <div v-else class="avatar-placeholder">{{ userInitial }}</div>
            <div class="avatar-edit"><ion-icon :icon="cameraOutline" /></div>
            <input ref="photoInput" type="file" accept="image/*" style="display:none" @change="onPhotoChange" />
          </div>

          <div class="profile-stats">
            <div class="stat">
              <span class="stat-num">0</span>
              <span class="stat-label">Viajes</span>
            </div>
            <div v-if="isConductor" class="stat">
              <span class="stat-num">{{ reviews.length + 1 }}</span>
              <span class="stat-label">Reseñas</span>
            </div>
            <div v-if="isConductor" class="stat">
              <span class="stat-num">{{ avgRating || '5.0' }}</span>
              <span class="stat-label">Rating</span>
            </div>
            <div v-if="!isConductor" class="stat">
              <span class="stat-num">{{ user?.university || '—' }}</span>
              <span class="stat-label">Uni</span>
            </div>
          </div>
        </div>

        <div class="profile-info">
          <div class="profile-name-row">
            <h2 class="profile-name">{{ user?.name }}</h2>
            <span class="role-badge" :class="user?.role">{{ isConductor ? '🚗 Conductor' : '🎒 Pasajero' }}</span>
          </div>
          <p class="profile-uni">{{ user?.city }}</p>

          <div v-if="!editingBio" class="bio-wrap" @click="editingBio = true">
            <p class="bio-text">{{ bio || '+ Agrega una descripción...' }}</p>
            <ion-icon :icon="createOutline" class="edit-icon" />
          </div>
          <div v-else class="bio-edit">
            <textarea v-model="bio" placeholder="Cuéntanos sobre ti..." rows="3" @blur="saveBio" />
          </div>
        </div>

        <button class="btn-edit-profile">Editar perfil</button>
      </div>

      <div class="tabs">
        <button v-for="tab in tabs" :key="tab.id" class="tab-btn"
          :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">
          <ion-icon :icon="tab.icon" />
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <!-- Tab: Info -->
      <div v-if="activeTab === 'info'" class="tab-content">
        <div class="section-card">
          <h3 class="section-title">👤 Mis Datos</h3>
          <div class="info-list">
            <div class="info-row">
              <ion-icon :icon="personOutline" class="info-icon" />
              <div class="info-content">
                <span class="info-label">Nombre</span>
                <span class="info-value">{{ user?.name }}</span>
              </div>
            </div>
            <div class="info-row">
              <ion-icon :icon="mailOutline" class="info-icon" />
              <div class="info-content">
                <span class="info-label">Correo</span>
                <span class="info-value">{{ user?.email }}</span>
              </div>
            </div>
            <div class="info-row">
              <ion-icon :icon="schoolOutline" class="info-icon" />
              <div class="info-content">
                <span class="info-label">Universidad</span>
                <span class="info-value">{{ user?.university || user?.route || '—' }}</span>
              </div>
            </div>
            <div class="info-row">
              <ion-icon :icon="locationOutline" class="info-icon" />
              <div class="info-content">
                <span class="info-label">Ciudad</span>
                <span class="info-value">{{ user?.city || '—' }}</span>
              </div>
            </div>
            <template v-if="isConductor">
              <div class="info-row">
                <ion-icon :icon="carOutline" class="info-icon" />
                <div class="info-content">
                  <span class="info-label">Vehículo</span>
                  <span class="info-value">{{ user?.car_model || '—' }}</span>
                </div>
              </div>
              <div class="info-row">
                <ion-icon :icon="cardOutline" class="info-icon" />
                <div class="info-content">
                  <span class="info-label">Placa</span>
                  <span class="info-value">{{ user?.plate || '—' }}</span>
                </div>
              </div>
              <div class="info-row">
                <span class="info-icon vehicle-emoji">{{ user?.vehicle_type === 'moto' ? '🏍️' : '🚗' }}</span>
                <div class="info-content">
                  <span class="info-label">Tipo de vehículo</span>
                  <span class="info-value">{{ user?.vehicle_type === 'moto' ? 'Moto' : 'Carro' }}</span>
                </div>
              </div>
              <div class="info-row">
                <ion-icon :icon="peopleOutline" class="info-icon" />
                <div class="info-content">
                  <span class="info-label">Capacidad</span>
                  <span class="info-value">{{ user?.capacity || '—' }} pasajeros</span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Tab: Horarios -->
      <div v-if="activeTab === 'schedule'" class="tab-content">
        <div class="section-card">
          <h3 class="section-title">🕐 Mis Horarios</h3>
          <div class="schedule-grid">
            <div class="schedule-item">
              <div class="schedule-icon purple"><ion-icon :icon="arrowForwardOutline" /></div>
              <div class="schedule-info">
                <span class="schedule-label">Ida</span>
                <input v-model="schedule.ida" type="text" placeholder="Ej: 6:30 AM" class="schedule-input" @blur="saveSchedule" />
              </div>
            </div>
            <div class="schedule-item">
              <div class="schedule-icon blue"><ion-icon :icon="arrowBackOutline" /></div>
              <div class="schedule-info">
                <span class="schedule-label">Vuelta</span>
                <input v-model="schedule.vuelta" type="text" placeholder="Ej: 5:00 PM" class="schedule-input" @blur="saveSchedule" />
              </div>
            </div>
          </div>
          <button class="btn-save-small" @click="saveSchedule">
            <ion-icon :icon="checkmarkOutline" /> Guardar horarios
          </button>
        </div>
      </div>

      <!-- Tab: Ruta (solo conductor) -->
      <div v-if="activeTab === 'route'" class="tab-content">
        <div class="section-card">
          <h3 class="section-title">🗺️ Mi Ruta</h3>
          <div class="vehicle-card">
            <div class="vehicle-icon">{{ user?.vehicle_type === 'moto' ? '🏍️' : '🚗' }}</div>
            <div class="vehicle-info">
              <span class="vehicle-model">{{ user?.car_model || 'Vehículo no registrado' }}</span>
              <span class="vehicle-plate">{{ user?.plate || '— — —' }} · {{ user?.capacity || '?' }} puestos</span>
            </div>
          </div>
          <div class="stops-section">
            <div class="stops-header">
              <span class="stops-title">Paradas</span>
              <button class="btn-add-stop" @click="addStop">
                <ion-icon :icon="addOutline" /> Agregar parada
              </button>
            </div>
            <div class="stops-list">
              <div v-for="(stop, i) in stops" :key="i" class="stop-item">
                <div class="stop-dot" :class="i === 0 ? 'start' : i === stops.length - 1 ? 'end' : 'mid'"></div>
                <div class="stop-content">
                  <input v-model="stops[i]" type="text"
                    :placeholder="i === 0 ? 'Punto de partida' : i === stops.length - 1 ? 'Destino final' : `Parada ${i}`"
                    class="stop-input" />
                  <button v-if="stops.length > 2" class="btn-remove-stop" @click="removeStop(i)">
                    <ion-icon :icon="closeOutline" />
                  </button>
                </div>
              </div>
            </div>
            <button class="btn-save-small" @click="saveRoute">
              <ion-icon :icon="checkmarkOutline" /> Guardar ruta
            </button>
          </div>
        </div>
      </div>

      <!-- Tab: Reseñas (solo conductor) -->
      <div v-if="activeTab === 'reviews'" class="tab-content">
        <div class="section-card">
          <h3 class="section-title">⭐ Reseñas</h3>
          <div class="review-card demo">
            <div class="review-header">
              <div class="review-avatar">C</div>
              <div class="review-meta">
                <span class="review-name">Carlos M.</span>
                <div class="review-stars">
                  <ion-icon v-for="s in 5" :key="s" :icon="star" class="star filled" />
                </div>
              </div>
            </div>
            <p class="review-text">Excelente conductor, muy puntual y amable. 100% recomendado!</p>
          </div>
          <div v-if="reviews.length === 0" class="empty-state">
            <ion-icon :icon="starOutline" class="empty-icon" />
            <p>Aún no tienes más reseñas</p>
          </div>
        </div>
      </div>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonContent, IonIcon } from '@ionic/vue';
import {
  logOutOutline, cameraOutline, createOutline, checkmarkOutline,
  arrowForwardOutline, arrowBackOutline, addOutline, closeOutline,
  starOutline, star, carOutline, personOutline, mailOutline,
  schoolOutline, locationOutline, cardOutline, timeOutline, mapOutline, peopleOutline,
} from 'ionicons/icons';
import { useAuthStore } from '@/stores/authStore';

const router = useRouter();
const authStore = useAuthStore();
const user = computed(() => authStore.user);
const isConductor = computed(() => user.value?.role === 'conductor');
const userInitial = computed(() => user.value?.name?.charAt(0).toUpperCase() || '?');

const profilePhoto = ref<string | null>(localStorage.getItem('profilePhoto'));
const photoInput = ref<HTMLInputElement | null>(null);
function triggerPhotoUpload() { photoInput.value?.click(); }
function onPhotoChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    profilePhoto.value = ev.target?.result as string;
    localStorage.setItem('profilePhoto', profilePhoto.value);
  };
  reader.readAsDataURL(file);
}

const bio = ref(localStorage.getItem('bio') || '');
const editingBio = ref(false);
function saveBio() {
  editingBio.value = false;
  localStorage.setItem('bio', bio.value);
}

const schedule = ref(JSON.parse(localStorage.getItem('schedule') || '{"ida":"","vuelta":""}'));
function saveSchedule() { localStorage.setItem('schedule', JSON.stringify(schedule.value)); }

const stops = ref<string[]>(JSON.parse(localStorage.getItem('stops') || '["",""]'));
function addStop() { stops.value.splice(stops.value.length - 1, 0, ''); }
function removeStop(i: number) { stops.value.splice(i, 1); }
function saveRoute() { localStorage.setItem('stops', JSON.stringify(stops.value)); }

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

function handleLogout() {
  authStore.logout();
  router.replace('/welcome');
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;600;700;800;900&display=swap');
.home-content { --background: #0d0820; font-family: 'Exo 2', sans-serif; }
.bg-glow { position: fixed; border-radius: 50%; filter: blur(90px); pointer-events: none; z-index: 0; }
.bg-glow-1 { width: 300px; height: 300px; background: radial-gradient(circle, rgba(200,80,192,0.2), transparent 70%); top: -60px; right: -40px; }
.bg-glow-2 { width: 250px; height: 250px; background: radial-gradient(circle, rgba(65,88,208,0.2), transparent 70%); bottom: 100px; left: -40px; }
.profile-header { position: relative; z-index: 1; padding: 16px 20px 0; }
.header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.logo-text { font-size: 20px; font-weight: 800; }
.go { color: #fff; }
.together { background: linear-gradient(90deg, #c850c0, #4158d0); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-logout { background: rgba(255,255,255,0.07); border: none; border-radius: 10px; width: 36px; height: 36px; color: rgba(255,255,255,0.5); font-size: 18px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.profile-top { display: flex; align-items: center; gap: 24px; margin-bottom: 16px; }
.avatar-wrap { position: relative; width: 80px; height: 80px; flex-shrink: 0; cursor: pointer; }
.avatar-img { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #c850c0; }
.avatar-placeholder { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #c850c0, #4158d0); display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 800; color: #fff; border: 3px solid rgba(200,80,192,0.5); }
.avatar-edit { position: absolute; bottom: 0; right: 0; width: 24px; height: 24px; background: #c850c0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #fff; border: 2px solid #0d0820; }
.profile-stats { display: flex; gap: 20px; flex: 1; justify-content: center; }
.stat { display: flex; flex-direction: column; align-items: center; }
.stat-num { color: #fff; font-size: 16px; font-weight: 800; }
.stat-label { color: rgba(255,255,255,0.4); font-size: 11px; }
.profile-info { margin-bottom: 14px; }
.profile-name-row { display: flex; align-items: center; gap: 10px; margin-bottom: 2px; }
.profile-name { color: #fff; font-size: 17px; font-weight: 700; margin: 0; }
.role-badge { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 20px; }
.role-badge.conductor { background: rgba(200,80,192,0.2); color: #c850c0; border: 1px solid rgba(200,80,192,0.3); }
.role-badge.pasajero { background: rgba(65,88,208,0.2); color: #6a7de8; border: 1px solid rgba(65,88,208,0.3); }
.profile-uni { color: rgba(255,255,255,0.45); font-size: 13px; margin: 0 0 10px; }
.bio-wrap { display: flex; align-items: flex-start; gap: 6px; cursor: pointer; }
.bio-text { color: rgba(255,255,255,0.7); font-size: 13px; margin: 0; line-height: 1.5; flex: 1; }
.edit-icon { color: rgba(255,255,255,0.25); font-size: 14px; flex-shrink: 0; margin-top: 2px; }
.bio-edit textarea { width: 100%; background: rgba(255,255,255,0.07); border: 1.5px solid rgba(200,80,192,0.4); border-radius: 10px; color: #fff; font-family: 'Exo 2', sans-serif; font-size: 13px; padding: 10px 12px; resize: none; outline: none; box-sizing: border-box; }
.btn-edit-profile { width: 100%; padding: 9px; background: transparent; border: 1.5px solid rgba(255,255,255,0.15); border-radius: 10px; color: #fff; font-family: 'Exo 2', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; margin-bottom: 4px; }
.tabs { display: flex; border-bottom: 1px solid rgba(255,255,255,0.08); position: relative; z-index: 1; margin-top: 8px; }
.tab-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 4px; background: transparent; border: none; color: rgba(255,255,255,0.35); font-family: 'Exo 2', sans-serif; font-size: 10px; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; transition: color 0.2s, border-color 0.2s; }
.tab-btn ion-icon { font-size: 18px; }
.tab-btn.active { color: #c850c0; border-bottom-color: #c850c0; }
.tab-content { position: relative; z-index: 1; padding: 16px 20px 40px; }
.section-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 18px; }
.section-title { color: #fff; font-size: 15px; font-weight: 700; margin: 0 0 16px; }
.info-list { display: flex; flex-direction: column; }
.info-row { display: flex; align-items: center; gap: 14px; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
.info-row:last-child { border-bottom: none; }
.info-icon { color: #c850c0; font-size: 18px; flex-shrink: 0; }
.vehicle-emoji { font-size: 18px; }
.info-content { display: flex; flex-direction: column; }
.info-label { color: rgba(255,255,255,0.35); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.info-value { color: #fff; font-size: 14px; font-weight: 500; }
.schedule-grid { display: flex; gap: 12px; margin-bottom: 14px; }
.schedule-item { flex: 1; background: rgba(255,255,255,0.05); border-radius: 12px; padding: 14px; display: flex; align-items: center; gap: 10px; }
.schedule-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; color: #fff; flex-shrink: 0; }
.schedule-icon.purple { background: linear-gradient(135deg, #c850c0, #8b31b0); }
.schedule-icon.blue { background: linear-gradient(135deg, #4158d0, #2d3db0); }
.schedule-info { display: flex; flex-direction: column; flex: 1; }
.schedule-label { color: rgba(255,255,255,0.4); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.schedule-input { background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,0.15); outline: none; color: #fff; font-family: 'Exo 2', sans-serif; font-size: 15px; font-weight: 700; width: 100%; padding: 4px 0; }
.vehicle-card { display: flex; align-items: center; gap: 14px; background: rgba(255,255,255,0.05); border-radius: 12px; padding: 14px; margin-bottom: 16px; }
.vehicle-icon { font-size: 32px; }
.vehicle-info { display: flex; flex-direction: column; }
.vehicle-model { color: #fff; font-size: 15px; font-weight: 700; }
.vehicle-plate { color: rgba(255,255,255,0.4); font-size: 12px; }
.stops-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.stops-title { color: rgba(255,255,255,0.7); font-size: 13px; font-weight: 600; }
.btn-add-stop { background: rgba(200,80,192,0.15); border: 1px solid rgba(200,80,192,0.3); border-radius: 8px; color: #c850c0; font-family: 'Exo 2', sans-serif; font-size: 12px; font-weight: 600; padding: 6px 12px; cursor: pointer; display: flex; align-items: center; gap: 4px; }
.stops-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.stop-item { display: flex; align-items: center; gap: 12px; }
.stop-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.stop-dot.start { background: #c850c0; box-shadow: 0 0 8px rgba(200,80,192,0.6); }
.stop-dot.mid { background: rgba(255,255,255,0.3); border: 2px solid rgba(255,255,255,0.2); }
.stop-dot.end { background: #4158d0; box-shadow: 0 0 8px rgba(65,88,208,0.6); }
.stop-content { flex: 1; display: flex; align-items: center; gap: 8px; }
.stop-input { flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-family: 'Exo 2', sans-serif; font-size: 13px; padding: 10px 12px; outline: none; }
.stop-input::placeholder { color: rgba(255,255,255,0.2); }
.btn-remove-stop { background: rgba(255,80,80,0.1); border: none; border-radius: 6px; color: #ff7070; font-size: 16px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px 0; color: rgba(255,255,255,0.3); }
.empty-icon { font-size: 36px; }
.review-card { background: rgba(255,255,255,0.04); border-radius: 12px; padding: 14px; margin-bottom: 10px; }
.review-card.demo { border: 1px solid rgba(255,255,255,0.08); }
.review-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.review-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #4158d0, #c850c0); display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; color: #fff; flex-shrink: 0; }
.review-name { color: #fff; font-size: 13px; font-weight: 700; }
.review-stars { display: flex; gap: 2px; }
.star { font-size: 12px; color: rgba(255,255,255,0.2); }
.star.filled { color: #f5c518; }
.review-text { color: rgba(255,255,255,0.6); font-size: 13px; margin: 0; line-height: 1.5; }
.btn-save-small { display: flex; align-items: center; gap: 6px; background: linear-gradient(135deg, #c850c0, #8b31b0); border: none; border-radius: 10px; color: #fff; font-family: 'Exo 2', sans-serif; font-size: 13px; font-weight: 600; padding: 10px 16px; cursor: pointer; margin-top: 4px; }
</style>