export function requireCoords(obj, label = 'punto') {
  if (!obj?.lat || !obj?.lon)
    return `${label} debe incluir { lat, lon }`;
  if (isNaN(parseFloat(obj.lat)) || isNaN(parseFloat(obj.lon)))
    return `${label}: lat y lon deben ser números`;
  return null;
}
