<template>
  <ion-page>
    <ion-content :fullscreen="true" class="res-content">
      <div class="grain"></div>
      <div class="atm-glow"></div>

      <div class="header">
        <button class="back-btn" @click="router.back()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div>
          <div class="brand">go<span>Together</span></div>
          <div class="header-title">Reseñas</div>
        </div>
      </div>

      <!-- Rating summary -->
      <div class="rating-card">
        <div class="rating-big">{{ promedio || '—' }}</div>
        <div class="stars-row">
          <span v-for="i in 5" :key="i" class="star" :class="{ filled: i <= Math.round(promedio) }">★</span>
        </div>
        <div class="rating-sub">{{ total }} reseña{{ total !== 1 ? 's' : '' }}</div>
        <div class="rating-user">{{ targetName }}</div>
      </div>

      <!-- Dejar reseña (solo si compartiste viaje) -->
      <div v-if="puedeResenar && !yaReseno" class="new-review-card">
        <div class="nrc-title">Deja tu reseña</div>
        <div class="star-select">
          <button v-for="i in 5" :key="i" class="star-btn" :class="{ sel: i <= nuevaCalif }" @click="nuevaCalif = i">★</button>
        </div>
        <textarea v-model="nuevoComentario" class="review-input" placeholder="Cuéntanos cómo fue el viaje..." rows="3" maxlength="300"></textarea>
        <div class="nrc-counter">{{ nuevoComentario.length }}/300</div>
        <button class="btn-enviar" :disabled="nuevaCalif === 0 || sending" @click="enviarResena">
          {{ sending ? 'Enviando...' : 'Publicar reseña' }}
        </button>
      </div>
      <div v-else-if="yaReseno" class="ya-reseno">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        Ya dejaste una reseña para este viaje
      </div>

      <!-- Lista de reseñas -->
      <div v-if="loading" class="empty-state">
        <div class="spinner"></div>
        <p>Cargando...</p>
      </div>
      <div v-else-if="resenas.length === 0" class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="opacity:0.2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        <p>Sin reseñas aún</p>
      </div>
      <div v-else class="feed">
        <div v-for="(r, i) in resenas" :key="r.id" class="review-card" :style="`animation-delay:${i*0.06}s`">
          <div class="rv-top">
            <div class="rv-avatar" :style="`background:${avatarColor(r.autor_name)}`">{{ initial(r.autor_name) }}</div>
            <div class="rv-meta">
              <div class="rv-name">{{ r.autor_name }}</div>
              <div class="rv-role">{{ r.autor_role === 'conductor' ? '🚗 Conductor' : '🎓 Pasajero' }}</div>
            </div>
            <div class="rv-stars">
              <span v-for="i in 5" :key="i" class="star-sm" :class="{ filled: i <= r.calificacion }">★</span>
            </div>
          </div>
          <p v-if="r.comentario" class="rv-comentario">{{ r.comentario }}</p>
          <div class="rv-fecha">{{ formatFecha(r.created_at) }}</div>
        </div>
      </div>

      <div style="height:100px"></div>
      <div class="toast" :class="{ show: toast.show, success: toast.type==='success', error: toast.type==='error' }">{{ toast.msg }}</div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { IonPage, IonContent } from '@ionic/vue';
import { useAuthStore } from '@/stores/authStore';

const router  = useRouter();
const route   = useRoute();
const authStore = useAuthStore();

// targetId puede venir como query param o como route param
// /resenas/:userId  ó  /resenas?userId=X&viajeId=Y
const targetId  = Number(route.params.userId || route.query.userId);
const viajeId   = route.query.viajeId ? Number(route.query.viajeId) : null;
const targetName = ref('');
const myId = authStore.user?.id;

const API = 'https://gotogether-api.onrender.com';
function getToken() { return localStorage.getItem('token') || ''; }

const resenas     = ref<any[]>([]);
const promedio    = ref<number>(0);
const total       = ref<number>(0);
const loading     = ref(false);
const puedeResenar = ref(false);
const yaReseno    = ref(false);
const nuevaCalif  = ref(0);
const nuevoComentario = ref('');
const sending     = ref(false);

