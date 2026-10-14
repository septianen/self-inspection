// app.js: state inspeksi, navigasi antar layar, dan penyimpanan sesi.
//
// Untuk yang terbiasa Android: anggap setiap <section data-screen="..."> sebagai
// satu "Fragment", dan showScreen() sebagai FragmentManager yang menampilkan satu per satu.

import { detectDevice, formatDevice, isAndroidChrome } from './device.js';
import { initPhoneForm, fillPhone, isPhoneValid } from './phone-form.js';
import * as touchTest from './tests/touch.js';
import * as colorTest from './tests/color.js';
import * as cameraTest from './tests/camera.js';
import * as speakerTest from './tests/speaker.js';
import * as micTest from './tests/mic.js';
import { renderSummary, renderReady } from './screen-result.js';
import { TEST_KEYS, buildDetail, buildAdText } from './report-text.js';
import {
  requestMediaPermissions, keepScreenOn, allowScreenOff, exitFullscreen, copyText, showToast,
} from './util.js';

const STORAGE_KEY = 'selfInspection.session.v1';
const TEST_COUNT = 6;

// ---------- State ----------

// Satu objek state untuk seluruh inspeksi. Disimpan ke sessionStorage setiap berubah,
// supaya refresh halaman tidak menghilangkan progres (sessionStorage hilang saat tab ditutup).
const state = {
  screen: 'home',   // 'home' | 'permission' | 'data' | 'test-1'..'test-6' | 'summary' | 'ready'
  permissions: { camera: true, mic: true }, // false = ditolak; tes terkait otomatis dilewati (M4)
  phone: null,      // diisi form Data HP (M2)
  device: null,     // hasil deteksi perangkat (M2)
  results: {},      // hasil tes per key (M3-M5)
  report: null,     // { id, url, adText } setelah laporan dibuat
  retest: null,     // nomor tes (1-6) yang diulang dari Ringkasan; setelah selesai kembali ke Ringkasan
  editFromSummary: false, // Data HP dibuka lewat "Ubah" di Ringkasan: tombolnya jadi "Simpan"
};

function saveState() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // Storage bisa diblokir (mode privat). Aplikasi tetap jalan tanpa penyimpanan.
  }
}

function loadState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function clearState() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) { /* abaikan */ }
}

function resetState() {
  state.screen = 'home';
  state.permissions = { camera: true, mic: true };
  state.phone = null;
  state.device = null;
  state.results = {};
  state.report = null;
  state.retest = null;
  state.editFromSummary = false;
}

// ---------- Navigasi ----------

const screens = document.querySelectorAll('.screen');

// Nama layar 'test-3' dirender di <section data-screen="test">.
function sectionNameFor(name) {
  return name.startsWith('test-') ? 'test' : name;
}

function testNumber(name) {
  return Number(name.split('-')[1]);
}

function isValidScreen(name) {
  if (['home', 'permission', 'data', 'summary', 'ready'].includes(name)) return true;
  const n = testNumber(name);
  return name.startsWith('test-') && n >= 1 && n <= TEST_COUNT;
}

// Tampilkan layar. `push` = true menambah entri ke riwayat browser, sehingga tombol back
// Android/Chrome kembali ke layar sebelumnya (History API).
function showScreen(name, { push = true } = {}) {
  state.screen = name;
  saveState();

  if (push) {
    history.pushState({ screen: name }, '');
  } else {
    history.replaceState({ screen: name }, '');
  }

  arrivedByBack = false;
  render(name);
}

