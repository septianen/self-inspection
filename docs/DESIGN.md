# DESIGN: Self Inspection

Sumber: kanvas Claude Design "Self Inspection". File aslinya ada di `design/` (referensi visual saja, lihat CLAUDE.md). Jika dokumen ini dan file `design/` berbeda, ikuti file `design/` untuk nilai visual dan dokumen ini untuk perilaku.

Gaya: bersih dan terang seperti aplikasi OLX. Latar putih, teks navy gelap, aksen biru `#3A77FF`, kartu bergaris tipis dengan sudut membulat. Mobile-first dengan lebar referensi 390px, dan harus tetap rapi dari 360px sampai 430px. Di layar lebar, konten dibatasi `max-width: 480px` dan diletakkan di tengah.

## Token (salin ke `:root` di `style.css`)

```css
:root {
  /* Warna dasar */
  --c-primary: #3A77FF;        /* tombol utama, progress, ikon aksen */
  --c-primary-strong: #2457D6; /* link, label aksen, tombol teks */
  --c-primary-ink: #1F4FC4;    /* teks di atas latar biru muda */
  --c-primary-soft: #EAF1FF;   /* chip terpilih, tombol sekunder biru */
  --c-primary-tint: #F2F6FF;   /* kartu info, panel tes */
  --c-primary-ring: #DCE7FF;   /* cincin di sekitar ikon bulat */
  --c-primary-light: #9EC0FF;  /* bar level suara rendah, sel sentuh "sedang" */

  --c-ink: #0B1F3A;            /* teks utama */
  --c-ink-2: #22324A;          /* teks blok laporan */
  --c-ink-3: #34445C;          /* teks sekunder di panel */
  --c-body: #4A5A72;           /* paragraf deskripsi */
  --c-muted: #5B6B82;          /* label kecil, caption */
  --c-disabled: #8A97A8;

  --c-bg: #FFFFFF;
  --c-bg-page: #F4F7FB;        /* latar halaman laporan publik, blok teks iklan */
  --c-border: #C9D2DF;         /* input, tombol sekunder */
  --c-border-soft: #DDE3EC;    /* kartu */
  --c-divider: #E6EBF2;
  --c-track: #E1E7F0;          /* segmen progress belum aktif */

  /* Status */
  --c-pass: #138A4E;    --c-pass-ink: #0E6B3C;  --c-pass-bg: #E9F7EF;
  --c-fail: #C25E0A;    --c-fail-ink: #9A4A06;  --c-fail-bg: #FFF1E3;
  --c-skip-ink: #4A5568; --c-skip-bg: #EEF1F5;

  /* Tipografi */
  --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, 'Roboto Mono', monospace;

  /* Radius */
  --r-sm: 8px; --r-md: 10px; --r-lg: 12px; --r-xl: 14px; --r-2xl: 16px; --r-pill: 999px;

  /* Spasi */
  --gutter: 20px;
}
```

Font Google: `https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap`

Aplikasi ini **hanya tema terang** (sesuai desain). Set `color-scheme: light` dan latar `body` eksplisit.

## Skala tipografi

| Peran | Ukuran / berat | Catatan |
|---|---|---|
| Judul hero (Beranda) | 30px / 800, line-height 1.15, letter-spacing -0.6px | `text-wrap: balance` |
| Judul layar (H1) | 24px / 800, letter-spacing -0.4px | |
| Judul header bar | 17px / 700 | |
| Judul seksi | 16px / 800 | |
| Teks tombol utama | 16px / 700 | |
| Paragraf | 15px / 400, line-height 1.55, `--c-body` | |
| Label field | 13px / 700 | |
| Teks isi baris / chip | 14–15px / 600–700 | |
| Caption | 12–13px / 400–600, `--c-muted` | |
| Eyebrow | 12px / 700, uppercase, letter-spacing 1.2px, `--c-primary-strong` | |
| Angka, ID, resolusi | `--font-mono` 600 | Input digit speaker: 32px |

## Komponen

