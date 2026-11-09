const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export const formatDate = (iso) => (iso ? dateFmt.format(new Date(iso)) : '-');
export const formatDateTime = (iso) => (iso ? dateTimeFmt.format(new Date(iso)) : '-');

export function daysSince(iso) {
  if (!iso) return 0;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export function timeAgo(iso) {
  if (!iso) return '';
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return formatDate(iso);
}

export function isOverdue(pkg, reminderDays = 3) {
  return pkg.status === 'waiting' && daysSince(pkg.receivedAt) >= reminderDays;
}

export const STATUS_LABEL = {
  waiting: 'Menunggu diambil',
  picked_up: 'Sudah diambil',
};

export const COURIERS = [
  'J&T Express',
  'JNE',
  'SiCepat',
  'SPX Express',
  'Anteraja',
  'Lion Parcel',
  'Pos Indonesia',
  'Ninja Xpress',
  'Tokopedia Kurir Rekomendasi',
  'Lainnya',
];

export const sortByDateDesc = (key) => (a, b) => new Date(b[key] || 0) - new Date(a[key] || 0);
