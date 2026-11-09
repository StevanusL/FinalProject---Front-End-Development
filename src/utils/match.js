import { normalizeTracking } from './ids';

// Mencocokkan data label paket dengan pengguna UNKLAB.
// Label sering ditulis tidak lengkap ("Kevin R.", "Bpk. Ronald (FIK)"), jadi pakai skor kemiripan.

const TITLES = new Set(['bpk', 'bapak', 'ibu', 'bu', 'pak', 'sdr', 'sdri', 'mr', 'mrs', 'ms', 'dr', 'prof', 'kak', 'kk']);

export function normalizePhone(p = '') {
  let d = String(p).replace(/\D/g, '');
  if (d.startsWith('62')) d = '0' + d.slice(2);
  else if (d.startsWith('8')) d = '0' + d;
  return d;
}

function tokens(name = '') {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !TITLES.has(t));
}

function levenshtein(a, b) {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

function tokenSimilar(a, b) {
  if (a === b) return 1;
  // inisial: "r" cocok dengan "rumengan"
  if ((a.length === 1 && b.startsWith(a)) || (b.length === 1 && a.startsWith(b))) return 0.7;
  if (a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a))) return 0.85;
  const dist = levenshtein(a, b);
  const ratio = 1 - dist / Math.max(a.length, b.length);
  return ratio >= 0.75 ? ratio : 0;
}

/** Skor 0..1 kemiripan nama di label dengan nama pengguna */
export function nameSimilarity(labelName, userName) {
  const lt = tokens(labelName);
  const ut = tokens(userName);
  if (!lt.length || !ut.length) return 0;
  let total = 0;
  for (const t of lt) {
    total += Math.max(...ut.map((u) => tokenSimilar(t, u)));
  }
  const coverage = total / lt.length; // seberapa banyak kata di label yang ditemukan
  const firstNameBonus = tokenSimilar(lt[0], ut[0]) === 1 ? 0.05 : 0;
  // label 1 kata ("Nathan") kurang meyakinkan
  const penalty = lt.length === 1 ? 0.15 : 0;
  return Math.max(0, Math.min(1, coverage + firstNameBonus - penalty));
}

/**
 * @returns {Array<{ user, score, reasons: string[], expectedId?: string }>} urut dari skor tertinggi
 */
export function findRecipientCandidates(label, users, expectedList = []) {
  const tracking = normalizeTracking(label.trackingNumber);
  const phone = normalizePhone(label.recipientPhone);
  const phoneUsable = phone.length >= 10 && !/x|\*/i.test(label.recipientPhone || '');

  const results = users.map((user) => {
    let score = 0;
    const reasons = [];
    let expectedId;

    const exp = tracking
      ? expectedList.find(
          (e) => e.userId === user.id && e.status === 'waiting' && normalizeTracking(e.trackingNumber) === tracking,
        )
      : null;
    if (exp) {
      score = Math.max(score, 0.99);
      reasons.push('Nomor resi terdaftar di daftar paket ditunggu');
      expectedId = exp.id;
    }

    if (phoneUsable && normalizePhone(user.phone) === phone) {
      score = Math.max(score, 0.95);
      reasons.push('Nomor HP sama dengan profil');
    } else if (label.recipientPhone && user.phone) {
      // nomor tersamar: cocokkan 4 digit terakhir
      const tail = String(label.recipientPhone).replace(/\D/g, '').slice(-4);
      if (tail.length === 4 && normalizePhone(user.phone).endsWith(tail)) {
        score = Math.max(score, 0.6);
        reasons.push('4 digit akhir nomor HP sama');
      }
    }

    const sim = nameSimilarity(label.recipientName, user.name);
    if (sim >= 0.5) {
      const nameScore = sim * 0.9;
      if (nameScore > score) score = nameScore;
      else score = Math.min(1, score + 0.03);
      reasons.push(sim >= 0.9 ? 'Nama sama' : 'Nama mirip');
    }

    return { user, score: Math.round(score * 100) / 100, reasons, expectedId };
  });

  return results.filter((r) => r.score >= 0.45).sort((a, b) => b.score - a.score);
}
