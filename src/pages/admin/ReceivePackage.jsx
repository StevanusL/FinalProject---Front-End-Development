import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { aiEnabled, aiModel, extractLabel } from '../../api/gemini';
import { receivePackage } from '../../api/packages';
import { useLoader } from '../../utils/useLoader';
import { prepareLabelPhoto } from '../../utils/image';
import { findRecipientCandidates } from '../../utils/match';
import { COURIERS } from '../../utils/format';
import PackageLabel from '../../components/PackageLabel';
import Icon from '../../components/Icon';

const EMPTY = {
  recipientName: '',
  recipientPhone: '',
  trackingNumber: '',
  courier: '',
  senderName: '',
  itemDescription: '',
  shelf: '',
  notes: '',
};

export default function ReceivePackage() {
  const { user, settings } = useAuth();
  const { data } = useLoader(async () => {
    const [users, expected] = await Promise.all([api.list('users'), api.list('expected')]);
    return { users, expected };
  }, []);

  const fileRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [ai, setAi] = useState({ state: 'idle', message: '', confidence: '', addressHint: '' });
  const [aiFilled, setAiFilled] = useState(false);
  const [choice, setChoice] = useState(null); // null = otomatis (kandidat teratas), '' = tanpa pemilik, atau id pengguna
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const candidates = useMemo(() => {
    if (!data) return [];
    if (!form.recipientName && !form.recipientPhone && !form.trackingNumber) return [];
    return findRecipientCandidates(form, data.users, data.expected).slice(0, 4);
  }, [data, form]);

  const autoPick = candidates[0]?.score >= 0.7 ? candidates[0] : null;
  const selectedId = choice === null ? autoPick?.user.id || '' : choice;
  const selectedCandidate = candidates.find((c) => c.user.id === selectedId);
  const selectedUser = data?.users.find((u) => u.id === selectedId);

  const readWithAi = async (prepared) => {
    if (!aiEnabled) {
      setAi({ state: 'error', message: 'API key Gemini belum diatur. Isi data label secara manual.' });
      return;
    }
    setAi({ state: 'reading', message: '' });
    try {
      const result = await extractLabel(prepared.forAi, prepared.mimeType);
      setForm((f) => ({
        ...f,
        recipientName: result.recipientName,
        recipientPhone: result.recipientPhone,
        trackingNumber: result.trackingNumber,
        courier: result.courier,
        senderName: result.senderName,
        itemDescription: result.itemDescription,
      }));
      setAiFilled(true);
      setChoice(null);
      setAi({ state: 'done', message: '', confidence: result.confidence, addressHint: result.addressHint });
    } catch (e) {
      setAi({ state: 'error', message: e.message });
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    try {
      const prepared = await prepareLabelPhoto(file);
      setPhoto(prepared);
      readWithAi(prepared);
    } catch (err) {
      setError(err.message);
    }
  };

  const reset = () => {
    setPhoto(null);
    setForm(EMPTY);
    setAi({ state: 'idle', message: '' });
    setAiFilled(false);
    setChoice(null);
    setSaved(null);
    setError('');
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.trackingNumber && !form.recipientName) {
      setError('Isi minimal nomor resi atau nama penerima.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const reason = selectedCandidate
        ? selectedCandidate.reasons.join('; ')
        : selectedUser
          ? 'Dipilih manual oleh petugas'
          : '';
      const pkg = await receivePackage({
        data: form,
        userId: selectedUser?.id || null,
        expectedId: selectedCandidate?.expectedId,
        matchReason: reason,
        aiExtracted: aiFilled,
        labelPhoto: photo?.thumbnail || '',
        adminId: user.id,
        settings,
      });
      setSaved({ pkg, owner: selectedUser });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="page page-narrow">
        <header className="page-head">
          <h1>Paket tercatat</h1>
          <p className="lede">
            {saved.owner
              ? `${saved.owner.name} sudah mendapat notifikasi beserta kode pengambilan.`
              : 'Paket disimpan tanpa pemilik. Tetapkan pemiliknya dari daftar paket saat sudah diketahui.'}
          </p>
        </header>
        <PackageLabel pkg={saved.pkg} showCode reminderDays={settings?.reminderDays} />
        <p className="hint">Tulis kode {saved.pkg.pickupCode} dan rak {saved.pkg.shelf || '-'} pada paket sebelum disimpan di rak.</p>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={reset}>
            <Icon name="camera" size={18} /> Terima paket berikutnya
          </button>
          <Link className="btn btn-ghost" to="/admin/paket">
            Lihat daftar paket
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>Terima paket</h1>
        <p className="lede">Foto label pengiriman. AI membaca datanya dan mencari pemiliknya di antara pengguna UNKLAB.</p>
      </header>

      <form className="receive" onSubmit={save}>
        <section className="step">
          <h2 className="step-title">
            <span className="step-no">1</span> Foto label
          </h2>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} hidden />
          {photo ? (
            <div className="photo">
              <img src={photo.thumbnail} alt="Foto label paket" />
              <div className="photo-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
                  Foto ulang
                </button>
                {aiEnabled && ai.state !== 'reading' && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => readWithAi(photo)}>
                    Baca ulang
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button type="button" className="dropzone" onClick={() => fileRef.current?.click()}>
              <Icon name="camera" size={32} />
              <strong>Ambil foto label</strong>
              <span>atau pilih gambar dari galeri</span>
            </button>
          )}

          <div className={`ai-status ai-${ai.state}`} role="status">
            {ai.state === 'idle' && (
              <span>
                {aiEnabled
                  ? `Label dibaca dengan ${aiModel}.`
                  : 'AI belum aktif (API key kosong). Data label bisa diisi manual.'}
              </span>
            )}
            {ai.state === 'reading' && <span className="pulse">Membaca label…</span>}
            {ai.state === 'done' && (
              <span>
                <Icon name="sparkle" size={16} /> Data diisi AI, keyakinan {ai.confidence}. Periksa sebelum menyimpan.
                {ai.addressHint && <em> Petunjuk alamat: {ai.addressHint}</em>}
              </span>
            )}
            {ai.state === 'error' && <span>{ai.message}</span>}
          </div>
        </section>

        <section className="step">
          <h2 className="step-title">
            <span className="step-no">2</span> Periksa data label
          </h2>
          <div className="form">
            <div className="field-row">
              <label className="field">
                <span>Nama penerima di label</span>
                <input value={form.recipientName} onChange={set('recipientName')} />
              </label>
              <label className="field">
                <span>No. HP penerima</span>
                <input value={form.recipientPhone} onChange={set('recipientPhone')} />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>Nomor resi</span>
                <input
                  value={form.trackingNumber}
                  onChange={(e) => setForm((f) => ({ ...f, trackingNumber: e.target.value.toUpperCase() }))}
                />
              </label>
              <label className="field">
                <span>Kurir</span>
                <input value={form.courier} onChange={set('courier')} list="courier-list" />
                <datalist id="courier-list">
                  {COURIERS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>Pengirim / toko</span>
                <input value={form.senderName} onChange={set('senderName')} />
              </label>
              <label className="field">
                <span>Isi paket</span>
                <input value={form.itemDescription} onChange={set('itemDescription')} />
              </label>
            </div>
          </div>
        </section>

        <section className="step">
          <h2 className="step-title">
            <span className="step-no">3</span> Pemilik dan rak
          </h2>

          {candidates.length > 0 ? (
            <ul className="candidates" role="radiogroup" aria-label="Kandidat pemilik">
              {candidates.map((c) => (
                <li key={c.user.id}>
                  <label className={`candidate ${selectedId === c.user.id ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="owner"
                      checked={selectedId === c.user.id}
                      onChange={() => setChoice(c.user.id)}
                    />
                    <span className="candidate-main">
                      <strong>{c.user.name}</strong>
                      <span className="muted">
                        {c.user.category}, {c.user.unit || '-'}
                      </span>
                      <span className="candidate-why">{c.reasons.join('; ')}</span>
                    </span>
                    <span className="meter" aria-label={`Kecocokan ${Math.round(c.score * 100)}%`}>
                      <span style={{ width: `${Math.round(c.score * 100)}%` }} />
                      <em>{Math.round(c.score * 100)}%</em>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              {form.recipientName || form.trackingNumber
                ? 'Tidak ada pengguna yang cocok dengan data label.'
                : 'Kandidat pemilik muncul setelah data label terisi.'}
            </p>
          )}

          <div className="field-row">
            <label className="field">
              <span>Pilih pemilik secara manual</span>
              <select value={selectedId} onChange={(e) => setChoice(e.target.value)}>
                <option value="">Belum diketahui (simpan tanpa pemilik)</option>
                {(data?.users || [])
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.idNumber})
                    </option>
                  ))}
              </select>
            </label>
            <label className="field field-shelf">
              <span>Rak penyimpanan</span>
              <input value={form.shelf} onChange={set('shelf')} placeholder="A-01" required />
            </label>
          </div>
          <label className="field">
            <span>Catatan (opsional)</span>
            <input value={form.notes} onChange={set('notes')} placeholder="Kotak besar, mudah pecah…" />
          </label>

          {error && <p className="alert alert-error">{error}</p>}
          <div className="actions">
            <button className="btn btn-primary btn-lg" disabled={saving || ai.state === 'reading'}>
              {saving ? 'Menyimpan…' : selectedUser ? `Simpan dan kabari ${selectedUser.name.split(' ')[0]}` : 'Simpan tanpa pemilik'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={reset}>
              Kosongkan
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
