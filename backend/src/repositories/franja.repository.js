import { pool } from '../config/db.js';

export const FranjaRepository = {

  /**
   * Lista todas las franjas activas de un conductor.
   */
  findByConductor: async (conductorId) => {
    const { rows } = await pool.query(`
      SELECT id, dia_semana, fecha_especifica, hora_inicio, hora_fin,
             destino_nombre, destino_lat, destino_lon, activa, created_at
      FROM franjas_horarias
      WHERE conductor_id = $1 AND activa = TRUE
      ORDER BY COALESCE(fecha_especifica, CURRENT_DATE), hora_inicio
    `, [conductorId]);
    return rows;
  },

  /**
   * Franjas activas de hoy para un conductor (día de semana o fecha exacta).
   */
  findHoyByConductor: async (conductorId) => {
    const { rows } = await pool.query(`
      SELECT id, hora_inicio, hora_fin, destino_nombre, destino_lat, destino_lon
      FROM franjas_horarias
      WHERE conductor_id = $1
        AND activa = TRUE
        AND (
          fecha_especifica = CURRENT_DATE
          OR (fecha_especifica IS NULL AND dia_semana = EXTRACT(DOW FROM CURRENT_DATE)::SMALLINT)
        )
      ORDER BY hora_inicio
    `, [conductorId]);
    return rows;
  },

  /**
   * Detecta solapamiento: devuelve true si el rango [inicio,fin] choca
   * con alguna franja existente del conductor en ese día.
   */
  detectaSolapamiento: async (conductorId, horaInicio, horaFin, diaSemana, fechaEspecifica, excludeId = null) => {
    const values = [conductorId, horaInicio, horaFin];
    let dayFilter;

    if (fechaEspecifica) {
      values.push(fechaEspecifica);
      dayFilter = `(fecha_especifica = $${values.length} OR (fecha_especifica IS NULL AND dia_semana = EXTRACT(DOW FROM $${values.length}::date)::SMALLINT))`;
    } else {
      values.push(diaSemana);
      dayFilter = `(fecha_especifica IS NULL AND dia_semana = $${values.length}) OR fecha_especifica IS NOT NULL`;
    }

    const excludeClause = excludeId ? `AND id != $${values.push(excludeId)}` : '';

    const { rows } = await pool.query(`
      SELECT id FROM franjas_horarias
      WHERE conductor_id = $1
        AND activa = TRUE
        AND hora_inicio < $3
        AND hora_fin   > $2
        AND (${dayFilter})
        ${excludeClause}
      LIMIT 1
    `, values);
    return rows.length > 0;
  },

  create: async (conductorId, { diaSemana, fechaEspecifica, horaInicio, horaFin, destinoNombre, destinoLat, destinoLon }) => {
    const { rows } = await pool.query(`
      INSERT INTO franjas_horarias
        (conductor_id, dia_semana, fecha_especifica, hora_inicio, hora_fin,
         destino_nombre, destino_lat, destino_lon)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `, [conductorId, diaSemana ?? null, fechaEspecifica ?? null,
        horaInicio, horaFin, destinoNombre, destinoLat ?? null, destinoLon ?? null]);
    return rows[0];
  },

  update: async (id, conductorId, fields) => {
    const allowed = ['dia_semana','fecha_especifica','hora_inicio','hora_fin',
                     'destino_nombre','destino_lat','destino_lon','activa'];
    const sets   = [];
    const values = [id, conductorId];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        values.push(fields[key]);
        sets.push(`${key}=$${values.length}`);
      }
    }
    if (!sets.length) return null;

    const { rows } = await pool.query(`
      UPDATE franjas_horarias
      SET ${sets.join(',')}
      WHERE id=$1 AND conductor_id=$2
      RETURNING *
    `, values);
    return rows[0] ?? null;
  },

  deleteById: async (id, conductorId) => {
    const { rowCount } = await pool.query(
      'DELETE FROM franjas_horarias WHERE id=$1 AND conductor_id=$2',
      [id, conductorId],
    );
    return rowCount > 0;
  },

  /**
   * Franjas activas cuyo destino coincide (por texto o por coordenadas cercanas).
   * Usada para sugerir conductores a un pasajero.
   * @param {string} destinoQuery  — texto del destino del pasajero
   * @param {object|null} destCoords — { lat, lon } geocodificado
   * @param {number} radiusKm
   */
  findConductoresConFranjaParaDestino: async (destinoQuery, destCoords, radiusKm) => {
    // Traer todas las franjas activas de hoy con datos del conductor
    const { rows } = await pool.query(`
      SELECT
        f.id AS franja_id,
        f.conductor_id,
        f.hora_inicio, f.hora_fin,
        f.destino_nombre, f.destino_lat, f.destino_lon,
        u.name, u.email, u.city, u.car_model, u.plate,
        u.vehicle_type, u.capacity, u.phone,
        COALESCE(h.precio, '{}') AS precio,
        COALESCE(h.routes, '{}') AS routes,
        u.capacity - COALESCE(
          (SELECT COUNT(*) FROM solicitudes s
           WHERE s.conductor_id = u.id AND s.estado = 'aceptada'
             AND s.fecha_viaje = CURRENT_DATE),
          0
        ) AS cupos_disponibles
      FROM franjas_horarias f
      JOIN users u ON u.id = f.conductor_id
      LEFT JOIN horarios h ON h.user_id = f.conductor_id
      WHERE f.activa = TRUE
        AND (
          f.fecha_especifica = CURRENT_DATE
          OR (f.fecha_especifica IS NULL
              AND f.dia_semana = EXTRACT(DOW FROM CURRENT_DATE)::SMALLINT)
        )
      ORDER BY f.hora_inicio
    `);
    return rows;
  },
};
