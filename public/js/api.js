/**
 * api.js — Utilidades de API con CSRF token para Quiniela B&B
 */

let _csrfToken = null;

/**
 * Obtiene el CSRF token de la sesión actual.
 * Hace caché para no repetir la llamada.
 */
async function getCsrfToken() {
  if (_csrfToken) return _csrfToken;
  try {
    const r = await fetch('/api/csrf-token');
    const d = await r.json();
    _csrfToken = d.csrfToken;
  } catch (e) {
    _csrfToken = null;
  }
  return _csrfToken;
}

/**
 * Wrapper de fetch que incluye el CSRF token en cabeceras
 * para peticiones POST/PUT/DELETE.
 */
async function apiFetch(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = await getCsrfToken();
    options.headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { 'X-CSRF-Token': token } : {}),
    };
  } else {
    options.headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  }

  return fetch(url, options);
}
