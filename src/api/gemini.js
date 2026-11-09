// Integrasi Google Gemini lewat REST API (tanpa SDK tambahan).
// Catatan: API key di frontend bisa dilihat siapa pun yang membuka DevTools.
// Untuk tugas kuliah ini cukup, tetapi untuk produksi panggil Gemini lewat backend.

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-3.5-flash-lite';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export const aiEnabled = Boolean(API_KEY);
export const aiModel = MODEL;

async function generate({ system, contents, json = false, temperature = 0.2 }) {
  if (!aiEnabled) throw new Error('API key Gemini belum diatur di file .env (VITE_GEMINI_API_KEY).');

  const body = {
    contents,
    generationConfig: {
      temperature,
      ...(json ? { responseMimeType: 'application/json' } : {}),
    },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };

  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Tidak bisa terhubung ke Gemini. Periksa koneksi internet.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `status ${res.status}`;
    if (res.status === 429) throw new Error('Kuota Gemini gratis sedang habis. Coba lagi sebentar lagi.');
    throw new Error(`Gemini menolak permintaan: ${msg}`);
  }

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts
    .filter((p) => !p.thought && typeof p.text === 'string')
    .map((p) => p.text)
    .join('')
    .trim();
  if (!text) throw new Error('Gemini tidak memberikan jawaban.');
  return text;
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Hasil AI tidak bisa dibaca. Coba foto ulang dengan lebih jelas.');
  }
}

const LABEL_PROMPT = `Kamu adalah asisten loket paket di Universitas Klabat (UNKLAB), Indonesia.
Baca foto label pengiriman/resi paket ini dan ambil data PENERIMA (bukan pengirim).
Balas HANYA dengan JSON dengan kunci berikut (string kosong jika tidak terbaca):
{
  "recipientName": "nama penerima persis seperti di label",
  "recipientPhone": "nomor HP penerima, hanya angka, boleh tersamar",
  "trackingNumber": "nomor resi / AWB tanpa spasi",
  "courier": "nama ekspedisi, misal J&T Express, JNE, SiCepat, SPX Express, Anteraja, Lion Parcel, Pos Indonesia, Ninja Xpress",
  "senderName": "nama pengirim atau toko",
  "itemDescription": "isi paket jika tertulis, singkat",
  "addressHint": "potongan alamat penerima yang membantu (misal nama asrama, fakultas, kamar)",
  "confidence": "tinggi | sedang | rendah"
}`;

/**
 * Membaca foto label paket.
 * @param {string} base64 data gambar tanpa prefiks data:
 * @param {string} mimeType misal image/jpeg
 */
export async function extractLabel(base64, mimeType = 'image/jpeg') {
  const text = await generate({
    json: true,
    temperature: 0,
    contents: [
      {
        role: 'user',
        parts: [{ text: LABEL_PROMPT }, { inline_data: { mime_type: mimeType, data: base64 } }],
      },
    ],
  });
  const raw = parseJson(text);
  const clean = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v));
  return {
    recipientName: clean(raw.recipientName),
    recipientPhone: clean(raw.recipientPhone).replace(/[^\dx*+]/gi, ''),
    trackingNumber: clean(raw.trackingNumber).replace(/\s+/g, '').toUpperCase(),
    courier: clean(raw.courier),
    senderName: clean(raw.senderName),
    itemDescription: clean(raw.itemDescription),
    addressHint: clean(raw.addressHint),
    confidence: clean(raw.confidence) || 'sedang',
  };
}

/**
 * Chatbot PaketKu. history: [{ role: 'user' | 'model', text }]
 */
export async function askAssistant({ history, context, role }) {
  const system = `Kamu adalah "Asisten PaketKu", chatbot sistem penerimaan paket kurir Universitas Klabat (UNKLAB).
Paket kurir untuk mahasiswa, dosen, dan staf diterima oleh loket/unit kampus, bukan langsung oleh pemesan.
Jawab dalam bahasa Indonesia yang ramah, singkat (maksimal 5 kalimat atau daftar pendek), dan HANYA berdasarkan DATA di bawah.
Jika data tidak ada, katakan terus terang dan sarankan menghubungi loket.
${role === 'admin'
    ? 'Lawan bicaramu adalah PETUGAS loket. Bantu ringkas data, cari paket, dan sarankan tindakan (misal kirim pengingat untuk paket yang lama tidak diambil).'
    : 'Lawan bicaramu adalah PEMILIK paket. Jangan pernah membahas paket milik orang lain. Ingatkan untuk membawa kode pengambilan.'}
Tanggal hari ini: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}.

DATA:
${JSON.stringify(context, null, 1)}`;

  const contents = history.map((m) => ({ role: m.role, parts: [{ text: m.text }] }));
  return generate({ system, contents, temperature: 0.3 });
}
