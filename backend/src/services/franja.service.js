import { FranjaRepository }  from '../repositories/franja.repository.js';
import { getCoordinates }    from './maps.service.js';
import { AppError }          from '../utils/AppError.js';
import { normalizeText }     from '../utils/format.js';
import { haversine }         from '../utils/geo.js';
import { LIMITS }            from '../constants/index.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTime(str) {
  // "08:00" → objeto comparable, devuelve "HH:MM"
  if (!str || !/^\d{2}:\d{2}$/.test(str))
    throw AppError.badRequest(`Hora inválida: "${str}". Formato esperado HH:MM`, 'HORA_INVALIDA');
  return str;
}

async function resolverDestino(destinoNombre) {
  try {
    const coords = await getCoordinates(destinoNombre);
    return { destinoLat: coords.lat, destinoLon: coords.lon };
  } catch {
    return { destinoLat: null, destinoLon: null };
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const FranjaService = {

  listar: async (conductorId) => {
    return FranjaRepository.findByConductor(conductorId);
  },

  crear: async (conductorId, body) => {
    const {
      hora_inicio,
      hora_fin,
      destino_nombre,
      dia_semana       = null,   // 0=Dom … 6=Sab
      fecha_especifica = null,   // "YYYY-MM-DD"
    } = body;

    if (!hora_inicio || !hora_fin) throw AppError.badRequest('hora_inicio y hora_fin son requeridos');
    if (!destino_nombre)           throw AppError.badRequest('destino_nombre es requerido');
    if (dia_semana === null && fecha_especifica === null)
      throw AppError.badRequest('Se requiere dia_semana (0-6) o fecha_especifica (YYYY-MM-DD)');

    parseTime(hora_inicio);
    parseTime(hora_fin);
    if (hora_fin <= hora_inicio)
      throw AppError.badRequest('hora_fin debe ser posterior a hora_inicio', 'HORA_INVALIDA');

    // Verificar solapamiento
    const solapa = await FranjaRepository.detectaSolapamiento(
      conductorId, hora_inicio, hora_fin, dia_semana, fecha_especifica,
    );
    if (solapa)
      throw AppError.conflict(
        'Ya tienes una franja horaria que se solapa con este rango',
        'FRANJA_SOLAPADA',
      );

    // Geocodificar el destino
    const { destinoLat, destinoLon } = await resolverDestino(destino_nombre);

    return FranjaRepository.create(conductorId, {
      diaSemana:        dia_semana,
      fechaEspecifica:  fecha_especifica,
      horaInicio:       hora_inicio,
      horaFin:          hora_fin,
      destinoNombre:    destino_nombre,
      destinoLat,
      destinoLon,
    });
  },

  actualizar: async (franjaId, conductorId, body) => {
    // Si cambian las horas, verificar solapamiento excluyendo la propia franja
    if (body.hora_inicio || body.hora_fin) {
      const franjas = await FranjaRepository.findByConductor(conductorId);
      const actual  = franjas.find(f => f.id == franjaId);
      if (!actual) throw AppError.notFound('Franja no encontrada', 'FRANJA_NOT_FOUND');

      const newInicio = body.hora_inicio || actual.hora_inicio;
      const newFin    = body.hora_fin    || actual.hora_fin;

      if (newFin <= newInicio)
        throw AppError.badRequest('hora_fin debe ser posterior a hora_inicio', 'HORA_INVALIDA');

      const solapa = await FranjaRepository.detectaSolapamiento(
        conductorId, newInicio, newFin,
        body.dia_semana ?? actual.dia_semana,
        body.fecha_especifica ?? actual.fecha_especifica,
        franjaId,
      );
      if (solapa)
        throw AppError.conflict('Solapamiento con otra franja existente', 'FRANJA_SOLAPADA');
    }

    // Re-geocodificar si cambia el destino
    if (body.destino_nombre) {
      const { destinoLat, destinoLon } = await resolverDestino(body.destino_nombre);
      body.destino_lat = destinoLat;
      body.destino_lon = destinoLon;
    }

    const updated = await FranjaRepository.update(franjaId, conductorId, {
      dia_semana:       body.dia_semana,
      fecha_especifica: body.fecha_especifica,
      hora_inicio:      body.hora_inicio,
      hora_fin:         body.hora_fin,
      destino_nombre:   body.destino_nombre,
      destino_lat:      body.destino_lat,
      destino_lon:      body.destino_lon,
    });
    if (!updated) throw AppError.notFound('Franja no encontrada', 'FRANJA_NOT_FOUND');
    return updated;
  },

  eliminar: async (franjaId, conductorId) => {
    const ok = await FranjaRepository.deleteById(franjaId, conductorId);
    if (!ok) throw AppError.notFound('Franja no encontrada', 'FRANJA_NOT_FOUND');
  },

  // ── Sugerencia de conductores para un pasajero ───────────────────────────

  /**
   * Dado el destino del pasajero, devuelve conductores que tienen una franja
   * activa hoy cuyo destino coincide (texto o cercanía geográfica).
   * Filtra conductores con cupos disponibles.
   */
  sugerirConductores: async (destinoQuery, radiusKm = LIMITS.GEO_RADIUS_KM) => {
    if (!destinoQuery?.trim()) throw AppError.badRequest('destino es requerido');

    // Geocodificar destino del pasajero
    let destCoords = null;
    try { destCoords = await getCoordinates(destinoQuery); } catch { /* noop */ }

    const rows = await FranjaRepository.findConductoresConFranjaParaDestino(
      destinoQuery, destCoords, radiusKm,
    );

    const queryNorm  = normalizeText(destinoQuery);
    const queryWords = queryNorm.split(/\s+/).filter(w => w.length > LIMITS.MIN_WORD_LENGTH);

    const RANK = { both: 0, geo: 1, text: 2 };
    const seen = new Map(); // conductor_id → best entry

    for (const row of rows) {
      if (parseInt(row.cupos_disponibles) <= 0) continue;

      // Match por texto
      const franjaDestNorm = normalizeText(row.destino_nombre);
      const textMatch = queryWords.length > 0
        && queryWords.filter(w => franjaDestNorm.includes(w)).length >= Math.ceil(queryWords.length / 2);

      // Match geográfico (extremo de destino de la franja)
      let geoMatch   = false;
      let distanciaKm = null;
      if (destCoords && row.destino_lat && row.destino_lon) {
        const d = parseFloat(haversine(destCoords, { lat: row.destino_lat, lon: row.destino_lon }).toFixed(2));
        distanciaKm = d;
        geoMatch = d <= radiusKm;
      }

      if (!textMatch && !geoMatch) continue;

      const matchType = (textMatch && geoMatch) ? 'both' : geoMatch ? 'geo' : 'text';

      const entry = {
        conductor_id:      row.conductor_id,
        name:              row.name,
        email:             row.email,
        city:              row.city,
        car_model:         row.car_model,
        plate:             row.plate,
        vehicle_type:      row.vehicle_type,
        capacity:          row.capacity,
        cupos_disponibles: parseInt(row.cupos_disponibles),
        phone:             row.phone,
        precio:            row.precio,
        routes:            row.routes,
        franja: {
          id:             row.franja_id,
          hora_inicio:    row.hora_inicio,
          hora_fin:       row.hora_fin,
          destino_nombre: row.destino_nombre,
          destino_lat:    row.destino_lat,
          destino_lon:    row.destino_lon,
        },
        matchType,
        distanciaDestinoKm: distanciaKm,
      };

      // Si ya está en el map, conservar el de mejor match
      const prev = seen.get(row.conductor_id);
      if (!prev || RANK[matchType] < RANK[prev.matchType]) {
        seen.set(row.conductor_id, entry);
      }
    }

    const results = [...seen.values()];
    results.sort((a, b) => {
      const byRank = RANK[a.matchType] - RANK[b.matchType];
      if (byRank !== 0) return byRank;
      if (a.distanciaDestinoKm != null && b.distanciaDestinoKm != null)
        return a.distanciaDestinoKm - b.distanciaDestinoKm;
      return 0;
    });

    return results;
  },
};
