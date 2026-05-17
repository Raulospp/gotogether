const { pool } = require('../config');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Distancia euclidiana simple entre dos coordenadas (suficiente para ordenar
 * rutas dentro de una ciudad). ~1° lat ≈ 111 km en Colombia.
 */
function dist(lat1, lon1, lat2, lon2) {
  const dx = (lat1 - lat2) * 111;
  const dy = (lon1 - lon2) * 99; // cos(3°) ≈ 0.9986, aprox 99 km/°
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Recalcula ruta_calculada para un viaje usando nearest-neighbor desde el
 * origen del conductor. Los destinos se agregan al final ordenados también
 * por distancia (primero el que esté más cerca de la última parada).
 *
 * @param {number} viajeId
 */
async function recalcularRuta(viajeId) {
  // Obtener pickups + origen del conductor
  const { rows } = await pool.query(
    `SELECT s.id AS solicitud_id,
            p.name AS pasajero_name,
            s.pickup_lat, s.pickup_lon, s.pickup_direccion,
            s.pickup_universidad, s.destino_lat, s.destino_lon,
            v.origen_lat, v.origen_lon
     FROM solicitudes s
     JOIN users p ON p.id = s.pasajero_id
     JOIN viajes v ON v.id = s.viaje_id
     WHERE s.viaje_id = $1
       AND s.estado IN ('aceptada','en_curso')
       AND s.pickup_lat IS NOT NULL`,
    [viajeId]
  );

  if (rows.length === 0) {
    await pool.query(`UPDATE viajes SET ruta_calculada = '[]' WHERE id = $1`, [viajeId]);
    return [];
  }

  // ── 1. Ordenar pickups con nearest-neighbor desde el origen del conductor ──
  const origenLat = rows[0].origen_lat;
  const origenLon = rows[0].origen_lon;

  const pickups = rows.map(r => ({
    lat: r.pickup_lat, lon: r.pickup_lon,
    direccion: r.pickup_direccion,
    tipo: 'pickup',
    nombre: r.pasajero_name,
    solicitud_id: r.solicitud_id,
    universidad: r.pickup_universidad,
    destino_lat: r.destino_lat,
    destino_lon: r.destino_lon,
  }));

  const ordenados = [];
  const usados = new Set();

  // Punto de partida: origen del conductor (o primer pickup si no hay origen)
  // IMPORTANTE: si origen es null (geocode falló), usamos el primer pickup como fallback
  // Esto evita que recalcularRuta falle y rompa todo el flujo de aceptación
  let actualLat = (origenLat != null) ? origenLat : pickups[0].lat;
  let actualLon = (origenLon != null) ? origenLon : pickups[0].lon;

  while (ordenados.length < pickups.length) {
    let minDist = Infinity, minIdx = -1;
    for (let i = 0; i < pickups.length; i++) {
      if (usados.has(i)) continue;
      const d = dist(actualLat, actualLon, pickups[i].lat, pickups[i].lon);
      if (d < minDist) { minDist = d; minIdx = i; }
    }
    const siguiente = pickups[minIdx];
    usados.add(minIdx);
    ordenados.push(siguiente);
    actualLat = siguiente.lat;
    actualLon = siguiente.lon;
  }

  // ── 2. Ordenar destinos (universidades únicas) por distancia desde la ──────
  //       última parada de pickup
  const destinosMap = new Map();
  rows.forEach(r => {
    if (!r.destino_lat) return;
    const key = `${parseFloat(r.destino_lat).toFixed(4)},${parseFloat(r.destino_lon).toFixed(4)}`;
    if (!destinosMap.has(key)) {
      destinosMap.set(key, {
        lat: r.destino_lat, lon: r.destino_lon,
        nombre: r.pickup_universidad || 'Universidad',
        tipo: 'destino',
        solicitudes: [],
      });
    }
    destinosMap.get(key).solicitudes.push(r.solicitud_id);
  });

  // Nearest-neighbor también para los destinos
  const destinos = [...destinosMap.values()];
  const destinosOrdenados = [];
  const usadosDest = new Set();
  let dLat = ordenados[ordenados.length - 1]?.lat || actualLat;
  let dLon = ordenados[ordenados.length - 1]?.lon || actualLon;

  while (destinosOrdenados.length < destinos.length) {
    let minDist = Infinity, minIdx = -1;
    for (let i = 0; i < destinos.length; i++) {
      if (usadosDest.has(i)) continue;
      const d = dist(dLat, dLon, destinos[i].lat, destinos[i].lon);
      if (d < minDist) { minDist = d; minIdx = i; }
    }
    const sig = destinos[minIdx];
    usadosDest.add(minIdx);
    destinosOrdenados.push(sig);
    dLat = sig.lat;
    dLon = sig.lon;
  }

  const ruta = [...ordenados, ...destinosOrdenados];
  await pool.query(
    `UPDATE viajes SET ruta_calculada = $1 WHERE id = $2`,
    [JSON.stringify(ruta), viajeId]
  );
  return ruta;
}

// ─────────────────────────────────────────────────────────────────────────────
// Controllers
// ─────────────────────────────────────────────────────────────────────────────

exports.crearSolicitud = async (req, res, next) => {
  try {
    const { conductor_id, pasajero_id } = req.body;
    const userId   = req.user.id;
    const userRole = req.user.role;

    if (userRole === 'pasajero') {
      if (!conductor_id) return res.status(400).json({ message: 'conductor_id requerido' });
      const existe = await pool.query(
        `SELECT id FROM solicitudes
         WHERE pasajero_id = $1 AND conductor_id = $2
           AND estado IN ('pendiente','aceptada') AND fecha_viaje = CURRENT_DATE`,
        [userId, conductor_id]
      );
      if (existe.rows.length > 0) return res.status(409).json({ message: 'Ya tienes una solicitud para hoy con este conductor' });
      const result = await pool.query(
        'INSERT INTO solicitudes (pasajero_id, conductor_id, iniciado_por, fecha_viaje) VALUES ($1, $2, $3, CURRENT_DATE) RETURNING *',
        [userId, conductor_id, userId]
      );
      return res.status(201).json({ message: 'Solicitud enviada', solicitud: result.rows[0] });
    }

    if (userRole === 'conductor') {
      if (!pasajero_id) return res.status(400).json({ message: 'pasajero_id requerido' });
      const existe = await pool.query(
        `SELECT id FROM solicitudes
         WHERE pasajero_id = $1 AND conductor_id = $2
           AND estado IN ('pendiente','aceptada') AND fecha_viaje = CURRENT_DATE`,
        [pasajero_id, userId]
      );
      if (existe.rows.length > 0) return res.status(409).json({ message: 'Ya enviaste una invitación a este pasajero hoy' });
      const result = await pool.query(
        'INSERT INTO solicitudes (pasajero_id, conductor_id, iniciado_por, fecha_viaje) VALUES ($1, $2, $3, CURRENT_DATE) RETURNING *',
        [pasajero_id, userId, userId]
      );
      return res.status(201).json({ message: 'Invitación enviada', solicitud: result.rows[0] });
    }

    res.status(400).json({ message: 'Rol no válido' });
  } catch (err) { next(err); }
};

exports.getPendientesCount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM solicitudes WHERE iniciado_por != $1 AND (conductor_id = $1 OR pasajero_id = $1) AND estado = $2',
      [userId, 'pendiente']
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) { next(err); }
};

