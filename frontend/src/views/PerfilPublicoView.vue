<template>
  <ion-page>
    <ion-content :fullscreen="true" class="pp-content">
      <div class="grain"></div>
      <div class="atm-glow"></div>

      <!-- Header -->
      <div class="pp-header">
        <button class="back-btn" @click="router.back()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div class="brand">go<span>Together</span></div>
      </div>

      <div v-if="loading" class="empty-state">
        <div class="spinner"></div>
        <p>Cargando perfil...</p>
      </div>

      <template v-else-if="usuario">
        <!-- Card principal -->
        <div class="pp-card">
          <div class="pp-av" :style="`background:${avatarColor(usuario.name)}`">
            {{ initial(usuario.name) }}
          </div>
          <div class="pp-name">{{ usuario.name }}</div>
          <div class="pp-role">{{ usuario.role === 'conductor' ? '🚗 Conductor' : '🎓 Pasajero' }}</div>
          <div class="pp-city">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {{ usuario.city || 'Sin ciudad' }}
          </div>
          <!-- Rating -->
          <div v-if="Number(usuario.total_resenas) > 0" class="pp-rating">
            <div class="pp-stars">
              <span v-for="i in 5" :key="i" class="pp-star" :class="{ filled: i <= Math.round(Number(usuario.promedio_resenas)) }">★</span>
            </div>
            <span class="pp-rating-val">{{ usuario.promedio_resenas }}</span>
            <span class="pp-rating-count">({{ usuario.total_resenas }} reseñas)</span>
          </div>
        </div>

        <!-- Info conductor -->
        <div v-if="usuario.role === 'conductor'" class="pp-section">
          <div class="pp-section-title">Vehículo</div>
          <div class="pp-vehicle-row">
            <div class="pp-vehicle-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              <span>{{ usuario.car_model || '—' }}</span>
            </div>
            <div class="pp-vehicle-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="18" height="13" rx="1"/><path d="M8 6V4M16 6V4"/></svg>
              <span class="pp-placa">{{ usuario.plate || '—' }}</span>
            </div>
            <div class="pp-vehicle-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              <span>{{ usuario.capacity || 4 }} cupos</span>
            </div>
          </div>
        </div>

        <!-- Info pasajero -->
        <div v-if="usuario.role === 'pasajero' && usuario.university" class="pp-section">
          <div class="pp-section-title">Universidad</div>
          <div class="pp-info-row">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
            {{ usuario.university }}
          </div>
        </div>

        <!-- Horario -->
        <div v-if="horarioHoy.ida || horarioHoy.vuelta" class="pp-section">
          <div class="pp-section-title">Horario hoy</div>
          <div class="pp-horario-row">
            <div v-if="horarioHoy.ida" class="pp-hora-chip">
              <div class="pp-hora-lbl">Salida</div>
              <div class="pp-hora-val">{{ horarioHoy.ida }}</div>
            </div>
            <div v-if="horarioHoy.vuelta" class="pp-hora-chip">
              <div class="pp-hora-lbl">Regreso</div>
              <div class="pp-hora-val">{{ horarioHoy.vuelta }}</div>
            </div>
            <div v-if="precioHoy" class="pp-hora-chip precio">
              <div class="pp-hora-lbl">Precio</div>
              <div class="pp-hora-val precio">${{ Number(precioHoy).toLocaleString('es-CO') }}</div>
            </div>
          </div>
        </div>

        <!-- Ruta -->
        <div v-if="rutaHoy.length > 0" class="pp-section">
          <div class="pp-section-title">Ruta de hoy</div>
          <div v-for="(stop, i) in rutaHoy" :key="i" class="pp-stop">
            <div class="pp-stop-dot" :class="i === 0 ? 'start' : i === rutaHoy.length-1 ? 'end' : 'mid'"></div>
            <span class="pp-stop-label">{{ stop }}</span>
          </div>
        </div>

        <!-- Acción principal -->
        <div class="pp-actions">
          <button v-if="usuario.phone" class="pp-btn-wpp" @click="contactarWpp">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.853L0 24l6.335-1.521A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.645-.52-5.148-1.422l-.369-.218-3.763.904.937-3.666-.242-.381A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
            Contactar por WhatsApp
          </button>
        </div>

        <!-- Reseñas -->
        <div class="pp-section">
          <div class="pp-section-title">Reseñas ({{ resenas.length }})</div>
          <div v-if="loadingResenas" class="empty-state-sm">Cargando...</div>
          <div v-else-if="resenas.length === 0" class="empty-state-sm">Sin reseñas todavía</div>
          <div v-else v-for="(r, i) in resenas" :key="r.id" class="pp-resena" :style="`animation-delay:${i*0.05}s`">
            <div class="pp-resena-top">
              <div class="pp-resena-av" :style="`background:${avatarColor(r.autor_name)}`">{{ initial(r.autor_name) }}</div>
              <div class="pp-resena-meta">
                <div class="pp-resena-name">{{ r.autor_name }}</div>
                <div class="pp-resena-role">{{ r.autor_role === 'conductor' ? '🚗 Conductor' : '🎓 Pasajero' }}</div>
              </div>
              <div class="pp-resena-stars">
                <span v-for="i in 5" :key="i" class="star-sm" :class="{ filled: i <= r.calificacion }">★</span>
              </div>
            </div>
            <p v-if="r.comentario" class="pp-resena-comentario">{{ r.comentario }}</p>
            <div class="pp-resena-fecha">{{ formatFecha(r.created_at) }}</div>
          </div>
        </div>

        <div style="height:80px"></div>
      </template>

      <div class="toast" :class="{ show: toast.show }">{{ toast.msg }}</div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { IonPage, IonContent } from '@ionic/vue';

