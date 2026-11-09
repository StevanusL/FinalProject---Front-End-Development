import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import Icon from './Icon';
import ChatWidget from './ChatWidget';

const NAV = {
  user: [
    { to: '/', label: 'Paket saya', short: 'Paket', icon: 'box', end: true },
    { to: '/ditunggu', label: 'Paket ditunggu', short: 'Ditunggu', icon: 'clock' },
    { to: '/notifikasi', label: 'Notifikasi', short: 'Notifikasi', icon: 'bell', badge: 'unread' },
    { to: '/profil', label: 'Profil', short: 'Profil', icon: 'user' },
  ],
  admin: [
    { to: '/admin', label: 'Loket', short: 'Loket', icon: 'home', end: true },
    { to: '/admin/terima', label: 'Terima paket', short: 'Terima', icon: 'scan' },
    { to: '/admin/paket', label: 'Daftar paket', short: 'Paket', icon: 'list' },
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
  const items = NAV[variant];

  useEffect(() => {
    if (variant !== 'user') return undefined;
    let alive = true;
    const load = async () => {
      try {
        const list = await api.list('notifications', { userId: user.id });
        if (alive) setUnread(list.filter((n) => !n.read).length);
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
  }, [variant, user.id, location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/masuk');
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

      <ChatWidget role={variant} />
    </div>
  );
}
