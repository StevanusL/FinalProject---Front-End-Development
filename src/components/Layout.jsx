import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import Icon from './Icon';
import ChatWidget from './ChatWidget';

const NOTIF_PATH = { user: '/notifikasi', admin: '/admin/notifikasi' };

// User melihat notifikasi miliknya; admin melihat notifikasi bersama untuk petugas (audience: 'admin').
const notifQuery = (variant, user) => (variant === 'admin' ? { audience: 'admin' } : { userId: user.id });

const NAV = {
  user: [
    { to: '/', label: 'Paket saya', short: 'Paket', icon: 'box', end: true },
    { to: '/tiba', label: 'Paket di loket', short: 'Di loket', icon: 'list' },
    { to: '/ditunggu', label: 'Paket ditunggu', short: 'Ditunggu', icon: 'clock' },
    { to: '/notifikasi', label: 'Notifikasi', short: 'Notifikasi', icon: 'bell', badge: 'unread' },
    { to: '/profil', label: 'Profil', short: 'Profil', icon: 'user' },
  ],
  admin: [
    { to: '/admin', label: 'Loket', short: 'Loket', icon: 'home', end: true },
    { to: '/admin/terima', label: 'Terima paket', short: 'Terima', icon: 'scan' },
    { to: '/admin/paket', label: 'Daftar paket', short: 'Paket', icon: 'list' },
    { to: '/admin/notifikasi', label: 'Notifikasi', short: 'Notif', icon: 'bell', badge: 'unread' },
    { to: '/admin/pengguna', label: 'Pengguna', short: 'Pengguna', icon: 'users' },
    { to: '/admin/pengaturan', label: 'Pengaturan', short: 'Atur', icon: 'settings' },
  ],
};

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true" />
      <span className="brand-text">
        PaketKu
        <small>UNKLAB</small>
      </span>
    </div>
  );
}

export default function Layout({ variant }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState(null);
  const seenIds = useRef(null);
  const items = NAV[variant];

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const list = await api.list('notifications', notifQuery(variant, user));
        if (!alive) return;
        const unreadList = list.filter((n) => !n.read);
        setUnread(unreadList.length);

        // Tampilkan pop-up untuk notifikasi belum dibaca yang baru terlihat
        // (saat pertama masuk, atau saat ada kabar baru ketika aplikasi terbuka).
        // Tidak muncul jika sedang membuka halaman notifikasi itu sendiri.
        const fresh = unreadList.filter((n) => !seenIds.current?.has(n.id));
        if (fresh.length && location.pathname !== NOTIF_PATH[variant]) {
          const newest = fresh.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
          setToast({ count: fresh.length, message: newest.message });
        }
        seenIds.current = new Set(list.map((n) => n.id));
      } catch {
        /* abaikan, coba lagi nanti */
      }
    };
    load();
    const t = setInterval(load, 20000);
    return () => {
      alive = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, user.id, location.pathname]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 9000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className={`app app-${variant}`}>
      <aside className="sidebar">
        <Brand />
        <nav className="side-nav" aria-label="Navigasi utama">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} className="side-link">
              <Icon name={it.icon} />
              <span>{it.label}</span>
              {it.badge === 'unread' && unread > 0 && <span className="count">{unread}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <div className="who">
            <strong>{user.name}</strong>
            <span>{variant === 'admin' ? 'Petugas loket' : [user.category, user.unit].filter(Boolean).join(', ')}</span>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
            <Icon name="logout" size={18} /> Keluar
          </button>
        </div>
      </aside>

      <header className="topbar">
        <Brand />
        <button type="button" className="icon-btn" onClick={handleLogout} aria-label="Keluar">
          <Icon name="logout" />
        </button>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <nav className="tabbar" aria-label="Navigasi utama">
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.end} className="tab">
            <span className="tab-icon">
              <Icon name={it.icon} size={22} />
              {it.badge === 'unread' && unread > 0 && <span className="dot" />}
            </span>
            <span>{it.short}</span>
          </NavLink>
        ))}
      </nav>

      {toast && (
        <div className="toast" role="status">
          <Icon name="bell" size={20} />
          <div className="toast-body">
            <strong>{toast.count > 1 ? `${toast.count} notifikasi baru` : 'Notifikasi baru'}</strong>
            <span>{toast.message}</span>
            <NavLink to={NOTIF_PATH[variant]} onClick={() => setToast(null)}>
              Lihat notifikasi
            </NavLink>
          </div>
          <button type="button" className="icon-btn" onClick={() => setToast(null)} aria-label="Tutup">
            <Icon name="close" size={18} />
          </button>
        </div>
      )}

      <ChatWidget role={variant} hasNews={variant === 'user' && unread > 0} />
    </div>
  );
}
