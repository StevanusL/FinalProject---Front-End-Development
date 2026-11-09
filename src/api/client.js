// Pembungkus kecil untuk REST API json-server.
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new Error('Server data tidak bisa dihubungi. Pastikan json-server berjalan (npm run server).');
  }
  if (!res.ok) {
    throw new Error(`Permintaan ke server gagal (${res.status}).`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function toQuery(params = {}) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (!entries.length) return '';
  return '?' + new URLSearchParams(entries).toString();
}

export const api = {
  list: (collection, params) => request(`/${collection}${toQuery(params)}`),
  get: (collection, id) => request(`/${collection}/${encodeURIComponent(id)}`),
  create: (collection, data) => request(`/${collection}`, { method: 'POST', body: JSON.stringify(data) }),
  update: (collection, id, data) =>
    request(`/${collection}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (collection, id) => request(`/${collection}/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Resource tunggal (objek, bukan array)
  getSettings: () => request('/settings'),
  updateSettings: (data) => request('/settings', { method: 'PATCH', body: JSON.stringify(data) }),
};
