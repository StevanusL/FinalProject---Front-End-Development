import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthShell } from './Login';

const EMPTY = { name: '', email: '', idNumber: '', phone: '', category: 'Mahasiswa', unit: '', password: '' };

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return setError('Kata sandi minimal 6 karakter.');
    setBusy(true);
    setError('');
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Daftar akun"
      subtitle="Tulis nama dan nomor HP yang sama dengan yang kamu pakai saat belanja online, supaya paket mudah dikenali."
    >
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Nama lengkap</span>
          <input value={form.name} onChange={set('name')} required />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Saya adalah</span>
            <select value={form.category} onChange={set('category')}>
              <option>Mahasiswa</option>
              <option>Dosen</option>
              <option>Staf</option>
            </select>
          </label>
          <label className="field">
            <span>{form.category === 'Mahasiswa' ? 'NIM' : 'NIP/NIDN'}</span>
            <input value={form.idNumber} onChange={set('idNumber')} required />
          </label>
        </div>
        <label className="field">
          <span>Email kampus</span>
          <input type="email" value={form.email} onChange={set('email')} required />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Nomor HP</span>
            <input type="tel" value={form.phone} onChange={set('phone')} placeholder="08…" required />
          </label>
          <label className="field">
            <span>Asrama / fakultas / unit</span>
            <input value={form.unit} onChange={set('unit')} placeholder="Asrama Putra Eden" />
          </label>
        </div>
        <label className="field">
          <span>Kata sandi</span>
          <input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" required />
        </label>
        {error && <p className="alert alert-error">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Mendaftarkan…' : 'Daftar'}
        </button>
      </form>
      <p className="auth-switch">
        Sudah punya akun? <Link to="/masuk">Masuk</Link>
      </p>
    </AuthShell>
  );
}