**Tombol utama** (`.btn-primary`): tinggi 52px, lebar penuh, radius 12px, latar `--c-primary`, teks putih 16px/700. Disabled: latar `--c-track`, teks `--c-disabled`.

**Tombol sekunder** (`.btn-secondary`): tinggi 48–52px, border 1px `--c-border`, latar putih, teks `--c-ink` 15px/700. Varian disabled: teks `--c-disabled`.

**Tombol teks** (`.btn-text`): tinggi 40px, tanpa border, teks `--c-primary-strong` 14px/700.

**Pasangan tombol**: grid 2 kolom dengan gap 10px. Kiri sekunder (negatif), kanan utama (positif).

**Header layar biasa**: padding `16px 20px 14px`, tombol kembali 40×40 (ikon chevron kiri 22px) dengan `margin-left: -8px`, judul 17px/700. Data HP dan Ringkasan memakai border bawah `--c-divider`.

**Header layar tes**: baris 3 kolom berisi tombol kembali di kiri, "Tes {n} dari 6" (13px/700 `--c-muted`) di tengah, dan tombol teks "Lewati" di kanan. Di bawahnya progress 6 segmen: grid 6 kolom, gap 4px, tinggi 4px, radius 2px. Segmen ≤ n berwarna `--c-primary`, sisanya `--c-track`.

**Footer**: padding `14px 20px 28px` (tambahkan `env(safe-area-inset-bottom)`). Footer menempel di bawah viewport: layar = flex column dengan `min-height: 100dvh`, `main { flex: 1 }`.

**Input teks / select**: tinggi 48px, padding 0 14px, border 1px `--c-border`, radius 10px, font 15px. Select memakai `appearance: none` dengan ikon chevron bawah di kanan. Fokus: border `--c-primary` + `outline: 2px solid var(--c-primary-soft)`.

**Chip** (penyimpanan, kelengkapan): tinggi 40px, padding 0 14–16px, radius pill. Normal: border 1px `--c-border`, teks 600. Terpilih: border 1.5px `--c-primary`, latar `--c-primary-soft`, teks `--c-primary-ink` 700, dan khusus chip ganda diberi ikon centang 14px di depan. Pakai `<button aria-pressed>`.

**Opsi radio/checkbox berbingkai**: `<label>` dengan border 1px `--c-border` radius 10–12px. Saat terpilih: border 1.5px `--c-primary` dan latar `#F5F8FF`. Input memakai `accent-color: var(--c-primary)`.

**Kartu info** (`.panel`): latar `--c-primary-tint`, radius 14–16px, padding 16px.

**Banner hasil otomatis**: flex dengan gap 12px, padding 12px 14px, radius 12px.
- Sukses: latar `--c-pass-bg`, lingkaran 30px `--c-pass` berisi ikon centang putih, judul `--c-pass-ink` 14px/700.
- Gagal: latar `--c-fail-bg`, lingkaran `--c-fail` berisi ikon tanda seru, judul `--c-fail-ink`.

**Pill status**: padding 4px 10px, radius 12px, 12px/700.
- Lulus: `--c-pass-bg` / `--c-pass-ink`
- Bermasalah: `--c-fail-bg` / `--c-fail-ink`
- Dilewati: `--c-skip-bg` / `--c-skip-ink`

Pill hitungan (Ringkasan, laporan): padding 6px 12px, radius 16px, 13px/700.

**Toast**: dipakai setelah salin. Pill gelap (`--c-ink`, teks putih 14px/600) di bawah tengah, di atas footer, hilang setelah 2 detik. Teksnya "Link disalin" atau "Teks disalin".

**Ikon**: SVG inline dengan stroke `currentColor`, stroke-width 2–2.2, `stroke-linecap/linejoin: round`. Salin path dari file `design/`. Ikon dekoratif diberi `aria-hidden="true"`, dan tombol yang hanya berisi ikon diberi `aria-label`.

**Logo**: kotak radius 10px berlatar `--c-primary` berisi ikon HP dengan centang (lihat `design/Main.dc.html`), diikuti teks "Self Inspection" 17px/800.

## Layar

Nama file mockup ditulis di setiap judul. Semua copy di bawah ini final.

