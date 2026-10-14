# TESTS: implementasi teknis

Semua tes berjalan di **Chrome Android** lewat HTTPS. Aturan lulus/gagal dan teks detail ada di `PRD.md`, sedangkan tampilan ada di `DESIGN.md`. Dokumen ini membahas cara kerjanya.

## Kontrak modul tes

Setiap file di `public/js/tests/` mengekspor:

```js
/**
 * @param {HTMLElement} container  elemen layar tempat tes dirender
 * @param {object} ctx              { index, total, facing?, onBack, onSkip }
 * @returns {Promise<TestResult>}
 */
export async function run(container, ctx) { ... }

// TestResult
{
  status: 'pass' | 'fail' | 'skipped',
  data: { ... }   // spesifik per tes, lihat di bawah
}
```

- `app.js` memanggil `run()`, menunggu hasilnya, lalu menyimpan `{ status, data, detail }`. Nilai `detail` dibuat oleh `report-text.js` dari `status` + `data`, sehingga teks hanya ditentukan di satu tempat.
- Tombol **Lewati** me-resolve `{ status: 'skipped', data: {} }`. Tombol **Kembali** me-reject dengan `new Error('back')`, lalu `app.js` menangani navigasinya.
- Setiap modul wajib membersihkan diri sebelum resolve/reject: hentikan `MediaStream`, tutup `AudioContext`, batalkan `requestAnimationFrame`, lepas event listener, keluar dari fullscreen jika memang modul itu yang masuk.

## Deteksi perangkat (`device.js`)

```js
export async function detectDevice() -> {
  os: 'Android 14' | null,
  browser: 'Chrome 129' | null,
  modelCode: 'SM-A546E' | null,   // disimpan, tidak ditampilkan
  screen: { width: 1080, height: 2340 } | null,
  ramGb: 8 | null,                // dari navigator.deviceMemory
  cpuCores: 8 | null,
  batteryPct: 82 | null,
  isAndroidChrome: true | false,
  userAgent: '...'
}
```

| Info | Sumber | Catatan |
|---|---|---|
| OS & model | `navigator.userAgentData.getHighEntropyValues(['platformVersion','model','fullVersionList'])` | `platformVersion` "14.0.0" menjadi "Android 14". Fallback: regex `/Android (\d+)/` pada `navigator.userAgent` |
| Browser | `fullVersionList` / `brands`, cari "Google Chrome" lalu "Chromium" | Ambil versi mayor saja |
| Resolusi | `Math.round(screen.width * devicePixelRatio)` × `Math.round(screen.height * devicePixelRatio)` | Urutkan agar angka kecil di depan (potret). Hasilnya perkiraan |
| RAM | `navigator.deviceMemory` | Chrome membatasi maksimal 8. Tampilan: `>= 8` menjadi "8 GB atau lebih", selain itu "Sekitar {n} GB" |
| CPU | `navigator.hardwareConcurrency` | "{n} inti" |
| Baterai | `navigator.getBattery()` → `Math.round(level * 100)` | Bungkus try/catch |
| Android+Chrome | `userAgentData.platform === 'Android'` dan brand Chrome ada | Untuk banner peringatan di Beranda |

Semua pemanggilan dibungkus try/catch. Field yang gagal dibaca bernilai `null` dan ditampilkan sebagai "Tidak terdeteksi".

## Utilitas bersama

- **Fullscreen**: `document.documentElement.requestFullscreen({ navigationUI: 'hide' })`. Hanya bisa dipanggil **di dalam handler sentuhan/klik**. Jika ditolak, pakai overlay `position: fixed; inset: 0; height: 100dvh`. Dengarkan `fullscreenchange`: jika pengguna keluar lewat tombol back Android di tengah tes sentuh/warna, kembali ke layar sebelumnya tanpa menyimpan hasil.
- **Wake lock**: `navigator.wakeLock.request('screen')` saat inspeksi dimulai, dan minta ulang saat `visibilitychange` menjadi visible. Abaikan error.
- **Getaran ringan** (opsional): `navigator.vibrate(10)` saat sel sentuh terisi. Hanya jika tidak mengganggu.

## Tes 1: Layar sentuh (`touch.js`)

**Data**: `{ cols: 8, rows: 14, total: 112, untouched: number }`

1. Tes dimulai dari tap "Lanjut ke Tes", jadi masuk fullscreen di dalam handler tap itu (sebelum `await` apa pun).
2. Render grid 8×14 dengan CSS grid ukuran penuh. Simpan status sel di `Uint8Array(112)`.
3. Pasang `touchstart` dan `touchmove` di **container layar penuh** (bukan per sel) dengan `{ passive: false }` + `preventDefault()`, dan CSS `touch-action: none`. Untuk setiap `changedTouches`:
   - `col = floor((clientX - rect.left) / (rect.width / 8))`, `row` dihitung serupa. Clamp ke rentang valid.
   - Tandai sel. Jika sebelumnya belum tersentuh, tambah hitungan dan perbarui pill.
   - Agar sapuan cepat tidak melompati sel, interpolasikan titik antara posisi sebelumnya dan sekarang untuk setiap `touch.identifier`, dengan langkah ≤ setengah lebar sel.