const router = useRouter();
const route  = useRoute();
const userId = Number(route.params.id);
const API = 'https://gotogether-api.onrender.com';
function getToken() { return localStorage.getItem('token') || ''; }

const loading        = ref(true);
const loadingResenas = ref(false);
const usuario        = ref<any>(null);
const resenas        = ref<any[]>([]);

const diasMap: Record<number,string> = {0:'domingo',1:'lunes',2:'martes',3:'miercoles',4:'jueves',5:'viernes',6:'sabado'};
const diaHoy = diasMap[new Date().getDay()];

const horarioHoy = computed(() => {
  const s = usuario.value?.schedule;
  if (!s) return { ida: '', vuelta: '' };
  const sch = typeof s === 'string' ? JSON.parse(s) : s;
  return sch?.[diaHoy] || { ida: '', vuelta: '' };
});

const precioHoy = computed(() => {
  const p = usuario.value?.precio;
  if (!p) return '';
  const pr = typeof p === 'string' ? JSON.parse(p) : p;
  return pr?.[diaHoy] || '';
});

const rutaHoy = computed(() => {
  const r = usuario.value?.routes;
  if (!r) return [];
  const rt = typeof r === 'string' ? JSON.parse(r) : r;
  return (rt?.[diaHoy]?.stops || []).filter((s: string) => s && s.trim());
});

