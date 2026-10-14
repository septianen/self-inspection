# TASKS: urutan pengerjaan

Kerjakan per milestone, berurutan. Di akhir setiap milestone, aplikasi harus bisa dijalankan (`npm run dev`) dan dicoba di HP. Centang item yang selesai, dan jangan mulai milestone berikutnya sebelum kriteria selesai terpenuhi.

## M1: Kerangka & navigasi

- [ ] `package.json` (scripts `dev`, `start`), `.gitignore` (`node_modules/`, `data/`)
- [ ] `server.js` minimal: static `public/`, `GET /healthz`
- [ ] `public/css/style.css`: token dari DESIGN.md + komponen dasar (tombol, header, header tes + progress, footer, input, chip, panel, banner, pill, toast)
- [ ] `public/index.html`: semua layar sebagai `<section data-screen="...">` (hanya satu yang tampil)
- [ ] `app.js`: state inspeksi, `showScreen(name)`, History API untuk tombol back, simpan/pulihkan dari `sessionStorage`
- [ ] Layar Beranda sesuai desain, termasuk varian "Lanjutkan Inspeksi"

**Selesai jika**: Beranda tampil persis seperti `design/Main.dc.html` di lebar 390px, dan berpindah layar (sementara dengan placeholder) berjalan, termasuk tombol back Android.

## M2: Data HP & izin

- [ ] `device.js` + panel "Terdeteksi otomatis"
- [ ] Form Data HP lengkap dengan validasi (PRD)
- [ ] Permintaan izin saat "Mulai Inspeksi" + layar "Izin dibutuhkan"
- [ ] Banner peringatan untuk non-Android/Chrome
- [ ] Wake lock

**Selesai jika**: di HP Android, info perangkat terisi dengan benar, form tidak bisa dilanjutkan tanpa field wajib, dan menolak izin menampilkan layar izin.

## M3: Tes layar (sentuh & warna)

- [ ] `tests/touch.js` (fullscreen, grid, interpolasi sapuan, multi-touch, tombol gagal)
- [ ] `tests/color.js` (fase A layar penuh, fase B pertanyaan, "Lihat warna lagi")
- [ ] Header tes + tombol Lewati/Kembali yang bisa dipakai ulang di semua tes
- [ ] Transisi tes 1 → tes 2 tetap fullscreen

**Selesai jika**: kedua tes menghasilkan `TestResult` yang benar untuk semua jalur (lulus, bermasalah, lewati, kembali).

## M4: Tes kamera, speaker, mikrofon

- [ ] `tests/camera.js` untuk belakang & depan (pratinjau, ambil foto, cek otomatis, label MP, state error)
- [ ] `tests/speaker.js` (mode suara id-ID + fallback bip, 2 kesempatan, input digit)
- [ ] `tests/mic.js` (rekam 3 detik, level bar, deteksi suara, putar ulang)
- [ ] Semua stream & audio dibersihkan saat keluar tes (cek ikon kamera/mic Android hilang)

**Selesai jika**: setiap tes berjalan di HP nyata. Menutup lensa memicu "terlalu gelap", dan diam saat tes mikrofon memicu "tidak terdeteksi".

## M5: Ringkasan & teks iklan

- [ ] `report-text.js`: nama tes, label status, `detail`, `adText`, format tanggal
- [ ] Layar Ringkasan (pill hitungan, daftar, ulangi satu tes, Ubah data)
- [ ] Layar Laporan siap (salin link, salin teks, bagikan, inspeksi lain)

**Selesai jika**: teks iklan sama persis dengan format di PRD untuk kombinasi lulus/bermasalah/dilewati, dan mengulang satu tes kembali ke Ringkasan.

## M6: Backend & laporan publik

- [ ] SQLite + `POST /api/reports` (validasi, ID, rate limit) + `GET /api/reports/:id`
- [ ] `GET /r/:id` dengan injeksi meta OG yang di-escape
- [ ] `report.html` + `report-page.js` (semua kartu, state memuat, state tidak ditemukan)
- [ ] Tombol "Buat Laporan" terhubung ke API, dengan state memuat dan error

**Selesai jika**: laporan dari HP bisa dibuka di HP lain lewat `/r/{ID}`, ID salah menampilkan "Laporan tidak ditemukan", dan input berbahaya (misalnya `<script>` di catatan) tampil sebagai teks biasa.

## M7: Deploy & uji akhir

- [ ] Deploy sesuai `DEPLOY.md`
- [ ] Jalankan checklist "Pengujian manual" di `TESTS.md` pada minimal 2 HP Android
- [ ] Rapikan bug tampilan di lebar 360px dan 430px

**Selesai jika**: seluruh checklist pengujian manual tercentang di `https://jual.mietek.tech`.