exports.getMisSolicitudes = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(`
      SELECT s.id, s.estado, s.created_at, s.iniciado_por,
             s.pasajero_id, s.conductor_id, s.viaje_id,
             s.pickup_lat, s.pickup_lon, s.pickup_direccion,
             s.pickup_universidad, s.destino_lat, s.destino_lon,
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
  } catch (err) { next(err); }
};

exports.updatePickup = async (req, res, next) => {
  try {
    const { pickup_lat, pickup_lon, pickup_direccion, pickup_universidad, destino_lat, destino_lon } = req.body;
    const solicitudId = req.params.id;
    const userId = req.user.id;
    await pool.query(
      `UPDATE solicitudes
       SET pickup_lat = $1, pickup_lon = $2,
           pickup_direccion    = COALESCE($3, pickup_direccion),
           pickup_universidad  = COALESCE($4, pickup_universidad),
           destino_lat         = COALESCE($5, destino_lat),
           destino_lon         = COALESCE($6, destino_lon)
       WHERE id = $7::integer AND pasajero_id = $8::integer`,
      [pickup_lat, pickup_lon, pickup_direccion, pickup_universidad, destino_lat, destino_lon, solicitudId, userId]
    );

    // Si ya tiene viaje_id → recalcular ruta con los nuevos coords
    const sol = await pool.query('SELECT viaje_id FROM solicitudes WHERE id = $1', [solicitudId]);
    if (sol.rows[0]?.viaje_id) await recalcularRuta(sol.rows[0].viaje_id);

    res.json({ message: 'Ubicación actualizada' });
  } catch (err) { next(err); }
};

exports.responderSolicitud = async (req, res, next) => {
  try {
    const { estado, precio_viaje } = req.body;
    const solicitudId = req.params.id;
    const userId = req.user.id;

    if (!['aceptada', 'rechazada'].includes(estado)) {
      return res.status(400).json({ message: 'Estado debe ser aceptada o rechazada' });
    }

    const solicitud = await pool.query('SELECT * FROM solicitudes WHERE id = $1', [solicitudId]);
    if (solicitud.rows.length === 0) return res.status(404).json({ message: 'Solicitud no encontrada' });
    const sol = solicitud.rows[0];

    const esReceptor = (sol.iniciado_por != userId) && (sol.conductor_id == userId || sol.pasajero_id == userId);
    if (!esReceptor) return res.status(403).json({ message: 'No tienes permiso' });

    if (estado === 'rechazada') {
      await pool.query('DELETE FROM solicitudes WHERE id = $1', [solicitudId]);
      return res.json({ message: 'Solicitud rechazada y eliminada' });
    }

    // ── ACEPTAR ──────────────────────────────────────────────────────────────
    const conductorId = sol.conductor_id;

    // Obtener ubicación del conductor para usarla como origen de la ruta
    const conductorData = await pool.query(
      'SELECT city FROM users WHERE id = $1',
      [conductorId]
    );
    // Intentar obtener coords del conductor desde horarios (si las guardó)
    // Por ahora usamos un geocode simple del barrio/ciudad
    // Se puede mejorar cuando el conductor comparta su ubicación en tiempo real
    const conductorCity = conductorData.rows[0]?.city || 'Cali';

    // 1. Buscar si ya existe un viaje abierto o en_curso para hoy
    let viajeId;
    const viajeExistente = await pool.query(
      `SELECT id FROM viajes
       WHERE conductor_id = $1 AND fecha = CURRENT_DATE
         AND estado IN ('abierto','en_curso')
       LIMIT 1`,
      [conductorId]
    );

    if (viajeExistente.rows.length > 0) {
      viajeId = viajeExistente.rows[0].id;
    } else {
      // Geocodificar el barrio del conductor para tener un origen real
      // Usamos el endpoint interno de geocode que ya tiene el proxy de Google
      let origenLat = null, origenLon = null;
      try {
        const geo = await fetch(
          `http://localhost:${process.env.PORT || 3000}/api/geocode?q=${encodeURIComponent(conductorCity + ', Cali, Colombia')}`
        );
        if (geo.ok) {
          const geoData = await geo.json();
          if (geoData.lat) { origenLat = geoData.lat; origenLon = geoData.lon; }
        }
      } catch (e) {
        // Si falla el geocode, la ruta se calculará desde el primer pasajero
        console.warn('[recalcRuta] No se pudo geocodificar origen conductor:', e.message);
      }

      const nuevoViaje = await pool.query(
        `INSERT INTO viajes (conductor_id, estado, fecha, origen_lat, origen_lon)
         VALUES ($1, 'abierto', CURRENT_DATE, $2, $3) RETURNING id`,
        [conductorId, origenLat, origenLon]
      );
      viajeId = nuevoViaje.rows[0].id;
    }

    // 2. Actualizar la solicitud: estado + viaje_id + precio_viaje
    await pool.query(
      'UPDATE solicitudes SET estado = $1, viaje_id = $2, precio_viaje = COALESCE($3, precio_viaje) WHERE id = $4 RETURNING *',
      [estado, viajeId, precio_viaje || null, solicitudId]
    );

    // 3. Recalcular ruta con todos los pasajeros del viaje
    // Se hace con try-catch para que un fallo en geocode no rompa la aceptación
    try { await recalcularRuta(viajeId); } catch(e) { console.warn('[recalcRuta] ignorado:', e.message); }

    res.json({ message: 'Solicitud aceptada', viaje_id: viajeId });
  } catch (err) { next(err); }
};

exports.cancelarSolicitud = async (req, res, next) => {
  try {
    const solicitudId = req.params.id;
    const userId = req.user.id;

    const check = await pool.query('SELECT * FROM solicitudes WHERE id = $1 AND iniciado_por = $2', [solicitudId, userId]);
    if (check.rows.length === 0) return res.status(403).json({ message: 'No puedes cancelar esta solicitud' });

    const viajeId = check.rows[0].viaje_id;
    await pool.query('DELETE FROM solicitudes WHERE id = $1', [solicitudId]);

    if (viajeId) await recalcularRuta(viajeId);

    res.json({ message: 'Solicitud cancelada' });
  } catch (err) { next(err); }
};