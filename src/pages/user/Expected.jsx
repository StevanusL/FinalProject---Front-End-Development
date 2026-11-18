import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { useLoader } from '../../utils/useLoader';
import { COURIERS, formatDate, sortByDateDesc } from '../../utils/format';
import { makeId, normalizeTracking } from '../../utils/ids';
import { notifyAdmins } from '../../api/packages';
import Icon from '../../components/Icon';

const EMPTY = { trackingNumber: '', courier: COURIERS[0], description: '', estimatedDate: '', note: '' };

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function Expected() {
  const { user } = useAuth();
  const { data, error, reload } = useLoader(() => api.list('expected', { userId: user.id }), [user.id]);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const list = (data || []).slice().sort(sortByDateDesc('createdAt'));
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const tracking = normalizeTracking(form.trackingNumber);
    if (!tracking) return;
    if (list.some((x) => normalizeTracking(x.trackingNumber) === tracking)) {
      setMsg('Nomor resi ini sudah ada di daftar.');
      return;
    }
    setBusy(true);
    try {
      const exp = await api.create('expected', {
        id: makeId('exp'),
        userId: user.id,
        trackingNumber: tracking,
        courier: form.courier,
        description: form.description.trim(),
        estimatedDate: form.estimatedDate || null,
        note: form.note.trim(),
        status: 'waiting',
        packageId: null,
        createdAt: new Date().toISOString(),
      });

      // Heads-up ke petugas: ada paket yang akan datang untuk pengguna ini
      const parts = [
        `${user.name} (${user.category}${user.unit ? `, ${user.unit}` : ''}) memberi tahu paket ${form.courier} dengan resi ${tracking} akan datang`,
      ];
      if (form.estimatedDate) parts.push(`perkiraan tiba ${formatDate(form.estimatedDate)}`);
      let message = parts.join(', ') + '.';
      if (exp.description) message += ` Isi: ${exp.description}.`;
      if (exp.note) message += ` Pesan: ${exp.note}`;
      await notifyAdmins(message, { fromUserId: user.id, expectedId: exp.id });

      setForm(EMPTY);
      setMsg('Nomor resi disimpan dan petugas loket sudah diberi tahu. Kamu akan dikabari saat paket tiba.');
      reload(true);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (x) => {
    await api.remove('expected', x.id);
    await notifyAdmins(`${user.name} membatalkan kabar paket ${x.courier} dengan resi ${x.trackingNumber}.`, {
      fromUserId: user.id,
    });
    reload(true);
  };

  return (
    <div className="page">
      <header className="page-head">
        <h1>Paket ditunggu</h1>
        <p className="lede">
          Beri tahu petugas loket bahwa paketmu akan datang. Dengan nomor resi, petugas langsung tahu paket itu
          milikmu walaupun nama di label disingkat atau salah tulis.
        </p>
      </header>

      <form className="card form" onSubmit={submit}>
        <div className="field-row">
          <label className="field">
            <span>Nomor resi</span>
            <input
              value={form.trackingNumber}
              onChange={set('trackingNumber')}
              placeholder="Contoh: JP1234567890"
              required
            />
          </label>
          <label className="field">
            <span>Kurir</span>
            <select value={form.courier} onChange={set('courier')}>
              {COURIERS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span>Isi paket (opsional)</span>
            <input value={form.description} onChange={set('description')} placeholder="Buku, sepatu, dokumen…" />
          </label>
          <label className="field">
            <span>Perkiraan tiba (opsional)</span>
            <input type="date" min={todayStr()} value={form.estimatedDate} onChange={set('estimatedDate')} />
          </label>
        </div>
        <label className="field">
          <span>Pesan untuk petugas (opsional)</span>
          <input
            value={form.note}
            onChange={set('note')}
            placeholder="Misal: paket besar, mudah pecah, atau akan diambil teman"
            maxLength={200}
          />
        </label>
        {msg && <p className="alert">{msg}</p>}
        <button className="btn btn-primary" disabled={busy}>
          <Icon name="send" size={18} /> Kabari petugas
        </button>
      </form>

      {error && <p className="alert alert-error">{error}</p>}

      <section className="section">
        <h2 className="section-title">Daftar resi</h2>
        {list.length === 0 ? (
          <p className="muted">Belum ada nomor resi yang didaftarkan.</p>
        ) : (
          <ul className="rows">
            {list.map((x) => (
              <li key={x.id} className="row">
                <div className="row-main">
                  <strong className="mono-ish">{x.trackingNumber}</strong>
                  <span className="muted">
                    {x.courier}
                    {x.description ? `, ${x.description}` : ''}. Didaftarkan {formatDate(x.createdAt)}
                    {x.estimatedDate ? `, perkiraan tiba ${formatDate(x.estimatedDate)}` : ''}
                  </span>
                  {x.note && <span className="row-note">Pesan: {x.note}</span>}
                </div>
                {x.status === 'arrived' ? (
                  <span className="badge badge-done">Sudah tiba</span>
                ) : (
                  <>
                    <span className="badge badge-wait">Belum tiba</span>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => remove(x)}
                      aria-label={`Hapus resi ${x.trackingNumber}`}
                    >
                      <Icon name="trash" size={18} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
