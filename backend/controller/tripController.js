import { pool } from "../config/database.js";

// ── Crear viaje (solo conductores) ────────────────────────────────────────────

export async function createTrip(req, res) {
  try {
    const { origin, destination, departure_time, available_seats, price } = req.body;
    const conductor_id = req.user.id;

    if (req.user.role !== "conductor") {
      return res.status(403).json({ message: "Solo los conductores pueden crear viajes" });
    }

    if (!origin || !destination || !departure_time || !available_seats) {
      return res.status(400).json({ message: "Faltan campos: origin, destination, departure_time, available_seats" });
    }

    if (available_seats < 1 || available_seats > 10) {
      return res.status(400).json({ message: "Los asientos disponibles deben estar entre 1 y 10" });
    }

    if (new Date(departure_time) <= new Date()) {
      return res.status(400).json({ message: "La hora de salida debe ser en el futuro" });
    }

    const result = await pool.query(
      `INSERT INTO trips (conductor_id, origin, destination, departure_time, available_seats, price)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [conductor_id, origin, destination, departure_time, available_seats, price || 0]
    );

    res.status(201).json({ message: "Viaje creado exitosamente", trip: result.rows[0] });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}

// ── Listar viajes disponibles ─────────────────────────────────────────────────

export async function getTrips(req, res) {
  try {
    const { origin, destination, date } = req.query;

    let query = `
      SELECT
        t.*,
        u.name  AS conductor_name,
        u.car_model,
        u.plate,
        u.vehicle_type,
        (SELECT COUNT(*) FROM trip_passengers tp WHERE tp.trip_id = t.id) AS passengers_count
      FROM trips t
      JOIN users u ON u.id = t.conductor_id
      WHERE t.status = 'activo'
        AND t.departure_time > NOW()
        AND t.available_seats > 0
    `;
    const params = [];
    let i = 1;

    if (origin) {
      query += ` AND LOWER(t.origin) LIKE LOWER($${i++})`;
      params.push(`%${origin}%`);
    }
    if (destination) {
      query += ` AND LOWER(t.destination) LIKE LOWER($${i++})`;
      params.push(`%${destination}%`);
    }
    if (date) {
      query += ` AND DATE(t.departure_time) = $${i++}`;
      params.push(date);
    }

    query += " ORDER BY t.departure_time ASC";

    const result = await pool.query(query, params);
    res.json({ trips: result.rows });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}

// ── Ver detalle de un viaje ───────────────────────────────────────────────────

export async function getTripById(req, res) {
  try {
    const { id } = req.params;

    const tripResult = await pool.query(
      `SELECT t.*, u.name AS conductor_name, u.car_model, u.plate, u.vehicle_type
       FROM trips t
       JOIN users u ON u.id = t.conductor_id
       WHERE t.id = $1`,
      [id]
    );

    if (tripResult.rows.length === 0) {
      return res.status(404).json({ message: "Viaje no encontrado" });
    }

    const passengersResult = await pool.query(
      `SELECT u.id, u.name, u.email, tp.joined_at
       FROM trip_passengers tp
       JOIN users u ON u.id = tp.passenger_id
       WHERE tp.trip_id = $1`,
      [id]
    );

    res.json({
      trip: tripResult.rows[0],
      passengers: passengersResult.rows
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}

// ── Unirse a un viaje (pasajero) ──────────────────────────────────────────────

export async function joinTrip(req, res) {
  try {
    const { id } = req.params;
    const passenger_id = req.user.id;

    if (req.user.role !== "pasajero") {
      return res.status(403).json({ message: "Solo los pasajeros pueden unirse a un viaje" });
    }

    const tripResult = await pool.query("SELECT * FROM trips WHERE id = $1", [id]);
    const trip = tripResult.rows[0];

    if (!trip) return res.status(404).json({ message: "Viaje no encontrado" });
    if (trip.status !== "activo") return res.status(400).json({ message: "Este viaje ya no está disponible" });
    if (trip.available_seats === 0) return res.status(400).json({ message: "No hay asientos disponibles" });

    // Verificar que no esté ya inscrito
    const yaInscrito = await pool.query(
      "SELECT id FROM trip_passengers WHERE trip_id = $1 AND passenger_id = $2",
      [id, passenger_id]
    );
    if (yaInscrito.rows.length > 0) {
      return res.status(409).json({ message: "Ya estás inscrito en este viaje" });
    }

    await pool.query(
      "INSERT INTO trip_passengers (trip_id, passenger_id) VALUES ($1, $2)",
      [id, passenger_id]
    );

    await pool.query(
      "UPDATE trips SET available_seats = available_seats - 1 WHERE id = $1",
      [id]
    );

    res.json({ message: "Te has unido al viaje exitosamente" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}

// ── Cancelar viaje (conductor dueño) ─────────────────────────────────────────

export async function cancelTrip(req, res) {
  try {
    const { id } = req.params;
    const conductor_id = req.user.id;

    const tripResult = await pool.query("SELECT * FROM trips WHERE id = $1", [id]);
    const trip = tripResult.rows[0];

    if (!trip) return res.status(404).json({ message: "Viaje no encontrado" });

    if (trip.conductor_id !== conductor_id) {
      return res.status(403).json({ message: "No tienes permiso para cancelar este viaje" });
    }

    await pool.query("UPDATE trips SET status = 'cancelado' WHERE id = $1", [id]);

    res.json({ message: "Viaje cancelado exitosamente" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}

// ── Mis viajes ────────────────────────────────────────────────────────────────

export async function getMyTrips(req, res) {
  try {
    const userId = req.user.id;
    const role   = req.user.role;

    let result;

    if (role === "conductor") {
      result = await pool.query(
        `SELECT t.*,
           (SELECT COUNT(*) FROM trip_passengers tp WHERE tp.trip_id = t.id) AS passengers_count
         FROM trips t
         WHERE t.conductor_id = $1
         ORDER BY t.departure_time DESC`,
        [userId]
      );
    } else {
      result = await pool.query(
        `SELECT t.*, u.name AS conductor_name, u.car_model, u.plate, tp.joined_at
         FROM trip_passengers tp
         JOIN trips t ON t.id = tp.trip_id
         JOIN users u ON u.id = t.conductor_id
         WHERE tp.passenger_id = $1
         ORDER BY t.departure_time DESC`,
        [userId]
      );
    }

    res.json({ trips: result.rows });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}
