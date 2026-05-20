<div align="center">

# 📱 GoTogether — Frontend

### Interfaz móvil de la plataforma de carpooling universitario

[![Vue 3](https://img.shields.io/badge/Vue-3-42b883?style=flat-square&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Ionic](https://img.shields.io/badge/Ionic-7.x-3880ff?style=flat-square&logo=ionic&logoColor=white)](https://ionicframework.com/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646cff?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Pinia](https://img.shields.io/badge/Pinia-2.x-f7d336?style=flat-square&logo=pinia&logoColor=black)](https://pinia.vuejs.org/)
[![License](https://img.shields.io/badge/licencia-MIT-blue?style=flat-square)](../LICENSE)

</div>

---

## 📖 Descripción

Este repositorio contiene la interfaz de usuario de **GoTogether**, una aplicación móvil/PWA construida con **Vue 3**, **TypeScript** e **Ionic Framework**. La app conecta a pasajeros universitarios con conductores de confianza, permitiendo solicitar viajes, gestionar horarios y rutas, visualizar trayectos en un mapa interactivo con **Google Maps**, y calificar experiencias mediante reseñas.

La interfaz está diseñada con un lenguaje visual oscuro y cohesivo, tipografía Outfit + DM Sans, efectos de glow atmosférico y adaptación completa a safe areas de dispositivos móviles (notch, barra de estado de Android/iOS).

---

## 🛠️ Tecnologías Utilizadas

| Tecnología | Versión | Rol |
|---|---|---|
| **Vue 3** | 3.x | Framework reactivo con Composition API y `<script setup>` |
| **TypeScript** | 5.x | Tipado estático en todas las vistas, stores y servicios |
| **Ionic Framework** | 7.x | Componentes UI móviles (IonPage, IonContent, IonIcon, etc.) |
| **Vite** | 5.x | Bundler ultrarrápido y servidor de desarrollo con HMR |
| **Pinia** | 2.x | Gestión de estado global (auth store) |
| **Vue Router** | 4.x (Ionic Router) | Navegación SPA con historial de web |
| **Axios** | — | Cliente HTTP con interceptores de token y manejo de 401 |
| **Google Maps JS API** | — | Renderizado de mapas, marcadores y rutas (`DirectionsRenderer`) |
| **Ionicons** | — | Iconografía consistente adaptada a iOS/Android |
| **Google Fonts** | — | Tipografías Outfit (display) y DM Sans (body) |

---

## 🏛️ Arquitectura del Frontend

El frontend sigue una **arquitectura basada en vistas** con separación clara entre estado global, lógica de acceso a datos y presentación visual. Cada vista es un componente Vue autónomo que se monta bajo demanda (lazy loading via Vue Router).

```
┌─────────────────────────────────────────────────────────────────┐
│                          USUARIO                                │
│                  Navegador / App Móvil (PWA)                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                ┌───────────▼───────────┐
                │       App.vue          │  ← Raíz: IonApp + IonRouterOutlet
                │    (safe area CSS)     │    Gestiona safe areas globalmente
                └───────────┬───────────┘
                            │
                ┌───────────▼───────────┐
                │      Vue Router        │  ← Ionic Router con createWebHistory
                │   (router/index.ts)    │    Lazy loading de todas las vistas
                └───────────┬───────────┘
                            │
          ┌─────────────────┼──────────────────┐
          │                 │                  │
  ┌───────▼───────┐ ┌───────▼───────┐ ┌───────▼───────┐
  │     Views     │ │    Stores     │ │   Services    │
  │  (.vue SFC)   │ │   (Pinia)     │ │  (authService)│
  │               │ │               │ │               │
  │  Composition  │ │  authStore    │ │  axios + JWT  │
  │  API + refs   │ │  user state   │ │  interceptors │
  │  computed     │ │  isLoggedIn   │ │  localStorage │
  └───────────────┘ └───────────────┘ └───────┬───────┘
                                              │
                                    ┌─────────▼──────────┐
                                    │   API REST Backend   │
                                    │  gotogether-api on   │
                                    │      Render.com      │
                                    └────────────────────┘
```

**Flujo de autenticación en el cliente:**

```
Usuario ingresa credenciales
        │
        ▼
authStore.login() → authService.login()
        │
        ▼
POST /api/auth/login → JWT recibido
        │
        ▼
localStorage.setItem('token', jwt)    ← Persistencia de sesión
localStorage.setItem('user', json)
        │
        ▼
authStore.user actualizado (ref reactivo)
        │
        ▼
router.replace('/inicio')             ← Redirección post-login
```

**Interceptor automático de token en cada request:**

```
Cualquier fetch/axios → interceptor request → añade Authorization: Bearer <token>
                                           ↓
                                    Si 401 → limpia localStorage → sesión cerrada
```

---

## 📁 Estructura de Carpetas

```
frontend/
│
├── src/
│   │
│   ├── views/                          # Vistas principales (páginas de la app)
│   │   ├── WelcomeView.vue             # Pantalla de bienvenida e inicio de flujo
│   │   ├── LoginView.vue               # Login dinámico por rol (pasajero/conductor)
│   │   ├── RegisterTipoView.vue        # Selección de tipo de cuenta al registrarse
│   │   ├── RegisterConductorView.vue   # Formulario de registro para conductores
│   │   ├── RegisterPasajeroView.vue    # Formulario de registro para pasajeros
│   │   ├── InicioView.vue              # Dashboard principal post-login (hub central)
│   │   ├── HomeView.vue                # Panel del conductor: perfil, horario, precios
│   │   ├── FeedView.vue                # Explorador de usuarios disponibles + solicitudes
│   │   ├── ViajeView.vue               # Detalle del viaje activo con controles
│   │   ├── MapaViaje.vue               # Componente de mapa Google Maps (reutilizable)
│   │   ├── SolicitudesView.vue         # Gestión de solicitudes recibidas y enviadas
│   │   ├── PerfilView.vue              # Vista pública del perfil de un usuario
│   │   ├── EditarPerfilView.vue        # Edición del perfil propio
│   │   └── ResenasView.vue             # Historial de reseñas y calificación promedio
│   │
│   ├── router/
│   │   └── index.ts                    # Definición de rutas SPA con lazy loading
│   │
│   ├── stores/
│   │   └── authStore.ts                # Store Pinia: estado del usuario autenticado
│   │
│   ├── services/
│   │   └── authService.ts              # Instancia Axios + interceptores + helpers auth
│   │
│   ├── theme/
│   │   └── variables.css               # Variables CSS de Ionic (colores, tipografía)
│   │
│   ├── App.vue                         # Componente raíz con safe areas globales
│   ├── main.ts                         # Bootstrap: Vue + IonicVue + Pinia + Router
│   └── vite-env.d.ts                   # Tipos de variables de entorno para Vite
│
├── public/                             # Assets estáticos (favicon, manifest)
├── .env                                # Variables de entorno (no commitear)
├── .env.example                        # Plantilla de variables de entorno
├── index.html                          # HTML shell de la SPA
├── vite.config.ts                      # Configuración de Vite
├── tsconfig.json                       # Configuración de TypeScript
└── package.json
```

---

## 📂 Explicación de Carpetas

### `views/`

Contiene todas las pantallas de la aplicación como **Single File Components (SFC)** de Vue. Cada vista es completamente autónoma: define su propio template, lógica reactiva con Composition API y estilos `scoped`. Se cargan de forma **lazy** a través del router, reduciendo el bundle inicial. Las vistas se comunican entre sí únicamente a través del router y del store de Pinia, nunca por props directas entre páginas.

### `router/`

Define el árbol de rutas de la SPA usando `@ionic/vue-router` con `createWebHistory`. Todas las vistas se importan con `() => import(...)` para garantizar **code splitting** automático por ruta. El router de Ionic integra la gestión nativa de historial de navegación del dispositivo, respetando los gestos de retroceso de iOS y Android.

### `stores/`

Contiene los stores de **Pinia**, el sistema de gestión de estado global de la app. El `authStore` centraliza el estado del usuario autenticado (`user`, `isLoggedIn`, `loading`, `error`) y expone las acciones de registro, login y logout. Es la única fuente de verdad del estado de sesión — todas las vistas que necesitan saber si el usuario está logueado o cuál es su rol consultan este store.

### `services/`

Abstrae la comunicación con la API REST. `authService.ts` crea y exporta una instancia de **Axios** (`api`) con la base URL del backend. Configura dos interceptores:
- **Request interceptor** — inyecta automáticamente `Authorization: Bearer <token>` en cada petición, leyendo el token de `localStorage`.
- **Response interceptor** — captura respuestas `401` globalmente, limpia el `localStorage` y cierra la sesión del usuario.

También expone helpers para registro, login, logout y lectura del usuario desde localStorage de forma segura (con manejo de `JSON.parse` fallido).

### `theme/`

Variables CSS personalizadas de Ionic. Define los tokens de diseño (colores primarios, fondos, tipografías) que se aplican globalmente a todos los componentes de Ionic mediante custom properties CSS.

---

## 🚀 Instalación

### Requisitos previos

- Node.js ≥ 18
- npm ≥ 9

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/gotogether.git
cd gotogether/frontend

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con la URL del backend y API Key de Google Maps

# 4. Iniciar en modo desarrollo
npm run dev
```

La app quedará disponible en `http://localhost:5173`.

Para construir para producción:

```bash
npm run build       # Genera el bundle en /dist
npm run preview     # Previsualiza el build de producción localmente
```

---

## 🔐 Variables de Entorno

Crea el archivo `.env` en la raíz del proyecto `frontend/`:

```env
# URL del backend (sin trailing slash)
VITE_API_URL=https://gotogether-api.onrender.com

# Google Maps JavaScript API Key
VITE_GOOGLE_MAPS_KEY=AIza...tu_api_key_aqui
```

| Variable | Requerida | Descripción |
|---|---|---|
| `VITE_API_URL` | ✅ Sí | URL base del backend GoTogether API |
| `VITE_GOOGLE_MAPS_KEY` | ✅ Sí | API Key para Google Maps JS (mapas, geocoding, rutas) |

> ⚠️ Las variables deben comenzar con `VITE_` para ser accesibles en el código del cliente vía `import.meta.env.VITE_*`. Nunca expongas claves de servidor con este prefijo.

---

## 📜 Scripts Disponibles

```bash
npm run dev       # Inicia el servidor de desarrollo Vite con HMR
npm run build     # Compila TypeScript y genera bundle de producción en /dist
npm run preview   # Sirve el build de producción localmente para testing
npm run lint      # Ejecuta ESLint sobre el código fuente
```

---

## 🗺️ Manejo de Rutas

Las rutas están definidas en `src/router/index.ts` con **Ionic Vue Router**. Todas las vistas usan importación dinámica (lazy loading) para optimizar el tiempo de carga inicial.

```ts
const routes: Array<RouteRecordRaw> = [
  { path: '/',                     redirect: '/welcome' },
  { path: '/welcome',              component: () => import('@/views/WelcomeView.vue') },
  { path: '/login/:role',          component: () => import('@/views/LoginView.vue') },
  { path: '/register/tipo',        component: () => import('@/views/RegisterTipoView.vue') },
  { path: '/register/conductor',   component: () => import('@/views/RegisterConductorView.vue') },
  { path: '/register/pasajero',    component: () => import('@/views/RegisterPasajeroView.vue') },
  { path: '/inicio',               component: () => import('@/views/InicioView.vue') },
  { path: '/home',                 component: () => import('@/views/HomeView.vue') },
  { path: '/feed',                 component: () => import('@/views/FeedView.vue') },
  { path: '/solicitudes',          component: () => import('@/views/SolicitudesView.vue') },
  { path: '/perfil/:role/:id',     component: () => import('@/views/PerfilView.vue') },
  { path: '/viaje/:id',            component: () => import('@/views/ViajeView.vue') },
  { path: '/editar-perfil',        component: () => import('@/views/EditarPerfilView.vue') },
  { path: '/resenas/:userId',      component: () => import('@/views/ResenasView.vue') },
];
```

**Diagrama de navegación:**

```
/welcome
  ├── /login/pasajero  ──────────────────────────────┐
  ├── /login/conductor ───────────────────────────── /inicio ─── /feed
  └── /register/tipo                                        ├── /solicitudes
        ├── /register/pasajero                              ├── /viaje/:id
        └── /register/conductor                             └── /home (conductor)
                                                                  └── /editar-perfil

/perfil/:role/:id  ←── desde Feed, Solicitudes, Viaje
/resenas/:userId   ←── desde Perfil
```

**Parámetros dinámicos de rutas:**

| Ruta | Parámetro | Valores posibles |
|---|---|---|
| `/login/:role` | `role` | `'pasajero'` / `'conductor'` |
| `/perfil/:role/:id` | `role`, `id` | rol del usuario, ID numérico |
| `/viaje/:id` | `id` | ID de solicitud |
| `/resenas/:userId` | `userId` | ID del usuario a consultar |

---

## 🔌 Consumo de API

### Instancia Axios centralizada

El servicio `authService.ts` exporta una instancia `api` de Axios preconfigurada que es importada directamente en las vistas donde se necesita:

```ts
// src/services/authService.ts
export const api = axios.create({ baseURL: 'https://gotogether-api.onrender.com' });

// Interceptor: inyecta el token en cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Interceptor: limpia sesión si el backend responde 401
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);
```

### Patrón de fetch en vistas

Las vistas que requieren datos propios (no cubiertos por `authService`) hacen peticiones directas con la **Fetch API nativa**, incluyendo el token manualmente mediante una función helper local:

```ts
const API = 'https://gotogether-api.onrender.com';

function getToken() {
  return localStorage.getItem('token');
}

// Ejemplo de fetch en InicioView.vue
async function fetchViajes() {
  const res = await fetch(`${API}/api/viajes/mis-viajes`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  viajes.value = await res.json();
}
```

### Polling de actualizaciones en tiempo real

Las vistas de solicitudes y el dashboard implementan **polling periódico** con `setInterval` para reflejar cambios de estado sin necesidad de WebSockets. El intervalo se limpia al desmontar el componente para evitar memory leaks:

```ts
let _poll: ReturnType<typeof setInterval>;

onMounted(() => {
  fetchSolicitudes();
  fetchPendientesCount();
  _poll = setInterval(() => {
    fetchSolicitudes();
    fetchPendientesCount();
  }, 6000); // Refresca cada 6 segundos
});

onUnmounted(() => {
  if (_poll) clearInterval(_poll);
});
```

### Resumen de llamadas por vista

| Vista | Endpoints consumidos |
|---|---|
| `InicioView` | `GET /viajes/mis-viajes`, `GET /solicitudes/mis-solicitudes`, `GET /solicitudes/pendientes-count`, `GET /users/conductores` o `/pasajeros`, `PATCH /solicitudes/:id` |
| `FeedView` | `GET /users/conductores` o `/pasajeros`, `GET /solicitudes/pendientes-count`, `POST /solicitudes` |
| `ViajeView` | `GET /viajes/:id`, `GET /viajes/mis-viajes`, `PATCH /viajes/:id/iniciar`, `PATCH /viajes/:id/finalizar`, `PATCH /viajes/:id/calificar`, `PATCH /solicitudes/:id/pickup`, `DELETE /solicitudes/:id` |
| `SolicitudesView` | `GET /solicitudes/mis-solicitudes`, `GET /solicitudes/pendientes-count`, `PATCH /solicitudes/:id`, `DELETE /solicitudes/:id` |
| `PerfilView` | `GET /users/conductores`, `GET /users/pasajeros`, `POST /solicitudes`, `PATCH /solicitudes/:id/pickup` |
| `ResenasView` | `GET /resenas/:userId`, `GET /resenas/:userId/promedio`, `GET /users/:id`, `POST /resenas` |
| `EditarPerfilView` | `PATCH /auth/profile` |
| `HomeView` | `POST /horarios`, `GET /horarios/me` |
| `MapaViaje` | `GET /geocode?q=...` (vía instancia `api` de Axios) |

---

## 🖥️ Vistas Principales

### `WelcomeView.vue` — Pantalla de bienvenida

Pantalla de entrada de la app. Muestra el logo SVG animado de GoTogether con efectos de glow atmosférico y grain de textura. Presenta dos botones de acceso (Soy Pasajero / Soy Conductor) y un enlace de registro. Es la ruta raíz de la aplicación.

```
📍 Ruta: /welcome
🔐 Auth: No requerida
📡 API: Ninguna
```

---

### `LoginView.vue` — Login por rol

Formulario de autenticación dinámico que recibe el `role` como parámetro de ruta (`/login/pasajero` o `/login/conductor`). Valida que el rol de la cuenta ingresada coincida con el rol seleccionado — si no coincide, muestra un error claro y cierra la sesión. Usa el `authStore` para gestionar el estado de carga y error.

```
📍 Ruta: /login/:role
🔐 Auth: No requerida
📡 API: POST /api/auth/login
```

---

### `RegisterConductorView.vue` / `RegisterPasajeroView.vue` — Registro

Formularios de registro diferenciados por tipo de usuario. El formulario de conductor incluye campos específicos del vehículo (`car_model`, `plate`, `vehicle_type`, `capacity`). El de pasajero incluye `university`. Ambos muestran un estado de éxito (`emailSent`) al completarse, indicando al usuario que verifique su correo.

```
📍 Rutas: /register/conductor | /register/pasajero
🔐 Auth: No requerida
📡 API: POST /api/auth/register/conductor | /register/pasajero
```

---

### `InicioView.vue` — Dashboard principal

Hub central de la aplicación post-login. Renderiza contenido diferenciado según el rol del usuario (conductor/pasajero) usando la propiedad computada `isConductor`. Muestra:
- Saludo personalizado con el primer nombre del usuario
- Horario y ruta del día actual del conductor
- Viajes activos del día con acceso directo
- Solicitudes pendientes con badge de conteo
- Sección del feed de usuarios disponibles (vista previa de 6)
- Modal de precio al aceptar solicitudes (conductor)

Implementa polling automático cada varios segundos para mantener la información actualizada.

```
📍 Ruta: /inicio
🔐 Auth: Requerida
📡 API: /viajes/mis-viajes, /solicitudes/mis-solicitudes,
        /solicitudes/pendientes-count, /users/conductores|pasajeros
```

---

### `FeedView.vue` — Explorador de usuarios

Vista de búsqueda y filtrado con dos tabs: **Feed** (usuarios disponibles) y **Solicitudes** (enviadas/recibidas). Incluye un campo de búsqueda en tiempo real que filtra los resultados por nombre usando `computed`. Los conductores ven pasajeros disponibles; los pasajeros ven conductores con cupos disponibles, horario del día y precio. Al seleccionar un usuario se abre un modal de confirmación para enviar la solicitud.

```
📍 Ruta: /feed
🔐 Auth: Requerida
📡 API: /users/conductores|pasajeros, /solicitudes/pendientes-count, POST /solicitudes
```

---

### `ViajeView.vue` — Viaje activo

Vista de control del viaje en curso. Presenta información completa del viaje (conductor, pasajeros, vehículo, precio, ruta), el componente `MapaViaje` embebido, y los controles de ciclo de vida:

- **Conductor:** botones de iniciar y finalizar el viaje
- **Pasajero:** formulario de ubicación de pickup + destino, confirmación de pickup, calificación estrella al finalizar

Las propiedades computadas `puedeIniciar`, `puedeFinalizar` y `yaConfirmadoPasajero` controlan la visibilidad de cada acción según el estado actual de la solicitud.

```
📍 Ruta: /viaje/:id
🔐 Auth: Requerida
📡 API: /viajes/:id, /viajes/mis-viajes, /viajes/:id/iniciar,
        /viajes/:id/finalizar, /viajes/:id/calificar, /solicitudes/:id/pickup
```

---

### `MapaViaje.vue` — Componente de mapa interactivo

Componente reutilizable que encapsula la integración completa con **Google Maps JavaScript API**. Acepta props tipadas y emite eventos al padre.

**Props:**

```ts
defineProps<{
  pickups?: Pickup[];          // Array de puntos de recogida a mostrar
  miSolicitudId?: number | null; // ID de la solicitud del pasajero activo
  altura?: number;             // Altura del contenedor del mapa
  yaConfirmado?: boolean;      // Si el pasajero ya compartió su ubicación
}>();
```

**Eventos emitidos:**

```ts
defineEmits<{
  (e: 'ubicacion-compartida', data: {
    lat: number; lon: number;
    direccion: string; universidad: string;
    destino_lat: number; destino_lon: number;
  }): void;
}>();
```

**Funcionalidades:**
- Muestra marcadores de todos los puntos de pickup de pasajeros
- Renderiza rutas calculadas con `DirectionsRenderer` (sin marcadores nativos, usando marcadores custom)
- Formulario de ingreso de dirección y universidad para el pasajero
- Preview de ruta antes de confirmar (`previsualizarRuta`)
- Geocodificación de la dirección ingresada via `GET /api/geocode`
- Actualización reactiva con `watch` sobre el prop `pickups`

```
📍 Uso: embebido en ViajeView y PerfilView
📡 API: GET /api/geocode?q=<dirección>
```

---

### `SolicitudesView.vue` — Gestión de solicitudes

Lista de solicitudes del usuario con tabs **Recibidas** / **Enviadas**, calculadas como propiedades computadas desde un único array de datos. Implementa polling cada 6 segundos. Permite aceptar o rechazar solicitudes recibidas directamente desde la vista. El contador de pendientes (`pendientesCount`) se actualiza junto con el polling.

```
📍 Ruta: /solicitudes
🔐 Auth: Requerida
📡 API: /solicitudes/mis-solicitudes, /solicitudes/pendientes-count, PATCH/DELETE /solicitudes/:id
```

---

### `HomeView.vue` — Panel del conductor

Panel de configuración y perfil del conductor. Organizado en tabs: **Info** (datos personales y bio), **Horario** (disponibilidad semanal con toggle por día), **Rutas** (descripción de ruta por día) y **Precios** (precio del viaje por día).

El estado del horario, rutas y precios se persiste localmente en `localStorage` como caché local antes de sincronizar con el backend vía `POST /api/horarios`.

```
📍 Ruta: /home
🔐 Auth: Requerida
📡 API: POST /api/horarios, GET /api/horarios/me
```

---

### `PerfilView.vue` — Perfil de usuario

Vista pública del perfil de cualquier usuario (accesible por ID y rol). Muestra datos del conductor (vehículo, horario, cupos disponibles, precio, calificación promedio) o del pasajero (universidad, horario). Permite solicitar un viaje directamente desde el perfil. Si el viaje es aceptado, muestra el componente `MapaViaje` para confirmar el punto de pickup.

```
📍 Ruta: /perfil/:role/:id
🔐 Auth: Requerida
📡 API: /users/conductores|pasajeros, POST /solicitudes, PATCH /solicitudes/:id/pickup
```

---

### `ResenasView.vue` — Sistema de reseñas

Historial completo de reseñas recibidas por un usuario con su calificación promedio. Muestra las reseñas ordenadas por fecha con nombre del autor y su rol. Si el usuario autenticado puede reseñar (ha viajado con esa persona y no ha calificado aún), se muestra el formulario de calificación con selector de estrellas.

```
📍 Ruta: /resenas/:userId
🔐 Auth: Requerida
📡 API: GET /resenas/:userId, GET /resenas/:userId/promedio,
        GET /users/:id, POST /resenas
```

---

## 🗂️ Manejo de Estado

### Pinia — `authStore`

El `authStore` es el único store global de la aplicación. Gestiona el estado de autenticación de forma reactiva y está disponible en cualquier vista mediante `useAuthStore()`.

```ts
// src/stores/authStore.ts
export const useAuthStore = defineStore('auth', () => {
  const user      = ref(authService.getUser());   // Usuario desde localStorage
  const isLoggedIn = ref(authService.isAuthenticated());
  const loading   = ref(false);
  const error     = ref('');

  // Acciones
  async function registerConductor(data: { ... }) { ... }
  async function registerPasajero(data: { ... })  { ... }
  async function login(email: string, password: string) { ... }
  function logout() {
    authService.logout();          // Limpia localStorage
    user.value = null;
    isLoggedIn.value = false;
  }

  return { user, isLoggedIn, loading, error,
           registerConductor, registerPasajero, login, logout };
});
```

**Acceso en las vistas:**

```ts
const authStore = useAuthStore();

// Estado reactivo
const user       = computed(() => authStore.user);
const isConductor = computed(() => authStore.user?.role === 'conductor');
const primerNombre = computed(() => user.value?.name?.split(' ')[0] || '');

// Acciones
await authStore.login(email, password);
authStore.logout();
```

### Estado local por vista

Cada vista gestiona su propio estado local con `ref` y `computed` de Vue 3:

```ts
// Patrón típico en las vistas
const loading  = ref(false);          // Control de estado de carga
const data     = ref<any[]>([]);      // Datos del servidor
const error    = ref('');             // Mensajes de error
const toast    = ref({ show: false, msg: '', type: 'success' }); // Notificaciones

const filtrado = computed(() =>       // Datos derivados sin mutar el original
  data.value.filter(item => item.nombre.includes(searchQuery.value))
);
```

---

## 📸 Capturas del Sistema

> Añade las capturas reales a la carpeta `screenshots/` en la raíz del repositorio.

### Autenticación

| Bienvenida | Login | Registro |
|---|---|---|
| ![Welcome](screenshots/welcome.png) | ![Login](screenshots/login.png) | ![Register](screenshots/register.png) |

### Dashboard y Exploración

| Dashboard Principal | Feed de usuarios | Perfil de conductor |
|---|---|---|
| ![Inicio](screenshots/inicio.png) | ![Feed](screenshots/feed.png) | ![Perfil](screenshots/perfil.png) |

### Viaje y Mapa

| Viaje Activo | Mapa de ruta | Solicitudes |
|---|---|---|
| ![Viaje](screenshots/viaje.png) | ![Mapa](screenshots/mapa.png) | ![Solicitudes](screenshots/solicitudes.png) |

### Reseñas y Perfil

| Sistema de reseñas | Panel del conductor | Editar perfil |
|---|---|---|
| ![Reseñas](screenshots/resenas.png) | ![Home conductor](screenshots/home.png) | ![Editar](screenshots/editar-perfil.png) |

---

## 💡 Buenas Prácticas Implementadas

### Composition API con `<script setup>`

Todas las vistas usan la sintaxis `<script setup lang="ts">` de Vue 3, la forma más concisa y performante de escribir componentes. Elimina el boilerplate de `defineComponent`, `setup()` y `return`.

```ts
// ✅ Patrón usado en todas las vistas
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
const data = ref<any[]>([]);
const filtrado = computed(() => data.value.filter(...));
onMounted(fetchData);
</script>
```

---

### Propiedades computadas sobre datos derivados

Los datos derivados (filtros, roles, nombres parciales) siempre se calculan con `computed`, nunca mutando el array original ni recalculando manualmente.

```ts
// ✅ Derivado reactivo — se actualiza automáticamente cuando cambia searchQuery o usuarios
const filteredUsuarios = computed(() =>
  usuarios.value.filter(u =>
    u.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
);

// ✅ Rol extraído de forma segura
const isConductor = computed(() => authStore.user?.role === 'conductor');
```

---

### Separación conductor/pasajero con computed

Las vistas que sirven a ambos roles usan `isConductor` como computed para alternar contenido con `v-if`/`v-else` o para seleccionar el endpoint correcto, sin duplicar vistas completas.

```ts
const endpoint = isConductor.value
  ? `${API}/api/users/pasajeros`
  : `${API}/api/users/conductores`;
```

---

### Limpieza de side effects con `onUnmounted`

Los intervals de polling y otros recursos asincrónicos se limpian en `onUnmounted` para evitar memory leaks cuando el usuario navega fuera de la vista.

```ts
let _poll: ReturnType<typeof setInterval>;

onMounted(() => {
  _poll = setInterval(fetchSolicitudes, 6000);
});

onUnmounted(() => {
  if (_poll) clearInterval(_poll); // ✅ Sin memory leaks
});
```

---

### Lazy loading de vistas

Todas las vistas se importan con importación dinámica en el router. Esto genera chunks separados en el build de producción — el usuario solo descarga el código de las pantallas que visita.

```ts
// ✅ Code splitting automático por ruta
{ path: '/feed', component: () => import('@/views/FeedView.vue') }
```

---

### Tokens de diseño consistentes

El sistema visual se mantiene coherente a través de variables CSS en `App.vue` y `variables.css`:

```css
/* Paleta de color central */
background: #070707;           /* Negro profundo */
color: #ede9e6;                /* Blanco cálido */
accent: #8B1A1A;               /* Rojo goTogether */

/* Tipografía */
font-family: 'Outfit', sans-serif;    /* Headings y brand */
font-family: 'DM Sans', sans-serif;  /* Body y UI */
```

---

### Manejo de errores tipado en TypeScript

Los errores de las llamadas a la API se capturan con tipado explícito para acceder de forma segura a la respuesta del servidor:

```ts
try {
  await authStore.login(email.value, password.value);
} catch (e: any) {
  error.value = e.response?.data?.message || e.message || 'Error al iniciar sesión';
}
```

---

### Safe areas para dispositivos móviles

`App.vue` define globalmente el manejo de safe areas para notch, barra de estado y barra de navegación del sistema, garantizando que el contenido no quede oculto en ningún dispositivo:

```css
/* Status bar — Android/iOS notch */
ion-header, ion-toolbar {
  padding-top: max(env(safe-area-inset-top), 16px) !important;
}

/* Bottom nav — home indicator de iPhone */
.bottom-nav {
  padding-bottom: max(env(safe-area-inset-bottom), 12px) !important;
  height: calc(60px + max(env(safe-area-inset-bottom), 12px)) !important;
}

/* Scroll area — no queda bajo el nav */
ion-content {
  --padding-bottom: calc(72px + env(safe-area-inset-bottom));
}
```

---

## 📱 Diseño Responsive

La app está diseñada **mobile-first** usando Ionic Framework como base de componentes nativos. Todas las vistas funcionan correctamente en:

| Plataforma | Soporte |
|---|---|
| Android (Chrome / WebView) | ✅ Nativo con safe areas |
| iOS (Safari / WebKit) | ✅ Nativo con safe areas |
| PWA (escritorio) | ✅ Layout adaptado |
| Modo landscape | ✅ Flexbox adaptable |

**Técnicas de adaptación usadas:**
- `env(safe-area-inset-*)` para notch y home indicator en todos los headers y navbars
- Layouts con `flexbox` y unidades relativas (`vh`, `%`, `max()`)
- `ion-content` con `--padding-bottom` dinámico para evitar superposición con la barra de navegación inferior
- Tipografía escalable con `font-size` en `px` y `em`
- Efectos visuales (glow, grain) implementados con `position: fixed` y `pointer-events: none` para no interferir con la interacción táctil

---

## 👤 Autor

**Tu Nombre**
Frontend Software Engineer

[![GitHub](https://img.shields.io/badge/GitHub-@tu--usuario-181717?style=flat-square&logo=github)](https://github.com/tu-usuario)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-tu--perfil-0A66C2?style=flat-square&logo=linkedin)](https://linkedin.com/in/tu-perfil)

---

<div align="center">
  <sub>GoTogether Frontend — Vue 3 + TypeScript + Ionic · MIT License</sub>
</div>
