require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { Resend } = require('resend');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, param, validationResult } = require('express-validator');

// ===============================
//  CONFIGURACIÓN Y CONSTANTES
// ===============================
const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const JWT_SECRET = process.env.JWT_SECRET;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const IS_PROD = process.env.NODE_ENV === 'production';
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

// Validaciones críticas al arrancar
if (!JWT_SECRET) throw new Error('❌ JWT_SECRET es requerido en .env');
if (IS_PROD && JWT_SECRET.length < 32) throw new Error('❌ JWT_SECRET debe tener al menos 32 caracteres en producción');
if (!DATABASE_URL) throw new Error('❌ DATABASE_URL es requerida en .env');
if (!RESEND_API_KEY) console.warn('⚠️  RESEND_API_KEY no definida. Los correos de verificación estarán desactivados.');

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// ===============================
//  POOL DE BASE DE DATOS
// ===============================
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
  max: 20,
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de conexiones:', err);
  process.exit(1);
});

// ===============================
//  QUERY HELPER
// ===============================
/**
 * Ejecuta una query con parámetros nombrados o posicionales.
 * Lanza errores en vez de retornar null para simplificar el flujo.
 */
const db = {
  query: (text, params) => pool.query(text, params),
  queryOne: async (text, params) => {
    const { rows } = await pool.query(text, params);
    return rows[0] ?? null;
  },
  transaction: async (fn) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};

// ===============================
//  MIDDLEWARES GLOBALES
// ===============================
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10kb' }));

// Logging estructurado
app.use((req, _res, next) => {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip,
  }));
  next();
});

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas solicitudes. Intenta más tarde.' },
});
app.use('/api/', globalLimiter);

// Rate limiting estricto para autenticación
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Demasiados intentos de autenticación. Intenta en 15 minutos.' },
});

// ===============================
//  FUNCIONES AUXILIARES
// ===============================

/** Proyección segura del usuario (nunca expone password, verify_token) */
const buildUserPayload = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  city: row.city,
  university: row.university ?? null,
  car_model: row.car_model ?? null,
  plate: row.plate ?? null,
  route: row.route ?? null,
  vehicle_type: row.vehicle_type ?? null,
  capacity: row.capacity ?? null,
  phone: row.phone ?? null,
  verified: row.verified,
});

/** Middleware de autenticación JWT */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }
  try {
    req.user = jwt.verify(authHeader.slice(7), JWT_SECRET);
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido';
    return res.status(401).json({ message });
  }
};

/** Middleware de autorización por rol */
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ message: 'No tienes permiso para realizar esta acción' });
  }
  next();
};

/** Middleware de validación express-validator */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  next();
};

/** Envía el correo de verificación de forma no bloqueante */
const sendVerificationEmail = async (email, name, token) => {
  if (!resend) return;
  const verifyUrl = `${BASE_URL}/api/auth/verify?token=${encodeURIComponent(token)}`;
  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: 'Verifica tu cuenta en goTogether',
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <body style="margin:0;padding:0;background:#0a0a0a;font-family:sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:40px 16px;">
              <table width="480" cellpadding="0" cellspacing="0"
                     style="background:#111;border-radius:16px;padding:40px;border:1px solid #222;">
                <tr><td>
                  <h1 style="color:#a32020;font-size:28px;margin:0 0 8px;">goTogether</h1>
                  <h2 style="color:#ede9e6;font-size:20px;margin:0 0 24px;">Hola, ${escapeHtml(name)} 👋</h2>
                  <p style="color:#aaa;line-height:1.6;margin:0 0 32px;">
                    Gracias por registrarte. Haz clic en el botón para activar tu cuenta.
                    Este enlace expira en <strong style="color:#ede9e6;">24 horas</strong>.
                  </p>
                  <a href="${verifyUrl}"
                     style="display:inline-block;background:#8B1A1A;color:#fff;
                            padding:14px 28px;border-radius:8px;text-decoration:none;
                            font-weight:600;letter-spacing:0.5px;">
                    Verificar cuenta
                  </a>
                  <p style="color:#555;font-size:12px;margin-top:32px;line-height:1.5;">
                    Si no creaste esta cuenta, puedes ignorar este mensaje con seguridad.
                    No compartiremos tu información con nadie.
                  </p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    });
  } catch (err) {
    // El email no es crítico; loguear pero no bloquear el registro
    console.error('⚠️  Error enviando email de verificación:', err.message);
  }
};

