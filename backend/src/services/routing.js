import { EXTERNAL, LIMITS } from '../constants/index.js';
import { logger }           from '../config/logger.js';


export async function snapToRoad(point) {
  if (!point?.lat || !point?.lon) {
    return { lat: point?.lat ?? 0, lon: point?.lon ?? 0, name: '' };
  }

  try {
    const params = new URLSearchParams({
      lat:    point.lat,
      lon:    point.lon,
      format: 'json',
      zoom:   LIMITS.GEO_ZOOM_STREET,
    });

    const res = await fetch(`${EXTERNAL.NOMINATIM}/reverse?${params}`, {
      headers: { 'User-Agent': EXTERNAL.USER_AGENT },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    return {
      lat:  parseFloat(data.lat  ?? point.lat),
      lon:  parseFloat(data.lon  ?? point.lon),
      name: data.display_name ?? '',
    };
  } catch (err) {
    logger.warn('snapToRoad falló', { message: err.message });
    return { lat: point.lat, lon: point.lon, name: '' };
  }
}

/**
 * Reverse geocoding: coordenadas → nombre de calle.
 * Reutilizable desde cualquier módulo que necesite nombrar un punto.
 */
export async function reverseGeocode(lat, lon) {
  try {
    const params = new URLSearchParams({ lat, lon, format: 'json' });
    const res = await fetch(`${EXTERNAL.NOMINATIM}/reverse?${params}`, {
      headers: { 'User-Agent': EXTERNAL.USER_AGENT },
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data.display_name ?? '';
  } catch {
    return '';
  }
}