import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';
import { getNext } from './utils/nav';
import UserHome from './pages/user/UserHome';
import Expected from './pages/user/Expected';
import Notifications from './pages/user/Notifications';
import ArrivedBoard from './pages/user/ArrivedBoard';
import Profile from './pages/user/Profile';
import AdminHome from './pages/admin/AdminHome';
import ReceivePackage from './pages/admin/ReceivePackage';
import PackageList from './pages/admin/PackageList';
import PackageDetail from './pages/admin/PackageDetail';
import Users from './pages/admin/Users';
import Settings from './pages/admin/Settings';

function RequireRole({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/masuk" replace />;
  if (user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />;
  return children;
}

// "/" adalah landing page untuk tamu, dan halaman Paket saya untuk user yang sudah masuk.
function UserArea() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  // Tamu yang membuka halaman user diarahkan ke Masuk, lalu dikembalikan ke halaman itu setelah masuk
  if (!user) {
    return pathname === '/' ? <Landing /> : <Navigate to={`/masuk?next=${encodeURIComponent(pathname)}`} replace />;
  }
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  return <Layout variant="user" />;
}

function GuestOnly({ children }) {
  const { user } = useAuth();
  const { search } = useLocation();
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : getNext(search) || '/'} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/masuk" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/daftar" element={<GuestOnly><Register /></GuestOnly>} />

      <Route path="/" element={<UserArea />}>
        <Route index element={<UserHome />} />
        <Route path="tiba" element={<ArrivedBoard />} />
        <Route path="ditunggu" element={<Expected />} />
        <Route path="notifikasi" element={<Notifications />} />
        <Route path="profil" element={<Profile />} />
      </Route>

      <Route
        path="/admin"
        element={
          <RequireRole role="admin">
            <Layout variant="admin" />
          </RequireRole>
        }
      >
        <Route index element={<AdminHome />} />
        <Route path="terima" element={<ReceivePackage />} />
        <Route path="paket" element={<PackageList />} />
        <Route path="paket/:id" element={<PackageDetail />} />
        <Route path="notifikasi" element={<Notifications audience="admin" />} />
        <Route path="pengguna" element={<Users />} />
        <Route path="pengaturan" element={<Settings />} />
        <Route path="profil" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
