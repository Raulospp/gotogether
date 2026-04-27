<template>
  <div class="mapa-wrap">
    <div v-if="!tieneCoords" class="mapa-empty">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
      <span>Ruta no configurada</span>
    </div>
    <div v-else ref="mapEl" class="mapa-el" :style="{ height: (altura || 220) + 'px' }"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  coords: { lat: number; lon: number }[];       // Paradas del conductor
  pickup?: { lat: number; lon: number } | null; // Punto recogida pasajero
  altura?: number;
}>();

const mapEl = ref<HTMLDivElement | null>(null);
let map: any = null;

const tieneCoords = computed(() => props.coords && props.coords.length >= 2);

async function init() {
  if (!mapEl.value || !tieneCoords.value) return;

  const L = (await import('leaflet')).default;
  // @ts-ignore
  await import('leaflet/dist/leaflet.css');

  map = L.map(mapEl.value, { zoomControl: false, attributionControl: false });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);

  const latlngs: [number, number][] = props.coords.map(c => [c.lat, c.lon]);

  // Ruta con OSRM
  let rutaCoords = latlngs;
  try {
    const wp = latlngs.map(([lat, lon]) => `${lon},${lat}`).join(';');
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${wp}?overview=full&geometries=geojson`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    if (data.code === 'Ok') rutaCoords = data.routes[0].geometry.coordinates.map(([lon, lat]: number[]) => [lat, lon] as [number, number]);
  } catch { /* usar línea recta */ }

  L.polyline(rutaCoords, { color: '#8B1A1A', weight: 4, opacity: 0.9 }).addTo(map);

  // Marcadores de paradas
  latlngs.forEach(([lat, lon], i) => {
    const isFirst = i === 0, isLast = i === latlngs.length - 1;
    const color = isFirst ? '#8B1A1A' : isLast ? '#ede9e6' : '#666';
    const border = isFirst ? '#ede9e6' : '#8B1A1A';
    const size = isFirst || isLast ? 16 : 10;
    L.marker([lat, lon], { icon: L.divIcon({
      html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:2.5px solid ${border};box-shadow:0 0 8px ${color}88"></div>`,
      iconSize: [size, size], iconAnchor: [size/2, size/2], className: ''
    })}).addTo(map);
  });

  // Punto de recogida del pasajero (amarillo)
  if (props.pickup) {
    L.marker([props.pickup.lat, props.pickup.lon], { icon: L.divIcon({
      html: `<div style="width:18px;height:18px;background:#ffcc00;border-radius:50%;border:3px solid #111;box-shadow:0 0 12px rgba(255,204,0,0.9)"></div>`,
      iconSize: [18, 18], iconAnchor: [9, 9], className: ''
    })}).addTo(map).bindPopup('<b>Punto de recogida</b>');
    latlngs.push([props.pickup.lat, props.pickup.lon]);
  }

  // Ubicación del usuario (azul)
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      if (!map) return;
      L.marker([pos.coords.latitude, pos.coords.longitude], { icon: L.divIcon({
        html: `<div style="width:14px;height:14px;background:#4a90d9;border-radius:50%;border:3px solid #fff;box-shadow:0 0 10px rgba(74,144,217,0.8)"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7], className: ''
      })}).addTo(map).bindPopup('Tu ubicación');
    }, null, { enableHighAccuracy: true });
  }

  map.fitBounds(L.latLngBounds(latlngs), { padding: [28, 28] });
}

onMounted(init);
onUnmounted(() => { if (map) { map.remove(); map = null; } });
</script>

<style scoped>
.mapa-wrap { border-radius: 14px; overflow: hidden; background: #0a0a0a; }
.mapa-el { width: 100%; }
.mapa-empty { height: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: rgba(237,233,230,0.2); font-family: 'DM Sans', sans-serif; font-size: 12px; }
</style>