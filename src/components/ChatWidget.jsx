import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { aiEnabled, askAssistant } from '../api/gemini';
import { daysSince, formatDateTime, isOverdue } from '../utils/format';
import Icon from './Icon';

const SUGGESTIONS = {
  user: ['Apakah ada paket saya yang sudah datang?', 'Jam berapa loket paket buka?', 'Bisakah teman mengambilkan paket saya?'],
  admin: ['Paket mana yang sudah lama tidak diambil?', 'Paket apa saja yang akan datang?', 'Paket mana yang belum ada pemiliknya?'],
};

function slimPackage(p, users, { withCode }) {
  const owner = users?.find((u) => u.id === p.userId);
  return {
    resi: p.trackingNumber,
    kurir: p.courier,
    namaDiLabel: p.recipientName,
    pemilik: owner ? owner.name : p.userId ? 'pengguna' : 'BELUM ADA PEMILIK',
    status: p.status === 'picked_up' ? 'sudah diambil' : 'menunggu diambil',
    rak: p.shelf,
    tiba: formatDateTime(p.receivedAt),
    lamaMenungguHari: p.status === 'waiting' ? daysSince(p.receivedAt) : undefined,
    diambilOleh: p.pickedUpBy || undefined,
    ...(withCode ? { kodePengambilan: p.status === 'waiting' ? p.pickupCode : undefined } : {}),
  };
}

async function buildContext(role, user, settings) {
  const office = settings
    ? { loket: settings.officeName, lokasi: settings.location, jamLayanan: settings.hours, kontak: settings.contact }
    : {};
  if (role === 'admin') {
    const [packages, users, expected] = await Promise.all([
      api.list('packages'),
      api.list('users'),
      api.list('expected', { status: 'waiting' }),
    ]);
    const waiting = packages.filter((p) => p.status === 'waiting');
    const today = new Date().toDateString();
    return {
      kantor: office,
      batasHariPengingat: settings?.reminderDays ?? 3,
      ringkasan: {
        totalMenunggu: waiting.length,
        tanpaPemilik: waiting.filter((p) => !p.userId).length,
        lewatBatas: waiting.filter((p) => isOverdue(p, settings?.reminderDays)).length,
        masukHariIni: packages.filter((p) => new Date(p.receivedAt).toDateString() === today).length,
      },
      paket: packages
        .slice()
        .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt))
        .slice(0, 60)
        .map((p) => slimPackage(p, users, { withCode: false })),
      paketAkanDatang: expected.map((e) => ({
        pengguna: users.find((u) => u.id === e.userId)?.name,
        resi: e.trackingNumber,
        kurir: e.courier,
        isi: e.description,
        perkiraanTiba: e.estimatedDate || 'tidak disebutkan',
        pesan: e.note || undefined,
      })),
    };
  }
  const [packages, expected] = await Promise.all([
    api.list('packages', { userId: user.id }),
    api.list('expected', { userId: user.id }),
  ]);
  return {
    kantor: office,
    pengguna: { nama: user.name, kategori: user.category, unit: user.unit },
    aturan: [
      'Paket diambil di loket dengan menunjukkan kode pengambilan.',
      'Boleh diwakilkan: berikan kode pengambilan kepada orang yang dititipi; petugas mencatat nama pengambil.',
      'Daftarkan nomor resi di menu "Paket ditunggu" agar paket langsung dikenali saat tiba.',
    ],
    paketSaya: packages.map((p) => slimPackage(p, null, { withCode: true })),
    paketDitunggu: expected.map((e) => ({
      resi: e.trackingNumber,
      kurir: e.courier,
      isi: e.description,
      status: e.status === 'arrived' ? 'sudah tiba' : 'belum tiba',
    })),
  };
}

// Jawaban sederhana tanpa AI (saat API key belum diatur atau Gemini gagal)
function offlineAnswer(role, ctx) {
  const k = ctx.kantor || {};
  if (role === 'admin') {
    const r = ctx.ringkasan;
    const late = ctx.paket.filter((p) => p.lamaMenungguHari >= ctx.batasHariPengingat);
    return [
      `Saat ini ada ${r.totalMenunggu} paket menunggu diambil, ${r.tanpaPemilik} belum ada pemilik, dan ${r.masukHariIni} paket masuk hari ini.`,
      late.length
        ? `Lewat ${ctx.batasHariPengingat} hari: ${late.map((p) => `${p.namaDiLabel} (rak ${p.rak})`).join(', ')}.`
        : 'Tidak ada paket yang lewat batas waktu.',
      ctx.paketAkanDatang.length
        ? `Akan datang: ${ctx.paketAkanDatang.map((e) => `${e.pengguna} (${e.kurir})`).join(', ')}.`
        : 'Belum ada kabar paket yang akan datang.',
    ].join('\n');
  }
  const waiting = ctx.paketSaya.filter((p) => p.status === 'menunggu diambil');
  const lines = waiting.length
    ? [`Ada ${waiting.length} paket menunggu Anda:`, ...waiting.map((p) => `• ${p.kurir} ${p.resi}, rak ${p.rak}, kode ${p.kodePengambilan}`)]
    : ['Belum ada paket Anda yang menunggu di loket.'];
  lines.push(`Ambil di ${k.loket || 'loket paket'} (${k.lokasi || '-'}). Jam layanan: ${k.jamLayanan || '-'}`);
  return lines.join('\n');
}

