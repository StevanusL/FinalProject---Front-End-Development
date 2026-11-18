import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getNext, withNext } from '../utils/nav';
import { useAuth } from '../context/AuthContext';
import AuthShell, { PasswordInput } from '../components/AuthShell';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const next = getNext(useLocation().search);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const u = await login(identifier, password);
      navigate(u.role === 'admin' ? '/admin' : next || '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      icon="login"
      title="Masuk ke akun"
      subtitle="Cek paketmu di loket UNKLAB"
      footer={
        <>
          Belum punya akun? <Link to={withNext('/daftar', next)}>Daftar di sini</Link>
        </>
      }
    >
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Email atau NIM/NIP</span>
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="nama@unklab.ac.id atau NIM"
            autoComplete="username"
            required
          />
        </label>
        <label className="field">
          <span>Kata sandi</span>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Masukkan kata sandi"
            autoComplete="current-password"
          />
        </label>
        {error && <p className="alert alert-error">{error}</p>}
        <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
          {busy ? 'Memeriksa…' : 'Masuk'}
        </button>
      </form>
      <details className="demo-accounts">
        <summary>Akun contoh untuk mencoba</summary>
        <ul>
          <li>Petugas: admin@unklab.ac.id / admin123</li>
          <li>Mahasiswa: grace@student.unklab.ac.id / user123</li>
          <li>Dosen: ronald.wenas@unklab.ac.id / user123</li>
        </ul>
      </details>
    </AuthShell>
  );
}
