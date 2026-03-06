<template>
  <ion-page>
    <ion-content :fullscreen="true" class="register-content">
      <div class="bg-glow"></div>
      <div class="wrapper">
        <button class="back-btn" @click="router.back()">
          <ion-icon :icon="chevronBackOutline" />
        </button>
        <h1 class="page-title">¿Cómo quieres <span class="accent">registrarte?</span></h1>
        <div class="options">
          <button class="option-card" @click="router.push('/register/pasajero')">
            <div class="option-icon purple"><ion-icon :icon="personOutline" /></div>
            <div class="option-text">
              <span class="option-title">Como Usuario</span>
              <span class="option-sub">Busca conductor y viaja</span>
            </div>
            <ion-icon :icon="chevronForwardOutline" class="arrow" />
          </button>
          <button class="option-card" @click="router.push('/register/conductor')">
            <div class="option-icon blue"><ion-icon :icon="carOutline" /></div>
            <div class="option-text">
              <span class="option-title">Como Conductor</span>
              <span class="option-sub">Ofrece tu vehículo</span>
            </div>
            <ion-icon :icon="chevronForwardOutline" class="arrow" />
          </button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent, IonIcon } from '@ionic/vue';
import { chevronBackOutline, chevronForwardOutline, personOutline, carOutline } from 'ionicons/icons';
import { useRouter } from 'vue-router';
const router = useRouter();
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;600;700;800;900&display=swap');
.register-content { --background: #12082a; font-family: 'Exo 2', sans-serif; }
.bg-glow { position: fixed; width: 300px; height: 300px; background: radial-gradient(circle, rgba(200,80,192,0.2), transparent 70%); filter: blur(70px); top: -60px; right: -40px; pointer-events: none; z-index: 0; }
.wrapper { position: relative; z-index: 1; padding: 24px; min-height: 100vh; display: flex; flex-direction: column; }
.back-btn { background: rgba(255,255,255,0.07); border: none; border-radius: 10px; width: 38px; height: 38px; color: #fff; font-size: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; align-self: flex-start; margin-bottom: 32px; }
.page-title { color: #fff; font-size: 26px; font-weight: 800; margin: 0 0 32px; line-height: 1.2; }
.accent { background: linear-gradient(90deg, #c850c0, #4158d0); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.options { display: flex; flex-direction: column; gap: 16px; }
.option-card { display: flex; align-items: center; gap: 16px; background: rgba(255,255,255,0.05); border: 1.5px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 18px; cursor: pointer; transition: border-color 0.2s, transform 0.15s; width: 100%; }
.option-card:active { transform: scale(0.98); border-color: rgba(200,80,192,0.4); }
.option-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 22px; color: #fff; flex-shrink: 0; }
.option-icon.purple { background: linear-gradient(135deg, #c850c0, #8b31b0); }
.option-icon.blue { background: linear-gradient(135deg, #4158d0, #2d3db0); }
.option-text { flex: 1; display: flex; flex-direction: column; text-align: left; }
.option-title { color: #fff; font-size: 16px; font-weight: 700; }
.option-sub { color: rgba(255,255,255,0.4); font-size: 12px; margin-top: 2px; }
.arrow { color: rgba(255,255,255,0.3); font-size: 18px; }
</style>