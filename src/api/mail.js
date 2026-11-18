// Memanggil server email lokal (server/mail-server.js).
// Kredensial Gmail hanya ada di server; browser cukup menyebut paket mana yang perlu diemailkan.
import { api } from './client';

const MAIL_URL = (import.meta.env.VITE_MAIL_URL || 'http://localhost:3002').replace(/\/$/, '');

async function call(path, options) {
  try {
    const res = await fetch(`${MAIL_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) return { ok: false, error: data.error || `Server email menjawab ${res.status}.` };
    return { ok: true, ...data };
  } catch {
    return { ok: false, error: 'Server email tidak berjalan. Jalankan npm run dev (atau npm run mail).' };
  }
}

export const getMailStatus = () => call('/api/email/status');
export const sendTestEmail = () => call('/api/email/test', { method: 'POST' });

/**
 * Mengirim email "paket sudah tiba" ke pemilik paket. Tidak pernah melempar error:
 * hasilnya { ok, to } atau { ok: false, error }, supaya penerimaan paket tetap tersimpan walau email gagal.
 */
export async function sendArrivalEmail(packageId) {
  const result = await call('/api/email/arrival', { method: 'POST', body: JSON.stringify({ packageId }) });
  if (result.ok) {
    try {
      await api.update('packages', packageId, { emailedAt: new Date().toISOString(), emailedTo: result.to });
    } catch {
      /* catatan waktu email tidak penting untuk dilanjutkan */
    }
  }
  return result;
}