### 1. Beranda (`design/Main.dc.html`)

- Header: logo + "Self Inspection".
- Eyebrow "Sebelum pasang iklan".
- H1 hero: "Cek kondisi HP-mu, biar pembeli lebih yakin".
- Paragraf: "6 tes singkat langsung di HP yang mau dijual. Hasilnya jadi laporan yang bisa kamu tempel di deskripsi iklan OLX."
- Grid 2 kolom berisi 6 kartu tes (ikon biru 20px + nama): Layar sentuh, Warna layar, Kamera belakang, Kamera depan, Speaker, Mikrofon. Kartu: border 1px `--c-border-soft`, radius 12px, padding 12px.
- Panel "Yang perlu disiapkan" berisi 3 baris berikon centang:
  - "Buka halaman ini di HP yang akan dijual, pakai Chrome"
  - "Ruangan cukup tenang untuk tes speaker dan mikrofon"
  - "Sekitar 5 menit"
- Footer: tombol utama "Mulai Inspeksi", dengan caption berikon gembok di bawahnya: "Foto dari tes kamera tidak disimpan".
- Jika bukan Android/Chrome: banner kuning di atas panel (pakai token fail) berisi "Self Inspection dirancang untuk HP Android dengan Chrome. Beberapa tes mungkin tidak berjalan di perangkat ini."
- Jika ada sesi tersimpan di `sessionStorage`: tombol utama berubah menjadi "Lanjutkan Inspeksi", dengan tombol teks "Mulai dari awal" di bawahnya.

### 2. Data HP (`design/DataHP.dc.html`)

- Header biasa: "Data HP".
- Panel "Terdeteksi otomatis" dengan label kanan "Dari browser". Isinya grid 2 kolom berpasangan label/nilai: Sistem operasi, Browser, Resolusi layar (mono, contoh "1080 × 2340"), RAM, Prosesor ("8 inti"), Baterai saat ini ("82%").
- Seksi "Isi data HP" (16px/800). Field sesuai PRD, dengan label: Merek, Model, Penyimpanan, Warna, Kelengkapan, Kondisi fisik, Catatan (opsional).
- Footer berborder atas: tombol utama "Lanjut ke Tes" (atau "Simpan" saat dibuka dari Ringkasan).
- Validasi: field wajib yang kosong saat tombol ditekan diberi border `--c-fail` dan pesan 13px di bawahnya, misalnya "Pilih kapasitas penyimpanan" atau "Isi model HP". Halaman di-scroll ke error pertama. Alternatif: tombol nonaktif sampai form valid. Pilih salah satu, tapi konsisten.

### 3. Tes 1, Layar sentuh (`design/TesSentuh.dc.html`)

Layar penuh tanpa header (pakai Fullscreen API, lihat TESTS.md).

- Grid 8 kolom × 14 baris memenuhi layar. Latar grid `--c-divider`, gap 2px, padding 2px. Sel radius 3px.
- Warna sel: belum tersentuh putih, sudah tersentuh `--c-primary`. Opsional: sel yang baru disentuh `--c-primary-light` lalu berubah ke `--c-primary` setelah 150ms.
- Pill mengambang di atas tengah (latar `--c-ink`, radius 24px, shadow), `pointer-events: none`, berisi "Tes 1 dari 6" (`#C5D3EA`) | pemisah | "Usap semua kotak" (putih 700) | hitungan mono "68/112" (`--c-primary-light`).
- Tombol mengambang di bawah (left/right 20px, bottom 28px + safe area): tombol sekunder putih dengan shadow, berisi "Ada area yang tidak bisa disentuh".
- Saat sel tertutup oleh pill atau tombol mengambang: elemen mengambang tidak menangkap sentuhan (pill), dan untuk tombol, sel di bawahnya tetap terhitung saat jari menggeser melewatinya (lihat TESTS.md).
- Selesai otomatis saat 112/112: semua sel berkedip hijau 300ms, lalu lanjut ke tes berikutnya.

### 4. Tes 2, Warna layar (`design/TesWarna.dc.html`)

