import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { useLoader } from '../../utils/useLoader';
import { sortByDateDesc } from '../../utils/format';
import PackageLabel from '../../components/PackageLabel';

export default function UserHome() {
  const { user, settings } = useAuth();
  const { data, error, loading } = useLoader(() => api.list('packages', { userId: user.id }), [user.id]);
  const packages = (data || []).slice().sort(sortByDateDesc('receivedAt'));
  const waiting = packages.filter((p) => p.status === 'waiting');
  const history = packages.filter((p) => p.status === 'picked_up');
  const firstName = user.name.split(' ')[0];

  return (
    <div className="page">
      <header className="page-head">
        <h1>Halo, {firstName}</h1>
        <p className="lede">
          {loading
            ? 'Memeriksa loket…'
            : waiting.length
              ? `${waiting.length} paket menunggu kamu di ${settings?.officeName || 'loket paket'}.`
              : 'Belum ada paket yang menunggu di loket.'}
        </p>
      </header>

      {error && <p className="alert alert-error">{error}</p>}

      {settings && (
        <aside className="office">
          <div>
            <h2>{settings.officeName}</h2>
            <p>{settings.location}</p>
          </div>
          <p className="office-hours">{settings.hours}</p>
        </aside>
      )}

      <section className="section">
        <h2 className="section-title">Siap diambil</h2>
        {!loading && waiting.length === 0 && (
          <div className="empty">
            <p>
              Sedang menunggu kiriman? Daftarkan nomor resinya agar petugas langsung tahu paket itu milikmu.
            </p>
            <Link className="btn btn-secondary" to="/ditunggu">
              Daftarkan nomor resi
            </Link>
          </div>
        )}
        <div className="labels">
          {waiting.map((p) => (
            <PackageLabel
              key={p.id}
              pkg={p}
              showCode
              reminderDays={settings?.reminderDays}
              officeName={settings?.officeName}
            />
          ))}
        </div>
        {waiting.length > 0 && (
          <p className="hint">
            Tidak bisa datang sendiri? Berikan kode pengambilan kepada teman yang kamu percaya. Petugas akan mencatat
            nama pengambilnya dan kamu mendapat notifikasi.
          </p>
        )}
      </section>

      {history.length > 0 && (
        <section className="section">
          <h2 className="section-title">Riwayat</h2>
          <div className="labels labels-compact">
            {history.map((p) => (
              <PackageLabel key={p.id} pkg={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