// Sapaan pertama untuk user: langsung memberi tahu paket yang sudah tiba, tanpa perlu bertanya.
async function buildGreeting(user, settings) {
  const packages = await api.list('packages', { userId: user.id });
  const waiting = packages.filter((p) => p.status === 'waiting');
  const firstName = user.name.split(' ')[0];
  const where = settings?.officeName || 'loket paket';
  if (!waiting.length) {
    return `Halo ${firstName}, belum ada paketmu yang tiba di ${where}. Aku akan kabari lewat notifikasi begitu paketmu datang.`;
  }
  return [
    `Halo ${firstName}, ada ${waiting.length} paketmu yang sudah tiba di ${where}:`,
    ...waiting.map((p) => `• ${p.courier} ${p.trackingNumber}, tiba ${formatDateTime(p.receivedAt)}. Kode: ${p.pickupCode}`),
    settings?.hours ? `Jam layanan: ${settings.hours}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export default function ChatWidget({ role, hasNews = false }) {
  const { user, settings } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, busy]);

  useEffect(() => {
    if (!open || role !== 'user' || messages.length) return;
    buildGreeting(user, settings)
      .then((text) => setMessages((m) => (m.length ? m : [{ role: 'model', text, greeting: true }])))
      .catch(() => {});
  }, [open, role, user, settings, messages.length]);

  const send = async (text) => {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...messages, { role: 'user', text: q }];
    setMessages(next);
    setInput('');
    setBusy(true);
    let ctx;
    try {
      ctx = await buildContext(role, user, settings);
      if (!aiEnabled) throw new Error('offline');
      const reply = await askAssistant({ history: next.filter((m) => !m.note && !m.greeting), context: ctx, role });
      setMessages((m) => [...m, { role: 'model', text: reply }]);
    } catch (e) {
      const fallback = ctx ? offlineAnswer(role, ctx) : e.message;
      const note = !aiEnabled ? 'Mode tanpa AI: API key Gemini belum diatur.' : `AI tidak tersedia: ${e.message}`;
      setMessages((m) => [...m, { role: 'model', text: fallback, note }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`chat-fab ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'Tutup asisten' : 'Buka Asisten PaketKu'}
      >
        <Icon name={open ? 'close' : 'chat'} size={22} />
        {!open && <span>Tanya</span>}
        {!open && hasNews && <span className="fab-dot" aria-label="Ada paket baru" />}
      </button>

      {open && (
        <section className="chat-panel" aria-label="Asisten PaketKu">
          <header className="chat-head">
            <div>
              <strong>Asisten PaketKu</strong>
              <span>{aiEnabled ? 'Dibantu Gemini, menjawab dari data paket' : 'Mode tanpa AI'}</span>
            </div>
            <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Tutup">
              <Icon name="close" />
            </button>
          </header>

          <div className="chat-list" ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} className={`bubble bubble-${m.role}`}>
                {m.text}
                {m.note && <small className="bubble-note">{m.note}</small>}
              </div>
            ))}
            {messages.every((m) => m.greeting) && (
              <div className="chat-empty">
                <p>
                  {role === 'admin'
                    ? 'Tanyakan kondisi loket, misalnya paket yang perlu diingatkan.'
                    : 'Atau tanyakan hal lain tentang paketmu.'}
                </p>
                <div className="chips">
                  {SUGGESTIONS[role].map((s) => (
                    <button key={s} type="button" className="chip" onClick={() => send(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {busy && <div className="bubble bubble-model bubble-typing">Sedang mencari di data paket…</div>}
          </div>

          <form
            className="chat-form"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tulis pertanyaan…"
              aria-label="Pertanyaan"
            />
            <button type="submit" className="btn btn-primary btn-icon" disabled={busy || !input.trim()} aria-label="Kirim">
              <Icon name="send" size={18} />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
