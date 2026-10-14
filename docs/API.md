# API & data

Backend: satu file `server.js` (Express + better-sqlite3). Server menyajikan `public/`, API JSON, dan halaman laporan publik.

## Konfigurasi

| Env | Default | Keterangan |
|---|---|---|
| `PORT` | `3100` | Port lokal, di produksi di belakang Nginx |
| `DB_PATH` | `./data/reports.db` | Folder dibuat otomatis jika belum ada |
| `PUBLIC_BASE_URL` | `https://jual.mietek.tech` | Dipakai untuk URL di respons dan meta OG |

- `app.set('trust proxy', 1)` karena server berada di belakang Nginx.
- `express.json({ limit: '20kb' })`.

## Bentuk data laporan

Dikirim klien saat "Buat Laporan" ditekan. Field `id`, `createdAt`, dan `userAgent` diisi server.

```json
{
  "phone": {
    "brand": "Samsung",
    "model": "Galaxy A54 5G",
    "storage": "256 GB",
    "color": "Hitam",
    "accessories": ["Dus", "Kabel data"],
    "condition": "minor_scratches",
    "notes": "Pemakaian 1,5 tahun, belum pernah servis."
  },
  "device": {
    "os": "Android 14",
    "browser": "Chrome 129",
    "modelCode": "SM-A546E",
    "screen": { "width": 1080, "height": 2340 },
    "ramGb": 8,
    "cpuCores": 8,
    "batteryPct": 82
  },
  "tests": {
    "touch":       { "status": "pass", "detail": "Semua 112 area merespons", "data": { "cols": 8, "rows": 14, "total": 112, "untouched": 0 } },
    "color":       { "status": "pass", "detail": "Tidak ada titik mati atau garis", "data": { "issues": [] } },
    "cameraBack":  { "status": "pass", "detail": "12 MP, gambar jelas", "data": { "width": 4000, "height": 3000, "megapixels": 12, "autoCheck": "ok", "verdict": "clear" } },
    "cameraFront": { "status": "pass", "detail": "8 MP, gambar jelas", "data": { "width": 3264, "height": 2448, "megapixels": 8, "autoCheck": "ok", "verdict": "clear" } },
    "speaker":     { "status": "fail", "detail": "Penjual tidak bisa mengenali suara uji", "data": { "mode": "speech", "attempts": 2, "reason": "wrong" } },
    "mic":         { "status": "pass", "detail": "Suara terdeteksi dan jelas", "data": { "detected": true, "peakRms": 0.21, "verdict": "clear" } }
  },
  "adText": "Hasil Inspeksi Mandiri – 14 Okt 2026\n..."
}
```

Nilai `condition`:

| Nilai | Teks panjang | Teks singkat |
|---|---|---|
| `like_new` | Mulus, seperti baru | Mulus |
| `minor_scratches` | Lecet halus bekas pemakaian | Lecet halus |
| `cracked` | Ada retak atau penyok | Ada retak |

Urutan tes tetap: `touch`, `color`, `cameraBack`, `cameraFront`, `speaker`, `mic`. Nama tampilannya: Layar sentuh, Warna layar, Kamera belakang, Kamera depan, Speaker, Mikrofon. Simpan mapping ini di `report-text.js` dan pakai juga oleh `report-page.js`.

`adText` dikirim tanpa ID (berisi placeholder `{ID}`). Server mengganti `{ID}` dengan ID sebenarnya sebelum menyimpan, lalu mengembalikan teks final.

## Skema SQLite

```sql
CREATE TABLE IF NOT EXISTS reports (
  id          TEXT PRIMARY KEY,           -- 6 karakter
  created_at  TEXT NOT NULL,              -- ISO 8601 UTC
  phone       TEXT NOT NULL,              -- JSON
  device      TEXT NOT NULL,              -- JSON
  tests       TEXT NOT NULL,              -- JSON
  ad_text     TEXT NOT NULL,
  user_agent  TEXT
);
```

Aktifkan `PRAGMA journal_mode = WAL;` saat start.

## ID laporan

- 6 karakter dari alfabet tanpa karakter yang mirip: `23456789ABCDEFGHJKMNPQRSTUVWXYZ`.
- Buat dengan `crypto.randomInt`, lalu cek bentrok di DB (coba ulang maksimal 5 kali).
- Pencocokan rute bersifat case-insensitive: ubah ke huruf besar sebelum query.

## Endpoint

### `POST /api/reports`

Simpan laporan baru.

**Validasi** (tolak dengan `400 { error: "<pesan Indonesia>" }`):

- `phone.brand` ada di daftar merek (PRD). `phone.model` berupa string 1–60 karakter. `phone.storage` ada di daftar kapasitas. `phone.condition` ada di 3 nilai di atas.
- `phone.color` ≤ 30, `phone.notes` ≤ 300, `phone.accessories` ⊆ daftar kelengkapan.
- `tests` punya tepat 6 key di atas. Setiap `status` ∈ {pass, fail, skipped} dan `detail` ≤ 120 karakter.
- `adText` ≤ 1000 dan mengandung `{ID}`.
- Potong spasi di awal/akhir semua string. Abaikan field tak dikenal (jangan disimpan).

**Respons** `201`:

```json
{ "id": "7K2Q9M", "url": "https://jual.mietek.tech/r/7K2Q9M", "adText": "…teks final…", "createdAt": "2026-10-14T05:40:12.000Z" }
```

**Rate limit sederhana** (in-memory): maksimal 30 laporan per IP per jam, dan selebihnya `429 { error: "Terlalu banyak laporan. Coba lagi nanti." }`.

### `GET /api/reports/:id`

`200` berisi objek lengkap `{ id, createdAt, phone, device, tests }` (tanpa `user_agent`, tanpa `adText`), atau `404 { error: "Laporan tidak ditemukan" }`.

### `GET /r/:id`

Sajikan `public/report.html`, dengan meta Open Graph disisipkan di server agar pratinjau link di WhatsApp rapi:

- `report.html` berisi placeholder `<!--OG-->` di dalam `<head>`.
- Jika laporan ada, ganti placeholder dengan:
  ```html
  <meta property="og:title" content="Laporan Inspeksi: Samsung Galaxy A54 5G">
  <meta property="og:description" content="5 lulus · 1 bermasalah · Diinspeksi 14 Okt 2026">
  <meta property="og:url" content="https://jual.mietek.tech/r/7K2Q9M">
  <meta property="og:type" content="website">
  <title>Laporan Samsung Galaxy A54 5G – Self Inspection</title>
  ```
  Semua nilai **wajib di-escape** (HTML entity untuk `& < > " '`).
- Jika tidak ada: ganti placeholder dengan `<title>Laporan tidak ditemukan – Self Inspection</title>` dan tetap kirim halaman dengan status `404`. Klien yang menampilkan state tidak ditemukan.
- `report-page.js` mengambil ID dari `location.pathname`, memanggil `GET /api/reports/:id`, lalu merender isinya dengan `textContent`.

### `GET /healthz`

Mengembalikan `200 ok`, untuk dicek setelah deploy.

### Statis

`express.static('public')` dengan `index.html` di `/`. Untuk file `.js`/`.css`, set `Cache-Control: no-cache` selama prototipe agar perubahan langsung terlihat.

## Format waktu

Server menyimpan UTC. Klien menampilkan dalam `Asia/Jakarta`:

```js
const d = new Date(createdAt);
const date = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(d);
// "14 Okt 2026"
const time = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(d);
// "12.40"
```

Periksa hasil singkatan bulan dari `Intl`. Jika muncul titik (misalnya "Okt."), hapus titiknya.
