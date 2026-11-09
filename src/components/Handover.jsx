import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { handOver } from '../api/packages';
import PackageLabel from './PackageLabel';

/** Formulir serah terima: dipakai di halaman Loket dan detail paket. */
export default function Handover({ pkg, owner, onDone, onCancel }) {
  const { user, settings } = useAuth();
  const [mode, setMode] = useState('owner');
  const [repName, setRepName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ownerName = owner?.name || pkg.recipientName;

  const submit = async (e) => {
    e.preventDefault();
    if (mode === 'rep' && !repName.trim()) return setError('Tulis nama orang yang mengambil.');
    setBusy(true);
    setError('');
    try {
      const pickedUpBy = mode === 'owner' ? `${ownerName} (pemilik)` : `${repName.trim()} (mewakili ${ownerName})`;
      const updated = await handOver(pkg, { pickedUpBy, adminId: user.id });
      onDone?.(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="handover">
      <PackageLabel pkg={pkg} reminderDays={settings?.reminderDays} />
      <form className="handover-form" onSubmit={submit}>
        <p className="handover-owner">
          Pemilik terdaftar: <strong>{owner ? `${owner.name}, ${owner.category} (${owner.idNumber})` : 'belum ada'}</strong>
        </p>
        <fieldset className="radio-group">
          <legend>Siapa yang mengambil?</legend>
          <label>
            <input type="radio" name="mode" checked={mode === 'owner'} onChange={() => setMode('owner')} />
            Pemilik sendiri
          </label>
          <label>
            <input type="radio" name="mode" checked={mode === 'rep'} onChange={() => setMode('rep')} />
            Diwakilkan teman / rekan
          </label>
        </fieldset>
        {mode === 'rep' && (
          <label className="field">
            <span>Nama pengambil</span>
            <input value={repName} onChange={(e) => setRepName(e.target.value)} autoFocus />
          </label>
        )}
        {error && <p className="alert alert-error">{error}</p>}
        <div className="actions">
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Menyimpan…' : 'Serahkan paket'}
          </button>
          {onCancel && (
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Batal
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
