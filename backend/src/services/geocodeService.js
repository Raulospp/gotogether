const config = require('../config');

const GKEY = config.GOOGLE_MAPS_KEY;
const CALI_BOUNDS = config.CALI_BOUNDS;

// Usar fetch nativo (Node 18+) o import dinámico si es necesario
const fetch = globalThis.fetch || require('node-fetch');

async function geocodeQuery(q) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${GKEY}&language=es&region=co&bounds=${CALI_BOUNDS}`;
  console.log('[geocodeQuery] URL:', url);
  const res = await fetch(url);
  const data = await res.json();
  console.log('[geocodeQuery] status:', data.status);
  return data;
}

async function geocodeAddress(address) {
  try {
    const normalizado = address.replace(/#\s*/g, '').replace(/\s{2,}/g, ' ').trim();
    console.log('[geocodeAddress] normalizado:', normalizado);

    // Intento 1: completo + Cali, Valle del Cauca
    let data = await geocodeQuery(`${normalizado}, Cali, Valle del Cauca, Colombia`);
    if (data.status === 'OK') {
      const loc = data.results[0].geometry.location;
      return { lat: loc.lat, lon: loc.lng, formatted: data.results[0].formatted_address };
    }

    // Intento 2: sin número de puerta
    const sinPuerta = normalizado.replace(/-\d+(\s*)$/, '').trim();
    if (sinPuerta !== normalizado) {
      data = await geocodeQuery(`${sinPuerta}, Cali, Valle del Cauca, Colombia`);
      if (data.status === 'OK') {
        const loc = data.results[0].geometry.location;
        return { lat: loc.lat, lon: loc.lng, formatted: data.results[0].formatted_address };
      }
    }

    // Intento 3: solo la vía
    const soloVia = normalizado.replace(/\s+\d[\d\s\-]*$/, '').trim();
    if (soloVia && soloVia !== normalizado) {
      data = await geocodeQuery(`${soloVia}, Cali, Colombia`);
      if (data.status === 'OK') {
        const loc = data.results[0].geometry.location;
        return { lat: loc.lat, lon: loc.lng, formatted: data.results[0].formatted_address };
      }
    }

    console.error('[geocodeAddress] No encontrado para:', address);
    return null;
  } catch (error) {
    console.error('[geocodeAddress] Error:', error.message);
    throw error; // para que el controlador lo capture
  }
}

module.exports = { geocodeAddress };