# PRD: Self Inspection

## Latar belakang

Pembeli HP bekas di OLX sering ragu terhadap kondisi barang karena hanya mengandalkan foto dan deskripsi penjual. Self Inspection memungkinkan penjual menguji fungsi utama HP langsung dari browser di HP tersebut, lalu menempelkan hasilnya ke iklan.

## Tujuan prototipe

1. Penjual bisa menyelesaikan seluruh inspeksi dalam sekitar 5 menit di HP Android dengan Chrome.
2. Hasil inspeksi tersimpan di server dan bisa dibuka siapa saja lewat link `https://jual.mietek.tech/r/{ID}`.
3. Penjual mendapat teks ringkas yang siap ditempel ke deskripsi iklan OLX.

## Pengguna

- **Penjual**: menjalankan inspeksi di HP yang akan dijual.
- **Pembeli**: membuka link laporan dari deskripsi iklan, tanpa login.

## Cakupan

**Tes (6, berurutan):**

1. Layar sentuh
2. Warna layar
3. Kamera belakang
4. Kamera depan
5. Speaker
6. Mikrofon

**Juga termasuk:** form data HP, deteksi info perangkat otomatis, ringkasan dengan opsi ulangi tes, penyimpanan laporan di server, halaman laporan publik, dan teks iklan.

**Tidak termasuk:** flash, IMEI, baterai, biometrik, sinyal, tombol fisik, skor, akun, anti-kecurangan, iPhone, dan foto di laporan.

## Alur pengguna

```
Beranda ─(Mulai Inspeksi + minta izin kamera & mikrofon)─▶ Data HP
  ─▶ Tes 1 Layar sentuh ─▶ Tes 2 Warna layar ─▶ Tes 3 Kamera belakang
  ─▶ Tes 4 Kamera depan ─▶ Tes 5 Speaker ─▶ Tes 6 Mikrofon
  ─▶ Ringkasan ─(Buat Laporan: POST ke server)─▶ Laporan siap

Pembeli: link /r/{ID} ─▶ Laporan publik
```

Aturan navigasi:

- Setiap layar tes punya tombol **Kembali** (ke layar sebelumnya) dan **Lewati** (status `skipped`, lanjut ke tes berikut).
- Di **Ringkasan**, ikon ulangi pada sebuah tes menjalankan **hanya tes itu**, lalu kembali ke Ringkasan.
- Link **Ubah** di Ringkasan membuka Data HP. Tombol bawahnya menjadi "Simpan" dan kembali ke Ringkasan.
- Setelah laporan dibuat, tombol Kembali tidak lagi tersedia. Inspeksi baru dimulai dari Beranda.
- Tombol back bawaan Android/Chrome menjalankan aksi yang sama dengan tombol Kembali di aplikasi (pakai History API).

## Izin perangkat

- Saat "Mulai Inspeksi" ditekan, panggil `getUserMedia({ video: true, audio: true })` sekali untuk memunculkan dialog izin, lalu langsung hentikan semua track.
- Jika ditolak, tampilkan layar **Izin dibutuhkan**. Layar ini tidak ada di mockup; ikuti gaya layar lain (lihat DESIGN.md §Layar tambahan). Isinya instruksi membuka ikon gembok di address bar → Izin → izinkan Kamera dan Mikrofon, plus tombol "Coba lagi".
- Jika satu jenis izin ditolak tetapi penjual tetap ingin lanjut, tes terkait otomatis berstatus `skipped` dengan detail "Izin kamera tidak diberikan" atau "Izin mikrofon tidak diberikan".

## Data HP (diisi penjual)

| Field | Tipe | Wajib | Pilihan / contoh |
|---|---|---|---|
| Merek | select | Ya | Samsung, Xiaomi, OPPO, vivo, realme, Infinix, Tecno, Google Pixel, Lainnya |
| Model | text (maks. 60) | Ya | "Galaxy A54 5G" |
| Penyimpanan | chip tunggal | Ya | 32 GB, 64 GB, 128 GB, 256 GB, 512 GB, 1 TB |
| Warna | text (maks. 30) | Tidak | "Hitam" |
| Kelengkapan | chip ganda | Tidak | Dus, Kabel data, Kepala charger, Nota pembelian |
| Kondisi fisik | radio | Ya | Mulus, seperti baru / Lecet halus bekas pemakaian / Ada retak atau penyok |
| Catatan | textarea (maks. 300) | Tidak | bebas |

Jika merek "Lainnya", teks model ditampilkan apa adanya tanpa nama merek.

Tombol "Lanjut ke Tes" nonaktif sampai semua field wajib terisi.

## Info perangkat (otomatis)

