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

// ---------- Fullscreen ----------

export function isFullscreen() {
  return Boolean(document.fullscreenElement);
}

// requestFullscreen hanya diizinkan Chrome jika dipanggil tak lama setelah gestur pengguna
// (tap/klik). Panggil ini langsung dari handler tap, sebelum `await` apa pun.
// Jika ditolak atau tidak didukung, tes tetap jalan karena layarnya sudah position: fixed
// menutupi seluruh viewport (hanya address bar yang tetap terlihat).
export async function enterFullscreen() {
  try {
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    return true;
  } catch (e) {
    return false;
  }
}

export async function exitFullscreen() {
  if (!document.fullscreenElement) return;
  try {
    await document.exitFullscreen();
  } catch (e) { /* abaikan */ }
}

// ---------- Clipboard & toast ----------

// Menyalin teks. navigator.clipboard hanya ada di HTTPS/localhost; fallback ke execCommand.
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { /* abaikan */ }
    area.remove();
    return ok;
  }
}

let toastTimer = null;

// Pill gelap di bawah layar, hilang setelah 2 detik.
export function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2000);
}

// ---------- Tinggi viewport ----------

// Menyimpan tinggi area yang benar-benar terlihat ke CSS variable `--app-height`.
// Di Chrome Android, `100vh`/`100dvh` bisa lebih tinggi dari area yang tampak (address bar,
// bar navigasi, transisi fullscreen), sehingga bagian bawah layar tertutup. window.innerHeight
// dan visualViewport.height selalu sesuai area yang terlihat.
export function trackViewportHeight() {
  const root = document.documentElement;
  const update = () => {
    const vv = window.visualViewport;
    const height = vv ? Math.min(vv.height, window.innerHeight) : window.innerHeight;
    root.style.setProperty('--app-height', `${Math.round(height)}px`);
  };
  update();
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', update);
  // Masuk/keluar fullscreen mengubah ukuran dengan animasi: hitung ulang setelah selesai.
  document.addEventListener('fullscreenchange', () => {
    update();
    setTimeout(update, 150);
    setTimeout(update, 500);
  });
}
