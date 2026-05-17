<template>
  <ion-page>
    <ion-content :fullscreen="true" class="viaje-content">
      <div class="grain"></div>
      <div class="atm-glow"></div>

      <div v-if="loading" class="empty-state">
        <div class="spinner"></div>
        <p>Cargando viaje...</p>
      </div>

      <!-- ══════════════════════════════════════════════════════
           VISTA FINALIZADO — Historial estilo Uber (pasajero)
           ══════════════════════════════════════════════════════ -->
      <template v-else-if="viaje && (viaje.estado === 'finalizada' || viaje.estado === 'finalizado') && !isConductor">

        <!-- Header resumen -->
        <div class="hst-header">
          <button class="back-btn" @click="router.replace('/inicio')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div class="hst-title-wrap">
            <div class="brand">go<span>Together</span></div>
            <div class="hst-title">Viaje completado</div>
          </div>
          <div class="hst-check">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>

        <!-- Card conductor -->
        <div class="hst-conductor-card">
          <div class="hst-av" :style="`background:${avatarColor(viaje.conductor_name)}`">
            {{ initial(viaje.conductor_name) }}
          </div>
          <div class="hst-cond-info">
            <div class="hst-cond-name">{{ viaje.conductor_name }}</div>
            <div class="hst-cond-sub">{{ viaje.car_model }} · {{ viaje.conductor_city }}</div>
          </div>
          <div v-if="precio" class="hst-precio-badge">
            <div class="hst-precio-val">${{ Number(precio).toLocaleString('es-CO') }}</div>
            <div class="hst-precio-lbl">pagado</div>
          </div>
        </div>

        <!-- Línea de ruta -->
        <div class="hst-ruta-card">
          <div class="hst-ruta-title">Ruta del viaje</div>
          <div class="hst-ruta-line">
            <!-- Pickup -->
            <div class="hst-stop">
              <div class="hst-dot pickup"></div>
              <div class="hst-stop-info">
                <div class="hst-stop-label">Recogida</div>
                <div class="hst-stop-dir">{{ viaje.pickup_direccion || 'Tu ubicación' }}</div>
              </div>
            </div>
            <!-- Destino -->
            <div class="hst-connector"></div>
            <div class="hst-stop">
              <div class="hst-dot destino"></div>
              <div class="hst-stop-info">
                <div class="hst-stop-label">Destino</div>
                <div class="hst-stop-dir">{{ viaje.pickup_universidad || 'Universidad' }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Detalle del pago -->
        <div v-if="precio" class="hst-pago-card">
          <div class="hst-pago-title">Detalle del pago</div>
          <div class="hst-pago-row">
            <span>Tarifa del viaje</span>
            <span>${{ Number(precio).toLocaleString('es-CO') }}</span>
          </div>
          <div class="hst-pago-row total">
            <span>Total</span>
            <span>${{ Number(precio).toLocaleString('es-CO') }}</span>
          </div>
          <div class="hst-pago-metodo">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            Pago en efectivo al conductor
          </div>
        </div>

        <!-- Calificación inline -->
        <div v-if="!calificacionEnviada" class="hst-rating-card">
          <div class="hst-rating-title">¿Cómo fue tu viaje?</div>
          <div class="hst-rating-sub">Califica a {{ viaje.conductor_name }}</div>
          <div class="hst-stars">
            <button v-for="i in 5" :key="i" class="hst-star" :class="{ sel: i <= califTemp }"
              @mouseenter="califTemp = i" @mouseleave="califTemp = califSeleccionada"
              @click="califSeleccionada = i; califTemp = i">
              ★
            </button>
          </div>
          <div v-if="califSeleccionada > 0" class="hst-rating-label">{{ ratingLabel(califSeleccionada) }}</div>
          <textarea v-if="califSeleccionada > 0" v-model="comentarioCalif"
            class="hst-comentario" placeholder="Cuéntanos más (opcional)..." rows="2" maxlength="250"></textarea>
          <button v-if="califSeleccionada > 0" class="hst-btn-calificar" :disabled="sendingCalif" @click="enviarCalificacion">
            {{ sendingCalif ? 'Enviando...' : 'Enviar calificación' }}
          </button>
        </div>
        <div v-else class="hst-rating-done">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          ¡Gracias por tu calificación!
        </div>

        <div style="height:30px"></div>
      </template>

      <!-- ══════════════════════════════════════════════════════
           VISTA NORMAL — Viaje activo (conductor + pasajero)
           ══════════════════════════════════════════════════════ -->
      <template v-else-if="viaje">

        <!-- Top bar -->
        <div class="top-bar">
          <button class="back-btn" @click="router.back()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <span class="top-title">Viaje de hoy</span>
          <div class="estado-pill" :class="`estado-${viaje.estado || viaje.viaje_estado}`">
            <div class="estado-dot"></div>
            {{ estadoLabel(viaje.estado || viaje.viaje_estado) }}
          </div>
        </div>

        <!-- Mapa -->
        <div class="mapa-wrap">
          <MapaViaje
            :pickups="todosPickups"
            :mi-solicitud-id="miSolicitudIdMapa"
            :ya-confirmado="yaConfirmadoPasajero"
            :altura="220"
            @ubicacion-compartida="onUbicacionCompartida"
          />
        </div>

        <!-- Banner pendiente -->
        <div v-if="!isConductor && viaje.estado === 'pendiente'" class="pendiente-banner">
          <div class="pendiente-dot"></div>
          Solicitud enviada — esperando que el conductor acepte
        </div>

        <!-- Banner en curso -->
        <div v-if="!isConductor && (viaje.estado === 'en_curso' || viaje.viaje_estado === 'en_curso')" class="en-curso-banner">
          <div class="en-curso-dot"></div>
          El conductor ya inició el viaje — está en camino
        </div>

        <!-- Lista pasajeros (conductor) -->
        <div v-if="isConductor && pasajeros.length > 0" class="pasajeros-list">
          <div class="pasajeros-title">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            Pasajeros ({{ pasajeros.length }})
          </div>
          <div v-for="p in pasajeros" :key="p.solicitud_id" class="pasajero-row">
            <div class="pas-av" :style="`background:${avatarColor(p.pasajero_name)}`">{{ initial(p.pasajero_name) }}</div>
            <div class="pas-info">
              <div class="pas-name">{{ p.pasajero_name }}</div>
              <div class="pas-uni">{{ p.pickup_universidad || p.pasajero_university || '' }}</div>
              <div class="pas-dir" :class="p.pickup_direccion ? '' : 'sin-dir'">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/></svg>
                {{ p.pickup_direccion || 'Esperando ubicación...' }}
              </div>
            </div>
            <button v-if="p.pasajero_phone" class="pas-wpp" @click="contactarWpp(p.pasajero_phone)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.853L0 24l6.335-1.521A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.645-.52-5.148-1.422l-.369-.218-3.763.904.937-3.666-.242-.381A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
            </button>
          </div>
        </div>

        <!-- Card conductor estilo Uber (pasajero) -->
        <div v-if="!isConductor" class="conductor-card-uber">
          <!-- Header: avatar + nombre + precio -->
          <div class="ccu-top">
            <div class="ccu-av" :style="`background:${avatarColor(viaje.conductor_name)}`">
              {{ initial(viaje.conductor_name) }}
            </div>
            <div class="ccu-info">
              <div class="ccu-name">{{ viaje.conductor_name }}</div>
              <div class="ccu-rol">Conductor</div>
            </div>
            <div v-if="precio" class="ccu-precio">
              <div class="ccu-precio-val">${{ Number(precio).toLocaleString('es-CO') }}</div>
              <div class="ccu-precio-lbl">precio</div>
            </div>
          </div>
          <!-- Datos del vehículo -->
          <div class="ccu-divider"></div>
          <div class="ccu-vehicle-row">
            <div class="ccu-vehicle-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              <span>{{ viaje.car_model || 'Vehículo' }}</span>
            </div>
            <div class="ccu-vehicle-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="18" height="13" rx="1"/><path d="M8 6V4M16 6V4"/></svg>
              <span class="ccu-placa">{{ viaje.plate || '—' }}</span>
            </div>
            <div class="ccu-vehicle-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.37 2 2 0 0 1 3.05 1.17h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z"/></svg>
              <span>{{ viaje.conductor_phone || '—' }}</span>
            </div>
          </div>
          <!-- Destino -->
          <div v-if="viaje.pickup_universidad" class="ccu-destino">
            <div class="ccu-dest-dot"></div>
            <span>{{ viaje.pickup_universidad }}</span>
          </div>
        </div>

        <!-- Horario -->
        <div v-if="horario.ida || horario.vuelta" class="horario-row">
          <div v-if="horario.ida" class="hora-chip">
            <div class="hora-lbl">Salida</div>
            <div class="hora-val">{{ horario.ida.split(' ')[0] }}<span class="hora-ampm">{{ horario.ida.split(' ')[1] }}</span></div>
          </div>
          <div v-if="horario.vuelta" class="hora-chip">
            <div class="hora-lbl">Regreso</div>
            <div class="hora-val">{{ horario.vuelta.split(' ')[0] }}<span class="hora-ampm">{{ horario.vuelta.split(' ')[1] }}</span></div>
          </div>
        </div>

        <!-- Acciones -->
        <div class="actions">
          <button v-if="!isConductor && telefonoOtro" class="btn-wpp" @click="contactarWpp(telefonoOtro)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.853L0 24l6.335-1.521A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.645-.52-5.148-1.422l-.369-.218-3.763.904.937-3.666-.242-.381A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
            Contactar por WhatsApp
          </button>

          <template v-if="isConductor">
            <button v-if="puedeIniciar" class="btn-iniciar" @click="iniciarViaje">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Iniciar viaje
            </button>
            <button v-if="puedeFinalizar" class="btn-finalizar" @click="finalizarViaje">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
              Finalizar viaje
            </button>
          </template>

          <button v-if="viaje.estado === 'aceptada' || viaje.estado === 'abierto'" class="btn-cancel" @click="cancelarViaje">
            Cancelar viaje
          </button>
        </div>

      </template>

      <div v-else class="empty-state">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="opacity:0.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <p>Viaje no encontrado</p>
      </div>

      <div class="toast" :class="{ show: toast.show, success: toast.type==='success', error: toast.type==='error' }">{{ toast.msg }}</div>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { IonPage, IonContent } from '@ionic/vue';
import { useAuthStore } from '@/stores/authStore';
import MapaViaje from '@/views/MapaViaje.vue';

const router = useRouter();
const route  = useRoute();
const authStore = useAuthStore();
const isConductor = computed(() => authStore.user?.role === 'conductor');
const solicitudId = Number(route.params.id);
const API = 'https://gotogether-api.onrender.com';
const loading = ref(true);
const viaje   = ref<any>(null);
let pollingInterval: any = null;

function getToken() { return localStorage.getItem('token') || ''; }

const diasMap: Record<number,string> = { 0:'domingo',1:'lunes',2:'martes',3:'miercoles',4:'jueves',5:'viernes',6:'sabado' };
const diaHoy = diasMap[new Date().getDay()];

// ─── Fetch ────────────────────────────────────────────────────────────────────
async function fetchViaje() {
  try {
    const res = await fetch(`${API}/api/viajes/${solicitudId}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });

    if (!res.ok) {
      // Fallback para conductor Y pasajero: buscar viaje activo del día
      const r2 = await fetch(`${API}/api/viajes/mis-viajes`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (r2.ok) {
        const mis = await r2.json();
        if (mis.length > 0) {
          const v = mis[0];
          viaje.value = {
            ...v,
            pasajeros: v.pasajeros || [],
            schedule: typeof v.schedule === 'string' ? JSON.parse(v.schedule) : (v.schedule || {}),
            precio:   typeof v.precio   === 'string' ? JSON.parse(v.precio)   : (v.precio   || {}),
            routes:   typeof v.routes   === 'string' ? JSON.parse(v.routes)   : (v.routes   || {}),
          };
        } else { router.replace('/inicio'); }
      } else { router.replace('/inicio'); }
      return;
    }

    const data = await res.json();
    // Normalizar campos que pueden llegar como string JSON
    data.schedule = typeof data.schedule === 'string' ? JSON.parse(data.schedule) : (data.schedule || {});
    data.precio   = typeof data.precio   === 'string' ? JSON.parse(data.precio)   : (data.precio   || {});
    data.routes   = typeof data.routes   === 'string' ? JSON.parse(data.routes)   : (data.routes   || {});
    viaje.value = data;

    // Si es pasajero y el viaje está aceptado/en_curso, cargar también
    // todos los pickups del conductor para mostrar la ruta completa
    if (!isConductor.value && ['aceptada','en_curso'].includes(data.estado)) {
      try {
        const r2 = await fetch(`${API}/api/viajes/mis-viajes`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        if (r2.ok) {
          const mis = await r2.json();
          if (mis.length > 0) {
            const v = mis[0];
            // Enriquecer con pasajeros del viaje para el mapa
            viaje.value = {
              ...data,
              pasajeros: v.pasajeros || [],
              todosPickupsConductor: (v.pasajeros || [])
                .filter((p: any) => p.pickup_lat)
                .map((p: any) => ({
                  lat: Number(p.pickup_lat),
                  lon: Number(p.pickup_lon),
                  destino_lat: p.destino_lat ? Number(p.destino_lat) : null,
                  destino_lon: p.destino_lon ? Number(p.destino_lon) : null,
                  direccion: p.pickup_direccion || '',
                  universidad: p.pickup_universidad || '',
                  nombre: p.pasajero_name,
                })),
            };
          }
        }
      } catch(e) { console.warn('No se pudo cargar ruta completa:', e); }
    }

    // Cargar pickups del viaje del conductor para el mapa del pasajero
    if (!isConductor.value && ['aceptada','en_curso'].includes(data.estado)) {
      await cargarPickupsConductor(data.conductor_id);
    }

    // Parar polling si finalizado
    const est = data.estado || data.viaje_estado;
    if (est === 'finalizada' || est === 'finalizado') { clearInterval(pollingInterval); pollingInterval = null; }
  } catch(e) { console.error(e); }
  finally { loading.value = false; }
}

async function cargarPickupsConductor(conductorId: number) {
  try {
    const r = await fetch(`${API}/api/solicitudes/mis-solicitudes`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (!r.ok) return;
    const sols = await r.json();

    // Mi solicitud activa con pickup
    const miSol = sols.find((s: any) =>
      s.pickup_lat && ['aceptada','en_curso','finalizada'].includes(s.estado)
    );
    if (!miSol || !viaje.value) return;

    // Todos los pasajeros del mismo conductor con pickup
    const todosConPickup = sols.filter((s: any) =>
      s.conductor_id === conductorId &&
      s.pickup_lat &&
      ['aceptada','en_curso','finalizada'].includes(s.estado)
    );

    const fuente = todosConPickup.length > 0 ? todosConPickup : [miSol];
    const picks = fuente.map((s: any) => ({
      lat: Number(s.pickup_lat),
      lon: Number(s.pickup_lon),
      destino_lat: s.destino_lat ? Number(s.destino_lat) : null,
      destino_lon: s.destino_lon ? Number(s.destino_lon) : null,
      direccion: s.pickup_direccion || '',
      universidad: s.pickup_universidad || '',
      nombre: s.pasajero_name || 'Pasajero',
    }));

    viaje.value = {
      ...viaje.value,
      pickup_lat: miSol.pickup_lat,
      pickup_lon: miSol.pickup_lon,
      pickup_direccion: miSol.pickup_direccion,
      pickup_universidad: miSol.pickup_universidad,
      destino_lat: miSol.destino_lat,
      destino_lon: miSol.destino_lon,
      todosPickupsConductor: picks,
    };
  } catch(e) { console.warn('cargarPickups:', e); }
}

onMounted(async () => {
  await fetchViaje();
  // Para pasajero: siempre cargar pickups del conductor para el mapa
  if (!isConductor.value && viaje.value?.conductor_id) {
    await cargarPickupsConductor(viaje.value.conductor_id);
  }
  // Si ya calificó, marcar como enviada
  if (viaje.value?.calificacion) {
    calificacionEnviada.value = true;
    califSeleccionada.value = viaje.value.calificacion;
    califTemp.value = viaje.value.calificacion;
  }
  pollingInterval = setInterval(async () => {
    await fetchViaje();
    // Recargar pickups en cada poll para ver nuevos pasajeros
    if (!isConductor.value && viaje.value?.conductor_id) {
      await cargarPickupsConductor(viaje.value.conductor_id);
    }
  }, 15000);
});
onUnmounted(() => { if (pollingInterval) clearInterval(pollingInterval); });

// ─── Computed ─────────────────────────────────────────────────────────────────
const pasajeros = computed(() => {
  if (!isConductor.value || !viaje.value) return [];
  if (Array.isArray(viaje.value.pasajeros) && viaje.value.pasajeros.length > 0) return viaje.value.pasajeros;
  if (viaje.value.pasajero_name) return [{
    solicitud_id: viaje.value.solicitud_id,
    pasajero_id: viaje.value.pasajero_id,
    pasajero_name: viaje.value.pasajero_name,
    pasajero_phone: viaje.value.pasajero_phone,
    pasajero_university: viaje.value.pasajero_university,
    pickup_lat: viaje.value.pickup_lat,
    pickup_lon: viaje.value.pickup_lon,
    pickup_direccion: viaje.value.pickup_direccion,
    pickup_universidad: viaje.value.pickup_universidad,
    destino_lat: viaje.value.destino_lat,
    destino_lon: viaje.value.destino_lon,
  }];
  return [];
});

const todosPickups = computed(() => {
  if (!viaje.value) return [];

  if (isConductor.value) {
    // Conductor: si pasajeros[] tiene datos usarlos, sino leer de la raiz
    const lista = pasajeros.value.length > 0 ? pasajeros.value : [viaje.value];
    return lista
      .filter((p: any) => p.pickup_lat)
      .map((p: any) => ({
        lat: Number(p.pickup_lat),
        lon: Number(p.pickup_lon),
        destino_lat: p.destino_lat ? Number(p.destino_lat) : null,
        destino_lon: p.destino_lon ? Number(p.destino_lon) : null,
        direccion: p.pickup_direccion || '',
        universidad: p.pickup_universidad || '',
        nombre: p.pasajero_name || p.conductor_name || '',
      }));
  } else {
    // Pasajero: los datos del pickup estan en la raiz de viaje.value
    if (!viaje.value.pickup_lat) return [];
    return [{
      lat: Number(viaje.value.pickup_lat),
      lon: Number(viaje.value.pickup_lon),
      destino_lat: viaje.value.destino_lat ? Number(viaje.value.destino_lat) : null,
      destino_lon: viaje.value.destino_lon ? Number(viaje.value.destino_lon) : null,
      direccion: viaje.value.pickup_direccion || '',
      universidad: viaje.value.pickup_universidad || '',
      nombre: 'Yo',
    }];
  }
});

const telefonoOtro = computed(() => (!isConductor.value ? viaje.value?.conductor_phone : '') || '');
const horario = computed(() => {
  let s = viaje.value?.schedule;
  if (!s) return { ida: '', vuelta: '' };
  if (typeof s === 'string') { try { s = JSON.parse(s); } catch { return { ida: '', vuelta: '' }; } }
  return { ida: s?.[diaHoy]?.ida || '', vuelta: s?.[diaHoy]?.vuelta || '' };
});
const rutaStops = computed((): string[] => {
  // Solo mostrar paradas si tienen contenido real (no strings vacíos)
  let routes = viaje.value?.routes;
  if (!routes) return [];
  if (typeof routes === 'string') { try { routes = JSON.parse(routes); } catch { return []; } }
  const stops = routes?.[diaHoy]?.stops || [];
  return Array.isArray(stops) ? stops.filter((s: string) => s && s.trim() !== '') : [];
});
// true cuando el pasajero ya confirmó su pickup (oculta el formulario en MapaViaje)
// Para conductor: verificar estado de todos los pasajeros
const puedeIniciar = computed(() => {
  if (!isConductor.value || !viaje.value) return false;
  const est = viaje.value.estado;
  if (['aceptada','abierto'].includes(est)) return true;
  // Si hay pasajeros con estado aceptada
  if (pasajeros.value.some((p: any) => p.estado === 'aceptada')) return true;
  return false;
});
const puedeFinalizar = computed(() => {
  if (!isConductor.value || !viaje.value) return false;
  const est = viaje.value.estado;
  if (est === 'en_curso') return true;
  // Si hay pasajeros con estado en_curso
  if (pasajeros.value.some((p: any) => p.estado === 'en_curso')) return true;
  return false;
});

const yaConfirmadoPasajero = computed(() => {
  if (isConductor.value) return false;
  if (!viaje.value) return false;
  // Si tiene pickup guardado O si el viaje ya inició → formulario oculto
  return !!(viaje.value.pickup_lat) || 
         viaje.value.estado === 'en_curso' || 
         viaje.value.estado === 'finalizada';
});

// Controla si MapaViaje muestra el formulario:
// solo cuando el pasajero NO ha confirmado su pickup todavía
const miSolicitudIdMapa = computed(() => {
  if (isConductor.value) return null;
  if (!viaje.value) return null;
  // Si ya tiene pickup guardado, pasar el id pero yaConfirmado=true ocultará el form
  // Si no tiene pickup y el estado es aceptada → mostrar formulario
  const est = viaje.value.estado;
  if (est === 'finalizada' || est === 'finalizado') return null;
  // Para en_curso sin pickup: ya es tarde pero mostramos confirmado
  return viaje.value.solicitud_id || null;
});

const precio = computed((): string => {
  if (!viaje.value) return '';
  // 1. precio_viaje especifico de esta solicitud
  if (viaje.value.precio_viaje) return String(viaje.value.precio_viaje);
  // 2. precio del horario del conductor para hoy (cargado por cargarPickupsConductor)
  const diasMap: Record<number,string> = {0:'domingo',1:'lunes',2:'martes',3:'miercoles',4:'jueves',5:'viernes',6:'sabado'};
  const d = diasMap[new Date().getDay()];
  let p = viaje.value.precio;
  if (p && typeof p === 'string') { try { p = JSON.parse(p); } catch { return ''; } }
  const val = p?.[d];
  return val ? String(val) : '';
});

function estadoLabel(e: string) {
  const m: Record<string,string> = { pendiente:'Pendiente', aceptada:'Confirmado', abierto:'Confirmado', en_curso:'En curso', finalizado:'Finalizado', finalizada:'Finalizado' };
  return m[e] || e;
}

// ─── Calificación inline ──────────────────────────────────────────────────────
const califSeleccionada = ref(0);
const califTemp         = ref(0);
const comentarioCalif   = ref('');
const sendingCalif      = ref(false);
const calificacionEnviada = ref(false);

function ratingLabel(n: number) {
  const l = ['', 'Muy malo', 'Regular', 'Bien', 'Muy bien', '¡Excelente!'];
  return l[n] || '';
}

async function enviarCalificacion() {
  if (!califSeleccionada.value || sendingCalif.value) return;
  sendingCalif.value = true;
  try {
    const receptor_id = viaje.value?.conductor_id;
    const viaje_id    = viaje.value?.viaje_id || solicitudId;
    const res = await fetch(`${API}/api/viajes/${solicitudId}/calificar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({
        calificacion: califSeleccionada.value,
        comentario:   comentarioCalif.value.trim() || null,
        conductor_id: receptor_id,
      }),
    });
    if (res.ok) {
      calificacionEnviada.value = true;
      showToast('¡Gracias por calificar!', 'success');
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.message || 'Error al enviar', 'error');
    }
  } catch { showToast('Error de conexión', 'error'); }
  finally { sendingCalif.value = false; }
}

