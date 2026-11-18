# PaketKu UNKLAB

Sistem penerimaan dan pengambilan paket kurir di lingkungan Universitas Klabat.

**Masalah nyata:** kurir tidak bisa mengantar paket langsung ke kamar asrama atau ruang dosen, jadi paket dititipkan ke loket/unit kampus. Pemilik paket sering tidak tahu paketnya sudah datang, nama di label disingkat atau salah tulis, paket menumpuk berhari-hari, dan tidak ada catatan siapa yang mengambil paket.

**Solusi:** petugas memotret label paket, **AI (Gemini)** membaca label dan mencocokkan penerima dengan pengguna UNKLAB, pemilik langsung mendapat notifikasi dan kode pengambilan, lalu serah terima dicatat (termasuk jika diwakilkan teman).

## Kesesuaian dengan kriteria tugas

| Kriteria | Penerapan |
| --- | --- |
| Menggunakan React | React 19 + Vite + React Router |
| json-server | Semua data di `db.json` (users, packages, expected, notifications, settings) |
| AI pada fitur utama | Gemini membaca foto label paket (OCR + ekstraksi data terstruktur), lalu hasilnya dicocokkan ke pengguna. Chatbot "Asisten PaketKu" menjawab pertanyaan dari data paket |
| Permasalahan nyata UNKLAB | Paket mahasiswa/dosen/staf diterima loket kampus, bukan oleh pemesan langsung |
| Referensi tambahan | Mirip Sistem Informasi Manajemen (data pengguna, riwayat, laporan loket) |

## Tampilan

- **Landing page** (`/`) untuk pengunjung yang belum masuk: hero biru dengan tombol "Cek paket saya" dan "Kabari paket datang", jumlah paket yang sedang menunggu, cara kerja, fitur, serta lokasi dan jam loket. Pengguna yang sudah masuk langsung diarahkan ke halaman Paket saya.
- **Masuk / Daftar** berbentuk kartu di tengah latar biru, dengan tombol tampilkan kata sandi dan konfirmasi kata sandi saat mendaftar.
- **Logo UNKLAB:** taruh file logo resmi di `public/unklab-logo.png`. Jika belum ada, hero menampilkan contoh kartu paket.
- Warna mengikuti tema PaketKu: biru tinta sebagai warna utama dan cokelat kardus sebagai aksen, diatur di bagian atas `src/index.css`.

## Peran pengguna

1. **User** (mahasiswa, dosen, staf)
   - Melihat paket yang menunggu beserta **kode pengambilan** dan nomor rak
   - Melihat **daftar semua paket di loket** (menu "Paket di loket"): nama disamarkan (misal `Gr*** Tu***`), resi hanya 4 digit akhir, tanpa kode pengambilan. Paket miliknya ditandai "Milikmu"
   - **Mengabari petugas** bahwa paketnya akan datang (menu "Paket ditunggu"): resi, kurir, isi, perkiraan tiba, dan pesan untuk petugas
   - Mendaftarkan **nomor resi yang sedang ditunggu**, sehingga paket langsung dikenali saat tiba
   - Notifikasi saat paket tiba, saat diingatkan, dan saat paket diambil (termasuk jika diambil orang lain)
   - Bertanya ke Asisten PaketKu ("paket saya sudah datang?", "jam berapa loket buka?")
2. **Admin** (petugas loket sekaligus admin)
   - **Terima paket**: foto label, AI mengisi data dan menyarankan pemilik dengan skor kecocokan
   - **Serah terima**: masukkan kode 6 karakter, pilih "pemilik sendiri" atau "diwakilkan" dan catat nama pengambil
   - Daftar paket dengan filter (menunggu diambil, lewat batas, tanpa pemilik, sudah diambil) dan pencarian
   - Menetapkan pemilik untuk paket yang namanya tidak cocok, mengirim pengingat untuk paket yang lama tertahan
   - **Notifikasi admin**: kabar dari pengguna tentang paket yang akan datang (atau dibatalkan), dengan angka belum dibaca dan pop-up
   - Daftar **Akan datang** di halaman Loket, diurutkan dari perkiraan tiba terdekat
   - Kelola pengguna dan pengaturan loket (nama, lokasi, jam layanan, batas hari pengingat)
   - Asisten AI untuk merangkum kondisi loket

## Cara menjalankan

Butuh **Node.js 18 atau lebih baru**.

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
# isi VITE_GEMINI_API_KEY di .env (gratis di https://aistudio.google.com/apikey)
npm run dev
```

`npm run dev` menjalankan tiga hal sekaligus:

- json-server di http://localhost:3001
- server email di http://localhost:3002
- aplikasi React di http://localhost:5173

Bisa juga dijalankan terpisah: `npm run server`, `npm run mail`, dan `npm run client`.

### Akun contoh

| Peran | Email | Kata sandi |
| --- | --- | --- |
| Admin / petugas | admin@unklab.ac.id | admin123 |
| Mahasiswa | grace@student.unklab.ac.id | user123 |
| Mahasiswa | kevin@student.unklab.ac.id | user123 |
| Mahasiswa | natalia@student.unklab.ac.id | user123 |
| Dosen | ronald.wenas@unklab.ac.id | user123 |

Login juga bisa memakai NIM/NIP (misal `ADM001`).

### Tanpa API key

Aplikasi tetap berjalan. Data label diisi manual (pencocokan pemilik tetap otomatis dari nama, nomor HP, dan resi), dan chatbot menjawab dengan ringkasan sederhana tanpa AI.

### Mencoba di HP (kamera)

Jalankan `npx vite --host` lalu buka alamat Network yang muncul dari HP di jaringan Wi-Fi yang sama. Ubah juga `VITE_API_URL` di `.env` menjadi IP laptop, misal `http://192.168.1.10:3001`.

