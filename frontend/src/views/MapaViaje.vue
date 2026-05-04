<template>
  <div class="mapa-outer">

    <!-- Formulario pasajero -->
    <div v-if="miSolicitudId && !ubicacionCompartida" class="form-wrap">
      <div class="form-titulo">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        Indica tu información al conductor
      </div>
      <label class="form-lbl">¿Dónde te recogemos?</label>
      <div class="form-row">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <input v-model="direccion" type="text" placeholder="Ej: Calle 5 # 38-25, Ciudad Jardín" class="form-inp" />
      </div>
      <label class="form-lbl" style="margin-top:8px">¿A qué universidad vas?</label>
      <div class="form-row">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
        <input v-model="universidad" type="text" placeholder="Ej: Univalle, USC, UAO..." class="form-inp" />
      </div>
      <button class="btn-enviar" :disabled="enviando" @click="enviarUbicacion">
        <svg v-if="!enviando" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
        <div v-else class="spin-sm"></div>
        {{ enviando ? 'Obteniendo ubicación...' : 'Enviar mi ubicación al conductor' }}
      </button>
    </div>

    <!-- Confirmación -->
    <div v-if="miSolicitudId && ubicacionCompartida" class="confirmado">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      Ubicación enviada al conductor
    </div>

    <!-- Mapa -->
    <div class="mapa-box" :style="{ height: (altura || 220) + 'px' }">
      <div v-if="cargando" class="mapa-loading">
        <div class="spin-mapa"></div>
        <span>Cargando mapa...</span>
      </div>
      <div ref="mapEl" style="width:100%;height:100%"></div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';

interface Pickup {
  lat?: number | null;
  lon?: number | null;
  destino_lat?: number | null;
  destino_lon?: number | null;
  direccion?: string;
  universidad?: string;
  nombre?: string;
}

const props = defineProps<{
  pickups?: Pickup[];
  miSolicitudId?: number | null;
  altura?: number;
}>();

const emit = defineEmits<{
  (e: 'ubicacion-compartida', data: {
    lat: number; lon: number; direccion: string;
    universidad: string; destino_lat: number; destino_lon: number;
  }): void;
}>();

const GKEY = 'AIzaSyBVta3wPBhLml0Jr87iM8ij5j134BMeqqo';
const mapEl = ref<HTMLDivElement | null>(null);
const cargando = ref(true);
const ubicacionCompartida = ref(false);
const enviando = ref(false);
const direccion = ref('');
const universidad = ref('');
let map: any = null;
let marcadores: any[] = [];
let rutaRenderer: any = null;
let miMarcador: any = null;

// ── Cargar Google Maps ────────────────────────────────────────────────────────
function cargarGM(): Promise<void> {
  return new Promise(resolve => {
    if ((window as any).google?.maps?.Map) { resolve(); return; }
    if (document.querySelector('script[data-gm]')) {
      const t = setInterval(() => { if ((window as any).google?.maps?.Map) { clearInterval(t); resolve(); } }, 150);
      return;
    }
    (window as any).__gmCb = resolve;
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GKEY}&callback=__gmCb&loading=async`;
    s.setAttribute('data-gm', '1');
    document.head.appendChild(s);
  });
}

// ── Geocodificar dirección ────────────────────────────────────────────────────
async function geocode(q: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q + ', Cali, Colombia')}&key=${GKEY}&language=es`;
    const r = await fetch(url);
    const d = await r.json();
    if (d.status === 'OK') return { lat: d.results[0].geometry.location.lat, lon: d.results[0].geometry.location.lng };
    return null;
  } catch { return null; }
}

// ── Geocodificación inversa ───────────────────────────────────────────────────
async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GKEY}&language=es`;
    const r = await fetch(url);
    const d = await r.json();
    return d.status === 'OK' ? d.results[0].formatted_address : `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  } catch { return `${lat.toFixed(4)}, ${lon.toFixed(4)}`; }
}

