// app.js: state inspeksi, navigasi antar layar, dan penyimpanan sesi.
//
// Untuk yang terbiasa Android: anggap setiap <section data-screen="..."> sebagai
// satu "Fragment", dan showScreen() sebagai FragmentManager yang menampilkan satu per satu.

const STORAGE_KEY = 'selfInspection.session.v1';
const TEST_COUNT = 6;

// ---------- State ----------

// Satu objek state untuk seluruh inspeksi. Disimpan ke sessionStorage setiap berubah,
// supaya refresh halaman tidak menghilangkan progres (sessionStorage hilang saat tab ditutup).
const state = {
  screen: 'home',   // 'home' | 'data' | 'test-1'..'test-6' | 'summary' | 'ready'
  phone: null,      // diisi form Data HP (M2)
  device: null,     // hasil deteksi perangkat (M2)
  results: {},      // hasil tes per key (M3-M5)
  report: null,     // { id, url, adText } setelah laporan dibuat (M6)
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
  state.phone = null;
  state.device = null;
  state.results = {};
  state.report = null;
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
  if (['home', 'data', 'summary', 'ready'].includes(name)) return true;
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

  render(name);
}

// Hanya menggambar layar tanpa menyentuh riwayat (dipakai juga oleh popstate).
function render(name) {
  const section = sectionNameFor(name);
  screens.forEach((el) => el.classList.toggle('is-active', el.dataset.screen === section));

  if (section === 'test') renderTestPlaceholder(testNumber(name));
  if (section === 'home') renderHome();

  // Aksesibilitas: scroll ke atas dan pindahkan fokus ke judul layar.
  window.scrollTo(0, 0);
  const active = document.querySelector('.screen.is-active');
  const heading = active && active.querySelector('h1, h2');
  if (heading) heading.focus({ preventScroll: true });
}

// Tombol back Android / Chrome memicu 'popstate' dengan state entri riwayat sebelumnya.
window.addEventListener('popstate', (event) => {
  const name = event.state && event.state.screen;

  // Setelah laporan dibuat, tombol Kembali tidak tersedia: tetap di layar "ready".
  if (state.screen === 'ready' && name !== 'ready') {
    history.pushState({ screen: 'ready' }, '');
    return;
  }

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

// Android + Chrome? Versi sederhana untuk M1; deteksi lengkap ada di device.js (M2).
function isAndroidChrome() {
  const ua = navigator.userAgent;
  return /Android/.test(ua) && /Chrome\//.test(ua) && !/(EdgA|OPR|SamsungBrowser)\//.test(ua);
}

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

// ---------- Placeholder tes (M1) ----------

const TEST_NAMES = ['Layar sentuh', 'Warna layar', 'Kamera belakang', 'Kamera depan', 'Speaker', 'Mikrofon'];

function renderTestPlaceholder(n) {
  document.getElementById('test-step').textContent = `Tes ${n} dari ${TEST_COUNT}`;
  document.getElementById('test-title').textContent = TEST_NAMES[n - 1];
  document.querySelectorAll('#test-progress > span').forEach((seg, i) => {
    seg.classList.toggle('is-done', i + 1 <= n);
  });
}

function nextTest() {
  const name = state.screen;
  const n = testNumber(name);
  showScreen(n < TEST_COUNT ? `test-${n + 1}` : 'summary');
}

// ---------- Event ----------

document.getElementById('btn-start').addEventListener('click', () => {
  // Lanjutkan: ke layar terakhir yang tersimpan. Mulai baru: ke Data HP
  // (M2 menambahkan permintaan izin kamera/mikrofon di sini).
  const resumeTo = hasSavedProgress() && isValidScreen(state.screen) && state.screen !== 'home'
    ? state.screen
    : 'data';
  showScreen(resumeTo);
});

document.getElementById('btn-restart').addEventListener('click', () => {
  resetState();
  clearState();
  showScreen('data');
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
  else if (target.dataset.action === 'skip' || target.dataset.action === 'next-test') nextTest();
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