async function fetchUsuario() {
  loading.value = true;
  try {
    const res = await fetch(`${API}/api/users/${userId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) usuario.value = await res.json();
  } catch(e) {} finally { loading.value = false; }
}

async function fetchResenas() {
  loadingResenas.value = true;
  try {
    const res = await fetch(`${API}/api/resenas/${userId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) resenas.value = await res.json();
  } catch(e) {} finally { loadingResenas.value = false; }
}

onMounted(() => { fetchUsuario(); fetchResenas(); });

function contactarWpp() {
  if (usuario.value?.phone) window.open(`https://wa.me/57${usuario.value.phone}`, '_blank');
}
function formatFecha(f: string) {
  return new Date(f).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}
function initial(name: string) { return name?.charAt(0).toUpperCase() || '?'; }
const avatarColors = ['linear-gradient(135deg,#8B1A1A,#4a0e0e)','linear-gradient(135deg,#1a3a8B,#0e1f4a)','linear-gradient(135deg,#1a6b3a,#0e3a1f)','linear-gradient(135deg,#6b1a6b,#3a0e3a)','linear-gradient(135deg,#2a2a6b,#1a1a3a)','linear-gradient(135deg,#5a3a1a,#3a200e)'];
function avatarColor(name: string) { return avatarColors[(name?.charCodeAt(0)||0) % avatarColors.length]; }
const toast = ref({ show: false, msg: '' });
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
.pp-content { --background: #070707; }
.grain { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.04'/%3E%3C/svg%3E"); }
.atm-glow { position: fixed; width: 350px; height: 350px; background: radial-gradient(circle, rgba(139,26,26,0.12) 0%, transparent 70%); top: -100px; left: 50%; transform: translateX(-50%); filter: blur(60px); pointer-events: none; z-index: 0; }
.pp-header { display: flex; align-items: center; gap: 14px; padding: 22px 20px 10px; position: relative; z-index: 1; }
.back-btn { width: 36px; height: 36px; background: #171717; border: 1px solid rgba(255,255,255,0.08); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: rgba(237,233,230,0.6); cursor: pointer; flex-shrink: 0; }
.brand { font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 700; color: rgba(237,233,230,0.3); }
.brand span { color: #a32020; }

.pp-card { margin: 10px 18px 0; background: linear-gradient(135deg,#141010,#100808); border: 1px solid rgba(139,26,26,0.2); border-radius: 20px; padding: 28px 20px 24px; text-align: center; position: relative; z-index: 1; }
.pp-av { width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 800; color: #ede9e6; margin: 0 auto 14px; border: 3px solid rgba(139,26,26,0.3); }
.pp-name { font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 800; color: #ede9e6; margin-bottom: 4px; }
.pp-role { font-size: 13px; color: rgba(237,233,230,0.4); margin-bottom: 6px; }
.pp-city { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: rgba(237,233,230,0.4); margin-bottom: 12px; }
.pp-rating { display: flex; align-items: center; justify-content: center; gap: 6px; }
.pp-stars { display: flex; gap: 2px; }
.pp-star { font-size: 18px; color: rgba(255,255,255,0.1); }
.pp-star.filled { color: #c9a227; }
.pp-rating-val { font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 800; color: #c9a227; }
.pp-rating-count { font-size: 11px; color: rgba(237,233,230,0.3); }

.pp-section { margin: 14px 18px 0; background: #111; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 14px 16px; position: relative; z-index: 1; }
.pp-section-title { font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 700; color: rgba(237,233,230,0.25); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px; }
.pp-vehicle-row { display: flex; gap: 0; }
.pp-vehicle-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; font-family: 'DM Sans', sans-serif; font-size: 12px; color: rgba(237,233,230,0.55); text-align: center; }
.pp-vehicle-item svg { color: rgba(237,233,230,0.25); }
.pp-placa { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 14px; color: #ede9e6; letter-spacing: 1px; }
.pp-info-row { display: flex; align-items: center; gap: 8px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: rgba(237,233,230,0.6); }
.pp-horario-row { display: flex; gap: 8px; }
.pp-hora-chip { flex: 1; background: rgba(139,26,26,0.1); border: 1px solid rgba(139,26,26,0.2); border-radius: 10px; padding: 8px; text-align: center; }
.pp-hora-chip.precio { background: rgba(37,211,102,0.08); border-color: rgba(37,211,102,0.2); }
.pp-hora-lbl { font-size: 9px; color: rgba(237,233,230,0.3); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
.pp-hora-val { font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 800; color: #ede9e6; }
.pp-hora-val.precio { color: #25d366; }
.pp-stop { display: flex; align-items: center; gap: 10px; padding: 5px 0; }
.pp-stop-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.pp-stop-dot.start { background: #8B1A1A; box-shadow: 0 0 6px rgba(139,26,26,0.5); }
.pp-stop-dot.mid { background: rgba(255,255,255,0.15); }
.pp-stop-dot.end { background: #25d366; box-shadow: 0 0 6px rgba(37,211,102,0.4); }
.pp-stop-label { font-family: 'DM Sans', sans-serif; font-size: 13px; color: rgba(237,233,230,0.65); }

.pp-actions { margin: 14px 18px 0; display: flex; gap: 10px; position: relative; z-index: 1; }
.pp-btn-wpp { flex: 1; padding: 13px; background: rgba(37,211,102,0.1); border: 1px solid rgba(37,211,102,0.25); border-radius: 14px; color: #25d366; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }

.pp-resena { background: #0d0d0d; border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 12px; margin-bottom: 8px; animation: fadeUp 0.3s ease both; }
@keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
.pp-resena-top { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.pp-resena-av { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 800; color: #ede9e6; flex-shrink: 0; }
.pp-resena-meta { flex: 1; }
.pp-resena-name { font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700; color: #ede9e6; }
.pp-resena-role { font-size: 10px; color: rgba(237,233,230,0.3); margin-top: 1px; }
.pp-resena-stars { display: flex; gap: 2px; }
.star-sm { font-size: 14px; color: rgba(255,255,255,0.1); }
.star-sm.filled { color: #c9a227; }
.pp-resena-comentario { font-family: 'DM Sans', sans-serif; font-size: 13px; color: rgba(237,233,230,0.6); line-height: 1.5; margin: 0 0 6px; }
.pp-resena-fecha { font-size: 10px; color: rgba(237,233,230,0.2); }
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 60px 0; color: rgba(237,233,230,0.25); font-family: 'DM Sans', sans-serif; font-size: 13px; position: relative; z-index: 1; }
.empty-state-sm { font-family: 'DM Sans', sans-serif; font-size: 12px; color: rgba(237,233,230,0.25); padding: 4px 0; }
.spinner { width: 28px; height: 28px; border-radius: 50%; border: 3px solid rgba(139,26,26,0.2); border-top-color: #8B1A1A; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.toast { position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%) translateY(20px); background: #1a1a1a; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 10px 20px; font-size: 13px; color: #ede9e6; z-index: 999; opacity: 0; transition: all 0.3s; pointer-events: none; }
.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
</style>