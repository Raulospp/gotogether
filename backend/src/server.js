require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'cambiame_en_produccion';
const resend = new Resend(process.env.RESEND_API_KEY);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      name          VARCHAR(100) NOT NULL,
      email         VARCHAR(150) UNIQUE NOT NULL,
      password      TEXT NOT NULL,
      role          VARCHAR(20) DEFAULT 'pasajero',
      city          VARCHAR(100),
      university    VARCHAR(100),
      car_model     VARCHAR(100),
      plate         VARCHAR(20),
      route         VARCHAR(100),
      vehicle_type  VARCHAR(20),
      capacity      INTEGER,
      verified      BOOLEAN DEFAULT FALSE,
      verify_token  TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(20)`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS capacity INTEGER`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_token TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`);
  await pool.query(`ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS iniciado_por INTEGER REFERENCES users(id) ON DELETE CASCADE`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS solicitudes (
      id            SERIAL PRIMARY KEY,
      pasajero_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
      conductor_id  INTEGER REFERENCES users(id) ON DELETE CASCADE,
      iniciado_por  INTEGER REFERENCES users(id) ON DELETE CASCADE,
      estado        VARCHAR(20) DEFAULT 'pendiente',
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS horarios (
      id        SERIAL PRIMARY KEY,
      user_id   INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      schedule  JSONB DEFAULT '{}',
      routes    JSONB DEFAULT '{}',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  console.log('Tablas listas');
}

app.use(cors());
app.use(express.json());

app.get('/health', function(req, res) {
  res.json({ status: 'ok' });
});

function authMiddleware(req, res, next) {
  var header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Token invalido o expirado' });
  }
}

async function sendVerificationEmail(email, name, token) {
  const verifyUrl = `http://localhost:3000/api/auth/verify?token=${token}`;
  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: email,
    subject: 'Verifica tu cuenta en goTogether',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; background: #070707; color: #ede9e6; padding: 32px; border-radius: 16px;">
        <h1 style="font-size: 24px; margin-bottom: 8px;">Hola, ${name} 👋</h1>
        <p style="color: rgba(237,233,230,0.6); margin-bottom: 24px;">Gracias por registrarte en <strong style="color:#a32020">goTogether</strong>. Solo un paso más:</p>
        <a href="${verifyUrl}" style="display:inline-block; background:#8B1A1A; color:#ede9e6; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px;">
          Verificar mi cuenta
        </a>
        <p style="color: rgba(237,233,230,0.35); font-size: 12px; margin-top: 24px;">Si no creaste esta cuenta, ignora este mensaje.</p>
      </div>
    `
  });
}

// ─── AUTH ────────────────────────────────────────────────────────────────────

app.post('/api/auth/register/conductor', async function(req, res) {
  try {
    var { name, email, password, city, car_model, plate, route, vehicle_type, capacity, phone } = req.body;
    vehicle_type = vehicle_type || 'carro';
    capacity = capacity || 4;
    route = route || '';
    phone = phone || '';

    if (!name || !email || !password || !city || !car_model || !plate) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    var existe = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ message: 'El correo ya esta registrado' });
    }

    var hashed = await bcrypt.hash(password, 10);
    var verifyToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });

    var result = await pool.query(
      'INSERT INTO users (name, email, password, role, city, car_model, plate, route, vehicle_type, capacity, phone, verified, verify_token) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,FALSE,$12) RETURNING id, name, email, role, city, university, car_model, plate, route, vehicle_type, capacity, phone, verified',
      [name, email, hashed, 'conductor', city, car_model, plate, route, vehicle_type, capacity, phone, verifyToken]
    );
    var user = result.rows[0];

    await sendVerificationEmail(email, name, verifyToken);

    res.status(201).json({ message: 'Conductor registrado. Revisa tu correo para verificar tu cuenta.', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.post('/api/auth/register/pasajero', async function(req, res) {
  try {
    var { name, email, password, city, university, route, phone } = req.body;
    route = route || '';
    phone = phone || '';

    if (!name || !email || !password || !city || !university) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    var existe = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ message: 'El correo ya esta registrado' });
    }

    var hashed = await bcrypt.hash(password, 10);
    var verifyToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });

    var result = await pool.query(
      'INSERT INTO users (name, email, password, role, city, university, route, phone, verified, verify_token) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,FALSE,$9) RETURNING id, name, email, role, city, university, car_model, plate, route, vehicle_type, capacity, phone, verified',
      [name, email, hashed, 'pasajero', city, university, route, phone, verifyToken]
    );
    var user = result.rows[0];

    await sendVerificationEmail(email, name, verifyToken);

    res.status(201).json({ message: 'Pasajero registrado. Revisa tu correo para verificar tu cuenta.', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.get('/api/auth/verify', async function(req, res) {
  try {
    var token = req.query.token;
    if (!token) return res.status(400).send('Token inválido');

    var decoded = jwt.verify(token, JWT_SECRET);
    var result = await pool.query('UPDATE users SET verified = TRUE, verify_token = NULL WHERE email = $1 RETURNING id', [decoded.email]);
    if (result.rows.length === 0) return res.status(404).send('Usuario no encontrado');

    res.send(`
      <html><body style="font-family:sans-serif;background:#070707;color:#ede9e6;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
        <div style="text-align:center;">
          <h1 style="color:#a32020">✓ Cuenta verificada</h1>
          <p>Ya puedes iniciar sesión en <strong>goTogether</strong></p>
        </div>
      </body></html>
    `);
  } catch (err) {
    res.status(400).send('Token inválido o expirado');
  }
});

app.post('/api/auth/login', async function(req, res) {
  try {
    var { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña requeridos' });
    }

    var result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    var user = result.rows[0];
    if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

    var match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Credenciales inválidas' });

    // Verificación desactivada temporalmente
    // if (!user.verified) {
    //   return res.status(403).json({ message: 'Debes verificar tu correo antes de iniciar sesión' });
    // }

    var token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        city: user.city, university: user.university,
        car_model: user.car_model, plate: user.plate, route: user.route,
        vehicle_type: user.vehicle_type, capacity: user.capacity, phone: user.phone
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.get('/api/auth/me', authMiddleware, async function(req, res) {
  try {
    var result = await pool.query(
      'SELECT id, name, email, role, city, university, car_model, plate, route, vehicle_type, capacity, phone, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ─── FEED ────────────────────────────────────────────────────────────────────

app.get('/api/users/conductores', authMiddleware, async function(req, res) {
  try {
    var result = await pool.query(`
      SELECT u.id, u.name, u.email, u.city, u.car_model, u.plate, u.vehicle_type, u.capacity, u.phone,
             COALESCE(h.schedule, '{}') as schedule,
             COALESCE(h.routes, '{}') as routes
      FROM users u
      LEFT JOIN horarios h ON h.user_id = u.id
      WHERE u.role = $1 AND u.id != $2
      ORDER BY u.created_at DESC
    `, ['conductor', req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.get('/api/users/pasajeros', authMiddleware, async function(req, res) {
  try {
    var result = await pool.query(`
      SELECT u.id, u.name, u.email, u.city, u.university, u.phone,
             COALESCE(h.schedule, '{}') as schedule
      FROM users u
      LEFT JOIN horarios h ON h.user_id = u.id
      WHERE u.role = $1 AND u.id != $2
      ORDER BY u.created_at DESC
    `, ['pasajero', req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ─── SOLICITUDES ─────────────────────────────────────────────────────────────

app.post('/api/solicitudes', authMiddleware, async function(req, res) {
  try {
    var { conductor_id, pasajero_id } = req.body;
    var userId = req.user.id;
    var userRole = req.user.role;

    if (userRole === 'pasajero') {
      if (!conductor_id) return res.status(400).json({ message: 'conductor_id requerido' });

      var existe = await pool.query(
        'SELECT id FROM solicitudes WHERE pasajero_id = $1 AND conductor_id = $2 AND estado = $3',
        [userId, conductor_id, 'pendiente']
      );
      if (existe.rows.length > 0) {
        return res.status(409).json({ message: 'Ya tienes una solicitud pendiente con este conductor' });
      }

      var result = await pool.query(
        'INSERT INTO solicitudes (pasajero_id, conductor_id, iniciado_por) VALUES ($1, $2, $3) RETURNING *',
        [userId, conductor_id, userId]
      );
      return res.status(201).json({ message: 'Solicitud enviada', solicitud: result.rows[0] });
    }

    if (userRole === 'conductor') {
      if (!pasajero_id) return res.status(400).json({ message: 'pasajero_id requerido' });

      var existe2 = await pool.query(
        'SELECT id FROM solicitudes WHERE pasajero_id = $1 AND conductor_id = $2 AND estado = $3',
        [pasajero_id, userId, 'pendiente']
      );
      if (existe2.rows.length > 0) {
        return res.status(409).json({ message: 'Ya enviaste una invitación a este pasajero' });
      }

      var result2 = await pool.query(
        'INSERT INTO solicitudes (pasajero_id, conductor_id, iniciado_por) VALUES ($1, $2, $3) RETURNING *',
        [pasajero_id, userId, userId]
      );
      return res.status(201).json({ message: 'Invitación enviada', solicitud: result2.rows[0] });
    }

    res.status(400).json({ message: 'Rol no válido' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.get('/api/solicitudes/mis-solicitudes', authMiddleware, async function(req, res) {
  try {
    var userId = req.user.id;
    var userRole = req.user.role;
    var result;

    // Devolver TODAS las solicitudes donde el usuario está involucrado
    result = await pool.query(`
      SELECT s.id, s.estado, s.created_at, s.iniciado_por,
             s.pasajero_id, s.conductor_id,
             p.name as pasajero_name, p.city as pasajero_city,
             p.university as pasajero_university, p.phone as pasajero_phone,
             c.name as conductor_name, c.city as conductor_city,
             c.car_model, c.vehicle_type, c.phone as conductor_phone
      FROM solicitudes s
      JOIN users p ON p.id = s.pasajero_id
      JOIN users c ON c.id = s.conductor_id
      WHERE s.pasajero_id = $1 OR s.conductor_id = $1
      ORDER BY s.created_at DESC
    `, [userId]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.patch('/api/solicitudes/:id', authMiddleware, async function(req, res) {
  try {
    var { estado } = req.body;
    var solicitudId = req.params.id;
    var userId = req.user.id;

    if (!['aceptada', 'rechazada'].includes(estado)) {
      return res.status(400).json({ message: 'Estado debe ser aceptada o rechazada' });
    }

    // Solo quien RECIBIÓ la solicitud puede aceptar/rechazar (no quien la inició)
    // Buscar la solicitud primero para debuggear
    var solicitudData = await pool.query(
      'SELECT * FROM solicitudes WHERE id = $1',
      [solicitudId]
    );
    console.log('Solicitud:', solicitudData.rows[0]);
    console.log('UserId intentando responder:', userId);

    if (solicitudData.rows.length === 0) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    var sol = solicitudData.rows[0];
    // El receptor es quien NO inició
    var esReceptor = (sol.iniciado_por != userId) && (sol.conductor_id == userId || sol.pasajero_id == userId);
    console.log('Es receptor:', esReceptor, 'iniciado_por:', sol.iniciado_por, 'conductor_id:', sol.conductor_id, 'pasajero_id:', sol.pasajero_id);

    if (!esReceptor) {
      return res.status(403).json({ message: 'No tienes permiso para modificar esta solicitud' });
    }

    // Si rechazada, eliminar directamente
    if (estado === 'rechazada') {
      await pool.query('DELETE FROM solicitudes WHERE id = $1', [solicitudId]);
      return res.json({ message: 'Solicitud rechazada y eliminada' });
    }

    var result = await pool.query(
      'UPDATE solicitudes SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, solicitudId]
    );

    res.json({ message: 'Solicitud aceptada', solicitud: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ─── EDITAR PERFIL ───────────────────────────────────────────────────────────

app.patch('/api/auth/profile', authMiddleware, async function(req, res) {
  try {
    var { name, city, phone, university, car_model, plate, password } = req.body;
    var userId = req.user.id;

    // Construir query dinámicamente
    var fields = [];
    var values = [];
    var idx = 1;

    if (name)       { fields.push(`name = $${idx++}`);       values.push(name); }
    if (city)       { fields.push(`city = $${idx++}`);       values.push(city); }
    if (phone)      { fields.push(`phone = $${idx++}`);      values.push(phone); }
    if (university) { fields.push(`university = $${idx++}`); values.push(university); }
    if (car_model)  { fields.push(`car_model = $${idx++}`);  values.push(car_model); }
    if (plate)      { fields.push(`plate = $${idx++}`);      values.push(plate); }
    if (password) {
      var bcrypt = require('bcryptjs');
      var hashed = await bcrypt.hash(password, 10);
      fields.push(`password = $${idx++}`);
      values.push(hashed);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }

    values.push(userId);
    var result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, email, role, city, university, car_model, plate, vehicle_type, capacity, phone`,
      values
    );

    res.json({ message: 'Perfil actualizado', user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ─── HORARIOS ────────────────────────────────────────────────────────────────

// Guardar horario y rutas del usuario
app.post('/api/horarios', authMiddleware, async function(req, res) {
  try {
    var { schedule, routes } = req.body;
    var userId = req.user.id;

    await pool.query(`
      INSERT INTO horarios (user_id, schedule, routes, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id) DO UPDATE
      SET schedule = $2, routes = $3, updated_at = NOW()
    `, [userId, JSON.stringify(schedule || {}), JSON.stringify(routes || {})]);

    res.json({ message: 'Horario guardado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener horario del usuario logueado
app.get('/api/horarios/me', authMiddleware, async function(req, res) {
  try {
    var result = await pool.query(
      'SELECT schedule, routes FROM horarios WHERE user_id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.json({ schedule: {}, routes: {} });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Cancelar/eliminar solicitud (solo quien la creó)
app.delete('/api/solicitudes/:id', authMiddleware, async function(req, res) {
  try {
    var solicitudId = req.params.id;
    var userId = req.user.id;

    var check = await pool.query(
      'SELECT id FROM solicitudes WHERE id = $1 AND iniciado_por = $2',
      [solicitudId, userId]
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ message: 'No tienes permiso para cancelar esta solicitud' });
    }

    await pool.query('DELETE FROM solicitudes WHERE id = $1', [solicitudId]);
    res.json({ message: 'Solicitud cancelada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Cancelar (eliminar) una solicitud — solo quien la inició
app.delete('/api/solicitudes/:id', authMiddleware, async function(req, res) {
  try {
    var solicitudId = req.params.id;
    var userId = req.user.id;

    var check = await pool.query(
      'SELECT id FROM solicitudes WHERE id = $1 AND iniciado_por = $2',
      [solicitudId, userId]
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ message: 'No puedes cancelar esta solicitud' });
    }

    await pool.query('DELETE FROM solicitudes WHERE id = $1', [solicitudId]);
    res.json({ message: 'Solicitud cancelada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────

initDB()
  .then(function() {
    app.listen(PORT, '0.0.0.0', function() {
      console.log('Servidor corriendo en http://localhost:' + PORT);
    });
  })
  .catch(function(err) {
    console.error('Error conectando a la DB:', err.message);
    process.exit(1);
  });