// Hanya menggambar layar tanpa menyentuh riwayat (dipakai juga oleh popstate).
function render(name) {
  const section = sectionNameFor(name);
  screens.forEach((el) => el.classList.toggle('is-active', el.dataset.screen === section));

  // Tes yang sedang berjalan dihentikan setiap pindah layar (mis. tombol back browser).
  stopActiveTest();
  if (section !== 'test') {
    state.retest = null;
    exitFullscreen(); // tes sentuh membiarkan fullscreen menyala untuk tes warna; keluar di sini
  }
  if (section !== 'data') state.editFromSummary = false;

  if (section === 'test') startTest(testNumber(name));
  if (section === 'home') renderHome();
  if (section === 'data') renderData();
  if (section === 'summary') renderSummary(state.phone, state.results, retestFromSummary);
  if (section === 'ready') renderReady(state.report);

  // Layar tetap menyala selama inspeksi berlangsung (bukan di Beranda / Laporan siap).
  if (section === 'home' || section === 'ready') allowScreenOff();
  else keepScreenOn();

  // Aksesibilitas: scroll ke atas dan pindahkan fokus ke judul layar.
  window.scrollTo(0, 0);
  const active = document.querySelector('.screen.is-active');
  const heading = active && active.querySelector('h1, h2');
  if (heading) heading.focus({ preventScroll: true });
}

// true jika layar saat ini dicapai lewat tombol back (popstate), bukan maju.
let arrivedByBack = false;

// Tombol back Android / Chrome memicu 'popstate' dengan state entri riwayat sebelumnya.
window.addEventListener('popstate', (event) => {
  let name = event.state && event.state.screen;
  // Entri 'ready' tanpa laporan (setelah "Inspeksi HP lain") tidak berarti apa-apa: ke Beranda.
  if (name === 'ready' && !state.report) name = null;

  // Setelah laporan dibuat, tombol Kembali tidak tersedia: tetap di layar "ready".
  if (state.screen === 'ready' && name !== 'ready') {
    history.pushState({ screen: 'ready' }, '');
    return;
  }

  arrivedByBack = true;
  if (name && isValidScreen(name)) {
    state.screen = name;
    saveState();
    render(name);
  } else {
    // Entri riwayat awal (tanpa state): kembali ke Beranda.
    state.screen = 'home';
    saveState();
    render('home');
  }
});

// Kembali = sama dengan menekan tombol back bawaan browser.
function goBack() {
  history.back();
}

// ---------- Beranda ----------

// Ada sesi tersimpan yang sudah melewati Beranda?
function hasSavedProgress() {
  return state.phone !== null || Object.keys(state.results).length > 0 || state.report !== null ||
    (state.screen !== 'home' && isValidScreen(state.screen));
}

function renderHome() {
  const resume = hasSavedProgress();
  document.getElementById('btn-start').textContent = resume ? 'Lanjutkan Inspeksi' : 'Mulai Inspeksi';
  document.getElementById('btn-restart').hidden = !resume;
  document.getElementById('device-warning').hidden = isAndroidChrome();
}

// ---------- Data HP ----------

const nextBtn = document.getElementById('btn-phone-next');

function renderData() {
  fillPhone(state.phone);
  nextBtn.textContent = state.editFromSummary ? 'Simpan' : 'Lanjut ke Tes';
  nextBtn.disabled = !(state.phone && isPhoneValid(state.phone));

  // Tampilkan hasil deteksi sebelumnya (jika ada), lalu perbarui (mis. level baterai).
  if (state.device) showDevice(state.device);
  detectDevice().then((info) => {
    state.device = info;
    saveState();
    showDevice(info);
  });
}

function showDevice(info) {
  const text = formatDevice(info);
  document.querySelectorAll('[data-device]').forEach((el) => {
    el.textContent = text[el.dataset.device];
  });
}

initPhoneForm((phone) => {
  state.phone = phone;
  saveState();
  nextBtn.disabled = !isPhoneValid(phone);
});

nextBtn.addEventListener('click', () => {
  if (state.editFromSummary) {
    state.editFromSummary = false;
    returnToSummary();
  } else {
    showScreen('test-1'); // juga memulai fullscreen tes sentuh (harus dari gestur ini)
  }
});

// ---------- Kembali ke Ringkasan (setelah ulangi tes / ubah data) ----------

// true jika entri Ringkasan masih ada tepat di belakang layar ini di riwayat browser.
// Tidak disimpan di sessionStorage: setelah refresh kita tidak bisa yakin, jadi pakai replace.
let summaryInHistory = false;

