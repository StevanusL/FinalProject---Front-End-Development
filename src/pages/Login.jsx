import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Barcode } from '../components/PackageLabel';

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="auth">
      <section className="auth-intro">
        <div className="brand brand-lg">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-text">
            PaketKu
            <small>UNKLAB</small>
          </span>
        </div>
        <h1 className="auth-headline">Paketmu dititip di loket kampus. Kami kabari begitu tiba.</h1>
        <p className="auth-lede">
          Kurir menitipkan paket ke loket UNKLAB. Petugas memotret labelnya, AI mengenali pemiliknya, dan kamu
          langsung mendapat kode untuk mengambilnya.
        </p>
        <div className="auth-sample" aria-hidden="true">
          <span className="code-text">K7RD3M</span>
          <Barcode value="JP1234567890" height={28} />
        </div>
      </section>
      <section className="auth-card">
        <h2>{title}</h2>
        {subtitle && <p className="muted">{subtitle}</p>}
        {children}
      </section>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
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
      navigate(u.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Masuk" subtitle="Gunakan email kampus atau NIM/NIP.">
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Email atau NIM/NIP</span>
          <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" required />
        </label>
        <label className="field">
          <span>Kata sandi</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p className="alert alert-error">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Memeriksa…' : 'Masuk'}
        </button>
      </form>
      <p className="auth-switch">
        Belum punya akun? <Link to="/daftar">Daftar sebagai mahasiswa, dosen, atau staf</Link>
      </p>
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
