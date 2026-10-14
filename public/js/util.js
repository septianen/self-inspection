// util.js: fungsi bantu yang dipakai lintas layar.

// ---------- Izin kamera & mikrofon ----------

// Meminta izin dengan membuka stream sebentar lalu langsung mematikannya.
// getUserMedia memunculkan dialog izin Chrome. Hasilnya true jika diizinkan.
// (Jika perangkat tidak punya kamera/mikrofon, hasilnya juga false.)
async function askMedia(constraints) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    // Wajib dimatikan, kalau tidak lampu kamera/mic Android tetap menyala.
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (e) {
    return false;
  }
}

// Dua permintaan terpisah (bukan satu {video, audio}) agar tahu izin mana yang ditolak.
// Harus dipanggil dari handler klik (gestur pengguna).
export async function requestMediaPermissions() {
  const camera = await askMedia({ video: true });
  const mic = await askMedia({ audio: true });
  return { camera, mic };
}

// ---------- Wake lock (layar tetap menyala) ----------

let wakeLock = null;
let wantWakeLock = false;

async function acquireWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (e) {
    // Ditolak (mis. baterai hemat). Tidak fatal, abaikan.
  }
}

export function keepScreenOn() {
  wantWakeLock = true;
  if (!wakeLock) acquireWakeLock();
}

export function allowScreenOff() {
  wantWakeLock = false;
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}

// Chrome melepas wake lock otomatis saat tab disembunyikan. Minta lagi saat kembali tampil.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && wantWakeLock && !wakeLock) acquireWakeLock();
});
