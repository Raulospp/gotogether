/**
 * services/routing.js
 * Snapping de coordenadas a la vía más cercana usando Nominatim reverse geocoding.
 * Sin API keys — usa OpenStreetMap.
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT     = 'goTogether/1.0 (carpooling universitario Colombia)';

/**
 * Ajusta un punto a la vía más cercana (snap to road).
 * Usa reverse geocoding de Nominatim para obtener el nombre de la calle
 * y las coordenadas del punto sobre la vía.
 *
 * @param {{ lat: number, lon: number }} point  Punto a ajustar
 * @returns {Promise<{ lat: number, lon: number, name: string }>}
 *
 * Si Nominatim falla, devuelve el mismo punto con name vacío
 * (no lanza error — el snap no es crítico para el flujo).
 */
export async function snapToRoad(point) {
  if (!point?.lat || !point?.lon) {
    return { lat: point?.lat ?? 0, lon: point?.lon ?? 0, name: '' };
  }

  try {
    const params = new URLSearchParams({
      lat:    point.lat,
      lon:    point.lon,
      format: 'json',
      zoom:   '17',        // zoom 17 → nivel de calle
    });

    const res = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!res.ok) throw new Error(`Nominatim reverse error ${res.status}`);

    const data = await res.json();

    // Nominatim devuelve las coordenadas del centroide del objeto más cercano
    return {
      lat:  parseFloat(data.lat ?? point.lat),
      lon:  parseFloat(data.lon ?? point.lon),
      name: data.display_name ?? '',
    };
  } catch (err) {
    console.warn('⚠️  snapToRoad falló (no crítico):', err.message);
    return { lat: point.lat, lon: point.lon, name: '' };
  }
}