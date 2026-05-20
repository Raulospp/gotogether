<div align="center">

# GoTogether

### Plataforma de carpooling universitario para estudiantes y conductores

[![Estado](https://img.shields.io/badge/estado-en%20desarrollo-yellow?style=flat-square)](https://github.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Vue](https://img.shields.io/badge/Vue-3-42b883?style=flat-square&logo=vue.js)](https://vuejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)

</div>

---

## Descripción

**GoTogether** es una plataforma full-stack de carpooling diseñada para conectar estudiantes universitarios con conductores de confianza. El sistema permite publicar y solicitar viajes compartidos, gestionar rutas, horarios y puntos de recogida, y calificar la experiencia mediante un sistema de reseñas integrado.

La plataforma está orientada a la ciudad de **Cali, Colombia**, con soporte de geolocalización vía Google Maps API, flujo de verificación de cuentas por correo electrónico y una interfaz móvil construida sobre Ionic + Vue 3.

---

## 🎯 Objetivo del Sistema

> Reducir los costos de transporte universitario y mejorar la seguridad de los estudiantes conectándolos con conductores verificados que comparten rutas similares, fomentando la confianza a través de reseñas y calificaciones transparentes.

El sistema distingue dos tipos de usuarios:

- **Conductor** — publica horarios, define rutas y precios, acepta o rechaza solicitudes de pasajeros.
- **Pasajero** — busca conductores disponibles, solicita un lugar en el viaje y registra su punto de recogida.

---

## ✨ Características Principales

| Módulo | Descripción |
|---|---|
| 🔐 **Autenticación** | Registro diferenciado por rol (conductor / pasajero), login con JWT y verificación de cuenta por email |
| 👤 **Gestión de usuarios** | Perfil editable, datos de vehículo para conductores, universidad para pasajeros |
| 🗺️ **Geolocalización** | Integración con Google Maps API para geocodificación de direcciones en Cali |
| 🚘 **Viajes** | Ciclo completo de viaje: solicitud → aceptación → inicio → finalización → calificación |
| 📅 **Horarios** | Conductores configuran su disponibilidad semanal y precios por ruta |
| 📋 **Solicitudes** | Gestión de solicitudes con estados (`pendiente`, `aceptada`, `rechazada`, `completada`) |
| ⭐ **Reseñas** | Sistema de calificación 1–5 estrellas con comentario, promedio calculado por usuario |
| 📧 **Notificaciones** | Correo de verificación de cuenta enviado vía Resend |
| 📱 **Interfaz móvil** | Frontend PWA/móvil con Ionic Vue, navegación SPA y tema personalizado |

---

## 🛠️ Tecnologías Utilizadas

### Backend

| Tecnología | Rol |
|---|---|
| **Node.js 18+** | Runtime del servidor |
| **Express.js** | Framework HTTP y routing |
| **PostgreSQL 15+** | Base de datos relacional principal |
| **JWT (jsonwebtoken)** | Autenticación stateless con tokens Bearer |
| **node-fetch** | Llamadas HTTP al API de Google Maps |
| **Resend** | Envío de correos transaccionales |
| **dotenv** | Gestión de variables de entorno |
| **bcrypt** | Hash seguro de contraseñas |

### Frontend

| Tecnología | Rol |
|---|---|
| **Vue 3** | Framework reactivo con Composition API |
| **TypeScript** | Tipado estático en todo el frontend |
| **Ionic Framework** | Componentes UI móviles y PWA |
| **Pinia** | Gestión de estado global (auth store) |
| **Vue Router** | Navegación SPA client-side |
| **Vite** | Bundler y servidor de desarrollo |
| **Axios** | Cliente HTTP para consumir la API REST |
| **Google Maps JS API** | Visualización de mapas y rutas en `MapaViaje` |

---

## 🏛️ Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTE                              │
│          Vue 3 + Ionic + TypeScript (Vite / PWA)            │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Views    │  │ Router   │  │ Stores   │  │ Services │   │
│  │ (.vue)   │  │ (Vue     │  │ (Pinia)  │  │ (Axios)  │   │
│  └──────────┘  │  Router) │  └──────────┘  └────┬─────┘   │
│                └──────────┘                      │         │
└──────────────────────────────────────────────────┼─────────┘
                                                   │ HTTP / REST
                                                   ▼
┌─────────────────────────────────────────────────────────────┐
│                        SERVIDOR                             │
│              Node.js + Express (API REST)                   │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌─────────┐  │
│  │ Routes   │→ │Controllers│→ │ Middleware │  │Services │  │
│  │          │  │          │  │ (auth JWT) │  │ (email, │  │
│  └──────────┘  └──────────┘  └────────────┘  │ geocode)│  │
│                                               └────┬────┘  │
└────────────────────────────────────────────────────┼───────┘
                                                     │
              ┌──────────────────────────────────────┤
              │                                      │
              ▼                                      ▼
   ┌─────────────────────┐              ┌─────────────────────┐
   │     PostgreSQL       │              │  APIs Externas       │
   │  users, solicitudes │              │  Google Maps API     │
   │  viajes, horarios   │              │  Resend Email API    │
   │  resenas            │              └─────────────────────┘
   └─────────────────────┘
```

**Flujo de autenticación:**

```
Usuario → POST /api/auth/register → [Hash bcrypt] → DB → Email verificación (Resend)
Usuario → POST /api/auth/login    → [Verificar hash] → JWT firmado → Cliente
Cliente → GET  /api/...           → [Bearer JWT] → Middleware auth → Controlador
```

---

## 📁 Estructura del Proyecto

```
gotogether/
│
├── 📂 backend/                     # API REST — Node.js + Express
│   ├── src/
│   │   ├── config/
│   │   │   └── index.js            # Configuración global (pool PG, env vars)
│   │   ├── controllers/
│   │   │   ├── authController.js   # Registro, login, verificación de email
│   │   │   ├── userController.js   # Perfil y gestión de usuarios
│   │   │   ├── viajeController.js  # CRUD de viajes y ciclo de vida
│   │   │   ├── solicitudController.js  # Solicitudes y estados
│   │   │   ├── horarioController.js    # Disponibilidad semanal
│   │   │   └── geocodeController.js    # Geocodificación de direcciones
│   │   ├── middleware/
│   │   │   ├── auth.js             # Verificación de JWT Bearer
│   │   │   └── errorHandler.js     # Manejo centralizado de errores
│   │   ├── routes/
│   │   │   ├── auth.js             # /api/auth
│   │   │   ├── users.js            # /api/users
│   │   │   ├── viajes.js           # /api/viajes
│   │   │   ├── solicitudes.js      # /api/solicitudes
│   │   │   ├── horarios.js         # /api/horarios
│   │   │   ├── geocode.js          # /api/geocode
│   │   │   └── resenas.js          # /api/resenas
│   │   ├── services/
│   │   │   ├── emailService.js     # Envío de emails (Resend)
│   │   │   └── geocodeService.js   # Integración Google Maps API
│   │   ├── db/
│   │   │   └── db.js               # Conexión PostgreSQL (Pool)
│   │   ├── utils/
│   │   │   └── helpers.js          # Funciones utilitarias
│   │   └── server.js               # Punto de entrada, init DB, listen
│   ├── .env                        # Variables de entorno (no commitear)
│   └── package.json
│
├── 📂 frontend/                    # SPA Móvil — Vue 3 + Ionic + TypeScript
│   ├── src/
│   │   ├── views/
│   │   │   ├── WelcomeView.vue         # Pantalla de bienvenida
│   │   │   ├── LoginView.vue           # Login por rol
│   │   │   ├── RegisterTipoView.vue    # Selección de tipo de usuario
│   │   │   ├── RegisterConductorView.vue  # Registro de conductor
│   │   │   ├── RegisterPasajeroView.vue   # Registro de pasajero
│   │   │   ├── InicioView.vue          # Dashboard principal
│   │   │   ├── HomeView.vue            # Home del conductor
│   │   │   ├── FeedView.vue            # Feed de viajes disponibles
│   │   │   ├── ViajeView.vue           # Detalle de viaje activo
│   │   │   ├── MapaViaje.vue           # Mapa de ruta (Google Maps)
│   │   │   ├── SolicitudesView.vue     # Gestión de solicitudes
│   │   │   ├── PerfilView.vue          # Vista de perfil
│   │   │   ├── EditarPerfilView.vue    # Edición de perfil
│   │   │   └── ResenasView.vue         # Historial de reseñas
│   │   ├── router/
│   │   │   └── index.ts            # Rutas SPA (Vue Router + Ionic)
│   │   ├── stores/
│   │   │   └── authStore.ts        # Store de autenticación (Pinia)
│   │   ├── services/
│   │   │   └── authService.ts      # Lógica de autenticación y JWT
│   │   ├── theme/
│   │   │   └── variables.css       # Tokens de diseño (colores, fuentes)
│   │   ├── App.vue                 # Componente raíz
│   │   └── main.ts                 # Bootstrap de la app
│   ├── .env                        # Variables de entorno frontend
│   └── package.json
│
└── README.md                       # Este archivo
```

---

## 🚀 Instalación Rápida

### Requisitos previos

- Node.js ≥ 18
- npm ≥ 9
- PostgreSQL ≥ 15 corriendo localmente o en la nube
- Cuenta en [Google Cloud](https://console.cloud.google.com/) con la API de **Maps Geocoding** habilitada
- Cuenta en [Resend](https://resend.com/) para el envío de emails

---

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/gotogether.git
cd gotogether
```

### 2. Configurar el Backend

```bash
cd backend
npm install
cp .env.example .env   # Edita las variables (ver sección Variables de Entorno)
npm run dev            # Inicia en modo desarrollo con nodemon
```

El servidor quedará disponible en `http://localhost:3000`.  
La base de datos se inicializa automáticamente al arrancar el servidor.

### 3. Configurar el Frontend

```bash
cd frontend
npm install
cp .env.example .env   # Apunta VITE_API_URL al backend
npm run dev            # Inicia Vite en modo desarrollo
```

La app quedará disponible en `http://localhost:5173`.

---

## 🔐 Variables de Entorno

### Backend — `backend/.env`

```env
# Servidor
PORT=3000
NODE_ENV=development

# Base de datos
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/gotogether

# Autenticación
JWT_SECRET=tu_secreto_jwt_seguro_aqui

# Google Maps
GOOGLE_MAPS_KEY=tu_api_key_de_google_maps

# Resend (emails transaccionales)
RESEND_API_KEY=re_xxxxxxxxxxxx

# URL base para links en emails
BASE_URL=http://localhost:3000
```

### Frontend — `frontend/.env`

```env
# URL del backend
VITE_API_URL=http://localhost:3000

# Google Maps (para el componente MapaViaje)
VITE_GOOGLE_MAPS_KEY=tu_api_key_de_google_maps
```

> ⚠️ **Nunca subas archivos `.env` al repositorio.** Asegúrate de incluirlos en `.gitignore`.

---

## 🗄️ Modelo de Base de Datos

El esquema se crea automáticamente al iniciar el servidor. Las tablas principales son:

```
users          — Conductores y pasajeros (rol, vehículo, universidad, verificación)
solicitudes    — Solicitudes de viaje con coordenadas de pickup y destino
horarios       — Disponibilidad semanal y precios por conductor (JSONB)
resenas        — Calificaciones 1-5 con comentario entre usuarios
```

---

## 📸 Capturas del Sistema

> Las imágenes a continuación muestran las principales pantallas de la plataforma.

### Bienvenida y Autenticación

```
screenshots/welcome.png     — Pantalla de inicio con selección de rol
screenshots/login.png        — Formulario de login
screenshots/register.png     — Registro de conductor / pasajero
```

![Pantalla de bienvenida](screenshots/welcome.png)
![Login](screenshots/login.png)

### Feed y Viajes

```
screenshots/feed.png         — Feed de conductores disponibles
screenshots/viaje-detalle.png — Detalle de un viaje activo
screenshots/mapa.png         — Mapa de ruta con Google Maps
```

![Feed de viajes](screenshots/feed.png)
![Mapa de ruta](screenshots/mapa.png)

### Perfil y Reseñas

```
screenshots/perfil.png       — Vista de perfil con estadísticas
screenshots/resenas.png      — Historial de reseñas y calificación promedio
```

![Perfil de usuario](screenshots/perfil.png)
![Sistema de reseñas](screenshots/resenas.png)

> 📌 Añade las capturas reales a la carpeta `screenshots/` en la raíz del repositorio.

---

## 📊 Estado del Proyecto

| Módulo | Estado |
|---|---|
| Autenticación (registro / login / JWT) | ✅ Completo |
| Verificación de email (Resend) | ✅ Completo |
| Gestión de perfil y edición | ✅ Completo |
| Flujo de viajes (solicitud → inicio → fin) | ✅ Completo |
| Horarios y precios del conductor | ✅ Completo |
| Geolocalización (Google Maps API) | ✅ Completo |
| Sistema de reseñas y calificaciones | ✅ Completo |
| Interfaz móvil Ionic Vue | ✅ Completo |
| Notificaciones push | 🔄 En progreso |
| Panel de administración | ⏳ Pendiente |
| Modo oscuro / claro | ⏳ Pendiente |
| Tests automatizados (unit + e2e) | ⏳ Pendiente |

---

## 🗺️ Roadmap Futuro

- [ ] **Notificaciones push** en tiempo real (WebSockets o Firebase Cloud Messaging)
- [ ] **Chat integrado** entre conductor y pasajero dentro del viaje
- [ ] **Panel de administración** para moderación de usuarios y reseñas
- [ ] **Historial de viajes** con exportación a PDF
- [ ] **Soporte multi-ciudad** (actualmente optimizado para Cali, Colombia)
- [ ] **Tests E2E** con Playwright y tests unitarios con Vitest / Jest
- [ ] **CI/CD** con GitHub Actions para despliegue automático
- [ ] **App nativa** empaquetada con Capacitor (iOS / Android)
- [ ] **Modo conductor premium** con estadísticas avanzadas de ingresos

---

## 👤 Autor

**Tu Nombre**  
Desarrollador Full Stack

[![GitHub](https://img.shields.io/badge/GitHub-@tu--usuario-181717?style=flat-square&logo=github)](https://github.com/tu-usuario)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-tu--perfil-0A66C2?style=flat-square&logo=linkedin)](https://linkedin.com/in/tu-perfil)

---

## 📄 Licencia

Este proyecto está licenciado bajo la **MIT License**.  
Puedes usarlo, modificarlo y distribuirlo libremente con la atribución correspondiente.

```
MIT License — Copyright (c) 2026 Tu Nombre
```

---

<div align="center">
  <sub>Hecho con ❤️ para la comunidad universitaria de Cali, Colombia</sub>
</div>
