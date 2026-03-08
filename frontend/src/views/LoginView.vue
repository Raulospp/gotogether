<template>
  <ion-page>
    <ion-content :fullscreen="true" class="login-content">
      <div class="grain"></div>
      <div class="atm-glow"></div>

      <div class="screen">
        <div class="back-row">
          <button class="back-btn" @click="router.back()">
            <ion-icon :icon="arrowBackOutline" />
          </button>
        </div>

        <div class="login-title">Bienvenido<br>de vuelta</div>
        <div class="login-sub">Inicia sesión para continuar</div>

        <div class="field">
          <label class="field-label">Correo electrónico</label>
          <div class="input-row">
            <ion-icon :icon="mailOutline" class="input-icon" />
            <input v-model="email" type="email" placeholder="correo@universidad.edu.co" class="input-real" />
          </div>
        </div>

        <div class="field">
          <label class="field-label">Contraseña</label>
          <div class="input-row">
            <ion-icon :icon="lockClosedOutline" class="input-icon" />
            <input v-model="password" type="password" placeholder="••••••••" class="input-real" />
          </div>
        </div>

        <p v-if="error" class="error-msg">{{ error }}</p>

        <div class="login-actions">
          <button class="btn-fill" @click="handleLogin" :disabled="loading">
            <span>{{ loading ? 'Ingresando...' : 'Iniciar sesión' }}</span>
            <ion-icon v-if="!loading" :icon="arrowForwardOutline" />
          </button>
          <div class="forgot">¿Olvidaste tu contraseña?</div>
        </div>
      </div>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { IonPage, IonContent, IonIcon } from '@ionic/vue';
import { arrowBackOutline, mailOutline, lockClosedOutline, arrowForwardOutline } from 'ionicons/icons';
import { useAuthStore } from '@/stores/authStore';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function handleLogin() {
  error.value = '';
  loading.value = true;
  try {
    await authStore.login(email.value, password.value);
    router.replace('/home');
  } catch (e: any) {
    error.value = e.message || 'Error al iniciar sesión';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

.login-content { --background: #070707; font-family: 'DM Sans', sans-serif; }

.grain {
  position: fixed; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none; z-index: 0;
}

.atm-glow {
  position: fixed;
  width: 280px; height: 280px;
  background: radial-gradient(circle, rgba(139,26,26,0.16) 0%, transparent 70%);
  top: -80px; left: 50%; transform: translateX(-50%);
  filter: blur(50px); pointer-events: none; z-index: 0;
}

.screen {
  position: relative; z-index: 1;
  padding: 56px 28px 40px;
  min-height: 100vh;
  display: flex; flex-direction: column;
  animation: fadeUp 0.5s ease both;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.back-btn {
  width: 38px; height: 38px;
  background: #171717; border: 1px solid rgba(255,255,255,0.1);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #ede9e6; font-size: 18px; cursor: pointer;
  margin-bottom: 36px;
}

.login-title {
  font-family: 'Outfit', sans-serif;
  font-size: 30px; font-weight: 800;
  letter-spacing: -1px; line-height: 1.15;
  color: #ede9e6; margin-bottom: 8px;
}

.login-sub {
  color: rgba(237,233,230,0.4);
  font-size: 14px; font-weight: 400;
  margin-bottom: 36px; line-height: 1.5;
}

.field { margin-bottom: 18px; }

.field-label {
  display: block; color: rgba(237,233,230,0.3);
  font-size: 10.5px; font-weight: 600;
  letter-spacing: 1.2px; text-transform: uppercase;
  margin-bottom: 8px; font-family: 'DM Sans', sans-serif;
}

.input-row {
  display: flex; align-items: center; gap: 12px;
  background: #171717; border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px; padding: 15px 18px;
}

.input-icon { color: rgba(237,233,230,0.25); font-size: 17px; flex-shrink: 0; }

.input-real {
  background: transparent; border: none; outline: none;
  color: #ede9e6; font-family: 'DM Sans', sans-serif;
  font-size: 14px; font-weight: 400; width: 100%;
}

.input-real::placeholder { color: rgba(237,233,230,0.2); }

.error-msg {
  color: #a32020; font-size: 13px;
  margin-bottom: 16px; text-align: center;
}

.login-actions { margin-top: 28px; }

.btn-fill {
  display: flex; align-items: center; justify-content: space-between;
  padding: 17px 20px; width: 100%;
  background: #8B1A1A; border: none; border-radius: 16px;
  color: #ede9e6; font-family: 'Outfit', sans-serif;
  font-size: 15px; font-weight: 600; cursor: pointer;
  box-shadow: 0 8px 28px rgba(139,26,26,0.4);
}

.btn-fill:disabled { opacity: 0.6; }

.forgot {
  text-align: center; margin-top: 16px;
  color: rgba(237,233,230,0.25); font-size: 12px;
}
</style>