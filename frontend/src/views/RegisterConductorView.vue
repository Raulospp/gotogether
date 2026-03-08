<template>
  <ion-page>
    <ion-content :fullscreen="true" class="reg-content">
      <div class="grain"></div>
      <div class="atm-glow"></div>

      <!-- Pantalla de éxito -->
      <div v-if="emailSent" class="screen screen-center">
        <div class="success-icon">✉️</div>
        <h1 class="title" style="text-align:center">Revisa tu correo</h1>
        <p class="sub" style="text-align:center; margin-bottom:0">Te enviamos un link de verificación a <strong style="color:#a32020">{{ form.email }}</strong>. Haz clic en el link para activar tu cuenta.</p>
        <button class="btn-fill" style="margin-top:32px" @click="router.replace('/login/conductor')">
          Ir al inicio de sesión
          <ion-icon :icon="arrowForwardOutline" />
        </button>
      </div>

      <!-- Formulario -->
      <div v-else class="screen">
        <div class="top-row">
          <button class="back-btn" @click="router.back()">
            <ion-icon :icon="arrowBackOutline" />
          </button>
          <div class="step-label">Conductor</div>
        </div>

        <h1 class="title">Crea tu cuenta</h1>
        <p class="sub">Completa tu información para empezar</p>

        <div class="form">
          <div class="field">
            <label class="field-label">Nombre completo</label>
            <div class="input-row">
              <ion-icon :icon="personOutline" class="input-icon" />
              <input v-model="form.name" type="text" placeholder="Tu nombre" class="input-real" />
            </div>
          </div>
          <div class="field">
            <label class="field-label">Número de celular</label>
            <div class="input-row">
              <ion-icon :icon="callOutline" class="input-icon" />
              <input v-model="form.phone" type="tel" placeholder="Ej: 3001234567" class="input-real" />
            </div>
          </div>
          <div class="field">
            <label class="field-label">Correo electrónico</label>
            <div class="input-row">
              <ion-icon :icon="mailOutline" class="input-icon" />
              <input v-model="form.email" type="email" placeholder="correo@universidad.edu.co" class="input-real" />
            </div>
          </div>
          <div class="field">
            <label class="field-label">Ciudad</label>
            <div class="input-row">
              <ion-icon :icon="locationOutline" class="input-icon" />
              <input v-model="form.city" type="text" placeholder="Ej: Cali" class="input-real" />
            </div>
          </div>
          <div class="field">
            <label class="field-label">Tipo de vehículo</label>
            <div class="toggle-row">
              <button class="toggle-btn" :class="{ active: form.vehicle_type === 'carro' }" @click="form.vehicle_type = 'carro'">
                <ion-icon :icon="carOutline" /> Carro
              </button>
              <button class="toggle-btn" :class="{ active: form.vehicle_type === 'moto' }" @click="form.vehicle_type = 'moto'">
                <ion-icon :icon="speedometerOutline" /> Moto
              </button>
            </div>
          </div>
          <div class="field">
            <label class="field-label">Modelo del vehículo</label>
            <div class="input-row">
              <ion-icon :icon="carOutline" class="input-icon" />
              <input v-model="form.car_model" type="text" placeholder="Ej: Chevrolet Spark 2020" class="input-real" />
            </div>
          </div>
          <div class="field">
            <label class="field-label">Placa</label>
            <div class="input-row">
              <ion-icon :icon="cardOutline" class="input-icon" />
              <input v-model="form.plate" type="text" placeholder="Ej: ABC 123" class="input-real" />
            </div>
          </div>
          <div class="field">
            <label class="field-label">Contraseña</label>
            <div class="input-row">
              <ion-icon :icon="lockClosedOutline" class="input-icon" />
              <input v-model="form.password" type="password" placeholder="Mínimo 6 caracteres" class="input-real" />
            </div>
          </div>

          <p v-if="error" class="error-msg">{{ error }}</p>

          <button class="btn-fill" @click="handleRegister" :disabled="loading">
            {{ loading ? 'Registrando...' : 'Crear cuenta' }}
            <ion-icon v-if="!loading" :icon="arrowForwardOutline" />
          </button>
        </div>
      </div>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonContent, IonIcon } from '@ionic/vue';