/** Escapa caracteres HTML para evitar inyección en emails */
const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

// ===============================
//  INICIALIZACIÓN DE TABLAS
// ===============================
const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      name          VARCHAR(100)  NOT NULL,
      email         VARCHAR(150)  UNIQUE NOT NULL,
      password      TEXT          NOT NULL,
      role          VARCHAR(20)   NOT NULL DEFAULT 'pasajero'
                      CHECK (role IN ('pasajero', 'conductor', 'admin')),
      city          VARCHAR(100),
      university    VARCHAR(100),
      car_model     VARCHAR(100),
      plate         VARCHAR(20),
      route         VARCHAR(100),
      vehicle_type  VARCHAR(20)   DEFAULT 'carro'
                      CHECK (vehicle_type IN ('carro', 'moto', 'van', 'otro')),
      capacity      INTEGER       DEFAULT 4 CHECK (capacity BETWEEN 1 AND 20),
      phone         VARCHAR(20),
      verified      BOOLEAN       NOT NULL DEFAULT FALSE,
      verify_token  TEXT,
      created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS solicitudes (
      id            SERIAL PRIMARY KEY,
      pasajero_id   INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      conductor_id  INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      iniciado_por  INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      estado        VARCHAR(20)   NOT NULL DEFAULT 'pendiente'
                      CHECK (estado IN ('pendiente', 'aceptada', 'rechazada', 'cancelada')),
      fecha_viaje   DATE          NOT NULL DEFAULT CURRENT_DATE,
      started_at    TIMESTAMPTZ,
      finished_at   TIMESTAMPTZ,
      created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_solicitud_activa
        UNIQUE (pasajero_id, conductor_id, fecha_viaje)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS horarios (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER   UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      schedule    JSONB     NOT NULL DEFAULT '{}',
      routes      JSONB     NOT NULL DEFAULT '{}',
      precio      JSONB     NOT NULL DEFAULT '{}',
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Función para auto-actualizar updated_at
  await pool.query(`
    CREATE OR REPLACE FUNCTION update_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $$ LANGUAGE plpgsql;
  `);

  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at'
      ) THEN
        CREATE TRIGGER trg_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
      END IF;
    END $$;
  `);

  // Índices
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_users_role         ON users(role)',
    'CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_sol_estado         ON solicitudes(estado)',
    'CREATE INDEX IF NOT EXISTS idx_sol_fecha          ON solicitudes(fecha_viaje)',
    'CREATE INDEX IF NOT EXISTS idx_sol_pasajero       ON solicitudes(pasajero_id)',
    'CREATE INDEX IF NOT EXISTS idx_sol_conductor      ON solicitudes(conductor_id)',
    'CREATE INDEX IF NOT EXISTS idx_sol_conductor_fecha ON solicitudes(conductor_id, fecha_viaje)',
    'CREATE INDEX IF NOT EXISTS idx_horarios_user      ON horarios(user_id)',
  ];
  await Promise.all(indexes.map((sql) => pool.query(sql)));

  console.log('✅ Base de datos inicializada correctamente');
};

// ===============================
//  RUTAS DE SALUD
// ===============================
app.get('/api/health', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT NOW() AS db_time');
    res.json({ status: 'ok', ts: new Date().toISOString(), db_time: rows[0].db_time });
  } catch {
    res.status(503).json({ status: 'error', message: 'Base de datos no disponible' });
  }
});

// ===============================
//  AUTH: REGISTRO
// ===============================

/** Validadores comunes para registro */
const baseRegisterValidators = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Nombre inválido (2–100 caracteres)'),
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
  body('city').trim().notEmpty().withMessage('La ciudad es requerida'),
  body('phone').optional({ nullable: true }).trim(),
];

app.post(
  '/api/auth/register/pasajero',
  authLimiter,
  [
    ...baseRegisterValidators,
    body('university').trim().notEmpty().withMessage('La universidad es requerida'),
  ],
  validate,
  async (req, res) => {
    const { name, email, password, city, phone, university, route } = req.body;
    try {
      const existing = await db.queryOne('SELECT id FROM users WHERE email=$1', [email]);
      if (existing) return res.status(409).json({ message: 'El correo ya está registrado' });

      const hashed = await bcrypt.hash(password, 12);
      const verifyToken = jwt.sign({ email, purpose: 'verify' }, JWT_SECRET, { expiresIn: '24h' });

      await db.query(
        `INSERT INTO users (name,email,password,role,city,phone,route,university,verify_token)
         VALUES ($1,$2,$3,'pasajero',$4,$5,$6,$7,$8)`,
        [name, email, hashed, city, phone ?? null, route ?? null, university, verifyToken]
      );

      // Fire-and-forget
      sendVerificationEmail(email, name, verifyToken);

      res.status(201).json({ message: 'Cuenta creada. Revisa tu correo para verificarla.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
);

app.post(
  '/api/auth/register/conductor',
  authLimiter,
  [
    ...baseRegisterValidators,
    body('car_model').trim().notEmpty().withMessage('El modelo del vehículo es requerido'),
    body('plate').trim().notEmpty().withMessage('La placa es requerida'),
    body('vehicle_type').isIn(['carro', 'moto', 'van', 'otro']).withMessage('Tipo de vehículo inválido'),
    body('capacity').isInt({ min: 1, max: 20 }).withMessage('Capacidad inválida (1–20)'),
  ],
  validate,
  async (req, res) => {
    const { name, email, password, city, phone, car_model, plate, vehicle_type, capacity, route } = req.body;
    try {
      const existing = await db.queryOne('SELECT id FROM users WHERE email=$1', [email]);
      if (existing) return res.status(409).json({ message: 'El correo ya está registrado' });

      const hashed = await bcrypt.hash(password, 12);
      const verifyToken = jwt.sign({ email, purpose: 'verify' }, JWT_SECRET, { expiresIn: '24h' });

      await db.query(
        `INSERT INTO users (name,email,password,role,city,phone,route,car_model,plate,vehicle_type,capacity,verify_token)
         VALUES ($1,$2,$3,'conductor',$4,$5,$6,$7,$8,$9,$10,$11)`,
        [name, email, hashed, city, phone ?? null, route ?? null, car_model, plate, vehicle_type, capacity, verifyToken]
      );

      sendVerificationEmail(email, name, verifyToken);

      res.status(201).json({ message: 'Cuenta creada. Revisa tu correo para verificarla.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
);

// ===============================
//  AUTH: VERIFICACIÓN Y LOGIN
// ===============================
app.get('/api/auth/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Token no proporcionado');

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.purpose !== 'verify') throw new Error('Token no es de verificación');

    const result = await db.query(
      'UPDATE users SET verified=TRUE, verify_token=NULL WHERE email=$1 AND verify_token=$2 RETURNING id',
      [decoded.email, token]
    );
    if (!result.rowCount) return res.status(410).send('Enlace ya utilizado o expirado');

    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head><meta charset="UTF-8"><title>Cuenta verificada · goTogether</title>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{background:#070707;color:#ede9e6;display:flex;align-items:center;
               justify-content:center;min-height:100vh;font-family:sans-serif;padding:16px}
          .card{background:#111;border:1px solid #222;border-radius:20px;
                padding:48px 40px;text-align:center;max-width:400px;width:100%}
          .check{font-size:56px;margin-bottom:16px}
          h1{color:#a32020;font-size:26px;margin-bottom:12px}
          p{color:#888;line-height:1.6}
        </style>
      </head>
      <body>
        <div class="card">
          <div class="check">✓</div>
          <h1>¡Cuenta verificada!</h1>
          <p>Ya puedes iniciar sesión en <strong style="color:#ede9e6">goTogether</strong>.</p>
        </div>
      </body>
      </html>
    `);
  } catch {
    res.status(400).send('Token inválido o expirado');
  }
});