Sistem operasi, versi Chrome, resolusi layar fisik, RAM (perkiraan), jumlah inti CPU, dan level baterai saat ini. Detail cara membacanya ada di `TESTS.md` §Deteksi perangkat. Nilai yang tidak tersedia ditampilkan sebagai "Tidak terdeteksi".

## Aturan hasil per tes

Status yang dipakai: `pass` (Lulus), `fail` (Bermasalah), `skipped` (Dilewati).

| Tes | Lulus jika | Bermasalah jika |
|---|---|---|
| Layar sentuh | Semua kotak grid tersentuh | Penjual menekan "Ada area yang tidak bisa disentuh" |
| Warna layar | Penjual memilih "Tidak ada masalah" | Penjual mencentang minimal satu masalah lalu "Simpan masalah" |
| Kamera belakang/depan | Cek otomatis normal **dan** penjual menekan "Ya, jelas" | Cek otomatis gagal (gambar hitam/kosong), kamera gagal dibuka, atau penjual menekan "Buram / rusak" |
| Speaker | 3 angka cocok dalam maksimal 2 kesempatan | Salah 2 kali, atau "Tidak terdengar suara apa pun" |
| Mikrofon | Suara terdeteksi otomatis **dan** penjual menekan "Jelas, lanjut" | Tidak ada suara terdeteksi setelah rekaman, atau penjual menekan "Suara tidak jelas" |

## Teks detail per hasil

Dipakai di Ringkasan dan laporan publik (`detail`). Teks pendek untuk iklan (`adText`) didefinisikan terpisah. Simpan semua teks ini di `report-text.js` sebagai satu sumber.

| Tes | Status | `detail` | `adText` |
|---|---|---|---|
| Layar sentuh | pass | Semua {n} area merespons | normal |
| | fail | {k} dari {n} area tidak merespons | ada area tidak merespons |
| Warna layar | pass | Tidak ada titik mati atau garis | tidak ada dead pixel |
| | fail | Ditemukan: {daftar masalah, huruf kecil, dipisah koma} | ada {daftar masalah} |
| Kamera belakang | pass | {mp} MP, gambar jelas | berfungsi ({mp} MP) |
| | fail | Gambar buram atau rusak / Kamera tidak bisa dibuka / Gambar gelap atau kosong | bermasalah |
| Kamera depan | (sama seperti kamera belakang) | | |
| Speaker | pass | Penjual mengenali suara uji | berfungsi |
| | fail | Penjual tidak bisa mengenali suara uji / Tidak ada suara terdengar | bermasalah |
| Mikrofon | pass | Suara terdeteksi dan jelas | berfungsi |
| | fail | Tidak ada suara terdeteksi / Suara rekaman tidak jelas | bermasalah |
| semua | skipped | Tidak dites | dilewati |

Jika MP tidak diketahui, hilangkan bagian "{mp} MP" dan tanda kurungnya.

## Format teks iklan

```
Hasil Inspeksi Mandiri – {tanggal, mis. 14 Okt 2026}
{Merek} {Model} · {Penyimpanan} · {Warna}

✓ Layar sentuh: normal
✓ Warna layar: tidak ada dead pixel
✓ Kamera belakang: berfungsi (12 MP)
✓ Kamera depan: berfungsi (8 MP)
✗ Speaker: bermasalah
– Mikrofon: dilewati

Laporan lengkap: jual.mietek.tech/r/{ID}
```

- Penanda: `✓` pass, `✗` fail, `–` skipped.
- Bagian "· {Warna}" dihilangkan jika warna kosong.
- Tanggal memakai zona waktu `Asia/Jakarta` dan format `id-ID` (`d MMM yyyy`, singkatan bulan Indonesia: Jan, Feb, Mar, Apr, Mei, Jun, Jul, Agu, Sep, Okt, Nov, Des).

## Laporan publik

Menampilkan data HP, waktu inspeksi (contoh "14 Okt 2026, 12.40 WIB"), jumlah lulus/bermasalah/dilewati, hasil 6 tes, keterangan dari penjual, info perangkat, dan disclaimer "inspeksi mandiri". Jika ID tidak ditemukan, tampilkan "Laporan tidak ditemukan".

## Perilaku khusus

- **Akses dari desktop atau non-Android**: di Beranda tampilkan peringatan "Self Inspection dirancang untuk HP Android dengan Chrome", tetapi tetap izinkan lanjut.
- **Layar tetap menyala**: aktifkan Screen Wake Lock selama inspeksi berlangsung, dan abaikan jika gagal.
- **Refresh halaman**: progres (data HP + hasil tes yang sudah selesai) dipulihkan dari `sessionStorage`. Tes yang sedang berjalan diulang dari awal.