// ─── Acciones ─────────────────────────────────────────────────────────────────
function initial(name: string) { return name?.charAt(0).toUpperCase() || '?'; }
const avatarColors = ['linear-gradient(135deg,#8B1A1A,#4a0e0e)','linear-gradient(135deg,#1a3a8B,#0e1f4a)','linear-gradient(135deg,#1a6b3a,#0e3a1f)','linear-gradient(135deg,#6b1a6b,#3a0e3a)','linear-gradient(135deg,#2a2a6b,#1a1a3a)','linear-gradient(135deg,#5a3a1a,#3a200e)'];
function avatarColor(name: string) { return avatarColors[(name?.charCodeAt(0)||0) % avatarColors.length]; }
function contactarWpp(phone: string) { window.open(`https://wa.me/57${phone}`, '_blank'); }

const toast = ref({ show: false, msg: '', type: 'success' });
function showToast(msg: string, type: 'success'|'error' = 'success') {
  toast.value = { show: true, msg, type };
  setTimeout(() => { toast.value.show = false; }, 2500);
}

async function onUbicacionCompartida(data: any) {
  try {
    const res = await fetch(`${API}/api/solicitudes/${solicitudId}/pickup`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({
        pickup_lat: data.lat, pickup_lon: data.lon,
        pickup_direccion: data.direccion, pickup_universidad: data.universidad,
        destino_lat: data.destino_lat, destino_lon: data.destino_lon,
      }),
    });
    if (res.ok) { showToast('Ubicación compartida', 'success'); await fetchViaje(); }
    else showToast('Error al guardar ubicación', 'error');
  } catch { showToast('Error al compartir ubicación', 'error'); }
}

