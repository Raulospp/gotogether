<template>
  <ion-page>
    <ion-content :fullscreen="true" class="login-content">
      <div class="bg-glow"></div>
      <div class="login-wrapper">

        <button class="back-btn" @click="router.back()">
          <ion-icon :icon="chevronBackOutline" />
        </button>

        <div class="logo-mini">
          <span class="brand-go">go</span><span class="brand-together">Together</span>
        </div>

        <h1 class="page-title">Inicio de sesión</h1>

        <div class="form-card">
          <div class="field-group">
            <div class="input-wrap" :class="{ focused: focused === 'email' }">
              <ion-icon :icon="mailOutline" class="input-icon" />
              <input v-model="email" type="email" placeholder="Correo"
                @focus="focused = 'email'" @blur="focused = ''" />
            </div>
          </div>

          <div class="field-group">
            <div class="input-wrap" :class="{ focused: focused === 'password' }">
              <ion-icon :icon="lockClosedOutline" class="input-icon" />
              <input v-model="password" :type="showPass ? 'text' : 'password'" placeholder="Contraseña"
                @focus="focused = 'password'" @blur="focused = ''" />
              <ion-icon :icon="showPass ? eyeOffOutline : eyeOutline" class="input-icon-right" @click="showPass = !showPass" />
            </div>
          </div>

          <div v-if="error" class="error-msg">
            <ion-icon :icon="alertCircleOutline" /> {{ error }}
          </div>

          <button class="btn-submit" :disabled="loading" @click="handleLogin">
            <ion-spinner v-if="loading" name="crescent" />
            <span v-else>Ingresar como {{ role === 'pasajero' ? 'Usuario' : 'Conductor' }}</span>
          </button>

          <p class="forgot" @click="">Olvide mi contraseña</p>
        </div>

      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { IonPage, IonContent, IonIcon, IonSpinner } from '@ionic/vue';
import { chevronBackOutline, mailOutline, lockClosedOutline, eyeOutline, eyeOffOutline, alertCircleOutline } from 'ionicons/icons';
import { authService } from '@/services/authService';

const router = useRouter();
const route = useRoute();
const role = route.params.role as string;

const email = ref('');
const password = ref('');
const showPass = ref(false);
const focused = ref('');
const loading = ref(false);
const error = ref('');

async function handleLogin() {
  if (!email.value || !password.value) {
    error.value = 'Completa todos los campos';
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    await authService.login(email.value, password.value);
    router.replace('/home');
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Credenciales inválidas';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;600;700;800;900&display=swap');
.login-content { --background: #12082a; font-family: 'Exo 2', sans-serif; }
.bg-glow { position: fixed; width: 350px; height: 350px; background: radial-gradient(circle, rgba(200,80,192,0.25), transparent 70%); filter: blur(80px); top: -80px; right: -60px; pointer-events: none; z-index: 0; }
.login-wrapper { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; min-height: 100vh; padding: 24px; }
.back-btn { background: rgba(255,255,255,0.07); border: none; border-radius: 10px; width: 38px; height: 38px; color: #fff; font-size: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; align-self: flex-start; margin-bottom: 32px; }
.logo-mini { font-size: 22px; font-weight: 800; margin-bottom: 8px; }
.brand-go { color: #fff; }
.brand-together { background: linear-gradient(90deg, #c850c0, #4158d0); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.page-title { color: #fff; font-size: 24px; font-weight: 700; margin: 0 0 32px; }
.form-card { width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: 14px; }
.input-wrap { display: flex; align-items: center; background: rgba(255,255,255,0.07); border: 1.5px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 0 14px; transition: border-color 0.2s, box-shadow 0.2s; }
.input-wrap.focused { border-color: #c850c0; box-shadow: 0 0 0 3px rgba(200,80,192,0.18); }
.input-icon { color: rgba(255,255,255,0.35); font-size: 18px; flex-shrink: 0; }
.input-icon-right { color: rgba(255,255,255,0.35); font-size: 18px; flex-shrink: 0; cursor: pointer; }
.input-wrap input { flex: 1; background: transparent; border: none; outline: none; color: #fff; font-family: 'Exo 2', sans-serif; font-size: 15px; padding: 14px 10px; }
.input-wrap input::placeholder { color: rgba(255,255,255,0.25); }
.error-msg { display: flex; align-items: center; gap: 8px; background: rgba(255,80,80,0.1); border: 1px solid rgba(255,80,80,0.25); color: #ff7070; border-radius: 8px; padding: 10px 14px; font-size: 13px; }
.btn-submit { width: 100%; padding: 15px; background: linear-gradient(135deg, #c850c0, #8b31b0); border: none; border-radius: 12px; color: #fff; font-family: 'Exo 2', sans-serif; font-size: 16px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 24px rgba(200,80,192,0.4); transition: transform 0.15s; margin-top: 4px; }
.btn-submit:active { transform: scale(0.97); }
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.forgot { text-align: center; color: rgba(255,255,255,0.4); font-size: 13px; cursor: pointer; margin: 4px 0 0; }
</style>