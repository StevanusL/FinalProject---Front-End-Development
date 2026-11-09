import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { useLoader } from '../../utils/useLoader';
import { formatDateTime, isOverdue, sortByDateDesc } from '../../utils/format';
import { StatusBadge } from '../../components/PackageLabel';
import Icon from '../../components/Icon';

const TABS = [
  { key: 'waiting', label: 'Di rak' },
  { key: 'late', label: 'Lewat batas' },
  { key: 'orphan', label: 'Tanpa pemilik' },
  { key: 'picked_up', label: 'Sudah diambil' },
  { key: 'all', label: 'Semua' },
];

export default function PackageList() {
  const { settings } = useAuth();
  const reminderDays = settings?.reminderDays ?? 3;
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'waiting';
  const [q, setQ] = useState('');
  const { data, error, loading } = useLoader(async () => {
    const [packages, users] = await Promise.all([api.list('packages'), api.list('users')]);
    return { packages, users };
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    const nameOf = (id) => data.users.find((u) => u.id === id)?.name || '';
    const term = q.trim().toLowerCase();
    return data.packages
      .filter((p) => {
        if (tab === 'waiting') return p.status === 'waiting';
        if (tab === 'late') return isOverdue(p, reminderDays);
        if (tab === 'orphan') return p.status === 'waiting' && !p.userId;
        if (tab === 'picked_up') return p.status === 'picked_up';
        return true;
      })
      .map((p) => ({ ...p, ownerName: nameOf(p.userId) }))
      .filter(
        (p) =>
          !term ||
          [p.trackingNumber, p.recipientName, p.ownerName, p.pickupCode, p.courier, p.shelf]
            .join(' ')
            .toLowerCase()
            .includes(term),
      )
      .sort(sortByDateDesc('receivedAt'));
  }, [data, tab, q, reminderDays]);

  return (
    <div className="page">
      <header className="page-head page-head-row">
        <div>
          <h1>Daftar paket</h1>
          <p className="lede">{loading ? 'Memuat…' : `${rows.length} paket`}</p>
        </div>
        <Link to="/admin/terima" className="btn btn-primary">
          <Icon name="scan" size={18} /> Terima paket
        </Link>
      </header>

      <div className="toolbar">
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`tab-btn ${tab === t.key ? 'is-active' : ''}`}
              onClick={() => setParams({ tab: t.key })}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className="search">
          <Icon name="search" size={18} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama, resi, kode, rak"
            aria-label="Cari paket"
          />
        </label>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      {!loading && rows.length === 0 ? (
        <p className="muted">Tidak ada paket di kategori ini.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Penerima</th>
                <th>Resi</th>
                <th>Rak</th>
                <th>Tiba</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/admin/paket/${p.id}`} className="cell-link">
                      <strong>{p.ownerName || `“${p.recipientName || 'tanpa nama'}”`}</strong>
                      {p.ownerName && p.recipientName !== p.ownerName && (
                        <span className="muted">Label: {p.recipientName}</span>
                      )}
                    </Link>
                  </td>
                  <td>
                    <span className="mono-ish">{p.trackingNumber || '-'}</span>
                    <span className="muted">{p.courier}</span>
                  </td>
                  <td className="shelf-cell">{p.shelf || '-'}</td>
                  <td>{formatDateTime(p.receivedAt)}</td>
                  <td>
                    <StatusBadge pkg={p} reminderDays={reminderDays} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
