import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone || '',
    unit: user.unit || '',
    password: '',
  });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password && form.password.length < 6) return setMsg('Kata sandi baru minimal 6 karakter.');
    setBusy(true);
    try {
      const patch = { name: form.name.trim(), phone: form.phone.trim(), unit: form.unit.trim() };
      if (form.password) patch.password = form.password;
      await updateProfile(patch);
      setForm((f) => ({ ...f, password: '' }));
      setMsg('Profil disimpan.');
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page page-narrow">
      <header className="page-head">
        <h1>Profil</h1>
        <p className="lede">
          {user.category}, {user.idNumber}. {user.email}
        </p>
      </header>
      <form className="card form" onSubmit={submit}>
        <label className="field">
          <span>Nama lengkap</span>
          <input value={form.name} onChange={set('name')} required />
          <small>Samakan dengan nama yang kamu tulis saat belanja online.</small>
        </label>
        <label className="field">
          <span>Nomor HP</span>
          <input type="tel" value={form.phone} onChange={set('phone')} />
          <small>Nomor HP di label paket dipakai AI untuk mengenali paketmu.</small>
        </label>
        <label className="field">
          <span>Asrama / fakultas / unit</span>
          <input value={form.unit} onChange={set('unit')} />
        </label>
        <label className="field">
          <span>Kata sandi baru</span>
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            placeholder="Kosongkan jika tidak diganti"
            autoComplete="new-password"
          />
        </label>
        {msg && <p className="alert">{msg}</p>}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Menyimpan…' : 'Simpan profil'}
        </button>
      </form>
    </div>
  );
}
