const { geocodeAddress } = require('../services/geocodeService');

exports.geocode = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.status(400).json({ message: 'Parámetro q requerido' });
    }
    console.log('[geocode] Consulta:', q);
    const result = await geocodeAddress(q);
    if (!result) {
      return res.status(404).json({ message: 'No se pudo geocodificar la dirección' });
    }
    res.json(result);
  } catch (err) {
    console.error('[geocode] Error interno:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};