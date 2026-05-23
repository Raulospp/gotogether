<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { useNotificacionStore } from '@/stores/notificacionStore';

const notifStore = useNotificacionStore();

onMounted(() => {
  // Inicia el polling del badge si el usuario ya tiene sesión activa
  if (localStorage.getItem('token')) {
    notifStore.startPolling(30_000); // cada 30 segundos
  }
});

onUnmounted(() => {
  notifStore.stopPolling();
});
</script>

<style>
/* ─── Android safe area global ─── */
ion-app {
  background: #070707;
}

/* Status bar padding for Android notch/cutout */
.top-bar,
.top-header,
ion-header,
ion-toolbar {
  padding-top: max(env(safe-area-inset-top), 16px) !important;
}

/* Bottom nav safe area */
.bottom-nav,
ion-tab-bar,
.nav-bar {
  padding-bottom: max(env(safe-area-inset-bottom), 12px) !important;
  height: calc(60px + max(env(safe-area-inset-bottom), 12px)) !important;
}

/* Content scrollable area should account for bottom nav */
ion-content {
  --padding-bottom: calc(72px + env(safe-area-inset-bottom));
}

/* Prevent content from going under status bar */
ion-page {
  padding-top: env(safe-area-inset-top);
}
</style>
