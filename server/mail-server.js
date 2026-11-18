// Server kecil untuk mengirim email lewat Gmail (SMTP + App Password).
// Browser tidak bisa mengirim email langsung, dan kredensial Gmail tidak boleh ada di frontend,
// jadi pengiriman dilakukan di sini (Node.js). Dijalankan oleh `npm run dev` atau `npm run mail`.
//
// Server ini hanya mengirim email tentang paket yang ada di db.json ke email pemiliknya,
// sehingga tidak bisa dipakai untuk mengirim email sembarangan.

import http from 'node:http';
import fs from 'node:fs';
import nodemailer from 'nodemailer';

const ROOT = new URL('../', import.meta.url);
const DB_FILE = new URL('db.json', ROOT);

// ---------- Baca .env (tanpa paket tambahan) ----------
function loadEnv() {
  const file = new URL('.env', ROOT);
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}
loadEnv();

const PORT = Number(process.env.MAIL_SERVER_PORT || 3002);
const GMAIL_USER = (process.env.GMAIL_USER || '').trim();
const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, ''); // App Password sering ditulis dengan spasi
const FROM_NAME = process.env.MAIL_FROM_NAME || 'PaketKu UNKLAB';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const configured = Boolean(GMAIL_USER && GMAIL_APP_PASSWORD);

const transporter = configured
  ? nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD } })
  : null;

// ---------- Utilitas ----------
const readDb = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const maskEmail = (e) => e.replace(/^(.{2}).*(@.*)$/, '$1***$2');

function friendlyError(err) {
  if (err?.code === 'EAUTH' || err?.responseCode === 535) {
    return 'Login Gmail gagal. Pastikan GMAIL_USER benar dan GMAIL_APP_PASSWORD berisi App Password (16 huruf), bukan kata sandi Gmail biasa.';
  }
  if (err?.code === 'EENVELOPE' || err?.responseCode === 550 || err?.responseCode === 553) {
    return 'Alamat email penerima ditolak. Periksa email pengguna di menu Pengguna.';
  }
  if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EDNS'].includes(err?.code)) {
    return 'Tidak bisa terhubung ke server Gmail. Periksa koneksi internet.';
  }
  return err?.message || 'Email gagal dikirim.';
}

const fmtDate = (iso) =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Makassar' }).format(new Date(iso));

// ---------- Template email ----------
function arrivalEmail(pkg, user, settings) {
  const firstName = user.name.split(' ')[0];
  const office = settings?.officeName || 'loket paket UNKLAB';
  const subject = `Paket ${pkg.courier || 'kamu'} sudah tiba di ${office} (kode ${pkg.pickupCode})`;

  const row = (label, value) =>
    value
      ? `<tr><td style="padding:6px 0;color:#5a6573;width:130px;vertical-align:top">${esc(label)}</td>
         <td style="padding:6px 0;font-weight:600;color:#16202c">${esc(value)}</td></tr>`
      : '';

  const html = `<!doctype html>
<html lang="id"><body style="margin:0;background:#e8ecf0;font-family:Arial,Helvetica,sans-serif;color:#16202c">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <p style="margin:0 0 16px;font-weight:800;font-size:18px">PaketKu UNKLAB</p>
    <div style="background:#ffffff;border-radius:8px;overflow:hidden;border-left:14px solid #c08a4e">
      <div style="padding:24px">
        <p style="margin:0 0 8px;font-size:20px;font-weight:800">Halo ${esc(firstName)}, paketmu sudah tiba.</p>
        <p style="margin:0 0 20px;color:#5a6573">Paket berikut diterima petugas dan siap kamu ambil di ${esc(office)}.</p>
        <table style="border-collapse:collapse;width:100%;font-size:14px">
          ${row('Kurir', pkg.courier)}
          ${row('Nomor resi', pkg.trackingNumber)}
          ${row('Pengirim', pkg.senderName)}
          ${row('Isi paket', pkg.itemDescription)}
          ${row('Tiba', fmtDate(pkg.receivedAt))}
        </table>
      </div>
      <div style="background:#f3e6d4;border-top:2px dashed #b7c1cb;padding:18px 24px">
        <p style="margin:0;font-size:13px;color:#85561f;font-weight:600">Kode pengambilan</p>
        <p style="margin:4px 0 0;font-size:34px;font-weight:800;letter-spacing:6px">${esc(pkg.pickupCode)}</p>
      </div>
    </div>
    <div style="padding:18px 4px;font-size:14px;line-height:1.6">
      <p style="margin:0 0 10px"><strong>Tempat ambil:</strong> ${esc(office)}${settings?.location ? `, ${esc(settings.location)}` : ''}</p>
      ${settings?.hours ? `<p style="margin:0 0 10px"><strong>Jam layanan:</strong> ${esc(settings.hours)}</p>` : ''}
      <p style="margin:0 0 10px">Tunjukkan kode di atas kepada petugas. Jika paket akan diambilkan teman, berikan kode ini kepadanya.</p>
      ${settings?.contact ? `<p style="margin:0 0 10px">Ada pertanyaan? Hubungi ${esc(settings.contact)}.</p>` : ''}
      <p style="margin:16px 0 0"><a href="${esc(APP_URL)}" style="color:#1d4e9e;font-weight:700">Buka PaketKu</a></p>
    </div>
    <p style="font-size:12px;color:#5a6573;padding:0 4px">Email ini dikirim otomatis oleh sistem PaketKu UNKLAB. Jangan membalas email ini.</p>
  </div>
</body></html>`;

  const text = [
    `Halo ${firstName}, paketmu sudah tiba di ${office}.`,
    '',
    `Kurir: ${pkg.courier || '-'}`,
    `Nomor resi: ${pkg.trackingNumber || '-'}`,
    pkg.senderName ? `Pengirim: ${pkg.senderName}` : null,
    `Tiba: ${fmtDate(pkg.receivedAt)}`,
    '',
    `KODE PENGAMBILAN: ${pkg.pickupCode}`,
    '',
    `Tempat ambil: ${office}${settings?.location ? `, ${settings.location}` : ''}`,
    settings?.hours ? `Jam layanan: ${settings.hours}` : null,
    'Tunjukkan kode ini kepada petugas.',
  ]
    .filter((l) => l !== null)
    .join('\n');

  return { subject, html, text };
}

