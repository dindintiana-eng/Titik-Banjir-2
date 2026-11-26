export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
export const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

export async function apiRequest(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) {
    const body = contentType.includes('application/json')
      ? await response.json()
      : { error: `Permintaan gagal (${response.status}).` };
    throw new Error(body.error || 'Permintaan gagal.');
  }
  return contentType.includes('application/json') ? response.json() : response;
}

export function imageUrl(path) {
  return path ? `${API_ORIGIN}${path}` : '';
}
