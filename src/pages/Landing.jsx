import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useLoader } from '../utils/useLoader';
import { SiteBrand } from '../components/AuthShell';
import PackageLabel from '../components/PackageLabel';
import Icon from '../components/Icon';

// Contoh kartu paket untuk hero jika logo UNKLAB belum ditaruh di folder public/
const SAMPLE = {
  id: 'contoh',
  courier: 'J&T Express',
  trackingNumber: 'JP1234567890',
  recipientName: 'Mahasiswa',
  senderName: 'Toko Buku Sinar',
  shelf: 'A1',
  status: 'waiting',
  userId: 'contoh',
  pickupCode: 'K7RD3M',
  receivedAt: new Date().toISOString(),
};

const STEPS = [
  {
    title: 'Kabari petugas',
    text: 'Setelah belanja online, daftarkan nomor resimu. Petugas loket langsung tahu ada paketmu yang akan datang.',
  },
  {
    title: 'Paket diterima loket',
    text: 'Kurir menitipkan paket di loket. Petugas memotret labelnya, AI membaca data dan mengenali pemiliknya.',
  },
  {
    title: 'Kamu dikabari',
    text: 'Notifikasi muncul di aplikasi dan email masuk ke Gmail-mu, lengkap dengan kode pengambilan.',
  },
  {
    title: 'Ambil dengan kode',
    text: 'Tunjukkan kode 6 karakter di loket. Tidak sempat? Titipkan kodenya ke teman, petugas mencatat siapa yang mengambil.',
  },
];

const FEATURES = [
  { icon: 'sparkle', title: 'Label dibaca AI', text: 'Gemini membaca foto label paket, jadi petugas tidak perlu mengetik ulang.' },
  { icon: 'bell', title: 'Notifikasi dan email', text: 'Kabar paket tiba lewat aplikasi dan Gmail, ditambah pengingat jika paket lama tidak diambil.' },
  { icon: 'list', title: 'Daftar paket di loket', text: 'Lihat semua paket yang sedang menunggu, dengan nama disamarkan untuk menjaga privasi.' },
  { icon: 'chat', title: 'Asisten PaketKu', text: 'Tanya "paket saya sudah datang?" atau "jam berapa loket buka?" kapan saja.' },
];

function HeroVisual() {
  // Logo resmi dipakai jika file public/unklab-logo.png tersedia; jika tidak, tampilkan contoh kartu paket.
  const [logoOk, setLogoOk] = useState(true);
  if (logoOk) {
    return (
      <img
        className="hero-logo"
        src="/unklab-logo.png"
        alt="Logo Universitas Klabat"
        onError={() => setLogoOk(false)}
      />
    );
  }
  return (
    <div className="hero-sample" aria-label="Contoh kartu paket di aplikasi">
      <PackageLabel pkg={SAMPLE} showCode officeName="loket paket" />
    </div>
  );
}

export default function Landing() {
  // Data umum tanpa login: jumlah paket menunggu dan info loket
  const { data, reload } = useLoader(async () => {
    const [packages, settings] = await Promise.all([api.list('packages', { status: 'waiting' }), api.getSettings()]);
    return { waiting: packages.filter((p) => p.status === 'waiting').length, settings };
  }, []);
  const settings = data?.settings;

  // Jumlah paket di loket diperbarui otomatis setiap 20 detik tanpa memuat ulang halaman
  useEffect(() => {
    const t = setInterval(() => reload(true), 20000);
    return () => clearInterval(t);
  }, [reload]);

  return (
    <div className="landing">
      <section className="hero">
        <nav className="site-nav" aria-label="Navigasi situs">
          <SiteBrand />
          <div className="site-nav-actions">
            <Link to="/masuk" className="pill pill-ghost">
              Masuk
            </Link>
            <Link to="/daftar" className="pill pill-accent">
              Daftar
            </Link>
          </div>
        </nav>

        <div className="hero-inner">
          <div className="hero-copy">
            <h1>
              <span className="hero-mark">Paket Kampus</span> UNKLAB
            </h1>
            <p>
              Sistem penerimaan paket kurir di lingkungan Universitas Klabat. Paket mahasiswa, dosen, dan staf diterima
              di loket kampus, pemiliknya dikabari begitu paket tiba, dan pengambilannya tercatat dengan kode.
            </p>
            <div className="hero-actions">
              {/* Setelah masuk, langsung ke halaman Paket saya */}
              <Link to="/masuk?next=/" className="pill pill-accent pill-lg">
                Cek paket saya
              </Link>
              {/* Setelah daftar (atau masuk), langsung ke halaman Paket ditunggu */}
              <Link to="/daftar?next=/ditunggu" className="pill pill-accent pill-lg">
                Kabari paket datang
              </Link>
            </div>
            {data && (
              <p className="hero-live">
                <span className="live-dot" aria-hidden="true" />
                {data.waiting
                  ? `${data.waiting} paket sedang menunggu diambil di ${settings?.officeName || 'loket'}`
                  : `Tidak ada paket yang menunggu di ${settings?.officeName || 'loket'} saat ini`}
              </p>
            )}
          </div>
          <div className="hero-visual">
            <HeroVisual />
          </div>
        </div>

        <svg className="hero-wave" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 70C240 20 480 20 720 55s480 60 720 10v55H0Z" fill="rgba(255,255,255,0.18)" />
          <path d="M0 90c260-40 520-40 760-5s440 45 680 0v35H0Z" fill="#fff" />
        </svg>
      </section>

      <section className="land-section">
        <div className="land-inner">
          <h2>Cara kerjanya</h2>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="steps-no">{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="land-section land-tint">
        <div className="land-inner">
          <h2>Yang kamu dapat</h2>
          <ul className="features">
            {FEATURES.map((f) => (
              <li key={f.title}>
                <Icon name={f.icon} size={24} />
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {settings && (
        <section className="land-section">
          <div className="land-inner land-office">
            <div>
              <h2>Tempat mengambil paket</h2>
              <p className="land-office-name">{settings.officeName}</p>
              <p>{settings.location}</p>
            </div>
            <dl>
              <div>
                <dt>Jam layanan</dt>
                <dd>{settings.hours}</dd>
              </div>
              {settings.contact && (
                <div>
                  <dt>Kontak</dt>
                  <dd>{settings.contact}</dd>
                </div>
              )}
            </dl>
            <Link to="/daftar" className="pill pill-brand pill-lg">
              Buat akun <Icon name="arrowRight" size={18} />
            </Link>
          </div>
        </section>
      )}

      <footer className="site-copy site-copy-dark">
        © {new Date().getFullYear()} Universitas Klabat, sistem penerimaan paket PaketKu
      </footer>
    </div>
  );
}
