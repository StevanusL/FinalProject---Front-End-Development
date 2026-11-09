import { useMemo, useState } from 'react';
import { api } from '../../api/client';
import { useLoader } from '../../utils/useLoader';
import { makeId } from '../../utils/ids';
import Icon from '../../components/Icon';

const EMPTY = {
  name: '',
  email: '',
  idNumber: '',
  phone: '',
  category: 'Mahasiswa',
  unit: '',
  role: 'user',
  password: '',
};

export default function Users() {
  const { data, error, reload } = useLoader(async () => {
    const [users, packages] = await Promise.all([api.list('users'), api.list('packages')]);
    return { users, packages };
  }, []);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const users = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data?.users || [])
      .filter((u) => !term || [u.name, u.email, u.idNumber, u.unit].join(' ').toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data, q]);

  const waitingCount = (uid) => (data?.packages || []).filter((p) => p.userId === uid && p.status === 'waiting').length;

  const startEdit = (u) => {
    setEditingId(u.id);
    setForm({ ...EMPTY, ...u, password: '' });
    setOpen(true);
    setMsg('');
  };

  const startNew = () => {
    setEditingId(null);
    setForm(EMPTY);
    setOpen(true);
    setMsg('');
  };

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      idNumber: form.idNumber.trim(),
      phone: form.phone.trim(),
      category: form.category,
      unit: form.unit.trim(),
      role: form.role,
    };
    const others = (data?.users || []).filter((u) => u.id !== editingId);
    if (others.some((u) => u.email === payload.email)) return setMsg('Email sudah dipakai pengguna lain.');
    try {
      if (editingId) {
        if (form.password) payload.password = form.password;
        await api.update('users', editingId, payload);
        setMsg('Perubahan disimpan.');
      } else {
        if (!form.password) return setMsg('Isi kata sandi awal untuk pengguna baru.');
        await api.create('users', { id: makeId('u'), ...payload, password: form.password, createdAt: new Date().toISOString() });
        setMsg(`${payload.name} ditambahkan.`);
      }
      setOpen(false);
      reload(true);
    } catch (err) {
      setMsg(err.message);
    }
  };

  const remove = async (u) => {
    if (waitingCount(u.id) > 0) return setMsg(`${u.name} masih punya paket di rak. Serahkan paketnya dulu.`);
    if (!window.confirm(`Hapus akun ${u.name}?`)) return;
    await api.remove('users', u.id);
    setMsg(`${u.name} dihapus.`);
    reload(true);
  };

  return (
    <div className="page">
      <header className="page-head page-head-row">
        <div>
          <h1>Pengguna</h1>
          <p className="lede">Mahasiswa, dosen, staf, dan petugas loket.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={startNew}>
          <Icon name="plus" size={18} /> Tambah pengguna
        </button>
      </header>

      {msg && <p className="alert">{msg}</p>}
      {error && <p className="alert alert-error">{error}</p>}

      {open && (
        <form className="card form" onSubmit={submit}>
          <h2 className="section-title">{editingId ? 'Ubah pengguna' : 'Pengguna baru'}</h2>
          <div className="field-row">
            <label className="field">
              <span>Nama lengkap</span>
              <input value={form.name} onChange={set('name')} required />
            </label>
            <label className="field">
              <span>Email</span>
              <input type="email" value={form.email} onChange={set('email')} required />
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>NIM / NIP</span>
              <input value={form.idNumber} onChange={set('idNumber')} required />
            </label>
            <label className="field">
              <span>Nomor HP</span>
              <input value={form.phone} onChange={set('phone')} />
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Kategori</span>
              <select value={form.category} onChange={set('category')}>
                <option>Mahasiswa</option>
                <option>Dosen</option>
                <option>Staf</option>
              </select>
            </label>
            <label className="field">
              <span>Asrama / fakultas / unit</span>
              <input value={form.unit} onChange={set('unit')} />
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Hak akses</span>
              <select value={form.role} onChange={set('role')}>
                <option value="user">Pengguna (pemilik paket)</option>
                <option value="admin">Petugas loket / admin</option>
              </select>
            </label>
            <label className="field">
              <span>{editingId ? 'Kata sandi baru (opsional)' : 'Kata sandi awal'}</span>
              <input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" />
            </label>
          </div>
          <div className="actions">
            <button className="btn btn-primary">{editingId ? 'Simpan perubahan' : 'Tambah pengguna'}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Batal
            </button>
          </div>
        </form>
      )}

      <label className="search search-wide">
        <Icon name="search" size={18} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, email, NIM/NIP, unit" aria-label="Cari pengguna" />
      </label>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>NIM / NIP</th>
              <th>Unit</th>
              <th>Paket di rak</th>
              <th aria-label="Aksi" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <strong>{u.name}</strong>
                  <span className="muted">
                    {u.role === 'admin' ? 'Petugas loket' : u.category}, {u.email}
                  </span>
                </td>
                <td className="mono-ish">{u.idNumber}</td>
                <td>{u.unit || '-'}</td>
                <td>{waitingCount(u.id) || '-'}</td>
                <td className="cell-actions">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => startEdit(u)}>
                    Ubah
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => remove(u)}
                    aria-label={`Hapus ${u.name}`}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