**Fase A, layar penuh warna** (tidak ada di mockup): 5 layar penuh berurutan, yaitu merah `#FF0000`, hijau `#00FF00`, biru `#0000FF`, putih `#FFFFFF`, hitam `#000000`. Ketuk di mana saja untuk ke warna berikutnya. Di warna pertama, tampilkan petunjuk "Perhatikan titik, garis, atau bercak. Ketuk untuk warna berikutnya" sebagai pill gelap di tengah yang hilang setelah 2,5 detik. Indikator kecil "1/5" di pojok kanan atas, semi-transparan. Setelah warna ke-5, keluar dari layar penuh dan masuk ke fase B.

**Fase B, pertanyaan** (mockup):
- Header tes "Tes 2 dari 6".
- H1 "Warna layar", lalu paragraf "Kamu sudah melihat 5 warna layar penuh. Apakah ada masalah berikut di salah satunya?"
- Baris 5 swatch warna (tinggi 44px, radius 8px; swatch putih diberi border) + tombol ikon ulang 44×44 berlabel "Lihat warna lagi" untuk kembali ke fase A.
- 4 opsi checkbox berbingkai (judul 15px/700 + keterangan 13px):
  - Titik mati (dead pixel): "Titik kecil yang warnanya tidak berubah"
  - Garis: "Garis tegak atau mendatar di layar"
  - Bercak atau bayangan: "Noda, burn-in, atau bekas gambar tertinggal"
  - Warna tidak rata: "Sebagian layar lebih gelap atau kekuningan"
- Footer: tombol utama "Tidak ada masalah" dan tombol sekunder "Simpan masalah". Tombol "Simpan masalah" nonaktif sampai ada yang dicentang. Saat ada yang dicentang, tombol "Tidak ada masalah" ikut nonaktif.

### 5. Tes 3 & 4, Kamera belakang / depan (`design/TesKamera.dc.html`)

Satu layout untuk dua tes. H1 berisi "Kamera belakang" atau "Kamera depan", dan header berisi "Tes 3 dari 6" atau "Tes 4 dari 6".

**State 1, pratinjau** (tidak ada di mockup, ikuti gaya yang sama):
- Kotak viewfinder tinggi 330px, radius 16px, latar `#1A2333`, berisi `<video>` live (`object-fit: cover`). Kamera depan di-mirror (`transform: scaleX(-1)`).
- Di bawahnya teks "Arahkan kamera ke benda di sekitarmu, lalu ambil foto."
- Footer: tombol utama "Ambil Foto" dengan ikon kamera.
- Selama kamera dibuka: spinner kecil + "Membuka kamera…". Jika gagal: banner gagal "Kamera tidak bisa dibuka" + tombol "Coba lagi" + tombol teks "Tandai bermasalah".

**State 2, setelah foto** (mockup):
- Viewfinder menampilkan frame yang dibekukan (canvas). Badge kiri atas (latar `rgba(11,31,58,.78)`, putih 12px/700, ikon kamera) berisi "Foto diambil".
- Banner hasil otomatis:
  - normal: "Gambar terdeteksi normal", lalu "Resolusi {W} × {H} ({MP} MP)" dengan angka mono.
  - gagal: "Gambar terlalu gelap atau kosong", lalu "Pastikan lensa tidak tertutup, lalu ambil ulang".
- "Apakah gambarnya jelas?" (16px/700), lalu caption "Foto hanya dicek di HP ini, lalu langsung dihapus."
- Footer: pasangan "Buram / rusak" (sekunder) dan "Ya, jelas" (utama), lalu tombol teks "Ambil ulang foto".
- Jika cek otomatis gagal: tombol "Ya, jelas" disembunyikan. Tombol yang tersedia "Ambil ulang foto" (sebagai tombol utama) dan "Tandai bermasalah" (sekunder).

### 6. Tes 5, Speaker (`design/TesSpeaker.dc.html`)