4. Pill atas memakai `pointer-events: none`. Tombol bawah ("Ada area…") tetap ikut dihitung. Sentuhan yang dimulai di atas tombol tetap menandai sel lewat handler container, dan tombol hanya dianggap ditekan jika jari diangkat di atasnya dengan total geseran < 10px.
5. Saat semua 112 sel tersentuh: kedipkan hijau 300ms, lalu resolve `pass`. **Jangan keluar fullscreen**, karena tes warna berikutnya juga memakainya.
6. Tombol "Ada area yang tidak bisa disentuh" me-resolve `fail` dengan `untouched = 112 - touched`.
7. Grid dihitung ulang saat `resize` (misalnya fullscreen baru aktif).

## Tes 2: Warna layar (`color.js`)

**Data**: `{ issues: Array<'dead_pixel' | 'lines' | 'blotch' | 'uneven'> }`

Label isu untuk teks: dead_pixel = "titik mati", lines = "garis", blotch = "bercak", uneven = "warna tidak rata".

**Fase A**:
1. Jika sudah fullscreen (lanjutan dari tes 1), langsung mulai. Jika belum (misalnya diulang dari Ringkasan), tampilkan fase B dulu dengan swatch dan petunjuk "Ketuk ⟳ untuk melihat warna". Fase A dimulai dari tap tombol "Lihat warna lagi", yang merupakan gestur pengguna sehingga fullscreen diizinkan.
2. Tampilkan `<div>` penuh layar berwarna. Satu `click` di mana saja berarti warna berikutnya. Beri debounce 250ms agar tap ganda tidak melompati warna.
3. Sembunyikan kursor dan elemen lain. Indikator "1/5" berupa teks putih/hitam semi-transparan, dikontraskan dengan warna latar.
4. Setelah warna kelima, panggil `document.exitFullscreen()`, lalu tampilkan fase B.

**Fase B**: checkbox → tombol sesuai DESIGN.md. "Tidak ada masalah" menghasilkan `pass` dengan `issues: []`, sedangkan "Simpan masalah" menghasilkan `fail` dengan isu yang dicentang.

## Tes 3 & 4: Kamera (`camera.js`)

`ctx.facing` bernilai `'environment'` (belakang) atau `'user'` (depan).

**Data**: `{ width, height, megapixels, autoCheck: 'ok' | 'dark' | 'error', verdict: 'clear' | 'blurry' | null, error?: string }`

1. **Buka kamera**:
   ```js
   getUserMedia({ video: {
     facingMode: { exact: ctx.facing },
     width: { ideal: 1920 }, height: { ideal: 1080 }
   }, audio: false })
   ```
   Jika gagal dengan `OverconstrainedError`, coba lagi tanpa `exact`. Jika tetap gagal (`NotAllowedError`, `NotReadableError`, dll.), tampilkan state error, dan "Tandai bermasalah" menghasilkan `fail` dengan `autoCheck: 'error'`.
2. Pasang stream ke `<video playsinline muted autoplay>`.
3. **Resolusi kamera** (untuk label MP), urutan sumber:
   1. `new ImageCapture(track).getPhotoCapabilities()` → `imageWidth.max`, `imageHeight.max` (biasanya resolusi foto penuh sensor di Chrome Android).
   2. Fallback `track.getCapabilities().width.max` / `.height.max`.
   3. Fallback `track.getSettings().width/height`.

   `megapixels = w*h/1e6`, dibulatkan ke bilangan bulat terdekat (jika < 10, simpan satu desimal lalu buang `.0`). Tulis `width`/`height` sebagai sisi panjang × sisi pendek.
4. **Ambil foto**: gambar frame video saat ini ke `<canvas>` yang ditampilkan di viewfinder (frame dibekukan), lalu hentikan stream.
5. **Cek otomatis** dari frame itu, diperkecil ke canvas 160×120 untuk analisis:
   - Hitung luminans tiap piksel `0.2126R + 0.7152G + 0.0722B`, lalu `mean` dan `stdDev`.
   - `mean < 12` berarti `dark` (lensa tertutup atau kamera mati).
   - `stdDev < 6` berarti `dark` juga (gambar rata, tidak ada detail).
   - Selain itu `ok`.
6. **Keputusan**:
   - "Ya, jelas" → `pass`, `verdict: 'clear'`
   - "Buram / rusak" → `fail`, `verdict: 'blurry'`
   - "Ambil ulang foto" → kembali ke langkah 1
   - Jika `dark`, sembunyikan "Ya, jelas" (lihat DESIGN.md).
7. **Privasi**: setelah resolve, kosongkan canvas (`canvas.width = 0`), hapus `video.srcObject`, dan jangan membuat blob atau data URL. Tidak ada data gambar yang ikut ke `data`.

## Tes 5: Speaker (`speaker.js`)

**Data**: `{ mode: 'speech' | 'beep', attempts: 1 | 2, reason?: 'wrong' | 'no_sound' }`

