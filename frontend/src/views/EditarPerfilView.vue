<template>
  <ion-page>
    <ion-content :fullscreen="true" class="edit-content">
      <div class="grain"></div>
      <div class="atm-glow"></div>

      <div class="screen">
        <div class="top-row">
          <button class="back-btn" @click="router.back()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div class="top-title">Editar perfil</div>
          <div style="width:36px"></div>
        </div>

        <div class="form">

          <div class="section-label">Información personal</div>

          <div class="field">
            <label class="field-label">Nombre completo</label>
            <div class="input-row">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <input v-model="form.name" type="text" placeholder="Tu nombre completo" class="input-real" />
            </div>
          </div>

          <div class="field">
            <label class="field-label">Ciudad</label>
            <div class="input-row">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <input v-model="form.city" type="text" placeholder="Tu ciudad" class="input-real" />
            </div>
          </div>

          <div class="field">
            <label class="field-label">Celular</label>
            <div class="input-row">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.14 12 19.79 19.79 0 0 1 1.08 3.4 2 2 0 0 1 3.05 1.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.17a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/></svg>
              <input v-model="form.phone" type="tel" placeholder="Ej: 3001234567" class="input-real" />
            </div>
          </div>

          <!-- Solo pasajero -->
          <div v-if="!isConductor" class="field">
            <label class="field-label">Universidad</label>
            <div class="input-row">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
              <input v-model="form.university" type="text" placeholder="Tu universidad" class="input-real" />
            </div>
          </div>

          <!-- Solo conductor -->
          <template v-if="isConductor">
            <div class="section-label" style="margin-top:8px">Vehículo</div>
            <div class="field">
              <label class="field-label">Modelo del vehículo</label>
              <div class="input-row">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><path d="m16 8 4 4-4 4V8z"/></svg>
                <input v-model="form.car_model" type="text" placeholder="Ej: Chevrolet Spark 2020" class="input-real" />
              </div>
            </div>
            <div class="field">
              <label class="field-label">Placa</label>
              <div class="input-row">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                <input v-model="form.plate" type="text" placeholder="Ej: ABC123" class="input-real" style="text-transform:uppercase" />
              </div>
            </div>
          </template>

          <div class="section-label" style="margin-top:8px">Seguridad</div>

          <div class="field">
            <label class="field-label">Nueva contraseña</label>
            <div class="input-row">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input v-model="form.password" type="password" placeholder="Dejar vacío para no cambiar" class="input-real" />
            </div>
          </div>

          <div class="field">
            <label class="field-label">Confirmar contraseña</label>
            <div class="input-row">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input v-model="form.confirmPassword" type="password" placeholder="Confirmar nueva contraseña" class="input-real" />
            </div>
          </div>

          <p v-if="error" class="error-msg">{{ error }}</p>
          <p v-if="success" class="success-msg">¡Perfil actualizado!</p>

          <button class="btn-save" @click="handleSave" :disabled="loading">
            {{ loading ? 'Guardando...' : 'Guardar cambios' }}
            <svg v-if="!loading" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          </button>

        </div>
      </div>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonContent } from '@ionic/vue';
import { useAuthStore } from '@/stores/authStore';

const router = useRouter();
const authStore = useAuthStore();
const user = computed(() => authStore.user);
const isConductor = computed(() => user.value?.role === 'conductor');

const API = 'http://localhost:3000';

const form = ref({
  name: user.value?.name || '',
  city: user.value?.city || '',
  phone: (user.value as any)?.phone || '',
  university: user.value?.university || '',
  car_model: user.value?.car_model || '',
  plate: user.value?.plate || '',
  password: '',
  confirmPassword: '',
});

const loading = ref(false);
const error = ref('');
const success = ref(false);

async function handleSave() {
  error.value = '';
  success.value = false;

  if (form.value.password && form.value.password !== form.value.confirmPassword) {
    error.value = 'Las contraseñas no coinciden';
    return;
  }

  loading.value = true;
  try {
    const token = localStorage.getItem('token');
    const body: any = {};
    if (form.value.name)       body.name = form.value.name;
    if (form.value.city)       body.city = form.value.city;
    if (form.value.phone)      body.phone = form.value.phone;
    if (form.value.university) body.university = form.value.university;
    if (form.value.car_model)  body.car_model = form.value.car_model;
    if (form.value.plate)      body.plate = form.value.plate.toUpperCase();
    if (form.value.password)   body.password = form.value.password;

    const res = await fetch(`${API}/api/auth/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) { error.value = data.message || 'Error al guardar'; return; }

    // Actualizar localStorage y store
    const updatedUser = { ...user.value, ...data.user };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    authStore.user = updatedUser as any;

    success.value = true;
    form.value.password = '';
    form.value.confirmPassword = '';

    setTimeout(() => router.back(), 1200);
  } catch (e) {
    error.value = 'Error al conectar con el servidor';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

.edit-content { --background: #070707; }
.grain { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.04'/%3E%3C/svg%3E"); }
.atm-glow { position: fixed; width: 300px; height: 300px; background: radial-gradient(circle, rgba(139,26,26,0.14) 0%, transparent 70%); top: -80px; left: 50%; transform: translateX(-50%); filter: blur(50px); pointer-events: none; z-index: 0; }

.screen { position: relative; z-index: 1; padding: 18px 24px 48px; min-height: 100vh; animation: fadeUp 0.4s ease both; }
@keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }

.top-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
.back-btn { width: 36px; height: 36px; background: #171717; border: 1px solid rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: rgba(237,233,230,0.6); cursor: pointer; }
.top-title { font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; color: #ede9e6; }

.form { display: flex; flex-direction: column; gap: 14px; }

.section-label { font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 700; color: rgba(237,233,230,0.3); letter-spacing: 1.2px; text-transform: uppercase; padding-bottom: 2px; border-bottom: 1px solid rgba(255,255,255,0.05); }

.field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 10.5px; font-weight: 600; color: rgba(237,233,230,0.3); letter-spacing: 1px; text-transform: uppercase; font-family: 'DM Sans', sans-serif; }
.input-row { display: flex; align-items: center; gap: 12px; background: #111111; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 14px 16px; transition: border-color 0.2s; }
.input-row:focus-within { border-color: rgba(139,26,26,0.4); }
.input-row svg { color: rgba(237,233,230,0.25); flex-shrink: 0; }
.input-real { background: transparent; border: none; outline: none; color: #ede9e6; font-family: 'DM Sans', sans-serif; font-size: 14px; width: 100%; }
.input-real::placeholder { color: rgba(237,233,230,0.2); }

.error-msg { color: #a32020; font-size: 13px; text-align: center; }
.success-msg { color: #25d366; font-size: 13px; text-align: center; font-weight: 600; }

.btn-save { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 16px; background: #8B1A1A; border: none; border-radius: 14px; color: #ede9e6; font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 700; cursor: pointer; box-shadow: 0 8px 24px rgba(139,26,26,0.4); margin-top: 8px; }
.btn-save:disabled { opacity: 0.6; }
</style>