// Huruf/angka yang mudah dibedakan saat dibacakan di loket (tanpa 0/O, 1/I, 5/S, 8/B, 2/Z).
const CODE_ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY34679';

export function makePickupCode(existing = []) {
  const used = new Set(existing);
  let code;
  do {
    code = Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
  } while (used.has(code));
  return code;
}

export function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export const normalizeTracking = (s = '') => s.replace(/[^a-z0-9]/gi, '').toUpperCase();
export const normalizeCode = (s = '') => s.replace(/[^a-z0-9]/gi, '').toUpperCase();
