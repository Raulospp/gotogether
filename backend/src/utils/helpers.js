// Puedes agregar funciones auxiliares como validaciones, formateo, etc.
// Por ahora lo dejamos vacío o con alguna utilidad básica.

function normalizeAddress(address) {
  return address.replace(/#\s*/g, '').replace(/\s{2,}/g, ' ').trim();
}

module.exports = { normalizeAddress };