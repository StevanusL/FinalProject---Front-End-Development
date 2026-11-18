import { api } from './client';
import { makeId, makePickupCode } from '../utils/ids';
import { sendArrivalEmail } from './mail';

const nowIso = () => new Date().toISOString();

function arrivalMessage(pkg, settings) {
  return `Paket ${pkg.courier || 'kurir'} (${pkg.trackingNumber || 'tanpa resi'}) sudah tiba di ${
    settings?.officeName || 'loket paket'
  }, rak ${pkg.shelf || '-'}. Tunjukkan kode ${pkg.pickupCode} saat mengambil.`;
}

export async function notify(userId, packageId, message) {
  if (!userId) return null;
  return api.create('notifications', {
    id: makeId('ntf'),
    userId,
    packageId,
    message,
    read: false,
    createdAt: nowIso(),
  });
}

/** Notifikasi bersama untuk semua petugas/admin. */
export async function notifyAdmins(message, extra = {}) {
  return api.create('notifications', {
    id: makeId('ntf'),
    audience: 'admin',
    userId: null,
    message,
    read: false,
    createdAt: nowIso(),
    ...extra,
  });
}

/**
 * Petugas mencatat paket baru yang diantar kurir.
 * @returns {{ pkg, email }} email = hasil pengiriman email ke pemilik (null jika belum ada pemilik)
 */
export async function receivePackage({ data, userId, expectedId, matchReason, aiExtracted, labelPhoto, adminId, settings }) {
  const existing = await api.list('packages');
  const pkg = {
    id: makeId('pkg'),
    trackingNumber: data.trackingNumber || '',
    courier: data.courier || '',
    recipientName: data.recipientName || '',
    recipientPhone: data.recipientPhone || '',
    senderName: data.senderName || '',
    itemDescription: data.itemDescription || '',
    userId: userId || null,
    status: 'waiting',
    shelf: data.shelf || '',
    pickupCode: makePickupCode(existing.map((p) => p.pickupCode)),
    receivedAt: nowIso(),
    receivedBy: adminId,
    aiExtracted: Boolean(aiExtracted),
    matchReason: matchReason || '',
    notes: data.notes || '',
    labelPhoto: labelPhoto || '',
    pickedUpAt: null,
    pickedUpBy: null,
    handedOverBy: null,
    remindedAt: null,
  };
  const saved = await api.create('packages', pkg);

  if (userId) await notify(userId, saved.id, arrivalMessage(saved, settings));
  if (expectedId) await api.update('expected', expectedId, { status: 'arrived', packageId: saved.id });
  const email = userId ? await sendArrivalEmail(saved.id) : null;
  return { pkg: saved, email };
}

/** Menetapkan pemilik untuk paket yang sebelumnya belum cocok dengan pengguna mana pun. */
export async function assignOwner(pkg, user, settings) {
  const updated = await api.update('packages', pkg.id, {
    userId: user.id,
    matchReason: 'Dipilih manual oleh petugas',
  });
  await notify(user.id, pkg.id, arrivalMessage(updated, settings));

  // tandai juga di daftar paket ditunggu jika resi cocok
  const exp = await api.list('expected', { userId: user.id });
  const hit = exp.find(
    (e) => e.status === 'waiting' && e.trackingNumber && e.trackingNumber.toUpperCase() === (pkg.trackingNumber || '').toUpperCase(),
  );
  if (hit) await api.update('expected', hit.id, { status: 'arrived', packageId: pkg.id });
  const email = await sendArrivalEmail(pkg.id);
  return { pkg: updated, email };
}

/** Serah terima paket ke pemilik / perwakilannya. */
export async function handOver(pkg, { pickedUpBy, adminId }) {
  const updated = await api.update('packages', pkg.id, {
    status: 'picked_up',
    pickedUpAt: nowIso(),
    pickedUpBy,
    handedOverBy: adminId,
  });
  await notify(
    pkg.userId,
    pkg.id,
    `Paket ${pkg.courier} (${pkg.trackingNumber}) sudah diambil oleh ${pickedUpBy}. Jika ini bukan Anda atau orang yang Anda titipi, segera hubungi loket.`,
  );
  return updated;
}

export async function sendReminder(pkg, settings, days) {
  await notify(
    pkg.userId,
    pkg.id,
    `Pengingat: paket ${pkg.courier} (${pkg.trackingNumber}) sudah ${days} hari menunggu di ${
      settings?.officeName || 'loket paket'
    }, rak ${pkg.shelf || '-'}. Jam layanan: ${settings?.hours || '-'}`,
  );
  return api.update('packages', pkg.id, { remindedAt: nowIso() });
}
