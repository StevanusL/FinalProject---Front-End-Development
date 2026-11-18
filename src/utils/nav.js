// Tujuan setelah masuk/daftar, dibawa lewat parameter ?next= (misal /masuk?next=/ditunggu).
// Hanya alamat di dalam aplikasi yang diterima, supaya tidak bisa diarahkan ke situs lain.
export function getNext(search = '') {
  const next = new URLSearchParams(search).get('next');
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

export const withNext = (path, next) => (next ? `${path}?next=${encodeURIComponent(next)}` : path);