import {
  arrowBackOutline, personOutline, mailOutline, locationOutline,
  carOutline, cardOutline, lockClosedOutline, arrowForwardOutline,
  speedometerOutline, callOutline
} from 'ionicons/icons';
import { useAuthStore } from '@/stores/authStore';

const router = useRouter();
const authStore = useAuthStore();

const form = ref({ name: '', phone: '', email: '', city: '', vehicle_type: 'carro', car_model: '', plate: '', password: '' });
const error = ref('');
const loading = ref(false);
const emailSent = ref(false);

async function handleRegister() {
  error.value = '';
  loading.value = true;
  try {
    await authStore.registerConductor({ ...form.value, capacity: form.value.vehicle_type === 'moto' ? 2 : 4 });
    emailSent.value = true;
  } catch (e: any) {
    error.value = e.message || 'Error al registrarse';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

.reg-content { --background: #070707; font-family: 'DM Sans', sans-serif; }
.grain { position: fixed; inset: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.04'/%3E%3C/svg%3E"); pointer-events: none; z-index: 0; }
.atm-glow { position: fixed; width: 280px; height: 280px; background: radial-gradient(circle, rgba(139,26,26,0.15) 0%, transparent 70%); top: -80px; left: 50%; transform: translateX(-50%); filter: blur(50px); pointer-events: none; z-index: 0; }

.screen { position: relative; z-index: 1; padding: 56px 28px 48px; min-height: 100vh; animation: fadeUp 0.5s ease both; }
.screen-center { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; }
.success-icon { font-size: 56px; margin-bottom: 20px; }
@keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

.top-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
.back-btn { width: 38px; height: 38px; background: #171717; border: 1px solid rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ede9e6; font-size: 18px; cursor: pointer; }
.step-label { font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 600; color: #a32020; background: rgba(139,26,26,0.12); border: 1px solid rgba(139,26,26,0.25); border-radius: 20px; padding: 4px 12px; }

.title { font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 800; letter-spacing: -0.8px; color: #ede9e6; margin-bottom: 6px; }
.sub { color: rgba(237,233,230,0.38); font-size: 13.5px; margin-bottom: 28px; line-height: 1.6; }

.form { display: flex; flex-direction: column; gap: 18px; }
.field { display: flex; flex-direction: column; gap: 8px; }
.field-label { color: rgba(237,233,230,0.3); font-size: 10.5px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; }
.input-row { display: flex; align-items: center; gap: 12px; background: #171717; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 15px 18px; }
.input-icon { color: rgba(237,233,230,0.22); font-size: 17px; flex-shrink: 0; }
.input-real { background: transparent; border: none; outline: none; color: #ede9e6; font-family: 'DM Sans', sans-serif; font-size: 14px; width: 100%; }
.input-real::placeholder { color: rgba(237,233,230,0.18); }

.toggle-row { display: flex; gap: 10px; }
.toggle-btn { flex: 1; padding: 13px; background: #171717; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; color: rgba(237,233,230,0.45); font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; transition: all 0.2s; }
.toggle-btn.active { background: rgba(139,26,26,0.15); border-color: rgba(139,26,26,0.35); color: #a32020; }

.error-msg { color: #a32020; font-size: 13px; text-align: center; }
.btn-fill { display: flex; align-items: center; justify-content: space-between; padding: 17px 20px; width: 100%; background: #8B1A1A; border: none; border-radius: 16px; color: #ede9e6; font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 600; cursor: pointer; box-shadow: 0 8px 28px rgba(139,26,26,0.4); }
.btn-fill:disabled { opacity: 0.6; }
</style>