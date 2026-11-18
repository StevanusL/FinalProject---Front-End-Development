import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { useLoader } from '../../utils/useLoader';
import { formatDateTime, maskName, maskTracking, sortByDateDesc, timeAgo } from '../../utils/format';
import Icon from '../../components/Icon';

/**
 * Daftar semua paket yang sedang menunggu di loket, bisa dilihat semua pengguna yang login.
 * Nama disamarkan dan kode pengambilan tidak ditampilkan.
 */
export default function ArrivedBoard() {
  const { user, settings } = useAuth();
  const [q, setQ] = useState('');
  const { data, error, loading } = useLoader(() => api.list('packages', { status: 'waiting' }), []);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data || [])
      .filter((p) => p.status === 'waiting')
      .map((p) => ({
        id: p.id,
        mine: p.userId === user.id,
        orphan: !p.userId,
        name: maskName(p.recipientName),
        courier: p.courier || 'Kurir tidak diketahui',
        resi: maskTracking(p.trackingNumber),
        last4: (p.trackingNumber || '').slice(-4).toLowerCase(),
        receivedAt: p.receivedAt,
      }))
      .filter(
        (r) =>
          !term ||
          r.courier.toLowerCase().includes(term) ||
          r.name.toLowerCase().includes(term) ||
          (term.length >= 3 && r.last4.endsWith(term)),
      )
      .sort(sortByDateDesc('receivedAt'));
  }, [data, q, user.id]);

  const total = (data || []).filter((p) => p.status === 'waiting').length;

  return (
    <div className="page">
      <header className="page-head">
        <h1>Paket di loket</h1>
        <p className="lede">
          {loading
            ? 'Memuat…'
            : `${total} paket sedang menunggu diambil di ${settings?.officeName || 'loket paket'}. Nama disamarkan untuk menjaga privasi.`}
        </p>
      </header>

      <label className="search search-wide">
        <Icon name="search" size={18} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari kurir atau 4 digit akhir resi"
          aria-label="Cari paket di loket"
        />
      </label>

      {error && <p className="alert alert-error">{error}</p>}

      {!loading && rows.length === 0 ? (
        <p className="muted">{q ? 'Tidak ada paket yang cocok dengan pencarian.' : 'Loket sedang kosong.'}</p>
      ) : (
        <ul className="rows board">
          {rows.map((r) => (
            <li key={r.id} className={`row ${r.mine ? 'is-mine' : ''}`}>
              <div className="row-main">
                <strong>{r.name}</strong>
                <span className="muted">
                  {r.courier}, resi {r.resi}
                </span>
              </div>
              <div className="board-side">
                {r.mine && <span className="badge badge-done">Milikmu</span>}
                {r.orphan && <span className="badge badge-orphan">Belum ada pemilik</span>}
                <time className="muted" dateTime={r.receivedAt} title={formatDateTime(r.receivedAt)}>
                  {timeAgo(r.receivedAt)}
                </time>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="hint">
        Paketmu ada di daftar dengan label “Belum ada pemilik”? Nama di labelnya tidak cocok dengan akunmu. Datang ke
        loket dengan bukti nomor resi{settings?.contact ? ` atau hubungi ${settings.contact}` : ''}. Paket berlabel
        “Milikmu” bisa langsung diambil dengan kode di halaman Paket saya.
      </p>
    </div>
  );
}
