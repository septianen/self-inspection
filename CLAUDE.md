# Self Inspection

Aplikasi web untuk inspeksi mandiri HP bekas sebelum dijual di OLX Indonesia. Penjual membuka web ini di HP yang akan dijual, menjalankan 6 tes hardware langsung di browser, lalu mendapat laporan berisi link publik dan teks siap tempel untuk deskripsi iklan.

Ini **prototipe hackathon**. Prioritasnya: alur berjalan mulus dari awal sampai akhir di HP Android. Kode harus sederhana dan mudah dibaca, karena pemilik proyek adalah Android developer (Kotlin) yang belum terbiasa dengan web.

- Domain produksi: `https://jual.mietek.tech`
- Laporan publik: `https://jual.mietek.tech/r/{ID}`
- Target perangkat: **Android + Chrome saja**. iPhone, desktop, dan browser bawaan aplikasi di luar cakupan.

## Dokumen

Baca dokumen yang relevan sebelum mengerjakan bagian terkait:

| File | Isi |
|---|---|
| `docs/PRD.md` | Cakupan produk, alur pengguna, aturan lulus/gagal tiap tes, format teks iklan |
| `docs/DESIGN.md` | Token warna, tipografi, komponen, dan spesifikasi setiap layar |
| `docs/TESTS.md` | Implementasi teknis 6 tes (Web API, algoritma, ambang batas, edge case) |
| `docs/API.md` | Struktur data laporan, skema SQLite, endpoint backend |
| `docs/DEPLOY.md` | Langkah deploy ke VPS Ubuntu 24 (Nginx, HTTPS, pm2) |
| `docs/TASKS.md` | Urutan pengerjaan dan kriteria selesai per milestone |
| `design/*.dc.html` | Mockup asli dari Claude Design, **referensi visual saja** (lihat di bawah) |

## Tentang folder `design/`

File `design/*.dc.html` adalah ekspor dari kanvas Claude Design. Format ini **tidak bisa dijalankan langsung**: ada tag khusus (`<x-dc>`, `<sc-for>`, `<helmet>`) dan script `support.js` yang tidak tersedia di sini. Gunakan file ini hanya untuk:

- menyalin nilai visual yang persis (warna, ukuran font, padding, radius, ikon SVG inline),
- memastikan copy (teks UI) sama dengan desain.

Jangan menyalin struktur tag khususnya ke kode produksi. Tulis ulang sebagai HTML + CSS biasa dengan class dan file CSS terpisah.

## Stack (wajib)

- **Frontend**: HTML + CSS + JavaScript biasa (ES modules via `<script type="module">`). **Tanpa** framework (React/Vue/dll), **tanpa** bundler, **tanpa** proses build, **tanpa** TypeScript.
- **Backend**: Node.js (>= 20) + Express + `better-sqlite3`. Satu file `server.js`.
- **Font**: Google Fonts, yaitu Plus Jakarta Sans (teks) dan IBM Plex Mono (angka, ID, resolusi).
- Dependensi npm seminimal mungkin: `express`, `better-sqlite3`. Hindari menambah paket lain tanpa alasan kuat.

## Struktur proyek

```
self-inspection/
├── CLAUDE.md
├── package.json
├── server.js              # Express: API + menyajikan public/
├── data/                  # SQLite (dibuat otomatis, di-.gitignore)
├── design/                # Mockup referensi (jangan diubah)
├── docs/
└── public/
    ├── index.html         # Aplikasi inspeksi (single page, berganti layar)
    ├── report.html        # Halaman laporan publik /r/{ID}
    ├── css/
    │   └── style.css      # Semua token + komponen
    └── js/
        ├── app.js         # State, navigasi layar, alur utama
        ├── device.js      # Deteksi info perangkat otomatis
        ├── report-text.js # Pembuat teks iklan + label status
        ├── report-page.js # Logika report.html
        └── tests/
            ├── touch.js
            ├── color.js
            ├── camera.js  # Dipakai kamera belakang & depan
            ├── speaker.js
            └── mic.js
```

## Perintah

```bash
npm install
npm run dev     # node --watch server.js, port 3100
npm start       # node server.js
```

Kamera dan mikrofon **hanya jalan di HTTPS atau `localhost`**. Untuk mencoba di HP Android saat development, pakai port forwarding Chrome DevTools (`chrome://inspect` → Port forwarding `3100 → localhost:3100`), lalu buka `http://localhost:3100` di HP.

## Aturan kode

- Bahasa UI: **Bahasa Indonesia**, informal tapi sopan (pakai "kamu"). Copy diambil dari `docs/DESIGN.md`.
- Nama variabel, fungsi, dan file: bahasa Inggris. Komentar boleh Bahasa Indonesia.
- Setiap modul tes mengekspor satu fungsi `run(container, ctx)` yang mengembalikan `Promise<TestResult>` (lihat `docs/TESTS.md`). Modul tes tidak boleh mengubah state global secara langsung.
- Selalu matikan `MediaStream` (`track.stop()`) saat keluar dari tes kamera atau mikrofon.
- **Privasi**: foto dari tes kamera dan rekaman mikrofon tidak boleh dikirim ke server dan tidak boleh disimpan di storage. Hapus referensi blob atau canvas setelah dicek.
- Teks dari pengguna yang ditampilkan di halaman (model, catatan, dll.) wajib dipasang dengan `textContent`, jangan `innerHTML`.
- Semua warna lewat CSS custom properties di `:root` (lihat `docs/DESIGN.md`). Jangan menulis hex langsung di komponen.
- Tombol minimal tinggi 44px. Gunakan elemen semantik (`<button>`, `<label>`, `<input>`).
- Simpan progres inspeksi di `sessionStorage` agar tidak hilang jika halaman di-refresh.

## Di luar cakupan (jangan dikerjakan)

Tes flash, IMEI, kesehatan baterai, sidik jari, sinyal, tombol fisik, sistem skor/grade, login atau akun, fitur anti-kecurangan, dukungan iPhone, dan menampilkan foto hasil tes di laporan.