// ---------- Handler ----------
async function sendArrival(packageId) {
  const db = readDb();
  const pkg = db.packages.find((p) => String(p.id) === String(packageId));
  if (!pkg) return [404, { ok: false, error: 'Paket tidak ditemukan.' }];
  if (pkg.status !== 'waiting') return [400, { ok: false, error: 'Paket ini sudah diambil.' }];
  const user = db.users.find((u) => u.id === pkg.userId);
  if (!user) return [400, { ok: false, error: 'Paket belum punya pemilik.' }];
  if (!user.email) return [400, { ok: false, error: `${user.name} belum punya alamat email.` }];

  const { subject, html, text } = arrivalEmail(pkg, user, db.settings);
  await transporter.sendMail({ from: `"${FROM_NAME}" <${GMAIL_USER}>`, to: user.email, subject, html, text });
  return [200, { ok: true, to: user.email }];
}

async function sendTest() {
  // Email uji selalu dikirim ke akun Gmail pengirim sendiri
  const settings = readDb().settings;
  await transporter.sendMail({
    from: `"${FROM_NAME}" <${GMAIL_USER}>`,
    to: GMAIL_USER,
    subject: 'Email uji PaketKu UNKLAB',
    text: `Pengaturan Gmail untuk ${settings?.officeName || 'PaketKu'} sudah benar. Email pemberitahuan paket siap dikirim.`,
  });
  return [200, { ok: true, to: GMAIL_USER }];
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (c) => {
      body += c;
      if (body.length > 10_000) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.end();

  const send = (code, data) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };
  const { pathname } = new URL(req.url, 'http://localhost');

  try {
    if (req.method === 'GET' && pathname === '/api/email/status') {
      return send(200, { configured, from: configured ? maskEmail(GMAIL_USER) : null });
    }
    if (req.method === 'POST' && pathname.startsWith('/api/email/')) {
      if (!configured) {
        return send(503, { ok: false, error: 'Email belum diatur. Isi GMAIL_USER dan GMAIL_APP_PASSWORD di file .env.' });
      }
      if (pathname === '/api/email/arrival') {
        const { packageId } = await readBody(req);
        return send(...(await sendArrival(packageId)));
      }
      if (pathname === '/api/email/test') return send(...(await sendTest()));
    }
    send(404, { ok: false, error: 'Tidak ditemukan.' });
  } catch (err) {
    console.error('[mail]', err);
    send(500, { ok: false, error: friendlyError(err) });
  }
});

server.listen(PORT, () => {
  console.log(
    configured
      ? `[mail] Siap mengirim email dari ${maskEmail(GMAIL_USER)} di http://localhost:${PORT}`
      : `[mail] Berjalan di http://localhost:${PORT}, tetapi email BELUM diatur (isi GMAIL_USER dan GMAIL_APP_PASSWORD di .env)`,
  );
  if (transporter) {
    transporter.verify().then(
      () => console.log('[mail] Login Gmail berhasil.'),
      (err) => console.error('[mail] ' + friendlyError(err)),
    );
  }
});