- Header "Tes 5 dari 6", H1 "Speaker", paragraf "Naikkan volume, putar suara, lalu ketik 3 angka yang kamu dengar."
- Panel tengah (`--c-primary-tint`, radius 16px): tombol bulat 96px `--c-primary` dengan cincin 10px `--c-primary-ring` dan ikon speaker 40px.
  - Label di bawah tombol: "Putar suara" sebelum diputar, "Memutar…" saat diputar (tombol nonaktif, ikon beranimasi pelan), "Putar lagi" setelahnya.
  - Caption "Sudah diputar {n} kali" muncul setelah putaran pertama.
- "Angka yang kamu dengar" + 3 kotak input digit (grid 3, tinggi 72px, radius 12px, mono 32px/600). Kotak aktif diberi border 2px `--c-primary`. Ketik satu digit langsung pindah ke kotak berikutnya, backspace kembali ke kotak sebelumnya. Pakai `inputmode="numeric"`.
- Caption "Kesempatan {k} dari 2".
- Jika salah pada kesempatan 1: kotak dikosongkan, banner gagal "Angka belum cocok. Dengarkan sekali lagi." muncul, angka baru diacak, dan suara diputar ulang otomatis.
- Footer: tombol utama "Cek Jawaban" (nonaktif sampai 3 digit terisi) + tombol teks "Tidak terdengar suara apa pun".

### 7. Tes 6, Mikrofon (`design/TesMikrofon.dc.html`)

- Header "Tes 6 dari 6", H1 "Mikrofon", paragraf "Tekan Rekam, lalu ucapkan dengan suara biasa: **"Halo, tes satu dua tiga."**"
- Panel level suara: label "Level suara" + timer mono "00:02 / 00:03". Di bawahnya area bar setinggi 110px berisi 40 bar vertikal (flex 1, gap 3px, radius 2px, tinggi minimal 4px). Bar dengan level > 30% berwarna `--c-primary`, sisanya `--c-primary-light`. Bar bergeser dari kanan ke kiri selama merekam.
- **State awal**: panel berisi bar datar. Footer: tombol utama "Rekam" dengan ikon mikrofon.
- **State merekam** (3 detik): timer berjalan, bar hidup, tombol berubah menjadi "Merekam…" (nonaktif).
- **State selesai, suara terdeteksi** (mockup): banner sukses "Suara terdeteksi" dengan teks "Dengarkan rekamannya untuk memastikan suara jernih", tombol sekunder "Putar rekaman" (ikon play biru), footer pasangan "Suara tidak jelas" dan "Jelas, lanjut", serta tombol teks "Rekam ulang".
- **State selesai, tidak ada suara**: banner gagal "Tidak ada suara terdeteksi" dengan teks "Dekatkan HP ke mulut dan bicara lebih keras". Footer: tombol utama "Rekam ulang" + tombol sekunder "Tandai bermasalah".

### 8. Ringkasan (`design/Ringkasan.dc.html`)

- Header biasa: "Ringkasan hasil" (tanpa indikator langkah).
- Baris HP: ikon HP 46px di kotak `--c-primary-tint`, nama "{Merek} {Model}" (16px/800), sub "{Penyimpanan} · {Warna} · {kondisi singkat}", dan link "Ubah" di kanan. Kondisi singkat: "Mulus" / "Lecet halus" / "Ada retak".
- Pill hitungan: "{a} lulus", "{b} bermasalah", "{c} dilewati". Pill dengan nilai 0 tetap ditampilkan.
- Kartu daftar 6 tes (border `--c-border-soft`, radius 14px, pemisah antarbaris `--c-divider`). Setiap baris berisi nama (15px/700) + detail (13px muted), pill status, dan tombol ikon ulangi 36px (`aria-label="Ulangi tes {nama}"`).
- Footer: tombol utama "Buat Laporan". Saat mengirim, tombol berisi spinner + "Membuat laporan…" dan nonaktif. Jika gagal: toast "Gagal membuat laporan. Periksa koneksi, lalu coba lagi."

### 9. Laporan siap (`design/LaporanSiap.dc.html`)

