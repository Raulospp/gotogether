const config = require('../config');

// *****MODIFICACIÓN CLAVE: Usar la versión require de node-fetch@2*****
const fetch = require('node-fetch');

const GKEY = config.GOOGLE_MAPS_KEY;
const CALI_BOUNDS = config.CALI_BOUNDS;

async function geocodeQuery(q) {
  // *****MEJORA: Verificamos que la API key esté presente*****
  if (!GKEY) {
    throw new Error('No se ha configurado la variable de entorno GOOGLE_MAPS_KEY.');
  }
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${GKEY}&language=es&region=co&bounds=${CALI_BOUNDS}`;
  console.log('[geocodeQuery] URL (key ocultada):', url.replace(GKEY, '***HIDDEN***'));
  const res = await fetch(url);
  const data = await res.json();
  console.log('[geocodeQuery] status response from Google:', data.status);
  return data;
}

async function geocodeAddress(address) {
  try {
    const normalizado = address.replace(/#\s*/g, '').replace(/\s{2,}/g, ' ').trim();
    let data = await geocodeQuery(`${normalizado}, Cali, Valle del Cauca, Colombia`);
    if (data.status === 'OK') {
      const loc = data.results[0].geometry.location;
      return { lat: loc.lat, lon: loc.lng, formatted: data.results[0].formatted_address };
    }

    const sinPuerta = normalizado.replace(/-\d+(\s*)$/, '').trim();
    if (sinPuerta !== normalizado) {
      data = await geocodeQuery(`${sinPuerta}, Cali, Valle del Cauca, Colombia`);
      if (data.status === 'OK') {
        const loc = data.results[0].geometry.location;
        return { lat: loc.lat, lon: loc.lng, formatted: data.results[0].formatted_address };
      }
    }

    const soloVia = normalizado.replace(/\s+\d[\d\s\-]*$/, '').trim();
    if (soloVia && soloVia !== normalizado) {
      data = await geocodeQuery(`${soloVia}, Cali, Colombia`);
      if (data.status === 'OK') {
        const loc = data.results[0].geometry.location;
        return { lat: loc.lat, lon: loc.lng, formatted: data.results[0].formatted_address };
      }
    }
    console.error('[geocodeAddress] No se encontró la dirección:', address);
    return null;
  } catch (error) {
    console.error('[geocodeService] Error CRÍTICO:', error);
    throw error;
  }
}

module.exports = { geocodeAddress };