### Email pemberitahuan lewat Gmail

Saat petugas mencatat paket (atau menetapkan pemilik paket tanpa pemilik), sistem mengirim email "paket sudah tiba" berisi data paket, kode pengambilan, lokasi, dan jam layanan ke **email akun pemilik paket**.

Cara mengaktifkan:

1. Pakai akun Gmail khusus untuk sistem (disarankan, misal akun kelompok), lalu aktifkan **Verifikasi 2 Langkah** di https://myaccount.google.com/security
2. Buka https://myaccount.google.com/apppasswords, buat App Password dengan nama `PaketKu`, lalu salin 16 hurufnya.
3. Isi di `.env`:
   ```
   GMAIL_USER=akunpengirim@gmail.com
   GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
   ```
4. Jalankan ulang `npm run dev`. Di terminal harus muncul `[mail] Login Gmail berhasil.`
5. Login sebagai admin, buka **Pengaturan**, lalu klik **Kirim email uji**.

Catatan:

- Kredensial Gmail hanya dibaca oleh `server/mail-server.js` (Node.js) dan **tidak pernah dikirim ke browser**. Karena itu namanya tidak diawali `VITE_`. Jangan pernah memberi awalan `VITE_` pada variabel ini.
- Jangan memakai kata sandi Gmail biasa; Gmail menolaknya. Wajib App Password.
- Email akun contoh di `db.json` fiktif. Untuk mencoba, daftar akun baru dengan Gmail sungguhan, atau ubah email pengguna di menu **Pengguna**.
- Kalau email gagal (server email mati, App Password salah, dan sebagainya), paket tetap tersimpan dan notifikasi di aplikasi tetap masuk. Email bisa dikirim ulang dari halaman detail paket.

### Data tersimpan permanen

Semua perubahan (akun baru dari menu Daftar, paket, notifikasi, pengaturan) langsung ditulis json-server ke file `db.json`. Jadi setelah server dimatikan dan dinyalakan lagi, datanya tetap ada. Data hanya hilang jika `db.json` ditimpa, misalnya mengekstrak ulang zip atau menimpa dengan versi teman di Git. Simpan salinan `db.json` jika ingin bisa kembali ke data contoh.

## Cara kerja AI

1. **Pembaca label** (`src/api/gemini.js` → `extractLabel`): foto diperkecil di browser (`src/utils/image.js`), dikirim ke Gemini dengan permintaan output JSON berisi nama penerima, HP, resi, kurir, pengirim, isi, dan petunjuk alamat.
2. **Pencocokan pemilik** (`src/utils/match.js`): urutan bukti terkuat
   - nomor resi ada di daftar "paket ditunggu" milik pengguna (99%)
   - nomor HP sama (95%), atau 4 digit akhir sama jika nomor tersamar
   - kemiripan nama (mengabaikan gelar seperti "Bpk.", menerima inisial "Kevin R.", toleran salah ketik)
   Kandidat dengan skor 70% ke atas otomatis terpilih, tetapi petugas tetap bisa mengganti.
3. **Asisten PaketKu** (`src/components/ChatWidget.jsx`): setiap pertanyaan dikirim bersama data yang relevan (untuk user hanya paket miliknya sendiri), sehingga jawaban berdasarkan data nyata di db.json.

Model diatur lewat `VITE_GEMINI_MODEL` (bawaan `gemini-3.5-flash-lite`).

> Catatan privasi: nama di menu "Paket di loket" disamarkan di tampilan, tetapi json-server tetap mengirim data lengkap ke browser. Untuk produksi, penyamaran harus dilakukan di backend.

> Catatan keamanan: kredensial Gmail aman karena hanya ada di server email. API key Gemini yang diletakkan di frontend bisa dilihat lewat DevTools browser, dan kata sandi di db.json tidak dienkripsi. Ini wajar untuk tugas kuliah dengan json-server, tetapi untuk produksi butuh backend sungguhan.

## Struktur folder

```
db.json                    data json-server
server/mail-server.js      server email (Node.js + Nodemailer, Gmail SMTP)
src/
  api/
    client.js              wrapper REST json-server
    gemini.js              panggilan Gemini (baca label + chatbot)
    mail.js                memanggil server email
    packages.js            alur bisnis: terima, tetapkan pemilik, serah terima, pengingat
  context/AuthContext.jsx  login, daftar, profil, pengaturan loket
  components/
    Layout.jsx             sidebar desktop + tab bar HP
    PackageLabel.jsx       kartu paket bergaya label pengiriman
    Handover.jsx           formulir serah terima
    ChatWidget.jsx         Asisten PaketKu
    AuthShell.jsx          kerangka halaman Masuk/Daftar
  pages/
    Landing.jsx, Login.jsx, Register.jsx
    user/                  UserHome, ArrivedBoard, Expected, Notifications (dipakai juga admin), Profile
    admin/                 AdminHome, ReceivePackage, PackageList, PackageDetail, Users, Settings
  utils/                   format tanggal, id & kode, kompres gambar, pencocokan nama
```

## Perlu didiskusikan dengan kelompok

- **Verifikasi pendaftaran (K8):** saat ini siapa pun bisa mendaftar tanpa verifikasi email kampus. Pilihan: batasi email ke domain `@unklab.ac.id` / `@student.unklab.ac.id`, atau akun baru harus disetujui admin. Lokasi kode: `src/pages/Register.jsx` dan fungsi `register` di `src/context/AuthContext.jsx`.

## Ide pengembangan lanjutan

- Pindai QR kode pengambilan dengan kamera di loket
- Notifikasi WhatsApp, dan email untuk pengingat serta saat paket diambil
- Laporan bulanan jumlah paket per kurir dan per asrama
- Foto bukti serah terima
