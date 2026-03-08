<template>
  <ion-page>
    <ion-content :fullscreen="true" class="reg-content">
      <div class="grain"></div>
      <div class="atm-glow"></div>

      <div class="screen">
        <button class="back-btn" @click="router.back()">
          <ion-icon :icon="arrowBackOutline" />
        </button>

        <div class="header">
          <div class="brand-name"><span class="go">go</span><span class="tog">Together</span></div>
          <h1 class="title">¿Cómo quieres<br>registrarte?</h1>
          <p class="sub">Elige tu rol en la plataforma</p>
        </div>

        <div class="cards">
          <button class="role-card" @click="router.push('/register/pasajero')">
            <div class="card-icon">
              <ion-icon :icon="personOutline" />
            </div>
            <div class="card-body">
              <span class="card-title">Pasajero</span>
              <span class="card-desc">Busca conductores y comparte el viaje a la U</span>
            </div>
            <ion-icon :icon="chevronForwardOutline" class="card-arrow" />
          </button>

          <button class="role-card role-card-red" @click="router.push('/register/conductor')">
            <div class="card-icon card-icon-red">
              <ion-icon :icon="carOutline" />
            </div>
            <div class="card-body">
              <span class="card-title">Conductor</span>
              <span class="card-desc">Ofrece tu vehículo y lleva estudiantes a la U</span>
            </div>
            <ion-icon :icon="chevronForwardOutline" class="card-arrow" />
          </button>
        </div>

        <div class="login-hint">
          ¿Ya tienes cuenta? <em @click="router.push('/login/pasajero')">Inicia sesión</em>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { IonPage, IonContent, IonIcon } from '@ionic/vue';
import { arrowBackOutline, personOutline, carOutline, chevronForwardOutline } from 'ionicons/icons';
const router = useRouter();
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

.reg-content { --background: #070707; font-family: 'DM Sans', sans-serif; }

.grain { position: fixed; inset: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.04'/%3E%3C/svg%3E"); pointer-events: none; z-index: 0; }

.atm-glow { position: fixed; width: 280px; height: 280px; background: radial-gradient(circle, rgba(139,26,26,0.15) 0%, transparent 70%); top: -80px; left: 50%; transform: translateX(-50%); filter: blur(50px); pointer-events: none; z-index: 0; }

.screen { position: relative; z-index: 1; padding: 56px 28px 40px; min-height: 100vh; display: flex; flex-direction: column; animation: fadeUp 0.5s ease both; }

@keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

.back-btn { width: 38px; height: 38px; background: #171717; border: 1px solid rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ede9e6; font-size: 18px; cursor: pointer; margin-bottom: 36px; }

.header { margin-bottom: 36px; }
.brand-name { font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 20px; }
.go { color: #ede9e6; } .tog { color: #a32020; }

.title { font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 800; letter-spacing: -1px; line-height: 1.2; color: #ede9e6; margin-bottom: 8px; }
.sub { color: rgba(237,233,230,0.4); font-size: 14px; }

.cards { display: flex; flex-direction: column; gap: 14px; flex: 1; }

.role-card { display: flex; align-items: center; gap: 16px; padding: 20px 18px; background: #111111; border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; cursor: pointer; text-align: left; transition: border-color 0.2s, background 0.2s; }
.role-card:hover { border-color: rgba(255,255,255,0.15); background: #161616; }
.role-card-red { border-color: rgba(139,26,26,0.2); }
.role-card-red:hover { border-color: rgba(139,26,26,0.4); background: rgba(139,26,26,0.06); }

.card-icon { width: 44px; height: 44px; background: #1f1f1f; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; color: rgba(237,233,230,0.6); flex-shrink: 0; }
.card-icon-red { background: rgba(139,26,26,0.15); color: #a32020; }

.card-body { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.card-title { font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; color: #ede9e6; letter-spacing: -0.3px; }
.card-desc { font-size: 12px; color: rgba(237,233,230,0.4); line-height: 1.4; }

.card-arrow { color: rgba(237,233,230,0.2); font-size: 16px; flex-shrink: 0; }

.login-hint { text-align: center; margin-top: 28px; color: rgba(237,233,230,0.3); font-size: 13px; }
.login-hint em { color: #a32020; font-style: normal; font-weight: 600; cursor: pointer; }
</style>