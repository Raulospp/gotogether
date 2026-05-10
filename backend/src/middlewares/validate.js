export function requireFields(body, fields) {
  const missing = fields.filter((f) => !body[f]);
  if (missing.length > 0) {
    return `Campos requeridos: ${missing.join(', ')}`;
  }
  return null;
}

export function requireCoords(obj, label = 'punto') {
  if (!obj?.lat || !obj?.lon) {
    return `${label} debe incluir { lat, lon }`;
  }
  if (isNaN(parseFloat(obj.lat)) || isNaN(parseFloat(obj.lon))) {
    return `${label}: lat y lon deben ser números`;
  }
  return null;
}

export function requireRole(user, role) {
  if (user.role !== role) {
    return `Solo ${role}es pueden realizar esta acción`;
  }
  return null;
}