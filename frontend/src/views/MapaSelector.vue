<template>
  <div class="sel-wrap">
    <!-- Instrucción -->
    <div class="sel-hint">
      <div class="hint-step" :class="{ done: paso >= paradas.length }">
        <span v-if="paso < paradas.length">
          Toca el mapa para marcar
          <strong style="color:#a32020">{{ paradas[paso] }}</strong>
          ({{ paso + 1 }}/{{ paradas.length }})
        </span>
        <span v-else style="color:#25d366">
          ✓ Todos los puntos marcados — guarda para confirmar
        </span>
      </div>
    </div>

    <!-- Chips de paradas -->
    <div class="sel-chips">
      <div v-for="(p, i) in paradas" :key="i" class="sel-chip"
        :class="{ active: paso === i, done: coords[i] }"
        @click="paso = i">
        <div class="chip-dot" :class="i === 0 ? 'start' : i === paradas.length-1 ? 'end' : 'mid'"></div>
        <span>{{ p }}</span>
        <svg v-if="coords[i]" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
    </div>

    <!-- Mapa -->
    <div ref="mapEl" class="sel-mapa"></div>

    <!-- Botón confirmar -->
    <button v-if="todosListos" class="btn-confirmar" @click="confirmar">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      Confirmar ruta
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps<{ paradas: string[] }>();
const emit = defineEmits<{ (e: 'confirmar', coords: { lat: number; lon: number }[]): void }>();

const mapEl = ref<HTMLDivElement | null>(null);
const paso = ref(0);
const coords = ref<({ lat: number; lon: number } | null)[]>(props.paradas.map(() => null));
let map: any = null;
let L: any = null;
const markers: any[] = [];
let linea: any = null;

const todosListos = computed(() => coords.value.every(c => c !== null));

async function init() {
  if (!mapEl.value) return;
  L = (await import('leaflet')).default;
  // @ts-ignore
  await import('leaflet/dist/leaflet.css');

  map = L.map(mapEl.value, { zoomControl: true, attributionControl: false });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);

  // Centrar en ubicación del usuario
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      p => map.setView([p.coords.latitude, p.coords.longitude], 15),
      () => map.setView([3.4516, -76.5320], 14)
    );
  } else {
    map.setView([3.4516, -76.5320], 14);
  }

  map.on('click', (e: any) => {
    const { lat, lng } = e.latlng;
    coords.value[paso.value] = { lat, lon: lng };
    dibujar();
    // Avanzar al siguiente automáticamente
    if (paso.value < props.paradas.length - 1) paso.value++;
  });
}

function dibujar() {
  // Limpiar
  markers.forEach(m => m.remove());
  markers.length = 0;
  if (linea) { linea.remove(); linea = null; }

  const validos: [number, number][] = [];

  coords.value.forEach((c, i) => {
    if (!c) return;
    const isFirst = i === 0, isLast = i === props.paradas.length - 1;
    const isActive = i === paso.value;
    const color = isFirst ? '#8B1A1A' : isLast ? '#ede9e6' : '#888';
    const border = isActive ? '#ffcc00' : isFirst ? '#ede9e6' : '#8B1A1A';
    const size = isFirst || isLast ? 16 : 12;
    const m = L.marker([c.lat, c.lon], { icon: L.divIcon({
      html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:2.5px solid ${border};box-shadow:0 0 8px ${color}99"></div>`,
      iconSize: [size, size], iconAnchor: [size/2, size/2], className: ''
    })}).addTo(map).bindPopup(`<div style="font-size:11px">${props.paradas[i]}</div>`);
    markers.push(m);
    validos.push([c.lat, c.lon]);
  });

  if (validos.length >= 2) {
    linea = L.polyline(validos, { color: '#8B1A1A', weight: 3, opacity: 0.8, dashArray: '6 4' }).addTo(map);
    markers.push(linea);
  }
}

function confirmar() {
  emit('confirmar', coords.value.filter(Boolean) as { lat: number; lon: number }[]);
}

onMounted(init);
onUnmounted(() => { if (map) { map.remove(); map = null; } });
</script>

<style scoped>
.sel-wrap { display: flex; flex-direction: column; gap: 10px; }

.sel-hint { font-family: 'DM Sans', sans-serif; font-size: 12px; color: rgba(237,233,230,0.5); }

.sel-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.sel-chip { display: flex; align-items: center; gap: 5px; background: #1a1a1a; border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 5px 10px; font-size: 10px; color: rgba(237,233,230,0.35); font-family: 'DM Sans', sans-serif; cursor: pointer; transition: all 0.2s; }
.sel-chip.active { border-color: rgba(255,204,0,0.4); color: #ffcc00; background: rgba(255,204,0,0.06); }
.sel-chip.done { border-color: rgba(139,26,26,0.3); color: #a32020; background: rgba(139,26,26,0.08); }
.chip-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.chip-dot.start { background: #8B1A1A; }
.chip-dot.mid { background: #555; }
.chip-dot.end { background: rgba(237,233,230,0.4); }

.sel-mapa { height: 300px; width: 100%; border-radius: 12px; overflow: hidden; cursor: crosshair; }

.btn-confirmar { width: 100%; padding: 13px; background: #8B1A1A; border: none; border-radius: 12px; color: #ede9e6; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; box-shadow: 0 6px 18px rgba(139,26,26,0.35); }
</style>