const estiloOscuro = [
  { elementType: 'geometry', stylers: [{ color: '#0f0f0f' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#888' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f0f0f' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2a2a2a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a0a0a' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

function mkIcon(G: any, color: string, size: number, border: string) {
  return { path: G.SymbolPath.CIRCLE, scale: size, fillColor: color, fillOpacity: 1, strokeColor: border, strokeWeight: 3 };
}

// ── Dibujar marcadores y ruta ─────────────────────────────────────────────────
function dibujar() {
  if (!map) return;
  const G = (window as any).google?.maps;
  if (!G) return;

  // Limpiar
  marcadores.forEach(m => m.setMap(null));
  marcadores = [];
  if (rutaRenderer) { rutaRenderer.setMap(null); rutaRenderer = null; }

  const puntos = (props.pickups || []).filter(p => p.lat && p.lon);
  if (puntos.length === 0) return;

  const bounds = new G.LatLngBounds();

  puntos.forEach((p: any) => {
    // Marcador amarillo = origen pasajero
    const m1 = new G.Marker({
      position: { lat: Number(p.lat), lng: Number(p.lon) }, map,
      icon: mkIcon(G, '#ffcc00', 10, '#111'),
      title: `${p.nombre || 'Pasajero'} — recogida`,
    });
    marcadores.push(m1);
    bounds.extend({ lat: Number(p.lat), lng: Number(p.lon) });

    // Marcador verde = destino (universidad)
    if (p.destino_lat && p.destino_lon) {
      const m2 = new G.Marker({
        position: { lat: Number(p.destino_lat), lng: Number(p.destino_lon) }, map,
        icon: mkIcon(G, '#25d366', 10, '#111'),
        title: `${p.universidad || 'Destino'}`,
      });
      marcadores.push(m2);
      bounds.extend({ lat: Number(p.destino_lat), lng: Number(p.destino_lon) });
    }
  });

  // Mi posición
  if (miMarcador) bounds.extend(miMarcador.getPosition());
  map.fitBounds(bounds, 40);

  // Trazar ruta con DirectionsService
  const origen = miMarcador ? miMarcador.getPosition() : { lat: Number(puntos[0].lat), lng: Number(puntos[0].lon) };
  const ultimo = puntos[puntos.length - 1] as any;
  const destino = (ultimo.destino_lat && ultimo.destino_lon)
    ? { lat: Number(ultimo.destino_lat), lng: Number(ultimo.destino_lon) }
    : { lat: Number(ultimo.lat), lng: Number(ultimo.lon) };

  const waypoints = puntos.map((p: any) => ({
    location: { lat: Number(p.lat), lng: Number(p.lon) },
    stopover: true,
  }));

  rutaRenderer = new G.DirectionsRenderer({
    suppressMarkers: true,
    polylineOptions: { strokeColor: '#8B1A1A', strokeWeight: 4, strokeOpacity: 0.9 },
  });
  rutaRenderer.setMap(map);

  new G.DirectionsService().route({
    origin: origen,
    destination: destino,
    waypoints,
    travelMode: 'DRIVING',
  }, (res: any, status: any) => {
    if (status === 'OK') rutaRenderer.setDirections(res);
  });
}

// ── Inicializar mapa ──────────────────────────────────────────────────────────
async function init() {
  if (!mapEl.value) { cargando.value = false; return; }
  await cargarGM();
  const G = (window as any).google.maps;

  map = new G.Map(mapEl.value, {
    zoom: 14,
    center: { lat: 3.4516, lng: -76.532 },
    styles: estiloOscuro,
    disableDefaultUI: true,
    zoomControl: true,
  });

  cargando.value = false;

  // Ubicación actual del usuario
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      if (!map) return;
      const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      map.setCenter(me);
      map.setZoom(15);
      if (miMarcador) miMarcador.setMap(null);
      miMarcador = new G.Marker({
        position: me, map,
        icon: mkIcon(G, '#4a90d9', 9, '#fff'),
        title: 'Tu ubicación',
      });
      dibujar();
    }, () => dibujar(), { enableHighAccuracy: true });
  } else {
    dibujar();
  }
}

// ── Enviar ubicación (pasajero) ───────────────────────────────────────────────
async function enviarUbicacion() {
  if (!navigator.geolocation) return;
  enviando.value = true;

  navigator.geolocation.getCurrentPosition(async pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    // Dirección del pasajero
    const dir = direccion.value.trim()
      ? direccion.value
      : await reverseGeocode(lat, lon);

    // Geocodificar universidad
    let dLat = lat, dLon = lon;
    if (universidad.value.trim()) {
      const dest = await geocode(universidad.value);
      if (dest) { dLat = dest.lat; dLon = dest.lon; }
    }

    enviando.value = false;
    ubicacionCompartida.value = true;
    emit('ubicacion-compartida', {
      lat, lon,
      direccion: dir,
      universidad: universidad.value,
      destino_lat: dLat,
      destino_lon: dLon,
    });
  }, () => { enviando.value = false; }, { enableHighAccuracy: true });
}

watch(() => props.pickups, dibujar, { deep: true });
onMounted(init);
onUnmounted(() => { map = null; });
</script>

<style scoped>
.mapa-outer { display: flex; flex-direction: column; gap: 10px; }

.form-wrap { background: #111; border: 1px solid rgba(139,26,26,0.25); border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 6px; }
.form-titulo { font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 700; color: rgba(237,233,230,0.35); text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.form-lbl { font-size: 10px; font-weight: 600; color: rgba(237,233,230,0.35); text-transform: uppercase; letter-spacing: 0.8px; font-family: 'DM Sans', sans-serif; }
.form-row { display: flex; align-items: center; gap: 10px; background: #1a1a1a; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 11px 13px; }
.form-row:focus-within { border-color: rgba(139,26,26,0.4); }
.form-row svg { color: rgba(237,233,230,0.25); flex-shrink: 0; }
.form-inp { background: transparent; border: none; outline: none; color: #ede9e6; font-family: 'DM Sans', sans-serif; font-size: 13px; width: 100%; }
.form-inp::placeholder { color: rgba(237,233,230,0.2); }
.btn-enviar { display: flex; align-items: center; justify-content: center; gap: 7px; margin-top: 6px; width: 100%; padding: 13px; background: #8B1A1A; border: none; border-radius: 12px; color: #ede9e6; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 16px rgba(139,26,26,0.4); }
.btn-enviar:disabled { opacity: 0.6; cursor: not-allowed; }

.confirmado { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: rgba(37,211,102,0.1); border: 1px solid rgba(37,211,102,0.25); border-radius: 12px; color: #25d366; font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 600; }

.mapa-box { position: relative; border-radius: 14px; overflow: hidden; background: #0a0a0a; }
.mapa-loading { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: #0a140a; z-index: 10; font-family: 'Outfit', sans-serif; font-size: 11px; color: rgba(37,211,102,0.4); letter-spacing: 1px; text-transform: uppercase; }
.spin-mapa { width: 18px; height: 18px; border-radius: 50%; border: 2px solid rgba(37,211,102,0.15); border-top-color: rgba(37,211,102,0.5); animation: spin 0.8s linear infinite; }
.spin-sm { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(237,233,230,0.3); border-top-color: #ede9e6; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>