1. Acak 3 digit 1–9, dengan dua digit berurutan tidak boleh sama. Angka 0 tidak dipakai karena "nol" mudah tertukar.
2. **Mode suara (utama)**: Web Speech API.
   - Muat suara dengan `speechSynthesis.getVoices()`. Jika kosong, tunggu event `voiceschanged` maksimal 1,5 detik.
   - Pilih suara dengan `lang` berawalan `id`. Jika tidak ada, pakai **mode bip**.
   - Ucapkan per digit dalam `SpeechSynthesisUtterance` terpisah dengan kata Indonesia (satu, dua, tiga, empat, lima, enam, tujuh, delapan, sembilan), `rate = 0.85`, `volume = 1`, dan jeda 600ms antardigit. Resolve "selesai diputar" setelah `onend` utterance terakhir.
   - Mulai **hanya dari tap tombol Putar** (Chrome Android memblokir audio tanpa gestur).
3. **Mode bip (fallback)**: setiap digit dimainkan sebagai sejumlah bip (digit 1–5 saja untuk mode ini). Bip berupa `OscillatorNode` 880Hz selama 150ms dengan jeda 200ms, dan jeda antarkelompok 900ms. Ganti teks instruksi menjadi "Hitung bunyi bip di setiap kelompok, lalu ketik jumlahnya." Mode bip juga dipakai jika `speechSynthesis` melempar error.
4. Bandingkan 3 digit input:
   - Cocok → `pass`.
   - Salah pada kesempatan 1 → digit baru, kotak dikosongkan, putar ulang otomatis (masih dalam gestur tap "Cek Jawaban").
   - Salah pada kesempatan 2 → `fail`, `reason: 'wrong'`.
5. "Tidak terdengar suara apa pun" → `fail`, `reason: 'no_sound'`.
6. Bersihkan dengan `speechSynthesis.cancel()` dan tutup `AudioContext` saat keluar.

## Tes 6: Mikrofon (`mic.js`)

**Data**: `{ detected: boolean, peakRms: number, verdict: 'clear' | 'unclear' | null }`

1. Tap "Rekam" (gestur):
   ```js
   getUserMedia({ audio: {
     echoCancellation: false, noiseSuppression: false, autoGainControl: false
   }})
   ```
   Buat `AudioContext` (panggil `resume()`), `MediaStreamSource`, lalu `AnalyserNode` (`fftSize = 1024`).
2. Rekam **3 detik** dengan `MediaRecorder` (`audio/webm;codecs=opus` jika `isTypeSupported`, selain itu default), bersamaan dengan loop `requestAnimationFrame`:
   - `getFloatTimeDomainData` → `rms = sqrt(mean(x²))`.
   - 250ms pertama dipakai sebagai **noise floor** (rata-rata RMS).
   - `threshold = max(0.02, noiseFloor * 3)`.
   - Akumulasikan durasi frame dengan `rms > threshold`. Catat `peakRms`.
   - Bar visual: setiap ~75ms dorong `level = min(1, rms / 0.25)` ke array 40 bar, lalu render.
3. Setelah 3 detik, hentikan recorder dan stream. `detected = durasiDiAtasThreshold >= 300ms`.
4. "Putar rekaman" memakai `new Audio(URL.createObjectURL(blob))`. Panggil `revokeObjectURL` setelah `ended` dan saat keluar dari tes.
5. Keputusan:
   - "Jelas, lanjut" → `pass`
   - "Suara tidak jelas" → `fail`, `verdict: 'unclear'`
   - Tidak terdeteksi + "Tandai bermasalah" → `fail`, `detected: false`
   - "Rekam ulang" → ulangi dari langkah 1
6. **Privasi**: blob rekaman dibuang (variabel di-null-kan, URL di-revoke) dan tidak pernah diunggah.

## Pengujian manual (checklist sebelum demo)

Uji di minimal 2 HP Android berbeda, lewat `https://jual.mietek.tech`:

- [ ] Dialog izin kamera & mikrofon muncul saat "Mulai Inspeksi"
- [ ] Menolak izin → layar "Izin dibutuhkan", lalu "Lanjut tanpa izin" membuat tes kamera/mic berstatus dilewati
- [ ] Tes sentuh: sapuan cepat diagonal mengisi sel tanpa celah, dan multi-jari berfungsi
- [ ] Tes sentuh → tes warna tetap fullscreen tanpa tap tambahan
- [ ] Tombol back Android saat fullscreen tidak membuat aplikasi macet
- [ ] Kamera belakang & depan: label MP masuk akal, menutup lensa → "terlalu gelap"
- [ ] Speaker: suara Indonesia terdengar; jika suara Indonesia tidak ada, mode bip berjalan
- [ ] Mikrofon: diam → tidak terdeteksi; bicara → terdeteksi; rekaman bisa diputar
- [ ] Refresh di tengah inspeksi → progres pulih
- [ ] Ulangi satu tes dari Ringkasan → kembali ke Ringkasan dengan hasil baru
- [ ] Teks iklan yang disalin sama persis dengan pratinjau
- [ ] Link `/r/{ID}` terbuka di HP lain dan di WhatsApp menampilkan pratinjau
