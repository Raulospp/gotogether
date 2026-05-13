/** Valida que un objeto tenga coordenadas lat/lon numéricas. */
export function validateCoords(obj, label = 'punto') {
  if (!obj?.lat || !obj?.lon)
    return `${label} debe incluir { lat, lon }`;
  if (isNaN(parseFloat(obj.lat)) || isNaN(parseFloat(obj.lon)))
    return `${label}: lat y lon deben ser números`;
  return null;
}

/** Parsea y valida parámetros de paginación desde req.query */
export function parsePagination(query, defaultLimit = 20) {
  const page  = Math.max(1, parseInt(query.page)  || 1);
  const limit = Math.min(100, parseInt(query.limit) || defaultLimit);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