- Tanpa header. Bagian tengah berisi lingkaran 64px `--c-primary` dengan cincin 8px `--c-primary-ring` dan ikon centang 32px, H1 "Laporan siap", lalu paragraf "Tempel teks di bawah ke deskripsi iklan OLX-mu. Pembeli bisa membuka laporan lengkap lewat link."
- Kotak link: border `--c-border`, radius 12px, berisi ikon link, URL tanpa `https://` dalam mono dan terpotong dengan ellipsis, serta tombol "Salin" kecil (`--c-primary-soft`). Tombol ini menyalin URL lengkap dengan `https://`.
- "Teks untuk iklan" + blok teks (`--c-bg-page`, border `--c-track`, radius 12px, 13.5px, line-height 1.6, `white-space: pre-line`) berisi teks iklan persis seperti yang akan disalin.
- Footer: tombol utama "Salin teks untuk iklan" (ikon salin), lalu pasangan "Lihat laporan" (link ke `/r/{ID}`, tab baru) dan "Bagikan link" (`navigator.share`, atau salin URL jika tidak tersedia).
- Tambahan di bawah footer: tombol teks "Inspeksi HP lain" yang menghapus sesi dan kembali ke Beranda.

### 10. Laporan publik (`design/LaporanPublik.dc.html`, file `public/report.html`)

- Latar halaman `--c-bg-page`. Header putih berborder bawah berisi logo kecil 30px + "Self Inspection", dengan ID mono "#{ID}" di kanan.
- Kartu 1: eyebrow "Laporan inspeksi HP", H1 "{Merek} {Model}", sub "{Penyimpanan} · {Warna}", baris ikon kalender "Diinspeksi {tanggal}, {jam} WIB", lalu pill hitungan. Pill dengan nilai 0 disembunyikan di halaman ini.
- Kartu 2, "Hasil tes": 6 baris berisi lingkaran status 26px (pass: `--c-pass` + centang; fail: `--c-fail` + tanda seru; skipped: `--c-skip-bg` + strip `--c-skip-ink`), nama + detail, dan pill status.
- Kartu 3, "Keterangan dari penjual": grid 2 kolom (label 112px) berisi Kondisi fisik, Kelengkapan ("–" jika kosong), dan Catatan (baris disembunyikan jika kosong).
- Kartu 4, "Info perangkat": Sistem operasi, Resolusi layar, RAM, Prosesor.
- Disclaimer (`--c-primary-soft`, ikon info): "Inspeksi dilakukan mandiri oleh penjual langsung di HP ini lewat browser. Tetap cek ulang saat bertemu penjual."
- Kartu memakai latar putih, border 1px `--c-track`, dan radius 16px.
- State memuat: kerangka abu-abu. State tidak ditemukan: ikon + "Laporan tidak ditemukan" + "Periksa kembali link dari penjual."
- `<title>`: "Laporan {Merek} {Model} – Self Inspection". Tambahkan meta Open Graph (`og:title`, `og:description` berisi ringkasan "5 lulus, 1 bermasalah") agar pratinjau link di WhatsApp rapi. Meta ini harus di-render di server (lihat API.md).

## Layar tambahan (tidak ada di mockup)

**Izin dibutuhkan**: header biasa "Izin kamera & mikrofon". Lingkaran ikon gembok 64px `--c-primary-tint`, lalu H1 "Izinkan kamera dan mikrofon", lalu paragraf "Self Inspection butuh akses kamera dan mikrofon untuk menjalankan tes." Di bawahnya daftar langkah bernomor (ini memang urutan langkah):
1. Ketuk ikon di kiri alamat web
2. Pilih Izin
3. Aktifkan Kamera dan Mikrofon

Footer: tombol utama "Coba lagi" + tombol teks "Lanjut tanpa izin". Jika lanjut tanpa izin, tes kamera dan mikrofon otomatis dilewati.

## Aksesibilitas & detail

- Fokus keyboard terlihat: `outline: 2px solid var(--c-primary); outline-offset: 2px`.
- Hormati `prefers-reduced-motion`: matikan animasi bar dan kedip.
- Transisi antarlayar: fade 150ms (atau tanpa animasi).
- Setiap pergantian layar di-scroll ke atas dan fokus dipindah ke H1.