function returnToSummary() {
  if (summaryInHistory) {
    summaryInHistory = false;
    goBack();
  } else {
    showScreen('summary', { push: false });
  }
}

// Ikon ulangi di Ringkasan: jalankan hanya tes itu, lalu kembali ke Ringkasan.
function retestFromSummary(n) {
  summaryInHistory = true;
  state.retest = n;
  showScreen(`test-${n}`); // dari gestur klik, jadi fullscreen diizinkan
}

// ---------- Menjalankan tes ----------

// Urutan tes (sama dengan docs/API.md).
const TESTS = [
  { key: 'touch', module: touchTest },
  { key: 'color', module: colorTest },
  { key: 'cameraBack', module: cameraTest, facing: 'environment' },
  { key: 'cameraFront', module: cameraTest, facing: 'user' },
  { key: 'speaker', module: speakerTest },
  { key: 'mic', module: micTest },
];

const testRoot = document.getElementById('test-root');
let activeController = null; // AbortController tes yang sedang berjalan

// Membatalkan tes aktif. Modul tes mendengarkan `ctx.signal` lalu membersihkan dirinya
// (menutup fullscreen, melepas listener, dll.).
function stopActiveTest() {
  if (activeController) {
    activeController.abort();
    activeController = null;
  }
}

// Kontrak modul tes (docs/TESTS.md): run(container, ctx) -> Promise<{status, data}>.
// - Tombol Lewati me-resolve { status: 'skipped' }.
// - Tombol Kembali me-reject Error('back'), lalu kita jalankan history.back().
// PENTING: startTest dipanggil langsung dari handler klik (lewat showScreen) tanpa await,
// karena tes sentuh meminta fullscreen dan itu hanya boleh dari gestur pengguna.
function startTest(n) {
  const def = TESTS[n - 1];
  const controller = new AbortController();
  activeController = controller;

  testRoot.replaceChildren();
  const ctx = {
    index: n, total: TEST_COUNT, facing: def.facing,
    permissions: state.permissions, signal: controller.signal,
  };

  def.module.run(testRoot, ctx)
    .then((result) => {
      if (controller.signal.aborted) return;
      state.results[def.key] = result;
      saveState();
      // Diulang dari Ringkasan: kembali ke sana, bukan lanjut ke tes berikutnya.
      if (state.retest === n) {
        state.retest = null;
        returnToSummary();
        return;
      }
      // Tes yang dilewati otomatis karena izin ditolak tidak boleh menjebak pengguna:
      // jika layar ini dicapai dengan tombol back, lanjutkan mundur.
      if (result.status === 'skipped' && result.data.reason === 'no_permission' && arrivedByBack) {
        goBack();
        return;
      }
      showScreen(n < TEST_COUNT ? `test-${n + 1}` : 'summary');
    })
    .catch((error) => {
      if (controller.signal.aborted) return;
      if (error.message === 'back') goBack();
      else console.error(`Tes ${def.key} gagal:`, error);
    });
}

// ---------- Event ----------

const startBtn = document.getElementById('btn-start');

startBtn.addEventListener('click', async () => {
  // Lanjutkan sesi: langsung ke layar terakhir, izin sudah pernah diminta.
  if (hasSavedProgress() && isValidScreen(state.screen) && state.screen !== 'home') {
    showScreen(state.screen);
    return;
  }
  await requestPermissionsThenContinue(startBtn);
});

// Minta izin kamera & mikrofon (dialog Chrome). Ditolak -> layar "Izin dibutuhkan".
async function requestPermissionsThenContinue(button) {
  button.disabled = true;
  keepScreenOn(); // dimulai dari gestur klik
  try {
    state.permissions = await requestMediaPermissions();
  } finally {
    button.disabled = false;
  }
  saveState();
  const allGranted = state.permissions.camera && state.permissions.mic;
  showScreen(allGranted ? 'data' : 'permission');
}

document.getElementById('btn-restart').addEventListener('click', (event) => {
  resetState();
  clearState();
  requestPermissionsThenContinue(event.currentTarget);
});