async function iniciarViaje() {
  const id = viaje.value?.viaje_id || solicitudId;
  const res = await fetch(`${API}/api/viajes/${id}/iniciar`, { method: 'PATCH', headers: { Authorization: `Bearer ${getToken()}` } });
  if (res.ok) { viaje.value.estado = 'en_curso'; showToast('¡Viaje iniciado!', 'success'); }
}

async function finalizarViaje() {
  const id = viaje.value?.viaje_id || solicitudId;
  const res = await fetch(`${API}/api/viajes/${id}/finalizar`, { method: 'PATCH', headers: { Authorization: `Bearer ${getToken()}` } });
  if (res.ok) {
    showToast('¡Viaje finalizado!', 'success');
    // Conductor va al inicio, pasajero ve historial
    setTimeout(() => router.replace('/inicio'), 800);
  }
}

async function cancelarViaje() {
  const res = await fetch(`${API}/api/solicitudes/${solicitudId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
  if (res.ok) { showToast('Viaje cancelado', 'error'); setTimeout(() => router.replace('/inicio'), 1000); }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
.viaje-content { --background: #070707; }
.grain { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.04'/%3E%3C/svg%3E"); }
.atm-glow { position: fixed; width: 350px; height: 350px; background: radial-gradient(circle, rgba(139,26,26,0.12) 0%, transparent 70%); top: -100px; left: 50%; transform: translateX(-50%); filter: blur(60px); pointer-events: none; z-index: 0; }

/* ── HISTORIAL ────────────────────────────────── */
.hst-header { display: flex; align-items: center; gap: 14px; padding: 22px 20px 18px; position: relative; z-index: 1; }
.back-btn { width: 36px; height: 36px; background: #171717; border: 1px solid rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: rgba(237,233,230,0.6); cursor: pointer; flex-shrink: 0; }
.hst-title-wrap { flex: 1; }
.brand { font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 700; color: rgba(237,233,230,0.3); margin-bottom: 2px; }
.brand span { color: #a32020; }
.hst-title { font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 800; color: #ede9e6; }
.hst-check { width: 38px; height: 38px; background: rgba(37,211,102,0.12); border: 1px solid rgba(37,211,102,0.25); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #25d366; }

.hst-conductor-card { margin: 0 18px 12px; background: linear-gradient(135deg,#141010,#100808); border: 1px solid rgba(139,26,26,0.25); border-radius: 18px; padding: 16px; display: flex; align-items: center; gap: 12px; position: relative; z-index: 1; }
.hst-av { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 800; color: #ede9e6; flex-shrink: 0; }
.hst-cond-info { flex: 1; }
.hst-cond-name { font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; color: #ede9e6; }
.hst-cond-sub { font-size: 11.5px; color: rgba(237,233,230,0.38); margin-top: 2px; }
.hst-precio-badge { text-align: center; }
.hst-precio-val { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 800; color: #25d366; }
.hst-precio-lbl { font-size: 9px; color: rgba(37,211,102,0.5); text-transform: uppercase; letter-spacing: 0.5px; }

.hst-ruta-card { margin: 0 18px 12px; background: #111; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 16px; position: relative; z-index: 1; }
.hst-ruta-title { font-family: 'Outfit', sans-serif; font-size: 11px; font-weight: 700; color: rgba(237,233,230,0.3); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px; }
.hst-ruta-line { display: flex; flex-direction: column; gap: 0; }
.hst-stop { display: flex; align-items: flex-start; gap: 12px; }
.hst-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; }
.hst-dot.pickup { background: #8B1A1A; box-shadow: 0 0 8px rgba(139,26,26,0.5); }
.hst-dot.destino { background: #25d366; box-shadow: 0 0 8px rgba(37,211,102,0.5); }
.hst-connector { width: 2px; height: 22px; background: rgba(255,255,255,0.08); margin-left: 5px; }
.hst-stop-label { font-size: 10px; color: rgba(237,233,230,0.3); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
.hst-stop-dir { font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600; color: #ede9e6; }

.hst-pago-card { margin: 0 18px 12px; background: #111; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 16px; position: relative; z-index: 1; }
.hst-pago-title { font-family: 'Outfit', sans-serif; font-size: 11px; font-weight: 700; color: rgba(237,233,230,0.3); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px; }
.hst-pago-row { display: flex; justify-content: space-between; font-family: 'DM Sans', sans-serif; font-size: 13px; color: rgba(237,233,230,0.55); padding: 5px 0; }
.hst-pago-row.total { border-top: 1px solid rgba(255,255,255,0.07); margin-top: 6px; padding-top: 10px; color: #ede9e6; font-weight: 700; font-size: 15px; }
.hst-pago-metodo { display: flex; align-items: center; gap: 6px; margin-top: 10px; font-size: 11.5px; color: rgba(237,233,230,0.3); font-family: 'DM Sans', sans-serif; }

.hst-rating-card { margin: 0 18px 12px; background: linear-gradient(135deg,#111,#0f0d0d); border: 1px solid rgba(201,162,39,0.2); border-radius: 18px; padding: 20px 16px; position: relative; z-index: 1; }
.hst-rating-title { font-family: 'Outfit', sans-serif; font-size: 17px; font-weight: 800; color: #ede9e6; margin-bottom: 4px; }
.hst-rating-sub { font-size: 12px; color: rgba(237,233,230,0.38); margin-bottom: 16px; }
.hst-stars { display: flex; gap: 6px; margin-bottom: 10px; }
.hst-star { font-size: 36px; background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.12); transition: color 0.12s, transform 0.1s; padding: 0; line-height: 1; }
.hst-star.sel { color: #c9a227; }
.hst-star:hover { transform: scale(1.12); }
.hst-rating-label { font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 700; color: #c9a227; margin-bottom: 10px; }
.hst-comentario { width: 100%; background: #0d0d0d; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; color: #ede9e6; font-family: 'DM Sans', sans-serif; font-size: 13px; padding: 10px 12px; resize: none; outline: none; box-sizing: border-box; margin-bottom: 12px; }
.hst-comentario::placeholder { color: rgba(237,233,230,0.2); }
.hst-btn-calificar { width: 100%; padding: 13px; background: #8B1A1A; border: none; border-radius: 12px; color: #ede9e6; font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 800; cursor: pointer; transition: opacity 0.2s; }
.hst-btn-calificar:disabled { opacity: 0.4; cursor: not-allowed; }
.hst-rating-done { margin: 0 18px 12px; display: flex; align-items: center; gap: 8px; color: #25d366; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; position: relative; z-index: 1; }

/* ── VISTA NORMAL ─────────────────────────────── */
.top-bar { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 14px; position: relative; z-index: 1; }
.top-title { font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 700; color: #ede9e6; }
.estado-pill { border-radius: 20px; padding: 4px 10px; font-size: 10px; font-weight: 700; font-family: 'Outfit', sans-serif; display: flex; align-items: center; gap: 5px; }
.estado-pendiente { background: rgba(201,162,39,0.1); border: 1px solid rgba(201,162,39,0.25); color: #c9a227; }
.estado-aceptada,.estado-abierto { background: rgba(37,211,102,0.1); border: 1px solid rgba(37,211,102,0.25); color: #25d366; }
.estado-en_curso { background: rgba(139,26,26,0.14); border: 1px solid rgba(139,26,26,0.28); color: #a32020; }
.estado-dot { width: 6px; height: 6px; border-radius: 50%; animation: pulse 1.5s ease infinite; }
.estado-aceptada .estado-dot,.estado-abierto .estado-dot { background: #25d366; }
.estado-en_curso .estado-dot { background: #a32020; }
@keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
.mapa-wrap { margin: 0 18px 14px; border: 1px solid rgba(37,211,102,0.15); border-radius: 16px; overflow: hidden; position: relative; z-index: 1; }
.pendiente-banner { margin: 0 18px 12px; background: rgba(201,162,39,0.1); border: 1px solid rgba(201,162,39,0.22); border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; gap: 10px; font-size: 13px; color: #c9a227; font-weight: 600; font-family: 'Outfit', sans-serif; position: relative; z-index: 1; }
.pendiente-dot { width: 10px; height: 10px; border-radius: 50%; background: #c9a227; flex-shrink: 0; animation: pulse 1s ease infinite; }
.en-curso-banner { margin: 0 18px 12px; background: rgba(139,26,26,0.12); border: 1px solid rgba(139,26,26,0.25); border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; gap: 10px; font-size: 13px; color: #a32020; font-weight: 600; font-family: 'Outfit', sans-serif; position: relative; z-index: 1; }
.en-curso-dot { width: 10px; height: 10px; border-radius: 50%; background: #a32020; flex-shrink: 0; animation: pulse 1s ease infinite; }
.pasajeros-list { margin: 0 18px 12px; background: #111; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; overflow: hidden; position: relative; z-index: 1; }
.pasajeros-title { display: flex; align-items: center; gap: 6px; padding: 10px 14px; font-size: 10px; font-weight: 700; color: rgba(237,233,230,0.35); text-transform: uppercase; letter-spacing: 1px; font-family: 'Outfit', sans-serif; border-bottom: 1px solid rgba(255,255,255,0.05); }
.pasajero-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); }
.pasajero-row:last-child { border-bottom: none; }
.pas-av { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 800; color: #ede9e6; flex-shrink: 0; }
.pas-info { flex: 1; min-width: 0; }
.pas-name { font-size: 13px; font-weight: 600; color: #ede9e6; font-family: 'Outfit', sans-serif; }
.pas-uni { font-size: 11px; color: #a32020; font-weight: 600; font-family: 'Outfit', sans-serif; }
.pas-dir { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #ffcc00; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pas-dir.sin-dir { color: rgba(237,233,230,0.2); }
.pas-wpp { width: 32px; height: 32px; background: rgba(37,211,102,0.1); border: 1px solid rgba(37,211,102,0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #25d366; cursor: pointer; flex-shrink: 0; }
.persona-card { margin: 0 18px 12px; background: #111; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 14px; position: relative; z-index: 1; }
.persona-top { display: flex; align-items: center; gap: 12px; }
.persona-av { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 800; color: #ede9e6; flex-shrink: 0; }
.persona-info { flex: 1; }
.persona-name { font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 700; color: #ede9e6; }
.persona-sub { font-size: 11px; color: rgba(237,233,230,0.38); margin-top: 2px; }
.persona-destino { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #a32020; font-weight: 600; }
.viaje-ruta { display: flex; flex-direction: column; gap: 0; }
.viaje-stop { display: flex; align-items: center; gap: 8px; padding: 4px 0; position: relative; }
.vstop-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.vstop-dot.start { background: #8B1A1A; box-shadow: 0 0 6px rgba(139,26,26,0.6); }
.vstop-dot.mid { background: rgba(237,233,230,0.2); }
.vstop-dot.end { background: #25d366; box-shadow: 0 0 6px rgba(37,211,102,0.5); }
.vstop-label { font-family: 'DM Sans', sans-serif; font-size: 12.5px; color: rgba(237,233,230,0.65); }
.ruta-stops-wrap { margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.06); }
.ruta-stops-title { font-size: 9px; font-weight: 700; color: rgba(237,233,230,0.25); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px; font-family: 'Outfit', sans-serif; }
.ruta-stops-list { display: flex; flex-direction: column; }
.ruta-stop-row { display: flex; align-items: flex-start; gap: 8px; position: relative; padding-bottom: 0; }
.ruta-stop-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; z-index: 1; }
.dot-start { background: #8B1A1A; box-shadow: 0 0 6px rgba(139,26,26,0.6); }
.dot-mid { background: rgba(237,233,230,0.2); }
.dot-end { background: #25d366; box-shadow: 0 0 6px rgba(37,211,102,0.5); }
.ruta-stop-line { position: absolute; left: 4px; top: 12px; width: 1px; height: 16px; background: rgba(255,255,255,0.1); }
.ruta-stop-name { font-family: 'DM Sans', sans-serif; font-size: 12px; color: rgba(237,233,230,0.65); padding-bottom: 12px; }
.conductor-card-uber { margin: 0 18px 12px; background: #111; border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; overflow: hidden; position: relative; z-index: 1; }
.ccu-top { display: flex; align-items: center; gap: 12px; padding: 16px 16px 12px; }
.ccu-av { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Outfit',sans-serif; font-size: 20px; font-weight: 800; color: #ede9e6; flex-shrink: 0; }
.ccu-info { flex: 1; }
.ccu-name { font-family: 'Outfit',sans-serif; font-size: 16px; font-weight: 800; color: #ede9e6; }
.ccu-rol { font-size: 11px; color: rgba(237,233,230,0.35); margin-top: 2px; }
.ccu-precio { text-align: center; background: rgba(37,211,102,0.1); border: 1px solid rgba(37,211,102,0.2); border-radius: 12px; padding: 8px 14px; }
.ccu-precio-val { font-family: 'Outfit',sans-serif; font-size: 18px; font-weight: 800; color: #25d366; }
.ccu-precio-lbl { font-size: 9px; color: rgba(37,211,102,0.5); text-transform: uppercase; }
.ccu-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 0 16px; }
.ccu-vehicle-row { display: flex; padding: 12px 16px; gap: 0; }
.ccu-vehicle-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; font-family: 'DM Sans',sans-serif; font-size: 11.5px; color: rgba(237,233,230,0.5); text-align: center; }
.ccu-vehicle-item svg { color: rgba(237,233,230,0.3); }
.ccu-placa { font-family: 'Outfit',sans-serif; font-weight: 800; font-size: 13px; color: #ede9e6; letter-spacing: 1px; }
.ccu-destino { display: flex; align-items: center; gap: 10px; padding: 10px 16px 14px; border-top: 1px solid rgba(255,255,255,0.06); font-family: 'DM Sans',sans-serif; font-size: 13px; color: rgba(237,233,230,0.6); }
.ccu-dest-dot { width: 10px; height: 10px; border-radius: 50%; background: #25d366; box-shadow: 0 0 8px rgba(37,211,102,0.5); flex-shrink: 0; }
.precio-box { text-align: center; background: rgba(37,211,102,0.1); border: 1px solid rgba(37,211,102,0.22); border-radius: 10px; padding: 6px 12px; }
.precio-val { font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 800; color: #25d366; }
.precio-lbl { font-size: 8px; color: rgba(37,211,102,0.5); text-transform: uppercase; }
.horario-row { display: flex; gap: 8px; margin: 0 18px 12px; position: relative; z-index: 1; }
.hora-chip { flex: 1; background: rgba(139,26,26,0.1); border: 1px solid rgba(139,26,26,0.25); border-radius: 12px; padding: 10px; text-align: center; }
.hora-lbl { font-size: 9px; color: rgba(237,233,230,0.35); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
.hora-val { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 800; color: #ede9e6; }
.hora-ampm { font-size: 11px; color: rgba(237,233,230,0.4); margin-left: 2px; }
.actions { padding: 4px 18px 40px; display: flex; flex-direction: column; gap: 10px; position: relative; z-index: 1; }
.btn-wpp { width: 100%; padding: 15px; background: rgba(37,211,102,0.12); border: 1px solid rgba(37,211,102,0.25); border-radius: 14px; color: #25d366; font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
.btn-iniciar { width: 100%; padding: 16px; background: #25d366; border: none; border-radius: 14px; color: #070707; font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 8px 24px rgba(37,211,102,0.35); }
.btn-finalizar { width: 100%; padding: 16px; background: #8B1A1A; border: none; border-radius: 14px; color: #ede9e6; font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 8px 24px rgba(139,26,26,0.4); }
.btn-cancel { width: 100%; padding: 13px; background: rgba(255,60,60,0.06); border: 1px solid rgba(255,60,60,0.12); border-radius: 14px; color: rgba(255,100,100,0.6); font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; }
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 80px 0; color: rgba(237,233,230,0.25); font-family: 'DM Sans', sans-serif; font-size: 14px; position: relative; z-index: 1; }
.spinner { width: 32px; height: 32px; border-radius: 50%; border: 3px solid rgba(139,26,26,0.2); border-top-color: #8B1A1A; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.toast { position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%) translateY(20px); background: #1a1a1a; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 10px 20px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: #ede9e6; z-index: 999; opacity: 0; transition: all 0.3s ease; pointer-events: none; white-space: nowrap; }
.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
.toast.success { border-color: rgba(37,211,102,0.3); color: #25d366; }
.toast.error { border-color: rgba(139,26,26,0.28); color: #a32020; }
</style>

