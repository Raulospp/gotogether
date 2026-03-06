<template>
  <ion-page>
    <ion-content :fullscreen="true" class="welcome-content">
      <div class="bg-glow bg-glow-1"></div>
      <div class="bg-glow bg-glow-2"></div>
      <div class="welcome-wrapper">
        <div class="logo-section">
          <div class="logo-icon-wrap">
            <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" class="logo-svg">
              <circle cx="40" cy="40" r="38" stroke="url(#grad1)" stroke-width="2.5"/>
              <path d="M22 52 C22 42 30 32 42 28 L50 20" stroke="url(#grad1)" stroke-width="3" stroke-linecap="round"/>
              <polygon points="50,14 56,24 46,22" fill="#c850c0"/>
              <path d="M58 28 C58 38 50 48 38 52 L30 60" stroke="url(#grad2)" stroke-width="3" stroke-linecap="round"/>
              <polygon points="30,66 24,56 34,58" fill="#4158d0"/>
              <text x="26" y="47" font-family="'Exo 2', sans-serif" font-weight="800" font-size="18" fill="white">gt</text>
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#c850c0"/>
                  <stop offset="100%" stop-color="#4158d0"/>
                </linearGradient>
                <linearGradient id="grad2" x1="1" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#4158d0"/>
                  <stop offset="100%" stop-color="#c850c0"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div class="brand-text">
            <span class="brand-go">go</span><span class="brand-together">Together</span>
          </div>
          <p class="brand-tagline">TU APP PARA IR A LA U</p>
        </div>

        <div class="actions-section">
          <button class="btn-action btn-conductor" @click="router.push('/login/pasajero')">
            <div class="btn-icon"><ion-icon :icon="personOutline" /></div>
            <div class="btn-label">
              <span class="btn-text-main">Ingresar</span>
              <span class="btn-text-sub">como Usuario</span>
            </div>
          </button>

          <button class="btn-action btn-pasajero" @click="router.push('/login/conductor')">
            <div class="btn-icon"><ion-icon :icon="carOutline" /></div>
            <div class="btn-label">
              <span class="btn-text-main">Ingresar</span>
              <span class="btn-text-sub">como Conductor</span>
            </div>
          </button>

          <p class="register-text">
            ¿No tienes cuenta?
            <a @click="router.push('/register/tipo')">Registrarme</a>
          </p>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent, IonIcon } from '@ionic/vue';
import { carOutline, personOutline } from 'ionicons/icons';
import { useRouter } from 'vue-router';
const router = useRouter();
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;600;700;800;900&display=swap');
.welcome-content { --background: #12082a; font-family: 'Exo 2', sans-serif; }
.bg-glow { position: fixed; border-radius: 50%; filter: blur(80px); pointer-events: none; z-index: 0; }
.bg-glow-1 { width: 320px; height: 320px; background: radial-gradient(circle, rgba(200,80,192,0.3), transparent 70%); top: -60px; left: -60px; }
.bg-glow-2 { width: 280px; height: 280px; background: radial-gradient(circle, rgba(65,88,208,0.3), transparent 70%); bottom: -40px; right: -40px; }
.welcome-wrapper { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 40px 28px; gap: 52px; }
.logo-section { display: flex; flex-direction: column; align-items: center; gap: 14px; animation: fadeDown 0.7s ease both; }
.logo-icon-wrap { width: 110px; height: 110px; background: rgba(255,255,255,0.05); border: 1.5px solid rgba(200,80,192,0.3); border-radius: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 40px rgba(200,80,192,0.2), 0 0 80px rgba(65,88,208,0.15); }
.logo-svg { width: 72px; height: 72px; }
.brand-text { font-size: 36px; font-weight: 800; letter-spacing: -0.5px; line-height: 1; }
.brand-go { color: #fff; }
.brand-together { background: linear-gradient(90deg, #c850c0, #4158d0); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.brand-tagline { color: rgba(255,255,255,0.4); font-size: 11px; letter-spacing: 2.5px; font-weight: 600; margin: 0; }
.actions-section { display: flex; flex-direction: column; gap: 14px; width: 100%; max-width: 320px; animation: fadeUp 0.7s ease 0.2s both; }
.btn-action { width: 100%; display: flex; align-items: center; gap: 16px; padding: 14px 22px; border: none; border-radius: 14px; cursor: pointer; transition: transform 0.15s; }
.btn-action:active { transform: scale(0.97); }
.btn-conductor { background: linear-gradient(135deg, #c850c0, #8b31b0); box-shadow: 0 6px 28px rgba(200,80,192,0.4); }
.btn-pasajero { background: linear-gradient(135deg, #4158d0, #2d3db0); box-shadow: 0 6px 28px rgba(65,88,208,0.4); }
.btn-icon { width: 40px; height: 40px; background: rgba(255,255,255,0.15); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #fff; flex-shrink: 0; }
.btn-label { display: flex; flex-direction: column; text-align: left; }
.btn-text-main { color: rgba(255,255,255,0.7); font-size: 13px; font-weight: 500; line-height: 1; }
.btn-text-sub { color: #fff; font-size: 17px; font-weight: 700; line-height: 1.3; }
.register-text { text-align: center; color: rgba(255,255,255,0.45); font-size: 14px; margin: 4px 0 0; }
.register-text a { color: #c850c0; font-weight: 700; cursor: pointer; }
@keyframes fadeDown { from { opacity: 0; transform: translateY(-24px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
</style>