document.getElementById('btn-permission-retry').addEventListener('click', (event) => {
  requestPermissionsThenContinue(event.currentTarget);
});

// Lanjut tanpa izin: tes kamera dan mikrofon yang ditolak otomatis berstatus "skipped" (M4).
document.getElementById('btn-permission-skip').addEventListener('click', () => {
  showScreen('data');
});

// ---------- Ringkasan & Laporan siap ----------

document.getElementById('btn-edit-phone').addEventListener('click', () => {
  summaryInHistory = true;
  state.editFromSummary = true;
  showScreen('data');
});

// Susun payload sesuai docs/API.md.
function buildPayload() {
  const tests = {};
  TEST_KEYS.forEach((key) => {
    const r = state.results[key] || { status: 'skipped', data: {} };
    tests[key] = { status: r.status, detail: buildDetail(key, r), data: r.data };
  });
  const d = state.device || {};
  return {
    phone: state.phone,
    device: {
      os: d.os || null, browser: d.browser || null, modelCode: d.modelCode || null,
      screen: d.screen || null, ramGb: d.ramGb ?? null, cpuCores: d.cpuCores ?? null,
      batteryPct: d.batteryPct ?? null,
    },
    tests,
    adText: buildAdText(state.phone, state.results), // masih berisi {ID}
  };
}

// Kirim laporan ke server. Server memvalidasi ulang, membuat ID, dan mengembalikan
// { id, url, adText (sudah berisi ID asli), createdAt }.
async function createReport(payload) {
  const res = await fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || `HTTP ${res.status}`);
    error.userMessage = res.status === 429 || res.status === 400 ? data.error : null;
    throw error;
  }
  return data;
}

const createBtn = document.getElementById('btn-create-report');

createBtn.addEventListener('click', async () => {
  if (!state.phone) {
    showToast('Data HP belum diisi.');
    return;
  }
  createBtn.disabled = true;
  const spinner = document.createElement('span');
  spinner.className = 'spinner is-light';
  createBtn.replaceChildren(spinner, 'Membuat laporan…');
  try {
    state.report = await createReport(buildPayload());
    saveState();
    showScreen('ready');
  } catch (error) {
    showToast(error.userMessage || 'Gagal membuat laporan. Periksa koneksi, lalu coba lagi.');
  } finally {
    createBtn.disabled = false;
    createBtn.textContent = 'Buat Laporan';
  }
});

document.getElementById('btn-copy-link').addEventListener('click', async () => {
  const ok = await copyText(state.report.url);
  showToast(ok ? 'Link disalin' : 'Gagal menyalin');
});

document.getElementById('btn-copy-ad').addEventListener('click', async () => {
  const ok = await copyText(state.report.adText);
  showToast(ok ? 'Teks disalin' : 'Gagal menyalin');
});

// Web Share API membuka lembar bagikan Android. Jika tidak ada, salin link saja.
document.getElementById('btn-share').addEventListener('click', async () => {
  const { url } = state.report;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Laporan inspeksi HP', url });
    } catch (e) { /* pengguna menutup lembar bagikan */ }
    return;
  }
  const ok = await copyText(url);
  showToast(ok ? 'Link disalin' : 'Gagal menyalin');
});

document.getElementById('btn-new').addEventListener('click', () => {
  resetState();
  clearState();
  showScreen('home');
});

// Delegasi event: satu listener untuk semua tombol ber-atribut data-action / data-goto.
document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action], [data-goto]');
  if (!target) return;

  if (target.dataset.goto) showScreen(target.dataset.goto);
  else if (target.dataset.action === 'back') goBack();
});

// ---------- Mulai ----------

function init() {
  const saved = loadState();
  if (saved) Object.assign(state, saved);

  // Refresh halaman selalu mendarat di Beranda. Jika ada progres tersimpan, tombol
  // "Lanjutkan Inspeksi" membawa pengguna ke layar terakhir (state.screen tetap dipertahankan).
  history.replaceState({ screen: 'home' }, '');
  render('home');
}

init();
