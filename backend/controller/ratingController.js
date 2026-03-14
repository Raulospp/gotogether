import { pool } from "../config/database.js";

// ── Crear calificación ────────────────────────────────────────────────────────

export async function createRating(req, res) {
  try {
    const { trip_id, reviewed_id, score, comment } = req.body;
    const reviewer_id = req.user.id;

    if (!trip_id || !reviewed_id || !score) {
      return res.status(400).json({ message: "Faltan campos: trip_id, reviewed_id, score" });
    }

    if (score < 1 || score > 5) {
      return res.status(400).json({ message: "El puntaje debe estar entre 1 y 5" });
    }

    if (reviewer_id === reviewed_id) {
      return res.status(400).json({ message: "No puedes calificarte a ti mismo" });
    }

    // Verificar que el viaje existe y está completado o activo
    const tripResult = await pool.query("SELECT * FROM trips WHERE id = $1", [trip_id]);
    const trip = tripResult.rows[0];
    if (!trip) return res.status(404).json({ message: "Viaje no encontrado" });

    // Verificar que el reviewer participó en el viaje
    const conductor   = trip.conductor_id;
    const passengerQ  = await pool.query(
      "SELECT id FROM trip_passengers WHERE trip_id = $1 AND passenger_id = $2",
      [trip_id, reviewer_id]
    );
    const esPassenger = passengerQ.rows.length > 0;
    const esConductor = conductor === reviewer_id;

    if (!esPassenger && !esConductor) {
      return res.status(403).json({ message: "Solo puedes calificar viajes en los que participaste" });
    }

    // Verificar que el reviewed participó en el viaje
    const reviewedIsPassenger = await pool.query(
      "SELECT id FROM trip_passengers WHERE trip_id = $1 AND passenger_id = $2",
      [trip_id, reviewed_id]
    );
    const reviewedIsConductor = conductor === reviewed_id;

    if (reviewedIsPassenger.rows.length === 0 && !reviewedIsConductor) {
      return res.status(400).json({ message: "El usuario calificado no participó en este viaje" });
    }

    const result = await pool.query(
      `INSERT INTO ratings (trip_id, reviewer_id, reviewed_id, score, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [trip_id, reviewer_id, reviewed_id, score, comment || null]
    );

    res.status(201).json({ message: "Calificación registrada exitosamente", rating: result.rows[0] });

  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Ya calificaste a este usuario en este viaje" });
    }
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}

// ── Ver calificaciones de un usuario ─────────────────────────────────────────

export async function getUserRatings(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
         r.id, r.score, r.comment, r.created_at,
         u.name AS reviewer_name,
         t.origin, t.destination, t.departure_time
       FROM ratings r
       JOIN users u ON u.id = r.reviewer_id
       JOIN trips t ON t.id = r.trip_id
       WHERE r.reviewed_id = $1
       ORDER BY r.created_at DESC`,
      [id]
    );

    const avgResult = await pool.query(
      "SELECT ROUND(AVG(score)::numeric, 1) AS average, COUNT(*) AS total FROM ratings WHERE reviewed_id = $1",
      [id]
    );

    res.json({
      average: avgResult.rows[0].average || 0,
      total:   avgResult.rows[0].total,
      ratings: result.rows
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}

// ── Historial de viajes completados ──────────────────────────────────────────

export async function getTripHistory(req, res) {
  try {
    const userId = req.user.id;
    const role   = req.user.role;

    let result;

    if (role === "conductor") {
      result = await pool.query(
        `SELECT
           t.*,
           (SELECT COUNT(*) FROM trip_passengers tp WHERE tp.trip_id = t.id) AS passengers_count,
           (SELECT ROUND(AVG(r.score)::numeric,1) FROM ratings r WHERE r.trip_id = t.id AND r.reviewed_id = t.conductor_id) AS avg_rating
         FROM trips t
         WHERE t.conductor_id = $1
           AND (t.status = 'completado' OR t.departure_time < NOW())
         ORDER BY t.departure_time DESC`,
        [userId]
      );
    } else {
      result = await pool.query(
        `SELECT
           t.*, u.name AS conductor_name, u.car_model, u.plate,
           tp.joined_at,
           (SELECT r.score FROM ratings r WHERE r.trip_id = t.id AND r.reviewer_id = $1 AND r.reviewed_id = t.conductor_id) AS my_rating
         FROM trip_passengers tp
         JOIN trips t  ON t.id  = tp.trip_id
         JOIN users u  ON u.id  = t.conductor_id
         WHERE tp.passenger_id = $1
           AND (t.status = 'completado' OR t.departure_time < NOW())
         ORDER BY t.departure_time DESC`,
        [userId]
      );
    }

    res.json({ history: result.rows });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}
