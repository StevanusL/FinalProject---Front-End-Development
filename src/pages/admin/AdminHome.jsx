import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { sendReminder } from '../../api/packages';
import { useLoader } from '../../utils/useLoader';
import { daysSince, formatDateTime, isOverdue, timeAgo } from '../../utils/format';
import { normalizeCode } from '../../utils/ids';
import Handover from '../../components/Handover';
import Icon from '../../components/Icon';

export default function AdminHome() {
  const { settings } = useAuth();
  const reminderDays = settings?.reminderDays ?? 3;
  const { data, error, reload } = useLoader(async () => {
    const [packages, users] = await Promise.all([api.list('packages'), api.list('users')]);
    return { packages, users };
  }, []);
  const packages = useMemo(() => data?.packages || [], [data]);
  const users = useMemo(() => data?.users || [], [data]);

  const [code, setCode] = useState('');
  const [found, setFound] = useState(null);
  const [lookupMsg, setLookupMsg] = useState('');
  const [doneMsg, setDoneMsg] = useState('');

  const waiting = packages.filter((p) => p.status === 'waiting');
  const overdue = waiting.filter((p) => p.userId && isOverdue(p, reminderDays));
  const orphan = waiting.filter((p) => !p.userId);
  const today = new Date().toDateString();
  const todayIn = packages.filter((p) => new Date(p.receivedAt).toDateString() === today).length;
  const todayOut = packages.filter((p) => p.pickedUpAt && new Date(p.pickedUpAt).toDateString() === today).length;
  const userById = (id) => users.find((u) => u.id === id);

  const lookup = (e) => {
    e.preventDefault();
    setDoneMsg('');
    const c = normalizeCode(code);
    const pkg = packages.find((p) => p.pickupCode === c);
    if (!pkg) {
      setFound(null);
      setLookupMsg(`Kode ${c} tidak ditemukan. Periksa lagi huruf dan angkanya.`);
    } else if (pkg.status === 'picked_up') {
      setFound(null);
      setLookupMsg(`Paket dengan kode ${c} sudah diambil oleh ${pkg.pickedUpBy} pada ${formatDateTime(pkg.pickedUpAt)}.`);
    } else if (!pkg.userId) {
      setFound(null);
      setLookupMsg(`Paket dengan kode ${c} belum punya pemilik. Tetapkan pemiliknya dulu di daftar paket.`);
    } else {
      setFound(pkg);
      setLookupMsg('');
    }
  };

  const remind = async (p) => {
    await sendReminder(p, settings, daysSince(p.receivedAt));
    reload(true);
  };

  return (
    <div className="page">
      <section className="counter">
        <div className="counter-head">
          <div>
            <h1>Serah terima paket</h1>
            <p className="lede">Minta pengambil menunjukkan kode 6 karakter dari aplikasinya.</p>
          </div>
          <Link to="/admin/terima" className="btn btn-secondary">
            <Icon name="scan" size={18} /> Terima paket baru
          </Link>
        </div>
        <form className="code-form" onSubmit={lookup}>
          <label className="sr-only" htmlFor="pickup-code">
            Kode pengambilan
          </label>
          <input
            id="pickup-code"
            className="code-input code-text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
            placeholder="K7RD3M"
            autoComplete="off"
            spellCheck="false"
          />
          <button className="btn btn-primary btn-lg" disabled={normalizeCode(code).length < 6}>
            Cari paket
          </button>
        </form>
        {lookupMsg && <p className="alert alert-error">{lookupMsg}</p>}
        {doneMsg && (
          <p className="alert alert-ok">
            <Icon name="check" size={18} /> {doneMsg}
          </p>
        )}
        {found && (
          <Handover
            pkg={found}
            owner={userById(found.userId)}
            onCancel={() => setFound(null)}
            onDone={(u) => {
              setFound(null);
              setCode('');
              setDoneMsg(`Paket ${u.trackingNumber} diserahkan kepada ${u.pickedUpBy}.`);
              reload(true);
            }}
          />
        )}
      </section>

      {error && <p className="alert alert-error">{error}</p>}

      <dl className="tally" aria-label="Ringkasan hari ini">
        <div>
          <dt>Di rak sekarang</dt>
          <dd>{waiting.length}</dd>
        </div>
        <div>
          <dt>Masuk hari ini</dt>
          <dd>{todayIn}</dd>
        </div>
        <div>
          <dt>Diambil hari ini</dt>
          <dd>{todayOut}</dd>
        </div>
        <div className={overdue.length ? 'is-alert' : ''}>
          <dt>Lewat {reminderDays} hari</dt>
          <dd>{overdue.length}</dd>
        </div>
      </dl>

      <div className="split">
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">Perlu diingatkan</h2>
            <span className="muted">Menunggu {reminderDays} hari atau lebih</span>
          </div>
          {overdue.length === 0 ? (
            <p className="muted">Tidak ada paket yang lama tertahan.</p>
          ) : (
            <ul className="rows">
              {overdue.map((p) => (
                <li key={p.id} className="row">
                  <Link to={`/admin/paket/${p.id}`} className="row-main">
                    <strong>{userById(p.userId)?.name || p.recipientName}</strong>
                    <span className="muted">
                      Rak {p.shelf || '-'}, {daysSince(p.receivedAt)} hari.{' '}
                      {p.remindedAt ? `Diingatkan ${timeAgo(p.remindedAt)}.` : 'Belum diingatkan.'}
                    </span>
                  </Link>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => remind(p)}>
                    Kirim pengingat
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="section">
          <div className="section-head">
            <h2 className="section-title">Belum ada pemilik</h2>
            <span className="muted">Nama di label tidak cocok</span>
          </div>
          {orphan.length === 0 ? (
            <p className="muted">Semua paket sudah punya pemilik.</p>
          ) : (
            <ul className="rows">
              {orphan.map((p) => (
                <li key={p.id} className="row">
                  <Link to={`/admin/paket/${p.id}`} className="row-main">
                    <strong>“{p.recipientName || 'tanpa nama'}”</strong>
                    <span className="muted">
                      {p.courier}, rak {p.shelf || '-'}, tiba {timeAgo(p.receivedAt)}
                    </span>
                  </Link>
                  <Link className="btn btn-secondary btn-sm" to={`/admin/paket/${p.id}`}>
                    Tetapkan
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

    </div>
  );
}
