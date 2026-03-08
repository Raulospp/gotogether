<template>
  <ion-page>
    <ion-content :fullscreen="true" class="welcome-content">
      <div class="grain"></div>
      <div class="atm-glow"></div>
      <div class="atm-glow-2"></div>

      <div class="screen">
        <div class="logo-wrap">
          <svg class="logomark" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="28" cy="28" r="26.5" stroke="rgba(139,26,26,0.25)" stroke-width="1"/>
            <line x1="18" y1="42" x2="28" y2="14" stroke="#8B1A1A" stroke-width="2.2" stroke-linecap="round"/>
            <polyline points="23,14 28,14 28,19" stroke="#8B1A1A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="38" y1="14" x2="28" y2="42" stroke="rgba(237,233,230,0.3)" stroke-width="2.2" stroke-linecap="round"/>
            <polyline points="33,42 28,42 28,37" stroke="rgba(237,233,230,0.3)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="28" cy="28" r="3" fill="#8B1A1A"/>
            <circle cx="28" cy="28" r="5.5" stroke="rgba(139,26,26,0.3)" stroke-width="1"/>
          </svg>
          <div class="brand-name">
            <span class="brand-go">go</span><span class="brand-tog">Together</span>
          </div>
          <div class="tagline">Comparte el camino a la U</div>
        </div>

        <div class="btn-stack">
          <button class="btn-fill" @click="router.push('/login/pasajero')">
            <span>Soy Pasajero</span>
            <span class="icon-box">
              <ion-icon :icon="personOutline" />
            </span>
          </button>
          <button class="btn-outline" @click="router.push('/login/conductor')">
            <span>Soy Conductor</span>
            <span class="icon-box icon-box-dark">
              <ion-icon :icon="carOutline" />
            </span>
          </button>
          <button class="btn-ghost-link" @click="router.push('/register/tipo')">
            ¿No tienes cuenta? <em>Regístrate</em>
          </button>
        </div>
      </div>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { IonPage, IonContent, IonIcon } from '@ionic/vue';
import { personOutline, carOutline } from 'ionicons/icons';

const router = useRouter();
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

.welcome-content {
  --background: #070707;
  font-family: 'DM Sans', sans-serif;
  position: relative;
}

.grain {
  position: fixed; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none; z-index: 0;
}

.atm-glow {
  position: fixed;
  width: 300px; height: 300px;
  background: radial-gradient(circle, rgba(139,26,26,0.18) 0%, transparent 70%);
  top: -80px; left: 50%; transform: translateX(-50%);
  filter: blur(50px); pointer-events: none; z-index: 0;
}

.atm-glow-2 {
  position: fixed;
  width: 200px; height: 200px;
  background: radial-gradient(circle, rgba(139,26,26,0.1) 0%, transparent 70%);
  bottom: -40px; right: -20px;
  filter: blur(60px); pointer-events: none; z-index: 0;
}

.screen {
  position: relative; z-index: 1;
  display: flex; flex-direction: column;
  height: 100vh;
  padding: 48px 28px 40px;
}

.logo-wrap {
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 0;
  padding-bottom: 24px;
}

.logomark {
  width: 64px; height: 64px;
  margin-bottom: 22px;
  animation: logoIn 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.2s both;
}

@keyframes logoIn {
  from { opacity: 0; transform: scale(0.6) rotate(-10deg); }
  to { opacity: 1; transform: scale(1) rotate(0deg); }
}

.brand-name {
  font-family: 'Outfit', sans-serif;
  font-size: 34px; font-weight: 800;
  letter-spacing: -1.5px; line-height: 1;
  animation: fadeUp 0.6s ease 0.4s both;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.brand-go { color: #ede9e6; }
.brand-tog { color: #a32020; }

.tagline {
  font-family: 'DM Sans', sans-serif;
  font-size: 12px; font-weight: 400;
  color: rgba(237,233,230,0.35);
  letter-spacing: 2.5px; text-transform: uppercase;
  margin-top: 12px;
  animation: fadeUp 0.6s ease 0.55s both;
}

.btn-stack {
  display: flex; flex-direction: column; gap: 12px;
  animation: fadeUp 0.6s ease 0.7s both;
}

.btn-fill {
  display: flex; align-items: center; justify-content: space-between;
  padding: 17px 20px;
  background: #8B1A1A;
  border: none; border-radius: 16px;
  color: #ede9e6;
  font-family: 'Outfit', sans-serif;
  font-size: 15px; font-weight: 600;
  cursor: pointer; letter-spacing: 0.1px;
  box-shadow: 0 8px 28px rgba(139,26,26,0.4), 0 2px 8px rgba(139,26,26,0.2);
}

.btn-outline {
  display: flex; align-items: center; justify-content: space-between;
  padding: 17px 20px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 16px;
  color: #ede9e6;
  font-family: 'Outfit', sans-serif;
  font-size: 15px; font-weight: 600;
  cursor: pointer;
}

.btn-ghost-link {
  text-align: center; padding: 14px;
  background: none; border: none;
  color: rgba(237,233,230,0.4);
  font-family: 'DM Sans', sans-serif;
  font-size: 13px; cursor: pointer;
}

.btn-ghost-link em {
  color: #a32020; font-style: normal; font-weight: 600;
}

.icon-box {
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.15);
  border-radius: 9px; flex-shrink: 0;
  font-size: 16px; color: #ede9e6;
}

.icon-box-dark {
  background: rgba(255,255,255,0.07);
}
</style>