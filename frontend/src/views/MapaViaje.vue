<template>
  <div class="mapa-outer">

    <!-- Formulario pasajero -->
    <div v-if="miSolicitudId && !ubicacionCompartida" class="form-wrap">
      <div class="form-titulo">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        Indica tu información al conductor
      </div>

      <label class="form-lbl">¿Dónde te recogemos?</label>
      <div class="form-row" :class="{ 'has-error': errorDireccion }">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <input
          v-model="direccion"
          type="text"
          placeholder="Ej: Calle 5 38-25, Ciudad Jardín"
          class="form-inp"
          @input="errorDireccion = false; rutaPrevisualizadaOk = false"
        />
      </div>
      <span v-if="errorDireccion" class="form-error">No encontramos esa dirección — intenta escribirla sin # (ej: "Calle 5 38-25, Ciudad Jardín")</span>

      <label class="form-lbl" style="margin-top:8px">¿A qué universidad vas?</label>
      <div class="form-row" :class="{ 'has-error': errorUniversidad }">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
        <input
          v-model="universidad"
          type="text"
          placeholder="Ej: Univalle, USC, UAO..."
          class="form-inp"
          @input="errorUniversidad = false; rutaPrevisualizadaOk = false"
        />
      </div>
      <span v-if="errorUniversidad" class="form-error">No encontramos esa universidad — prueba con el nombre completo (ej: "Universidad del Valle", "Universidad de San Buenaventura")</span>

      <button
        class="btn-preview"
        :disabled="previsualizando || !direccion.trim() || !universidad.trim()"
        @click="previsualizarRuta"
      >
        <svg v-if="!previsualizando" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        <div v-else class="spin-sm"></div>
        {{ previsualizando ? 'Calculando ruta...' : 'Ver ruta en el mapa' }}
      </button>

      <button
        class="btn-enviar"
        :disabled="enviando || !rutaPrevisualizadaOk"
        @click="enviarUbicacion"
      >
        <svg v-if="!enviando" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
        <div v-else class="spin-sm"></div>
        {{ enviando ? 'Guardando...' : (miSolicitudId === -1 ? 'Confirmar dirección' : 'Confirmar y enviar al conductor') }}
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
import { api } from '@/services/authService'; // Importamos la instancia con token automático

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
const previsualizando = ref(false);
const rutaPrevisualizadaOk = ref(false);
const direccion = ref('');
const universidad = ref('');
const errorDireccion = ref(false);
const errorUniversidad = ref(false);

let coordsPickup: { lat: number; lon: number } | null = null;
let coordsDestino: { lat: number; lon: number } | null = null;

let map: any = null;
let marcadores: any[] = [];
let rutaRenderer: any = null;
let miMarcador: any = null;

// ── Geocodificar usando la instancia api (con token automático) ──
async function geocode(q: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const response = await api.get('/api/geocode', { params: { q } });
    if (response.status === 200 && response.data?.lat && response.data?.lon) {
      return { lat: response.data.lat, lon: response.data.lon };
    }
    console.error('[geocode] Respuesta inválida:', response.data);
    return null;
  } catch (error: any) {
    console.error('[geocode] Error:', error.response?.status, error.response?.data || error.message);
    return null;
  }
}