app.post(
  '/api/auth/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Contraseña requerida'),
  ],
  validate,
  async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await db.queryOne('SELECT * FROM users WHERE email=$1', [email]);

      // Timing-safe: hashear siempre aunque no exista el usuario
      const dummy = '$2a$12$invalidhashfortimingprotection000000000000000000000000';
      const match = await bcrypt.compare(password, user?.password ?? dummy);

      if (!user || !match) {
        return res.status(401).json({ message: 'Credenciales inválidas' });
      }
      if (!user.verified) {
        return res.status(403).json({ message: 'Debes verificar tu cuenta antes de iniciar sesión' });
      }

      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: buildUserPayload(user) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
);

app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const user = await db.queryOne('SELECT * FROM users WHERE id=$1', [req.user.id]);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ user: buildUserPayload(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ===============================
//  USUARIOS: LISTADOS
// ===============================
app.get('/api/users/conductores', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        u.id, u.name, u.email, u.city, u.car_model, u.plate,
        u.vehicle_type, u.capacity, u.phone, u.route,
        COALESCE(h.schedule, '{}') AS schedule,
        COALESCE(h.routes,   '{}') AS routes,
        COALESCE(h.precio,   '{}') AS precio,
        GREATEST(
          u.capacity - COALESCE((
            SELECT COUNT(*) FROM solicitudes s
            WHERE s.conductor_id = u.id
              AND s.estado = 'aceptada'
              AND s.fecha_viaje = CURRENT_DATE
          ), 0),
          0
        ) AS cupos_disponibles,
        EXISTS (
          SELECT 1 FROM solicitudes s
          WHERE s.conductor_id = u.id
            AND s.pasajero_id  = $1
            AND s.estado IN ('pendiente','aceptada')
        ) AS ya_solicitado
      FROM users u
      LEFT JOIN horarios h ON h.user_id = u.id
      WHERE u.role = 'conductor'
        AND u.id != $1
        AND u.verified = TRUE
      ORDER BY cupos_disponibles DESC, u.name
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.get('/api/users/pasajeros', authenticate, requireRole('conductor'), async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        u.id, u.name, u.email, u.city, u.university, u.phone, u.route,
        COALESCE(h.schedule, '{}') AS schedule,
        COALESCE(h.routes,   '{}') AS routes,
        EXISTS (
          SELECT 1 FROM solicitudes s
          WHERE s.pasajero_id  = u.id
            AND s.conductor_id = $1
            AND s.estado IN ('pendiente','aceptada')
        ) AS ya_invitado
      FROM users u
      LEFT JOIN horarios h ON h.user_id = u.id
      WHERE u.role = 'pasajero'
        AND u.id != $1
        AND u.verified = TRUE
      ORDER BY u.name
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ===============================
//  SOLICITUDES
// ===============================
app.get('/api/solicitudes/mis-solicitudes', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        s.id, s.estado, s.created_at, s.iniciado_por, s.fecha_viaje,
        s.pasajero_id, s.conductor_id,
        p.name  AS pasajero_name,  p.city AS pasajero_city,
        p.university AS pasajero_university, p.phone AS pasajero_phone,
        c.name  AS conductor_name, c.city AS conductor_city,
        c.car_model, c.plate,      c.phone AS conductor_phone
      FROM solicitudes s
      JOIN users p ON p.id = s.pasajero_id
      JOIN users c ON c.id = s.conductor_id
      WHERE (s.pasajero_id = $1 OR s.conductor_id = $1)
        AND s.estado NOT IN ('rechazada','cancelada')
      ORDER BY s.created_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.get('/api/solicitudes/pendientes-count', authenticate, async (req, res) => {
  try {
    const row = await db.queryOne(`
      SELECT COUNT(*) AS count FROM solicitudes
      WHERE estado = 'pendiente'
        AND iniciado_por != $1
        AND (pasajero_id = $1 OR conductor_id = $1)
    `, [req.user.id]);
    res.json({ count: parseInt(row.count, 10) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.post(
  '/api/solicitudes',
  authenticate,
  [
    body('conductor_id').optional().isInt({ min: 1 }).withMessage('conductor_id inválido'),
    body('pasajero_id').optional().isInt({ min: 1 }).withMessage('pasajero_id inválido'),
  ],
  validate,
  async (req, res) => {
    const myId   = req.user.id;
    const myRole = req.user.role;
    const { conductor_id, pasajero_id } = req.body;

    let finalConductorId, finalPasajeroId;
    if (myRole === 'pasajero') {
      if (!conductor_id) return res.status(400).json({ message: 'conductor_id requerido' });
      finalPasajeroId  = myId;
      finalConductorId = conductor_id;
    } else if (myRole === 'conductor') {
      if (!pasajero_id) return res.status(400).json({ message: 'pasajero_id requerido' });
      finalConductorId = myId;
      finalPasajeroId  = pasajero_id;
    } else {
      return res.status(403).json({ message: 'Rol no permitido' });
    }

    try {
      const result = await db.transaction(async (client) => {
        // Verificar que ambos usuarios existen y están verificados
        const [pasajero, conductor] = await Promise.all([
          client.query('SELECT id FROM users WHERE id=$1 AND role=$2 AND verified=TRUE', [finalPasajeroId, 'pasajero']),
          client.query('SELECT id, capacity FROM users WHERE id=$1 AND role=$2 AND verified=TRUE', [finalConductorId, 'conductor']),
        ]);
        if (!pasajero.rows.length)  throw Object.assign(new Error('Pasajero no encontrado o no verificado'), { status: 404 });
        if (!conductor.rows.length) throw Object.assign(new Error('Conductor no encontrado o no verificado'), { status: 404 });

        // Cupos disponibles (solo relevante si el pasajero envía la solicitud)
        if (myRole === 'pasajero') {
          const { rows: [{ count }] } = await client.query(`
            SELECT COUNT(*) FROM solicitudes
            WHERE conductor_id=$1 AND estado='aceptada' AND fecha_viaje=CURRENT_DATE
          `, [finalConductorId]);
          const cupos = conductor.rows[0].capacity - parseInt(count, 10);
          if (cupos <= 0) throw Object.assign(new Error('El conductor no tiene cupos disponibles'), { status: 409 });
        }

        const { rows } = await client.query(`
          INSERT INTO solicitudes (pasajero_id, conductor_id, iniciado_por, fecha_viaje)
          VALUES ($1, $2, $3, CURRENT_DATE)
          ON CONFLICT (pasajero_id, conductor_id, fecha_viaje) DO NOTHING
          RETURNING id
        `, [finalPasajeroId, finalConductorId, myId]);

        if (!rows.length) throw Object.assign(new Error('Ya existe una solicitud activa entre estos usuarios hoy'), { status: 409 });
        return rows[0].id;
      });

      res.status(201).json({ message: 'Solicitud enviada', id: result });
    } catch (err) {
      console.error(err);
      res.status(err.status ?? 500).json({ message: err.message ?? 'Error interno del servidor' });
    }
  }
);

app.patch(
  '/api/solicitudes/:id',
  authenticate,
  [
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    body('estado').isIn(['aceptada', 'rechazada']).withMessage('Estado inválido'),
  ],
  validate,
  async (req, res) => {
    const { estado } = req.body;
    const myId = req.user.id;
    try {
      const s = await db.queryOne('SELECT * FROM solicitudes WHERE id=$1', [req.params.id]);
      if (!s) return res.status(404).json({ message: 'Solicitud no encontrada' });
      if (s.estado !== 'pendiente') return res.status(409).json({ message: 'La solicitud ya fue procesada' });

      // Solo puede responder quien NO la inició y sí forma parte de ella
      const esParte = s.pasajero_id === myId || s.conductor_id === myId;
      if (!esParte || s.iniciado_por === myId) {
        return res.status(403).json({ message: 'No tienes permiso para responder esta solicitud' });
      }

      await db.query('UPDATE solicitudes SET estado=$1 WHERE id=$2', [estado, req.params.id]);
      res.json({ message: `Solicitud ${estado}` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
);

app.delete(
  '/api/solicitudes/:id',
  authenticate,
  [param('id').isInt({ min: 1 }).withMessage('ID inválido')],
  validate,
  async (req, res) => {
    try {
      const s = await db.queryOne('SELECT * FROM solicitudes WHERE id=$1', [req.params.id]);
      if (!s) return res.status(404).json({ message: 'Solicitud no encontrada' });
      if (s.iniciado_por !== req.user.id) {
        return res.status(403).json({ message: 'Solo quien inició la solicitud puede cancelarla' });
      }
      if (s.estado === 'aceptada') {
        return res.status(409).json({ message: 'No puedes cancelar una solicitud ya aceptada' });
      }
      await db.query('DELETE FROM solicitudes WHERE id=$1', [req.params.id]);
      res.json({ message: 'Solicitud cancelada' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
);

// ===============================
//  VIAJES (HOY)
// ===============================
app.get('/api/viajes/mis-viajes', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        s.id AS solicitud_id, s.estado, s.fecha_viaje,
        s.pasajero_id, s.conductor_id,
        p.name  AS pasajero_name,  p.city AS pasajero_city,
        p.university AS pasajero_university, p.phone AS pasajero_phone,
        c.name  AS conductor_name, c.city AS conductor_city,
        c.car_model, c.plate,      c.phone AS conductor_phone,
        COALESCE(hc.schedule, '{}') AS schedule,
        COALESCE(hc.routes,   '{}') AS routes,
        COALESCE(hc.precio,   '{}') AS precio
      FROM solicitudes s
      JOIN users p  ON p.id = s.pasajero_id
      JOIN users c  ON c.id = s.conductor_id
      LEFT JOIN horarios hc ON hc.user_id = c.id
      WHERE s.estado = 'aceptada'
        AND s.fecha_viaje = CURRENT_DATE
        AND (s.pasajero_id = $1 OR s.conductor_id = $1)
      ORDER BY s.created_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.delete('/api/viajes/limpiar-pasados', authenticate, async (req, res) => {
  try {
    const result = await db.query(`
      DELETE FROM solicitudes
      WHERE estado = 'aceptada'
        AND fecha_viaje < CURRENT_DATE
        AND (pasajero_id = $1 OR conductor_id = $1)
    `, [req.user.id]);
    res.json({ message: `${result.rowCount} viajes pasados eliminados` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ===============================
//  HORARIOS
// ===============================
app.get('/api/horarios', authenticate, async (req, res) => {
  try {
    const row = await db.queryOne(
      'SELECT schedule, routes, precio FROM horarios WHERE user_id=$1',
      [req.user.id]
    );
    res.json(row ?? { schedule: {}, routes: {}, precio: {} });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.post(
  '/api/horarios',
  authenticate,
  [
    body('schedule').optional().isObject().withMessage('schedule debe ser un objeto JSON'),
    body('routes').optional().isObject().withMessage('routes debe ser un objeto JSON'),
    body('precio').optional().isObject().withMessage('precio debe ser un objeto JSON'),
  ],
  validate,
  async (req, res) => {
    const { schedule = {}, routes = {}, precio = {} } = req.body;
    try {
      await db.query(`
        INSERT INTO horarios (user_id, schedule, routes, precio, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (user_id) DO UPDATE
          SET schedule   = $2,
              routes     = $3,
              precio     = $4,
              updated_at = NOW()
      `, [req.user.id, schedule, routes, precio]);
      res.json({ message: 'Horario guardado' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
);

// ===============================
//  PERFIL (EDITAR)
// ===============================
app.patch(
  '/api/auth/profile',
  authenticate,
  [
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Nombre inválido'),
    body('city').optional().trim().notEmpty().withMessage('Ciudad inválida'),
    body('phone').optional({ nullable: true }).trim(),
    body('university').optional().trim(),
    body('car_model').optional().trim(),
    body('plate').optional().trim(),
    body('password').optional().isLength({ min: 8 }).withMessage('Contraseña debe tener al menos 8 caracteres'),
  ],
  validate,
  async (req, res) => {
    const ALLOWED = ['name', 'city', 'phone', 'university', 'car_model', 'plate', 'password'];
    const updates = [];
    const values  = [];
    let idx = 1;

    for (const field of ALLOWED) {
      if (req.body[field] === undefined) continue;
      if (field === 'password') {
        updates.push(`password = $${idx++}`);
        values.push(await bcrypt.hash(req.body.password, 12));
      } else {
        updates.push(`${field} = $${idx++}`);
        values.push(req.body[field]);
      }
    }

    if (!updates.length) return res.status(400).json({ message: 'No hay campos para actualizar' });

    values.push(req.user.id);
    try {
      const result = await db.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id=$${idx} RETURNING *`,
        values
      );
      res.json({ message: 'Perfil actualizado', user: buildUserPayload(result.rows[0]) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
);

// ===============================
//  404 Y MANEJO DE ERRORES GLOBAL
// ===============================
app.use((_req, res) => res.status(404).json({ message: 'Ruta no encontrada' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('❌ Error no capturado:', err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

// ===============================
//  GRACEFUL SHUTDOWN
// ===============================
const shutdown = async (signal) => {
  console.log(`\n📴 ${signal} recibido. Cerrando servidor...`);
  await pool.end();
  console.log('🔌 Pool cerrado. Adiós.');
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ===============================
//  INICIO DEL SERVIDOR
// ===============================
initDB()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor corriendo en ${BASE_URL} [${IS_PROD ? 'PRODUCTION' : 'DEVELOPMENT'}]`);
    });
  })
  .catch((err) => {
    console.error('❌ No se pudo inicializar la base de datos:', err.message);
    process.exit(1);
  });