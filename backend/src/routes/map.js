import { Router } from 'express';
import axios from 'axios';

const router = Router();

// GET /api/map/geocode?address=...
router.get('/geocode', async (req, res) => {
  const { address } = req.query;

  if (!address) {
    return res.status(400).json({ error: 'Dirección requerida' });
  }

  try {
    const response = await axios.get(
      'https://nominatim.openstreetmap.org/search',
      {
        params: {
          q: address,
          format: 'json',
          limit: 1
        },
        headers: {
          'User-Agent': 'mi-app/1.0'
        }
      }
    );

    if (!response.data.length) {
      return res.status(404).json({ error: 'No encontrado' });
    }

    const place = response.data[0];

    res.json({
      lat: place.lat,
      lng: place.lon,
      name: place.display_name
    });

  } catch (error) {
    res.status(500).json({ error: 'Error en geocoding' });
  }
});

export default router;