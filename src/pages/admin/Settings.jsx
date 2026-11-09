import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { aiEnabled, aiModel } from '../../api/gemini';

export default function Settings() {
  const { settings, refreshSettings } = useAuth();
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  if (!form) return <div className="page"><p className="muted">Memuat pengaturan…</p></div>;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.updateSettings({
        officeName: form.officeName.trim(),
        location: form.location.trim(),
        hours: form.hours.trim(),
        contact: form.contact.trim(),
        reminderDays: Math.max(1, Number(form.reminderDays) || 3),
      });
      await refreshSettings();
      setMsg('Pengaturan disimpan.');
    } catch (err) {
      setMsg(err.message);
    }
  };

  return (
    <div className="page page-narrow">
      <header className="page-head">
        <h1>Pengaturan loket</h1>
        <p className="lede">Informasi ini tampil di aplikasi pengguna dan dipakai Asisten PaketKu untuk menjawab.</p>
      </header>
      <form className="card form" onSubmit={submit}>
        <label className="field">
          <span>Nama loket / unit penerima paket</span>
          <input value={form.officeName} onChange={set('officeName')} required />
        </label>
        <label className="field">
          <span>Lokasi</span>
          <input value={form.location} onChange={set('location')} />
        </label>
        <label className="field">
          <span>Jam layanan</span>
          <textarea rows={2} value={form.hours} onChange={set('hours')} />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Kontak loket</span>
            <input value={form.contact} onChange={set('contact')} />
          </label>
          <label className="field">
            <span>Ingatkan setelah (hari)</span>
            <input type="number" min="1" value={form.reminderDays} onChange={set('reminderDays')} />
          </label>
        </div>
        {msg && <p className="alert">{msg}</p>}
        <button className="btn btn-primary">Simpan pengaturan</button>
      </form>

      <section className="card">
        <h2 className="section-title">Status AI</h2>
        <p>
          {aiEnabled
            ? `Aktif dengan model ${aiModel}. Pembaca label dan Asisten PaketKu memakai Gemini.`
            : 'Belum aktif. Isi VITE_GEMINI_API_KEY di file .env lalu jalankan ulang npm run dev.'}
        </p>
      </section>
    </div>
  );
}
