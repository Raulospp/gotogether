const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { pool } = require('../config');

router.get('/:userId/promedio', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT ROUND(AVG(calificacion)::numeric,1) as promedio, COUNT(*) as total FROM resenas WHERE receptor_id=$1',
      [req.params.userId]
    );
    res.json(rows[0]);
  } catch(err) { next(err); }
});

router.get('/:userId', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.id, r.calificacion, r.comentario, r.created_at, r.autor_id,
              u.name as autor_name, u.role as autor_role
       FROM resenas r JOIN users u ON u.id = r.autor_id
       WHERE r.receptor_id=$1 ORDER BY r.created_at DESC`,
      [req.params.userId]
    );
    res.json(rows);
  } catch(err) { next(err); }
});

module.exports = router;