async function fetchResenas() {
  loading.value = true;
  try {
    const [rRes, pRes] = await Promise.all([
      fetch(`${API}/api/resenas/${targetId}`,          { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/api/resenas/${targetId}/promedio`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (rRes.ok) resenas.value = await rRes.json();
    if (pRes.ok) {
      const p = await pRes.json();
      promedio.value = parseFloat(p.promedio) || 0;
      total.value    = parseInt(p.total) || 0;
    }
    // Ver si ya dejé reseña para este viaje
    if (viajeId) {
      yaReseno.value = resenas.value.some(r => r.autor_id === myId);
    }
  } catch(e) { console.error(e); }
  finally { loading.value = false; }
}

async function checkPuedeResenar() {
  // Solo si hay viajeId y somos diferentes personas
  if (!viajeId || !myId || myId === targetId) return;
  puedeResenar.value = true;
}

async function fetchTargetName() {
  try {
    const r = await fetch(`${API}/api/users/${targetId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (r.ok) { const u = await r.json(); targetName.value = u.name || ''; }
  } catch {}
}

async function enviarResena() {
  if (nuevaCalif.value === 0 || sending.value) return;
  sending.value = true;
  try {
    const res = await fetch(`${API}/api/resenas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({
        receptor_id:  targetId,
        calificacion: nuevaCalif.value,
        comentario:   nuevoComentario.value.trim() || null,
        viaje_id:     viajeId,
      }),
    });
    if (res.ok) {
      showToast('¡Reseña publicada!', 'success');
      yaReseno.value = true;
      nuevaCalif.value = 0;
      nuevoComentario.value = '';
      await fetchResenas();
    } else {
      const err = await res.json();
      showToast(err.message || 'Error al publicar', 'error');
    }
  } catch { showToast('Error de conexión', 'error'); }
  finally { sending.value = false; }
}

onMounted(() => {
  fetchResenas();
  checkPuedeResenar();
  fetchTargetName();
});

function formatFecha(f: string) {
  return new Date(f).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}
function initial(name: string) { return name?.charAt(0).toUpperCase() || '?'; }
const avatarColors = ['linear-gradient(135deg,#8B1A1A,#4a0e0e)','linear-gradient(135deg,#1a3a8B,#0e1f4a)','linear-gradient(135deg,#1a6b3a,#0e3a1f)','linear-gradient(135deg,#6b1a6b,#3a0e3a)','linear-gradient(135deg,#2a2a6b,#1a1a3a)','linear-gradient(135deg,#5a3a1a,#3a200e)'];
function avatarColor(name: string) { return avatarColors[(name?.charCodeAt(0)||0) % avatarColors.length]; }

const toast = ref({ show: false, msg: '', type: 'success' });
function showToast(msg: string, type: 'success'|'error' = 'success') {
  toast.value = { show: true, msg, type };
  setTimeout(() => { toast.value.show = false; }, 2500);
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
.res-content { --background: #070707; }
.grain { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.04'/%3E%3C/svg%3E"); }
.atm-glow { position: fixed; width: 350px; height: 350px; background: radial-gradient(circle, rgba(139,26,26,0.1) 0%, transparent 70%); top: -100px; left: 50%; transform: translateX(-50%); filter: blur(60px); pointer-events: none; z-index: 0; }
.header { padding: 22px 20px 4px; display: flex; align-items: center; gap: 14px; position: relative; z-index: 1; }
.back-btn { background: #151515; border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #ede9e6; flex-shrink: 0; }
.brand { font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 700; color: rgba(237,233,230,0.3); margin-bottom: 2px; }
.brand span { color: #a32020; }
.header-title { font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 800; color: #ede9e6; }

/* Rating summary */
.rating-card { margin: 18px 18px 0; background: linear-gradient(135deg, #141010, #100808); border: 1px solid rgba(139,26,26,0.25); border-radius: 20px; padding: 24px 20px 20px; text-align: center; position: relative; z-index: 1; }
.rating-big { font-family: 'Outfit', sans-serif; font-size: 52px; font-weight: 800; color: #ede9e6; line-height: 1; }
.stars-row { display: flex; justify-content: center; gap: 4px; margin: 8px 0 6px; }
.star { font-size: 22px; color: rgba(255,255,255,0.12); transition: color 0.2s; }
.star.filled { color: #c9a227; }
.rating-sub { font-family: 'DM Sans', sans-serif; font-size: 12px; color: rgba(237,233,230,0.35); margin-bottom: 4px; }
.rating-user { font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 700; color: rgba(237,233,230,0.6); }

/* Nueva reseña */
.new-review-card { margin: 14px 18px 0; background: #111; border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; padding: 18px 16px; position: relative; z-index: 1; }
.nrc-title { font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 700; color: #ede9e6; margin-bottom: 12px; }
.star-select { display: flex; gap: 8px; margin-bottom: 14px; }
.star-btn { font-size: 28px; background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.15); transition: color 0.15s, transform 0.1s; padding: 0; line-height: 1; }
.star-btn.sel { color: #c9a227; }
.star-btn:hover { transform: scale(1.15); }
.review-input { width: 100%; background: #0d0d0d; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; color: #ede9e6; font-family: 'DM Sans', sans-serif; font-size: 13px; padding: 10px 12px; resize: none; outline: none; box-sizing: border-box; }
.review-input::placeholder { color: rgba(237,233,230,0.2); }
.review-input:focus { border-color: rgba(139,26,26,0.4); }
.nrc-counter { text-align: right; font-size: 10px; color: rgba(237,233,230,0.2); margin: 4px 0 12px; font-family: 'DM Sans', sans-serif; }
.btn-enviar { width: 100%; padding: 11px; background: #8B1A1A; border: none; border-radius: 12px; color: #ede9e6; font-family: 'Outfit', sans-serif; font-size: 13.5px; font-weight: 700; cursor: pointer; transition: opacity 0.2s; }
.btn-enviar:disabled { opacity: 0.4; cursor: not-allowed; }
.ya-reseno { margin: 14px 18px 0; display: flex; align-items: center; gap: 7px; color: #25d366; font-family: 'DM Sans', sans-serif; font-size: 12.5px; font-weight: 600; position: relative; z-index: 1; }

/* Lista */
.feed { padding: 14px 18px 0; display: flex; flex-direction: column; gap: 10px; position: relative; z-index: 1; }
.review-card { background: #111; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 14px 16px; animation: fadeUp 0.4s ease both; }
@keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
.rv-top { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.rv-avatar { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 800; color: #ede9e6; flex-shrink: 0; }
.rv-meta { flex: 1; min-width: 0; }
.rv-name { font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 700; color: #ede9e6; }
.rv-role { font-size: 10.5px; color: rgba(237,233,230,0.35); margin-top: 1px; }
.rv-stars { display: flex; gap: 2px; }
.star-sm { font-size: 14px; color: rgba(255,255,255,0.1); }
.star-sm.filled { color: #c9a227; }
.rv-comentario { font-family: 'DM Sans', sans-serif; font-size: 13px; color: rgba(237,233,230,0.7); line-height: 1.55; margin: 0 0 8px; }
.rv-fecha { font-size: 10.5px; color: rgba(237,233,230,0.25); font-family: 'DM Sans', sans-serif; }

.empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: rgba(237,233,230,0.25); font-family: 'DM Sans', sans-serif; font-size: 14px; position: relative; z-index: 1; }
.spinner { width: 28px; height: 28px; border-radius: 50%; border: 3px solid rgba(139,26,26,0.2); border-top-color: #8B1A1A; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.toast { position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%) translateY(20px); background: #1a1a1a; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 10px 20px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: #ede9e6; z-index: 999; opacity: 0; transition: all 0.3s ease; pointer-events: none; white-space: nowrap; }
.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
.toast.success { border-color: rgba(37,211,102,0.3); color: #25d366; }
.toast.error { border-color: rgba(139,26,26,0.28); color: #a32020; }
</style>