// ── Cargar Google Maps ────────────────────────────────────────────────────────
function cargarGM(): Promise<void> {
  return new Promise(resolve => {
    if ((window as any).google?.maps?.Map) { resolve(); return; }
    if (document.querySelector('script[data-gm]')) {
      const t = setInterval(() => {
        if ((window as any).google?.maps?.Map) { clearInterval(t); resolve(); }
      }, 150);
      return;
    }
    (window as any).__gmCb = resolve;
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GKEY}&callback=__gmCb&loading=async`;
    s.setAttribute('data-gm', '1');
    document.head.appendChild(s);
  });
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
  return { path: G.SymbolPath.CIRCLE, scale: size, fillColor: color, fillOpacity: 1, strokeColor: border, strokeWeight: 2.5 };
}

function mkPin(color: string, label: string): any {
  return {
    url: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
        <filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.35"/></filter>
        <path filter="url(#s)" d="M18 2C10.27 2 4 8.27 4 16c0 10 14 26 14 26s14-16 14-26C32 8.27 25.73 2 18 2z" fill="${color}"/>
        <circle cx="18" cy="16" r="7" fill="white" opacity="0.25"/>
        <text x="18" y="21" text-anchor="middle" font-size="13" font-weight="bold" fill="white" font-family="sans-serif">${label}</text>
      </svg>
    `)}`,
    scaledSize: { width: 36, height: 44, equals: () => false },
    anchor: { x: 18, y: 44, equals: () => false },
  };
}

function limpiarMapa() {
  marcadores.forEach(m => m.setMap(null));
  marcadores = [];
  if (rutaRenderer) { rutaRenderer.setMap(null); rutaRenderer = null; }
}

function trazarRuta(
  G: any,
  origen: { lat: number; lng: number },
  paradas: Array<{ lat: number; lng: number }>,
  destinos: Array<{ lat: number; lng: number }>
) {
  if (rutaRenderer) { rutaRenderer.setMap(null); rutaRenderer = null; }
  if (destinos.length === 0) return;

  const destinosUnicos = destinos.filter((d, i, arr) =>
    arr.findIndex(x => Math.abs(x.lat - d.lat) < 0.0001 && Math.abs(x.lng - d.lng) < 0.0001) === i
  );
  const destinoFinal = destinosUnicos[destinosUnicos.length - 1];
  const waypointObjs = [
    ...paradas.map(p => ({ location: new G.LatLng(p.lat, p.lng), stopover: true })),
    ...destinosUnicos.slice(0, -1).map(d => ({ location: new G.LatLng(d.lat, d.lng), stopover: true })),
  ];
  rutaRenderer = new G.DirectionsRenderer({
    suppressMarkers: true,
    polylineOptions: {
      strokeColor: '#a32020',
      strokeWeight: 5,
      strokeOpacity: 0.85,
      icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '16px' }],
    },
  });
  rutaRenderer.setMap(map);
  new G.DirectionsService().route({
    origin: new G.LatLng(origen.lat, origen.lng),
    destination: new G.LatLng(destinoFinal.lat, destinoFinal.lng),
    waypoints: waypointObjs,
    optimizeWaypoints: false,
    travelMode: 'DRIVING',
  }, (res: any, status: any) => {
    if (status === 'OK') rutaRenderer.setDirections(res);
    else console.warn('DirectionsService error:', status);
  });
}

function dibujar() {
  if (!map) return;
  const G = (window as any).google?.maps;
  if (!G) return;
  limpiarMapa();

  const puntos = (props.pickups || []).filter(p => p.lat && p.lon);
  if (puntos.length === 0) return;

  const bounds = new G.LatLngBounds();
  puntos.forEach((p: any) => {
    const m1 = new G.Marker({
      position: { lat: Number(p.lat), lng: Number(p.lon) }, map,
      icon: mkPin('#e53935', '📍'),
      title: `${p.nombre || 'Pasajero'} — recogida`,
      animation: G.Animation.DROP,
    });
    const iw1 = new G.InfoWindow({ content: `<div style="font-family:sans-serif;font-size:12px;color:#111;padding:2px 4px"><b>${p.nombre || 'Pasajero'}</b><br>${p.direccion || ''}</div>` });
    m1.addListener('click', () => iw1.open(map, m1));
    marcadores.push(m1);
    bounds.extend({ lat: Number(p.lat), lng: Number(p.lon) });

    if (p.destino_lat && p.destino_lon) {
      const m2 = new G.Marker({
        position: { lat: Number(p.destino_lat), lng: Number(p.destino_lon) }, map,
        icon: mkPin('#25d366', '🎓'),
        title: `${p.universidad || 'Destino'}`,
        animation: G.Animation.DROP,
      });
      const iw2 = new G.InfoWindow({ content: `<div style="font-family:sans-serif;font-size:12px;color:#111;padding:2px 4px"><b>${p.universidad || 'Destino'}</b></div>` });
      m2.addListener('click', () => iw2.open(map, m2));
      marcadores.push(m2);
      bounds.extend({ lat: Number(p.destino_lat), lng: Number(p.destino_lon) });
    }
  });

  if (miMarcador) bounds.extend(miMarcador.getPosition());
  map.fitBounds(bounds, 40);

  const paradas = puntos.map((p: any) => ({ lat: Number(p.lat), lng: Number(p.lon) }));
  const destinos = puntos.filter((p: any) => p.destino_lat && p.destino_lon).map((p: any) => ({ lat: Number(p.destino_lat), lng: Number(p.destino_lon) }));
  if (destinos.length === 0) return;

  const origenConductor = miMarcador ? { lat: miMarcador.getPosition().lat(), lng: miMarcador.getPosition().lng() } : paradas[0];
  trazarRuta(G, origenConductor, paradas, destinos);
}

async function previsualizarRuta() {
  if (!direccion.value.trim()) { errorDireccion.value = true; return; }
  if (!universidad.value.trim()) { errorUniversidad.value = true; return; }
  if (!map) return;

  previsualizando.value = true;
  rutaPrevisualizadaOk.value = false;
  coordsPickup = null;
  coordsDestino = null;

  const G = (window as any).google?.maps;
  if (!G) { previsualizando.value = false; return; }

  const pickup = await geocode(direccion.value);
  if (!pickup) { errorDireccion.value = true; previsualizando.value = false; return; }

  const destino = await geocode(universidad.value);
  if (!destino) { errorUniversidad.value = true; previsualizando.value = false; return; }

  coordsPickup = pickup;
  coordsDestino = destino;

  limpiarMapa();
  const mPickup = new G.Marker({
    position: { lat: pickup.lat, lng: pickup.lon }, map,
    icon: mkPin('#e53935', '📍'),
    title: 'Tu punto de recogida',
    animation: G.Animation.DROP,
  });
  const iwPickup = new G.InfoWindow({ content: `<div style="font-family:sans-serif;font-size:12px;color:#111;padding:2px 4px"><b>Tu recogida</b><br>${direccion.value}</div>` });
  mPickup.addListener('click', () => iwPickup.open(map, mPickup));
  marcadores.push(mPickup);

  const mDest = new G.Marker({
    position: { lat: destino.lat, lng: destino.lon }, map,
    icon: mkPin('#25d366', '🎓'),
    title: universidad.value,
    animation: G.Animation.DROP,
  });
  const iwDest = new G.InfoWindow({ content: `<div style="font-family:sans-serif;font-size:12px;color:#111;padding:2px 4px"><b>${universidad.value}</b></div>` });
  mDest.addListener('click', () => iwDest.open(map, mDest));
  marcadores.push(mDest);

  const bounds = new G.LatLngBounds();
  bounds.extend({ lat: pickup.lat, lng: pickup.lon });
  bounds.extend({ lat: destino.lat, lng: destino.lon });
  map.fitBounds(bounds, 60);

  trazarRuta(G, { lat: pickup.lat, lng: pickup.lon }, [], [{ lat: destino.lat, lng: destino.lon }]);
  rutaPrevisualizadaOk.value = true;
  previsualizando.value = false;
}

async function enviarUbicacion() {
  if (!coordsPickup || !coordsDestino) return;
  enviando.value = true;
  try {
    let lat = coordsPickup.lat;
    let lon = coordsPickup.lon;
    if (navigator.geolocation) {
      await new Promise<void>(resolve => {
        navigator.geolocation.getCurrentPosition(
          pos => { lat = pos.coords.latitude; lon = pos.coords.longitude; resolve(); },
          () => resolve(),
          { enableHighAccuracy: true, timeout: 5000 }
        );
      });
    }
    ubicacionCompartida.value = true;
    emit('ubicacion-compartida', {
      lat, lon,
      direccion: direccion.value,
      universidad: universidad.value,
      destino_lat: coordsDestino.lat,
      destino_lon: coordsDestino.lon,
    });
  } finally {
    enviando.value = false;
  }
}

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
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      if (!map) return;
      const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      map.setCenter(me);
      map.setZoom(15);
      if (miMarcador) miMarcador.setMap(null);
      miMarcador = new G.Marker({
        position: me, map,
        icon: mkPin('#4a90d9', '🚗'),
        title: 'Tu ubicación',
        animation: G.Animation.DROP,
        zIndex: 999,
      });
      dibujar();
    }, () => dibujar(), { enableHighAccuracy: true });
  } else {
    dibujar();
  }
}

watch(() => props.pickups, dibujar, { deep: true });
onMounted(init);
onUnmounted(() => { map = null; });
</script>

<style scoped>
/* (Mantén tus estilos exactos, no los cambio) */
.mapa-outer { display: flex; flex-direction: column; gap: 10px; }
.form-wrap { background: #111; border: 1px solid rgba(139,26,26,0.25); border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 6px; }
.form-titulo { font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 700; color: rgba(237,233,230,0.35); text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.form-lbl { font-size: 10px; font-weight: 600; color: rgba(237,233,230,0.35); text-transform: uppercase; letter-spacing: 0.8px; font-family: 'DM Sans', sans-serif; }
.form-row { display: flex; align-items: center; gap: 10px; background: #1a1a1a; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 11px 13px; transition: border-color 0.2s; }
.form-row:focus-within { border-color: rgba(139,26,26,0.4); }
.form-row.has-error { border-color: rgba(255,80,80,0.5); }
.form-row svg { color: rgba(237,233,230,0.25); flex-shrink: 0; }
.form-inp { background: transparent; border: none; outline: none; color: #ede9e6; font-family: 'DM Sans', sans-serif; font-size: 13px; width: 100%; }
.form-inp::placeholder { color: rgba(237,233,230,0.2); }
.form-error { font-size: 10px; color: rgba(255,100,100,0.7); padding: 0 4px; font-family: 'DM Sans', sans-serif; }
.btn-preview { display: flex; align-items: center; justify-content: center; gap: 7px; margin-top: 4px; width: 100%; padding: 11px; background: rgba(74,144,217,0.12); border: 1px solid rgba(74,144,217,0.3); border-radius: 12px; color: #4a90d9; font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
.btn-preview:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-enviar { display: flex; align-items: center; justify-content: center; gap: 7px; margin-top: 4px; width: 100%; padding: 13px; background: #8B1A1A; border: none; border-radius: 12px; color: #ede9e6; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 16px rgba(139,26,26,0.4); transition: opacity 0.2s; }
.btn-enviar:disabled { opacity: 0.4; cursor: not-allowed; }
.confirmado { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: rgba(37,211,102,0.1); border: 1px solid rgba(37,211,102,0.25); border-radius: 12px; color: #25d366; font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 600; }
.mapa-box { position: relative; border-radius: 14px; overflow: hidden; background: #0a0a0a; }
.mapa-loading { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: #0a140a; z-index: 10; font-family: 'Outfit', sans-serif; font-size: 11px; color: rgba(37,211,102,0.4); letter-spacing: 1px; text-transform: uppercase; }
.spin-mapa { width: 18px; height: 18px; border-radius: 50%; border: 2px solid rgba(37,211,102,0.15); border-top-color: rgba(37,211,102,0.5); animation: spin 0.8s linear infinite; }
.spin-sm { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(237,233,230,0.3); border-top-color: #ede9e6; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>