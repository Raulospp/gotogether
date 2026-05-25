<div align="center">

# Backend API

### API REST modular para la plataforma de carpooling universitario

[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey?style=flat-square&logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![JWT](https://img.shields.io/badge/Auth-JWT-orange?style=flat-square&logo=jsonwebtokens)](https://jwt.io/)
[![License](https://img.shields.io/badge/licencia-MIT-blue?style=flat-square)](../LICENSE)

</div>

---

##  Descripción

Este repositorio contiene el servidor backend de **GoTogether**, una API REST construida con Node.js y Express que gestiona toda la lógica de negocio de la plataforma de carpooling universitario: autenticación de usuarios, ciclo de vida de viajes, solicitudes, horarios de conductores, geolocalización y sistema de reseñas.

El servidor se conecta a una base de datos **PostgreSQL**, inicializa el esquema automáticamente al arrancar, y expone endpoints protegidos mediante **JWT Bearer tokens**.

---

## Tecnologías Utilizadas

| Tecnología | Versión | Rol |
|---|---|---|
| **Node.js** | ≥ 18 | Runtime del servidor |
| **Express.js** | 4.x | Framework HTTP y routing |
| **PostgreSQL** | ≥ 15 | Base de datos relacional |
| **pg (node-postgres)** | — | Driver PostgreSQL con connection pool |
| **bcryptjs** | — | Hash seguro de contraseñas (salt rounds: 10) |
| **jsonwebtoken** | — | Generación y verificación de JWT |
| **node-fetch@2** | — | Llamadas HTTP a la Google Maps Geocoding API |
| **dotenv** | — | Carga de variables de entorno desde `.env` |
| **cors** | — | Habilitación de Cross-Origin Resource Sharing |

---

## Arquitectura del Backend

El proyecto sigue una **arquitectura modular por capas** con separación clara de responsabilidades. Cada capa tiene una única función y no conoce los detalles de implementación de las demás.

```
HTTP Request
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│                      Express App                        │
│                       server.js                         │
└──────────────────────┬──────────────────────────────────┘
                       │
              ┌────────▼────────┐
              │    Routes       │  ← Mapean URL + método HTTP
              │  /api/auth      │    al controlador correspondiente
              │  /api/users     │
              │  /api/viajes    │
              │  /api/...       │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │   Middleware    │  ← auth.js: verifica JWT antes
              │  (auth guard)   │    de pasar al controlador
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  Controllers    │  ← Lógica de negocio, validaciones
              │                 │    y construcción de queries SQL
              └────────┬────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
  ┌────────▼────────┐   ┌──────────▼──────────┐
  │    pg Pool      │   │     Services         │
  │  (PostgreSQL)   │   │                      │
  │                 │   │  geocodeService      │
  └─────────────────┘   └─────────────────────┘
```

**Principios aplicados:**

- **Single Responsibility** — cada archivo tiene una sola responsabilidad definida.
- **Fail-fast** — validaciones al inicio de cada controlador antes de tocar la base de datos.
- **Centralización de errores** — `next(err)` delega siempre al `errorHandler` global.
- **No hay lógica de negocio en las rutas** — las rutas solo mapean HTTP → controlador.
- **Pool de conexiones** — la instancia de `Pool` se crea una sola vez en `config/index.js` y se importa donde se necesita.


---

## Carpetas

### `config/`
Fuente única de verdad para la configuración de la aplicación. Exporta el pool de PostgreSQL, las variables de entorno, la clave JWT y constantes geográficas (`CALI_BOUNDS`). Todos los módulos importan desde aquí en lugar de leer `process.env` directamente.

### `controllers/`
Contienen la lógica de negocio de cada dominio. Acceden a la base de datos mediante el pool, validan entradas, construyen las queries SQL parametrizadas y forman la respuesta HTTP. No conocen nada del enrutamiento ni de la capa de presentación.

### `middleware/`
Funciones que interceptan el ciclo request-response:
- **`auth.js`** — extrae y verifica el JWT del header `Authorization: Bearer <token>`. Adjunta `req.user` con `{ id, email, role }` para uso en controladores.
- **`errorHandler.js`** — captura todos los errores pasados con `next(err)` y devuelve una respuesta 500 estandarizada sin exponer detalles internos.

### `routes/`
Declaran únicamente el mapeo de método HTTP + path hacia el controlador. No contienen lógica de negocio. Aplican `authMiddleware` selectivamente por endpoint.

### `services/`
Abstraen integraciones externas con APIs de terceros:
- **`emailService.js`** — envía el email de verificación de cuenta usando la SDK de Resend con una plantilla HTML embebida.
- **`geocodeService.js`** — convierte direcciones de texto en coordenadas lat/lon usando la Google Maps Geocoding API, con tres niveles de fallback (dirección completa → sin número de puerta → solo vía).

### `utils/`
Funciones puras y reutilizables sin dependencias de Express o la base de datos. Actualmente incluye `normalizeAddress` para limpiar strings de direcciones antes de geocodificar.

---

## Variables de Entorno

Crea el archivo `.env` en la raíz del proyecto `backend/` con las siguientes variables:

```env
# ─── Servidor ──────────────────────────────────────────
PORT=3000
NODE_ENV=development       # development | production

# ─── Base de datos ─────────────────────────────────────
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/gotogether

# ─── Autenticación ─────────────────────────────────────
JWT_SECRET=cambia_esto_por_un_secreto_largo_y_aleatorio

# ─── Google Maps ───────────────────────────────────────
GOOGLE_MAPS_KEY=AIza...tu_api_key_aqui

# ─── Resend (emails transaccionales) ───────────────────
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx

# ─── URL base (para links de verificación en emails) ───
BASE_URL=http://localhost:3000
```

| Variable | Requerida | Descripción |
|---|---|---|
| `PORT` | No | Puerto del servidor (default: `3000`) |
| `NODE_ENV` | No | Entorno de ejecución. En `production` habilita SSL en el pool PG |
| `DATABASE_URL` |  Sí | Connection string completo de PostgreSQL |
| `JWT_SECRET` |  Sí | Secreto para firmar y verificar tokens JWT |
| `GOOGLE_MAPS_KEY` |  Sí | API Key de Google Maps con Geocoding API habilitada |
| `RESEND_API_KEY` |  Sí | API Key de Resend para envío de emails |
| `BASE_URL` |  Sí | URL pública del servidor (se usa en el link de verificación del email) |

---

## Scripts Disponibles

```bash
npm run dev       # Inicia el servidor con nodemon (hot-reload en desarrollo)
npm start         # Inicia el servidor en producción (node src/server.js)
```

---

##  Base de Datos

### Configuración del Pool

La conexión a PostgreSQL se gestiona mediante un `Pool` de la librería `pg` con los siguientes parámetros:

```js
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,                    // Máximo de conexiones simultáneas
  idleTimeoutMillis: 30000,   // Cierra conexiones inactivas a los 30s
  connectionTimeoutMillis: 10000, // Timeout al adquirir conexión: 10s
});
```

### Esquema de Tablas

El esquema se inicializa automáticamente con `CREATE TABLE IF NOT EXISTS` al arrancar el servidor.

---

#### `users`

```sql
CREATE TABLE users (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  email        VARCHAR(150) UNIQUE NOT NULL,
  password     TEXT NOT NULL,                      -- Hash bcrypt
  role         VARCHAR(20) DEFAULT 'pasajero',     -- 'conductor' | 'pasajero'
  city         VARCHAR(100),
  university   VARCHAR(100),                       -- Solo pasajeros
  car_model    VARCHAR(100),                       -- Solo conductores
  plate        VARCHAR(20),                        -- Solo conductores
  route        VARCHAR(100),
  vehicle_type VARCHAR(20) DEFAULT 'carro',        -- 'carro' | 'moto' | etc.
  capacity     INTEGER DEFAULT 4,                  -- Cupos del vehículo
  phone        VARCHAR(20),
  verified     BOOLEAN DEFAULT FALSE,              -- Verificación por email
  verify_token TEXT,                               -- Token JWT temporal (24h)
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### `solicitudes`

Representa una solicitud de viaje entre un pasajero y un conductor. Contiene coordenadas de pickup/destino y gestiona el ciclo de vida completo del viaje.

```sql
CREATE TABLE solicitudes (
  id                   SERIAL PRIMARY KEY,
  pasajero_id          INTEGER REFERENCES users(id) ON DELETE CASCADE,
  conductor_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
  iniciado_por         INTEGER REFERENCES users(id) ON DELETE CASCADE,
  estado               VARCHAR(20) DEFAULT 'pendiente',
  -- Estados: pendiente | aceptada | rechazada | en_curso | finalizada
  fecha_viaje          DATE DEFAULT CURRENT_DATE,
  pickup_lat           DOUBLE PRECISION,
  pickup_lon           DOUBLE PRECISION,
  pickup_direccion     TEXT,
  pickup_universidad   TEXT,
  destino_lat          DOUBLE PRECISION,
  destino_lon          DOUBLE PRECISION,
  calificacion         SMALLINT,                    -- 1-5 (al finalizar)
  comentario_calificacion TEXT,
  precio_viaje         INTEGER,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### `horarios`

Un conductor tiene exactamente un registro de horario (relación `UNIQUE user_id`). Los datos semanales, rutas y precios se almacenan como `JSONB` flexible.

```sql
CREATE TABLE horarios (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  schedule   JSONB DEFAULT '{}',   -- { "lunes": true, "martes": false, ... }
  routes     JSONB DEFAULT '{}',   -- { "lunes": "Calle 5 → Univalle", ... }
  precio     JSONB DEFAULT '{}',   -- { "lunes": 3000, "martes": 2500, ... }
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### `resenas`

Sistema de calificaciones entre usuarios, vinculado opcionalmente a una solicitud específica.

```sql
CREATE TABLE resenas (
  id           SERIAL PRIMARY KEY,
  autor_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  receptor_id  INTEGER REFERENCES users(id) ON DELETE CASCADE,
  solicitud_id INTEGER REFERENCES solicitudes(id) ON DELETE SET NULL,
  calificacion SMALLINT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
  comentario   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de rendimiento
CREATE INDEX idx_resenas_receptor ON resenas(receptor_id);
CREATE INDEX idx_resenas_autor    ON resenas(autor_id);
CREATE INDEX idx_users_role             ON users(role);
CREATE INDEX idx_solicitudes_estado     ON solicitudes(estado);
CREATE INDEX idx_solicitudes_pasajero   ON solicitudes(pasajero_id);
CREATE INDEX idx_solicitudes_conductor  ON solicitudes(conductor_id);
```

---

##  Endpoints Principales

Todos los endpoints protegidos requieren el header:

```
Authorization: Bearer <jwt_token>
```

### Autenticación — `/api/auth`

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/auth/register/conductor` | Registro de conductor |
| `POST` | `/api/auth/register/pasajero` | Registro de pasajero |
| `POST` | `/api/auth/login`  | Login y obtención de JWT |
| `GET` | `/api/auth/verify?token=...`  | Verificación de cuenta por email |
| `GET` | `/api/auth/me` | Obtener usuario autenticado |
| `PATCH` | `/api/auth/profile` | Actualizar perfil del usuario |

---

###  Usuarios — `/api/users`

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/users/conductores` | Listar conductores con cupos disponibles y promedio de reseñas |
| `GET` | `/api/users/pasajeros`   | Listar pasajeros (usado por conductores) |
| `GET` | `/api/users/:id` | Obtener perfil completo de un usuario por ID |

---

###  Solicitudes — `/api/solicitudes`

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/solicitudes`  | Crear solicitud (pasajero→conductor o conductor→pasajero) |
| `GET` | `/api/solicitudes/mis-solicitudes`  | Listar todas las solicitudes del usuario autenticado |
| `GET` | `/api/solicitudes/pendientes-count` | Contar solicitudes pendientes recibidas |
| `PATCH` | `/api/solicitudes/:id`  | Aceptar o rechazar una solicitud |
| `PATCH` | `/api/solicitudes/:id/pickup`  | Actualizar coordenadas de pickup y destino |
| `DELETE` | `/api/solicitudes/:id` | Cancelar una solicitud (solo quien la inició) |

---

###  Viajes — `/api/viajes`

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/viajes/mis-viajes`  | Viajes activos del usuario (respuesta diferenciada por rol) |
| `GET` | `/api/viajes/:id`  | Detalle de un viaje por ID |
| `GET` | `/api/viajes/conductor/:conductorId`  | Pickups activos de un conductor (para el mapa) |
| `PATCH` | `/api/viajes/:id/iniciar`   | Iniciar un viaje (conductor) → estado `en_curso` |
| `PATCH` | `/api/viajes/:id/finalizar` | Finalizar un viaje (conductor) → estado `finalizada` |
| `PATCH` | `/api/viajes/:id/calificar` | Calificar un viaje finalizado (pasajero) |
| `PATCH` | `/api/viajes/:id/ubicacion` | Actualizar ubicación de pickup dentro de un viaje |
| `DELETE` | `/api/viajes/limpiar-pasados` | Eliminar viajes pendientes de fechas anteriores |

---

###  Horarios — `/api/horarios`

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/horarios` | Guardar o actualizar horario semanal del conductor (upsert) |
| `GET` | `/api/horarios/me`  | Obtener horario, rutas y precios del conductor autenticado |

---

###  Reseñas — `/api/resenas`

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/resenas/:userId`  | Listar reseñas recibidas por un usuario |
| `GET` | `/api/resenas/:userId/promedio` | Obtener calificación promedio de un usuario |

---

###  Geocodificación — `/api/geocode`

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/geocode?q=<dirección>` | Convertir dirección de texto a coordenadas lat/lon |

---

### 🏥 Health Check

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| `GET` | `/health`   | Estado del servidor |

---

## 📨 Ejemplos Request / Response

### Registro de conductor

**Request**
```http
POST /api/auth/register/conductor
Content-Type: application/json

{
  "name": "Carlos Ramírez",
  "email": "carlos@email.com",
  "password": "MiPass123!",
  "city": "Cali",
  "car_model": "Renault Logan 2021",
  "plate": "ABC-123",
  "vehicle_type": "carro",
  "capacity": 4,
  "phone": "3001234567",
  "route": "Sur → Univalle"
}
```

**Response** `201 Created`
```json
{
  "message": "Conductor registrado. Revisa tu correo",
  "user": {
    "id": 1,
    "name": "Carlos Ramírez",
    "email": "carlos@email.com",
    "role": "conductor",
    "city": "Cali",
    "car_model": "Renault Logan 2021",
    "plate": "ABC-123",
    "vehicle_type": "carro",
    "capacity": 4,
    "phone": "3001234567",
    "verified": false
  }
}
```

---

### Login

**Request**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "carlos@email.com",
  "password": "MiPass123!"
}
```

**Response** `200 OK`
```json
{
  "message": "Login exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Carlos Ramírez",
    "email": "carlos@email.com",
    "role": "conductor",
    "city": "Cali",
    "car_model": "Renault Logan 2021",
    "plate": "ABC-123",
    "vehicle_type": "carro",
    "capacity": 4,
    "phone": "3001234567"
  }
}
```

---

### Crear solicitud (pasajero → conductor)

**Request**
```http
POST /api/solicitudes
Authorization: Bearer <token>
Content-Type: application/json

{
  "conductor_id": 1
}
```

**Response** `201 Created`
```json
{
  "message": "Solicitud enviada",
  "solicitud": {
    "id": 42,
    "pasajero_id": 5,
    "conductor_id": 1,
    "iniciado_por": 5,
    "estado": "pendiente",
    "fecha_viaje": "2026-05-20",
    "created_at": "2026-05-20T14:30:00.000Z"
  }
}
```

---

### Aceptar solicitud

**Request**
```http
PATCH /api/solicitudes/42
Authorization: Bearer <token_conductor>
Content-Type: application/json

{
  "estado": "aceptada",
  "precio_viaje": 3000
}
```

**Response** `200 OK`
```json
{
  "message": "Solicitud aceptada"
}
```

---

### Guardar horario del conductor

**Request**
```http
POST /api/horarios
Authorization: Bearer <token_conductor>
Content-Type: application/json

{
  "schedule": {
    "lunes": true,
    "martes": true,
    "miercoles": false,
    "jueves": true,
    "viernes": true
  },
  "routes": {
    "lunes": "Calle 5 → Univalle",
    "martes": "Calle 5 → Univalle",
    "jueves": "Calle 13 → ICESI",
    "viernes": "Calle 13 → ICESI"
  },
  "precio": {
    "lunes": 3000,
    "martes": 3000,
    "jueves": 2500,
    "viernes": 2500
  }
}
```

**Response** `200 OK`
```json
{
  "message": "Horario guardado"
}
```

---

### Geocodificar dirección

**Request**
```http
GET /api/geocode?q=Calle+13+%2312-34%2C+Cali
Authorization: Bearer <token>
```

**Response** `200 OK`
```json
{
  "lat": 3.4516,
  "lon": -76.5320,
  "formatted": "Calle 13 #12-34, Cali, Valle del Cauca, Colombia"
}
```

---

### Calificar viaje finalizado

**Request**
```http
PATCH /api/viajes/42/calificar
Authorization: Bearer <token_pasajero>
Content-Type: application/json

{
  "calificacion": 5,
  "comentario": "Excelente puntualidad y trato amable",
  "conductor_id": 1
}
```

**Response** `200 OK`
```json
{
  "message": "Calificacion enviada"
}
```

---

### Respuestas de error comunes

```json
// 400 Bad Request — campos faltantes
{ "message": "Todos los campos son requeridos" }

// 401 Unauthorized — token ausente
{ "message": "Token no proporcionado" }

// 401 Unauthorized — token expirado
{ "message": "Token expirado" }

// 403 Forbidden — sin permiso sobre el recurso
{ "message": "No tienes permiso" }

// 404 Not Found
{ "message": "Solicitud no encontrada" }

// 409 Conflict — duplicado
{ "message": "Ya tienes una solicitud para hoy con este conductor" }

// 500 Internal Server Error
{ "message": "Error interno del servidor" }
```

---

##  Middlewares

### `auth.js` — Autenticación JWT

Protege todos los endpoints que requieren sesión iniciada. Se aplica individualmente por ruta en los archivos de `routes/`.

```js
// Uso en routes/
router.get('/me', authMiddleware, authController.getMe);
```

**Flujo interno:**

```
1. Extrae el header Authorization
2. Verifica que inicie con "Bearer "
3. Extrae el token y lo verifica con jwt.verify()
4. Adjunta req.user = { id, email, role } para uso en controladores
5. Si el token expiró → 401 "Token expirado"
6. Si el token es inválido → 401 "Token inválido"
7. Si no hay header → 401 "Token no proporcionado"
```

---

### `errorHandler.js` — Manejador Global de Errores

Función de cuatro parámetros `(err, req, res, next)` registrada al final de la cadena de middlewares en `server.js`. Captura cualquier error pasado con `next(err)` desde los controladores.

```js
// Uso en controladores
try {
  // lógica...
} catch (err) {
  next(err); // ← delega al errorHandler global
}
```

Devuelve siempre `500` con un mensaje genérico, evitando exponer stack traces en producción. Los errores se loguean en consola para debugging.

---

##  Manejo de Errores

| Situación | Código | Mensaje |
|---|---|---|
| Campos obligatorios vacíos | `400` | Campo específico requerido |
| Token no enviado | `401` | `Token no proporcionado` |
| Token JWT inválido | `401` | `Token inválido` |
| Token JWT expirado | `401` | `Token expirado` |
| Sin permiso sobre recurso | `403` | `No tienes permiso` |
| Recurso no encontrado | `404` | Mensaje específico por entidad |
| Conflicto de duplicados | `409` | Mensaje descriptivo del duplicado |
| Error interno / DB | `500` | `Error interno del servidor` |

**Estrategia de propagación:**

```
Controlador → catch(err) → next(err) → errorHandler → res.status(500)
```

Los errores de validación de negocio (campos vacíos, estados inválidos, permisos) se manejan **dentro del controlador** con `return res.status(4xx).json(...)`. Los errores de infraestructura (queries fallidas, problemas de red) se propagan al `errorHandler`.

---

##  Validaciones

Las validaciones se aplican al inicio de cada función controladora siguiendo el principio **fail-fast**: se devuelve inmediatamente si los datos son inválidos, sin consultar la base de datos.

**Ejemplos de validaciones implementadas:**

```js
// Campos requeridos
if (!name || !email || !password || !city || !car_model || !plate) {
  return res.status(400).json({ message: 'Todos los campos son requeridos' });
}

// Email único (verificación en DB antes de insertar)
const existe = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
if (existe.rows.length > 0) return res.status(409).json({ message: 'El correo ya está registrado' });

// Rango de calificación
if (!calificacion || calificacion < 1 || calificacion > 5)
  return res.status(400).json({ message: 'Calificacion debe ser entre 1 y 5' });

// Estados válidos en solicitudes
if (!['aceptada', 'rechazada'].includes(estado)) {
  return res.status(400).json({ message: 'Estado debe ser aceptada o rechazada' });
}

// Prevención de doble calificación
const ya = await pool.query('SELECT calificacion FROM solicitudes WHERE id=$1', [solicitudId]);
if (ya.rows[0]?.calificacion) return res.status(409).json({ message: 'Ya calificaste este viaje' });
```
---

##  Seguridad

| Medida | Implementación |
|---|---|
| **Hashing de contraseñas** | `bcryptjs` con `saltRounds: 10` |
| **Autenticación stateless** | JWT firmado con secreto — sin sesiones en servidor |
| **Tokens con expiración** | Verificación email: `24h` / Sesión: `7d` |
| **Prevención SQL Injection** | Queries parametrizadas con `$1, $2, ...` en todos los controladores |
| **Limitación de payload** | `express.json({ limit: '10kb' })` |
| **CORS habilitado** | `cors()` global — configurable por dominio en producción |
| **No exposición de errores** | `errorHandler` devuelve mensaje genérico en 500, sin stack traces |
| **Autorización por recurso** | Verificación de ownership antes de `UPDATE`/`DELETE` (ej: `iniciado_por = userId`) |
| **SSL en producción** | Pool PG activa SSL cuando `NODE_ENV === 'production'` |
| **Campos sensibles excluidos** | `password` y `verify_token` nunca se devuelven en las respuestas de usuario |

---

<div align="center">
  <sub>GoTogether Backend — Node.js + Express + PostgreSQL </sub>
</div>
