import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { useLoader } from '../../utils/useLoader';
import { sortByDateDesc, timeAgo } from '../../utils/format';

/** Dipakai user (notifikasi pribadi) dan admin (notifikasi bersama untuk petugas). */
export default function Notifications({ audience = 'user' }) {
  const { user } = useAuth();
  const isAdmin = audience === 'admin';
  const { data, error, reload } = useLoader(
    () => api.list('notifications', isAdmin ? { audience: 'admin' } : { userId: user.id }),
    [user.id, isAdmin],
  );
  const list = (data || []).slice().sort(sortByDateDesc('createdAt'));
  const unread = list.filter((n) => !n.read);

  const markAll = async () => {
    await Promise.all(unread.map((n) => api.update('notifications', n.id, { read: true })));
    reload(true);
  };

  const markOne = async (n) => {
    if (n.read) return;
    await api.update('notifications', n.id, { read: true });
    reload(true);
  };

  return (
    <div className="page">
      <header className="page-head page-head-row">
        <div>
          <h1>Notifikasi</h1>
          <p className="lede">{unread.length ? `${unread.length} belum dibaca` : 'Semua sudah dibaca'}</p>
        </div>
        {unread.length > 0 && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={markAll}>
            Tandai semua dibaca
          </button>
        )}
      </header>

      {error && <p className="alert alert-error">{error}</p>}

      {list.length === 0 ? (
        <p className="muted">
          {isAdmin
            ? 'Belum ada notifikasi. Kabar dari pengguna yang menunggu paket akan muncul di sini.'
            : 'Belum ada notifikasi. Kamu akan dikabari di sini saat paket tiba.'}
        </p>
      ) : (
        <ul className="notifs">
          {list.map((n) => (
            <li key={n.id}>
              <button type="button" className={`notif ${n.read ? '' : 'is-unread'}`} onClick={() => markOne(n)}>
                <span className="notif-msg">{n.message}</span>
                <span className="notif-time">{timeAgo(n.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
