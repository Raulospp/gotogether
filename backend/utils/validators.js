// Valida formato de email
export function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Valida que la contraseña tenga al menos 6 caracteres
export function isValidPassword(password) {
  return typeof password === "string" && password.length >= 6;
}

// Sanitiza strings: elimina espacios al inicio y al final
export function sanitize(value) {
  return typeof value === "string" ? value.trim() : value;
}
