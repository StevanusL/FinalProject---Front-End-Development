import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getNext, withNext } from '../utils/nav';
import { useAuth } from '../context/AuthContext';
import AuthShell, { PasswordInput } from '../components/AuthShell';

const EMPTY = { name: '', email: '', idNumber: '', phone: '', category: 'Mahasiswa', unit: '', password: '', confirm: '' };

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const next = getNext(useLocation().search);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // TODO (diskusi kelompok, K8): pendaftaran masih bebas tanpa verifikasi email kampus.
  // Opsi: batasi domain email ke @unklab.ac.id / @student.unklab.ac.id, atau akun dibuat/disetujui admin.
  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return setError('Kata sandi minimal 6 karakter.');
    if (form.password !== form.confirm) return setError('Konfirmasi kata sandi tidak sama.');
    setBusy(true);
    setError('');
    try {
      await register(form);
      navigate(next || '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      icon="userPlus"
      title="Buat akun baru"
      subtitle="Daftar sebagai mahasiswa, dosen, atau staf UNKLAB"
      footer={
        <>
          Sudah punya akun? <Link to={withNext('/masuk', next)}>Masuk di sini</Link>
        </>
      }
    >
      <p className="auth-tip">
        Pakai nama dan nomor HP yang sama dengan saat belanja online, supaya paketmu mudah dikenali.
      </p>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Nama lengkap</span>
          <input value={form.name} onChange={set('name')} placeholder="Masukkan nama lengkap" required />
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
          <input type="email" value={form.email} onChange={set('email')} placeholder="nama@unklab.ac.id" required />
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
        <div className="field-row">
          <label className="field">
            <span>Kata sandi</span>
            <PasswordInput
              value={form.password}
              onChange={set('password')}
              placeholder="Min. 6 karakter"
              autoComplete="new-password"
            />
          </label>
          <label className="field">
            <span>Konfirmasi</span>
            <PasswordInput
              value={form.confirm}
              onChange={set('confirm')}
              placeholder="Ulangi kata sandi"
              autoComplete="new-password"
            />
          </label>
        </div>
        {error && <p className="alert alert-error">{error}</p>}
        <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
          {busy ? 'Mendaftarkan…' : 'Daftar sekarang'}
        </button>
      </form>
    </AuthShell>
  );
}
