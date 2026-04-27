<template>
  <div class="pickup-wrap">
    <div class="pickup-hint">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      <span v-if="!seleccionado">Toca el mapa para marcar <strong style="color:#a32020">dónde estás</strong></span>
      <span v-else style="color:#25d366">✓ Ubicación marcada — ya puedes solicitar</span>
    </div>
    <div ref="mapEl" class="pickup-mapa"></div>
    <button v-if="!seleccionado" class="btn-mi-ubicacion" @click="usarMiUbicacion">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
      Usar mi ubicación actual
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const emit = defineEmits<{ (e: 'update', lat: number, lon: number): void }>();
const mapEl = ref<HTMLDivElement | null>(null);
const seleccionado = ref(false);
let map: any = null;
let marker: any = null;
let L: any = null;

function ponerMarcador(lat: number, lon: number) {
  if (marker) marker.remove();
  marker = L.marker([lat, lon], { icon: L.divIcon({
    html: `<div style="width:22px;height:22px;background:#8B1A1A;border-radius:50%;border:3px solid #ede9e6;box-shadow:0 0 16px rgba(139,26,26,0.9)">
             <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:7px;height:7px;background:#ede9e6;border-radius:50%"></div>
           </div>`,
    iconSize: [22, 22], iconAnchor: [11, 11], className: ''
  })}).addTo(map).bindPopup('<b style="font-size:11px">Tu ubicación</b>').openPopup();
  seleccionado.value = true;
  emit('update', lat, lon);
}

function usarMiUbicacion() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(p => {
    map.setView([p.coords.latitude, p.coords.longitude], 17);
    ponerMarcador(p.coords.latitude, p.coords.longitude);
  }, null, { enableHighAccuracy: true });
}

onMounted(async () => {
  L = (await import('leaflet')).default;
  // @ts-ignore
  await import('leaflet/dist/leaflet.css');

  map = L.map(mapEl.value!, { zoomControl: true, attributionControl: false });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
  map.setView([3.4516, -76.5320], 14);

  // Centrar en ubicación automáticamente
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      p => map.setView([p.coords.latitude, p.coords.longitude], 16),
      () => {}
    );
  }

  // Toque en mapa
  map.on('click', (e: any) => ponerMarcador(e.latlng.lat, e.latlng.lng));
});

onUnmounted(() => { if (map) { map.remove(); map = null; } });
</script>

<style scoped>
.pickup-wrap { display: flex; flex-direction: column; gap: 8px; }
.pickup-hint { font-size: 11.5px; color: rgba(237,233,230,0.45); font-family: 'DM Sans', sans-serif; display: flex; align-items: center; gap: 6px; }
.pickup-mapa { height: 240px; width: 100%; border-radius: 12px; overflow: hidden; cursor: crosshair; }
.btn-mi-ubicacion { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: 10px; background: rgba(139,26,26,0.1); border: 1px solid rgba(139,26,26,0.25); border-radius: 10px; color: #a32020; font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; }
</style>
