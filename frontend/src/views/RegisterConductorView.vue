<template>
  <ion-page>
    <ion-content :fullscreen="true" class="register-content">
      <div class="bg-glow-top"></div>
      <div class="register-wrapper">
        <button class="back-btn" @click="router.back()">
          <ion-icon :icon="chevronBackOutline" />
        </button>
        <h1 class="page-title">REGISTRO – <span class="title-accent">CONDUCTOR</span></h1>
        <div class="form-card">

          <div class="field-group">
            <label>Nombre completo</label>
            <div class="input-wrap" :class="{ focused: focused === 'name' }">
              <input v-model="form.name" type="text" placeholder="Tu nombre completo" @focus="focused = 'name'" @blur="focused = ''" />
            </div>
          </div>

          <div class="field-group">
            <label>Correo electrónico</label>
            <div class="input-wrap" :class="{ focused: focused === 'email' }">
              <input v-model="form.email" type="email" placeholder="correo@ejemplo.com" @focus="focused = 'email'" @blur="focused = ''" />
            </div>
          </div>

          <div class="field-group">
            <label>Número de celular</label>
            <div class="input-wrap" :class="{ focused: focused === 'phone' }">
              <input v-model="form.phone" type="tel" placeholder="Ej: 3001234567" @focus="focused = 'phone'" @blur="focused = ''" />
            </div>
          </div>

          <div class="field-group">
            <label>Ciudad</label>
            <div class="input-wrap" :class="{ focused: focused === 'city' }">
              <input v-model="form.city" type="text" placeholder="Ej: Cali" @focus="focused = 'city'" @blur="focused = ''" />
            </div>
          </div>

          <div class="field-group">
            <label>Universidad destino</label>
            <div class="input-wrap" :class="{ focused: focused === 'university' }">
              <input v-model="form.university" type="text" placeholder="Ej: Univalle" @focus="focused = 'university'" @blur="focused = ''" />
            </div>
          </div>

          <div class="field-group">
            <label>Vehículo</label>
            <div class="input-wrap" :class="{ focused: focused === 'model' }">
              <input v-model="form.model" type="text" placeholder="Ej: Chevrolet Spark 2020" @focus="focused = 'model'" @blur="focused = ''" />
            </div>
          </div>

          <div class="field-group">
            <label>Placa</label>
            <div class="input-wrap" :class="{ focused: focused === 'plate' }">
              <input v-model="form.plate" type="text" placeholder="Ej: ABC 123" style="text-transform: uppercase" @focus="focused = 'plate'" @blur="focused = ''" />
            </div>
          </div>

          <div class="field-group">
            <label>Contraseña</label>
            <div class="input-wrap" :class="{ focused: focused === 'password' }">
              <input v-model="form.password" :type="showPass ? 'text' : 'password'" placeholder="Mínimo 6 caracteres" @focus="focused = 'password'" @blur="focused = ''" />
              <ion-icon :icon="showPass ? eyeOffOutline : eyeOutline" class="input-icon-right" @click="showPass = !showPass" />
            </div>
          </div>

          <div v-if="error" class="error-msg">
            <ion-icon :icon="alertCircleOutline" /> {{ error }}
          </div>

          <button class="btn-submit" :disabled="loading" @click="handleSubmit">
            <ion-spinner v-if="loading" name="crescent" />
            <span v-else>Registrarme</span>
          </button>
          <button class="btn-cancel" @click="router.back()">Cancelar</button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonContent, IonIcon, IonSpinner } from '@ionic/vue';
import { chevronBackOutline, alertCircleOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons';
import { useAuthStore } from '@/stores/authStore';

const router = useRouter();
const authStore = useAuthStore();
const loading = ref(false);
const error = ref('');
const focused = ref('');
const showPass = ref(false);

const form = ref({ name: '', email: '', phone: '', city: '', university: '', model: '', plate: '', password: '' });

async function handleSubmit() {
  const { name, email, phone, city, university, model, plate, password } = form.value;
  if (!name || !email || !phone || !city || !university || !model || !plate || !password) {
    error.value = 'Por favor completa todos los campos';
    return;
  }
  if (password.length < 6) {
    error.value = 'La contraseña debe tener mínimo 6 caracteres';
    return;
  }
  error.value = '';
  loading.value = true;
  try {
    await authStore.registerConductor({
      name, email, password, city,
      car_model: model, plate,
      route: university,
    });
    router.replace('/home');
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Error al registrarse';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;600;700;800;900&display=swap');
.register-content { --background: #12082a; font-family: 'Exo 2', sans-serif; }
.bg-glow-top { position: fixed; width: 300px; height: 300px; background: radial-gradient(circle, rgba(200,80,192,0.25), transparent 70%); filter: blur(60px); top: -80px; right: -60px; pointer-events: none; z-index: 0; }
.register-wrapper { position: relative; z-index: 1; padding: 20px 22px 40px; min-height: 100vh; display: flex; flex-direction: column; }
.back-btn { background: rgba(255,255,255,0.07); border: none; border-radius: 10px; width: 38px; height: 38px; color: #fff; font-size: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; margin-bottom: 20px; align-self: flex-start; }
.page-title { font-size: 22px; font-weight: 900; color: #fff; letter-spacing: 1px; margin: 0 0 24px; text-transform: uppercase; }
.title-accent { background: linear-gradient(90deg, #c850c0, #9b50d0); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.form-card { display: flex; flex-direction: column; gap: 14px; }
.field-group label { display: block; color: rgba(255,255,255,0.75); font-size: 13px; font-weight: 600; margin-bottom: 6px; }
.input-wrap { background: rgba(255,255,255,0.07); border: 1.5px solid rgba(255,255,255,0.1); border-radius: 10px; transition: border-color 0.2s; position: relative; display: flex; align-items: center; }
.input-wrap.focused { border-color: #c850c0; box-shadow: 0 0 0 3px rgba(200,80,192,0.18); }
.input-wrap input { flex: 1; background: transparent; border: none; outline: none; color: #fff; font-family: 'Exo 2', sans-serif; font-size: 14px; padding: 13px 14px; box-sizing: border-box; }
.input-wrap input::placeholder { color: rgba(255,255,255,0.22); }
.input-icon-right { color: rgba(255,255,255,0.35); font-size: 18px; padding-right: 12px; cursor: pointer; flex-shrink: 0; }
.error-msg { display: flex; align-items: center; gap: 8px; background: rgba(255,80,80,0.1); border: 1px solid rgba(255,80,80,0.25); color: #ff7070; border-radius: 8px; padding: 10px 14px; font-size: 13px; }
.btn-submit { width: 100%; padding: 15px; background: linear-gradient(135deg, #c850c0, #8b31b0); border: none; border-radius: 12px; color: #fff; font-family: 'Exo 2', sans-serif; font-size: 16px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 24px rgba(200,80,192,0.4); transition: transform 0.15s; margin-top: 6px; }
.btn-submit:active { transform: scale(0.97); }
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-cancel { background: transparent; border: none; color: rgba(255,255,255,0.45); font-family: 'Exo 2', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; padding: 8px; text-align: center; }
</style>