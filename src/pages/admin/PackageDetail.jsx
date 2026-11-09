import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { assignOwner, sendReminder } from '../../api/packages';
import { useLoader } from '../../utils/useLoader';
import { daysSince, formatDateTime, timeAgo } from '../../utils/format';
import { findRecipientCandidates } from '../../utils/match';
import PackageLabel from '../../components/PackageLabel';
import Handover from '../../components/Handover';
import Icon from '../../components/Icon';

export default function PackageDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useAuth();
  const { data, error, reload } = useLoader(async () => {
    const [pkg, users, expected] = await Promise.all([api.get('packages', id), api.list('users'), api.list('expected')]);
    return { pkg, users, expected };
  }, [id]);
  const [assignId, setAssignId] = useState('');
  const [showHandover, setShowHandover] = useState(false);
  const [msg, setMsg] = useState('');

  const pkg = data?.pkg;
  const userById = (uid) => data?.users.find((u) => u.id === uid);
  const owner = pkg ? userById(pkg.userId) : null;
  const suggestions = useMemo(
    () => (pkg && !pkg.userId ? findRecipientCandidates(pkg, data.users, data.expected).slice(0, 3) : []),
    [pkg, data],
  );

  if (error) return <div className="page"><p className="alert alert-error">{error}</p></div>;
  if (!pkg) return <div className="page"><p className="muted">Memuat paket…</p></div>;

  const doAssign = async (uid) => {
    const u = userById(uid);
    if (!u) return;
    await assignOwner(pkg, u, settings);
    setMsg(`Paket ditetapkan untuk ${u.name}. Notifikasi sudah dikirim.`);
    setAssignId('');
    reload(true);
  };

  const doRemind = async () => {
    await sendReminder(pkg, settings, daysSince(pkg.receivedAt));
    setMsg('Pengingat dikirim.');
    reload(true);
  };

  const doDelete = async () => {
    if (!window.confirm('Hapus catatan paket ini? Tindakan ini tidak bisa dibatalkan.')) return;
    await api.remove('packages', pkg.id);
    navigate('/admin/paket');
  };

  const timeline = [
    { at: pkg.receivedAt, text: `Diterima dari kurir oleh ${userById(pkg.receivedBy)?.name || 'petugas'}${pkg.aiExtracted ? ', label dibaca AI' : ''}` },
    pkg.remindedAt && { at: pkg.remindedAt, text: 'Pengingat dikirim ke pemilik' },
    pkg.pickedUpAt && { at: pkg.pickedUpAt, text: `Diambil oleh ${pkg.pickedUpBy}, diserahkan ${userById(pkg.handedOverBy)?.name || 'petugas'}` },
  ].filter(Boolean);

  return (
    <div className="page">
      <Link to="/admin/paket" className="back">
        <Icon name="arrowLeft" size={18} /> Daftar paket
      </Link>

      {msg && (
        <p className="alert alert-ok">
          <Icon name="check" size={18} /> {msg}
        </p>
      )}

      <div className="detail">
        <div className="detail-main">
          {showHandover ? (
            <Handover
              pkg={pkg}
              owner={owner}
              onCancel={() => setShowHandover(false)}
              onDone={() => {
                setShowHandover(false);
                setMsg('Paket sudah diserahkan.');
                reload(true);
              }}
            />
          ) : (
            <PackageLabel pkg={pkg} showCode reminderDays={settings?.reminderDays} />
          )}

          <section className="card">
            <h2 className="section-title">Pemilik</h2>
            {owner ? (
              <p>
                <strong>{owner.name}</strong>, {owner.category} ({owner.idNumber}), {owner.unit || '-'}. HP {owner.phone || '-'}
                {pkg.matchReason && <span className="muted"> Dasar pencocokan: {pkg.matchReason}.</span>}
              </p>
            ) : (
              <>
                <p className="muted">Nama di label “{pkg.recipientName || '-'}” belum cocok dengan pengguna mana pun.</p>
                {suggestions.length > 0 && (
                  <div className="chips">
                    {suggestions.map((s) => (
                      <button key={s.user.id} type="button" className="chip" onClick={() => doAssign(s.user.id)}>
                        Tetapkan ke {s.user.name} ({Math.round(s.score * 100)}%)
                      </button>
                    ))}
                  </div>
                )}
                <div className="inline-form">
                  <select value={assignId} onChange={(e) => setAssignId(e.target.value)} aria-label="Pilih pemilik">
                    <option value="">Pilih pengguna…</option>
                    {data.users
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.idNumber})
                        </option>
                      ))}
                  </select>
                  <button type="button" className="btn btn-secondary" disabled={!assignId} onClick={() => doAssign(assignId)}>
                    Tetapkan pemilik
                  </button>
                </div>
              </>
            )}
          </section>
        </div>

        <aside className="detail-side">
          {pkg.status === 'waiting' && !showHandover && (
            <div className="card stack">
              {pkg.userId ? (
                <button type="button" className="btn btn-primary btn-block" onClick={() => setShowHandover(true)}>
                  Serahkan paket
                </button>
              ) : (
                <p className="muted">Tetapkan pemilik dulu sebelum paket bisa diserahkan.</p>
              )}
              {pkg.userId && (
                <button type="button" className="btn btn-secondary btn-block" onClick={doRemind}>
                  Kirim pengingat
                </button>
              )}
            </div>
          )}

          {pkg.labelPhoto && (
            <figure className="card photo-card">
              <img src={pkg.labelPhoto} alt={`Foto label paket ${pkg.trackingNumber}`} />
              <figcaption className="muted">Foto label saat diterima</figcaption>
            </figure>
          )}

          <section className="card">
            <h2 className="section-title">Riwayat</h2>
            <ol className="timeline">
              {timeline.map((t, i) => (
                <li key={i}>
                  <span>{t.text}</span>
                  <time className="muted" title={timeAgo(t.at)}>
                    {formatDateTime(t.at)}
                  </time>
                </li>
              ))}
            </ol>
            {pkg.notes && <p className="muted">Catatan: {pkg.notes}</p>}
          </section>

          <button type="button" className="btn btn-danger-ghost btn-sm" onClick={doDelete}>
            <Icon name="trash" size={16} /> Hapus catatan paket
          </button>
        </aside>
      </div>
    </div>
  );
}
