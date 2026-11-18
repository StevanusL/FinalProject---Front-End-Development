import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';

export function SiteBrand({ light = true }) {
  return (
    <Link to="/" className={`site-brand ${light ? 'is-light' : ''}`} aria-label="PaketKu UNKLAB, ke beranda">
      <span className="site-brand-name">PaketKu</span>
      <span className="site-brand-pill">UNKLAB</span>
    </Link>
  );
}

/** Kolom kata sandi dengan tombol tampilkan/sembunyikan. */
export function PasswordInput({ value, onChange, placeholder, autoComplete, required = true }) {
  const [show, setShow] = useState(false);
  return (
    <span className="input-with-btn">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
      />
      <button
        type="button"
        className="input-btn"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
      >
        <Icon name={show ? 'eyeOff' : 'eye'} size={18} />
      </button>
    </span>
  );
}

/** Kerangka halaman Masuk / Daftar: latar biru dengan kartu di tengah. */
export default function AuthShell({ icon, title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <header className="auth-top">
        <SiteBrand />
        <Link to="/" className="auth-back">
          <Icon name="arrowLeft" size={16} /> Kembali ke beranda
        </Link>
      </header>

      <main className="auth-main">
        <section className="auth-box">
          <span className="auth-icon" aria-hidden="true">
            <Icon name={icon} size={28} />
          </span>
          <h1>{title}</h1>
          {subtitle && <p className="auth-sub">{subtitle}</p>}
          {children}
          {footer && <div className="auth-foot">{footer}</div>}
        </section>
      </main>

      <footer className="site-copy">© {new Date().getFullYear()} Universitas Klabat, sistem penerimaan paket PaketKu</footer>
    </div>
  );
}
