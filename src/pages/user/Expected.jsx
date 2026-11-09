import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { useLoader } from '../../utils/useLoader';
import { COURIERS, formatDate, sortByDateDesc } from '../../utils/format';
import { makeId, normalizeTracking } from '../../utils/ids';
import Icon from '../../components/Icon';

const EMPTY = { trackingNumber: '', courier: COURIERS[0], description: '' };

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
      await api.create('expected', {
        id: makeId('exp'),
        userId: user.id,
        trackingNumber: tracking,
        courier: form.courier,
        description: form.description.trim(),
        status: 'waiting',
        packageId: null,
        createdAt: new Date().toISOString(),
      });
      setForm(EMPTY);
      setMsg('Nomor resi disimpan. Kamu akan dikabari saat paket tiba di loket.');
      reload(true);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    await api.remove('expected', id);
    reload(true);
  };

  return (
    <div className="page">
      <header className="page-head">
        <h1>Paket ditunggu</h1>
        <p className="lede">
          Nama di label sering disingkat atau salah tulis. Dengan nomor resi, petugas langsung tahu paket itu milikmu.
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
        <label className="field">
          <span>Isi paket (opsional)</span>
          <input value={form.description} onChange={set('description')} placeholder="Buku, sepatu, dokumen…" />
        </label>
        {msg && <p className="alert">{msg}</p>}
        <button className="btn btn-primary" disabled={busy}>
          <Icon name="plus" size={18} /> Simpan nomor resi
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
                  </span>
                </div>
                {x.status === 'arrived' ? (
                  <span className="badge badge-done">Sudah tiba</span>
                ) : (
                  <>
                    <span className="badge badge-wait">Belum tiba</span>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => remove(x.id)}
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
