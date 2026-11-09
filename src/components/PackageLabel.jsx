import { daysSince, formatDateTime, isOverdue } from '../utils/format';

/** Garis barcode dekoratif yang dibangkitkan dari nomor resi (bukan barcode asli). */
export function Barcode({ value = '', height = 34 }) {
  const bars = [];
  let x = 0;
  const src = value || 'PAKETKU';
  for (let i = 0; i < src.length * 2; i++) {
    const c = src.charCodeAt(i % src.length) + i * 7;
    const w = (c % 3) + 1;
    const gap = ((c >> 2) % 2) + 1;
    bars.push(<rect key={i} x={x} y="0" width={w} height={height} />);
    x += w + gap;
  }
  return (
    <svg className="barcode" viewBox={`0 0 ${x} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      {bars}
    </svg>
  );
}

export function StatusBadge({ pkg, reminderDays = 3 }) {
  if (pkg.status === 'picked_up') return <span className="badge badge-done">Sudah diambil</span>;
  if (!pkg.userId) return <span className="badge badge-orphan">Belum ada pemilik</span>;
  if (isOverdue(pkg, reminderDays))
    return <span className="badge badge-late">Menunggu {daysSince(pkg.receivedAt)} hari</span>;
  return <span className="badge badge-wait">Menunggu diambil</span>;
}

/**
 * Kartu paket berbentuk label pengiriman: elemen khas aplikasi.
 * showCode: tampilkan kode pengambilan besar (hanya untuk pemilik).
 */
export default function PackageLabel({ pkg, showCode = false, reminderDays, officeName }) {
  const picked = pkg.status === 'picked_up';
  return (
    <article className={`label ${picked ? 'is-picked' : ''}`}>
      <div className="label-tape" aria-hidden="true" />
      <div className="label-body">
        <header className="label-head">
          <div>
            <p className="label-courier">{pkg.courier || 'Kurir tidak diketahui'}</p>
            <p className="label-resi">{pkg.trackingNumber || 'Tanpa nomor resi'}</p>
          </div>
          <StatusBadge pkg={pkg} reminderDays={reminderDays} />
        </header>

        <dl className="label-grid">
          <div>
            <dt>Untuk</dt>
            <dd>{pkg.recipientName || '-'}</dd>
          </div>
          <div>
            <dt>Dari</dt>
            <dd>{pkg.senderName || '-'}</dd>
          </div>
          <div>
            <dt>Rak</dt>
            <dd className="label-shelf">{pkg.shelf || '-'}</dd>
          </div>
          <div>
            <dt>{picked ? 'Diambil' : 'Tiba'}</dt>
            <dd>{formatDateTime(picked ? pkg.pickedUpAt : pkg.receivedAt)}</dd>
          </div>
        </dl>

        {showCode && !picked && (
          <div className="label-code">
            <div>
              <span className="label-code-title">Kode pengambilan</span>
              <strong className="code-text">{pkg.pickupCode}</strong>
              {officeName && <span className="label-code-hint">Tunjukkan di {officeName}</span>}
            </div>
            <Barcode value={pkg.trackingNumber} />
          </div>
        )}
        {picked && pkg.pickedUpBy && <p className="label-foot">Diserahkan kepada {pkg.pickedUpBy}</p>}
      </div>
    </article>
  );
}
