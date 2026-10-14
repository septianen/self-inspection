// report-text.js: SATU-SATUNYA tempat teks hasil inspeksi dibuat.
// Dipakai oleh Ringkasan, teks iklan, dan halaman laporan publik (report-page.js).
// Tidak menyentuh DOM, jadi aman diimpor dari mana saja.

export const PUBLIC_BASE_URL = 'https://jual.mietek.tech';

// Urutan tes tetap, sama dengan docs/API.md.
export const TEST_KEYS = ['touch', 'color', 'cameraBack', 'cameraFront', 'speaker', 'mic'];

export const TEST_NAMES = {
  touch: 'Layar sentuh',
  color: 'Warna layar',
  cameraBack: 'Kamera belakang',
  cameraFront: 'Kamera depan',
  speaker: 'Speaker',
  mic: 'Mikrofon',
};

export const STATUS_LABEL = { pass: 'Lulus', fail: 'Bermasalah', skipped: 'Dilewati' };

export const CONDITION_LONG = {
  like_new: 'Mulus, seperti baru',
  minor_scratches: 'Lecet halus bekas pemakaian',
  cracked: 'Ada retak atau penyok',
};

export const CONDITION_SHORT = {
  like_new: 'Mulus',
  minor_scratches: 'Lecet halus',
  cracked: 'Ada retak',
};

const ISSUE_LABEL = {
  dead_pixel: 'titik mati',
  lines: 'garis',
  blotch: 'bercak',
  uneven: 'warna tidak rata',
};

const AD_MARK = { pass: '✓', fail: '✗', skipped: '–' };

// ---------- Tanggal & waktu (zona Asia/Jakarta) ----------

export function formatDate(value) {
  const d = new Date(value);
  const text = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta',
  }).format(d);
  return text.replace(/\./g, ''); // buang titik singkatan bulan ("Okt."): "14 Okt 2026"
}

export function formatTime(value) {
  const d = new Date(value);
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Jakarta',
  }).format(d).replace(':', '.'); // "12.40"
}

// ---------- Data HP ----------

// "Samsung Galaxy A54 5G". Jika merek "Lainnya", hanya model.
export function phoneTitle(phone) {
  return phone.brand === 'Lainnya' ? phone.model : `${phone.brand} ${phone.model}`;
}

// ---------- Hasil tes ----------

function megapixelText(data) {
  return data && data.megapixels ? `${data.megapixels} MP` : null;
}

// Teks `detail` (Ringkasan + laporan publik) dari status + data.
export function buildDetail(key, result) {
  const status = result ? result.status : 'skipped';
  const data = (result && result.data) || {};

  if (status === 'skipped') {
    if (data.reason === 'no_permission') {
      if (key === 'cameraBack' || key === 'cameraFront') return 'Izin kamera tidak diberikan';
      if (key === 'mic') return 'Izin mikrofon tidak diberikan';
    }
    return 'Tidak dites';
  }

  switch (key) {
    case 'touch': {
      const total = data.total || 112;
      return status === 'pass'
        ? `Semua ${total} area merespons`
        : `${data.untouched} dari ${total} area tidak merespons`;
    }
    case 'color':
      return status === 'pass'
        ? 'Tidak ada titik mati atau garis'
        : `Ditemukan: ${(data.issues || []).map((i) => ISSUE_LABEL[i]).join(', ')}`;
    case 'cameraBack':
    case 'cameraFront': {
      if (status === 'pass') {
        const mp = megapixelText(data);
        return mp ? `${mp}, gambar jelas` : 'Gambar jelas';
      }
      if (data.autoCheck === 'error') return 'Kamera tidak bisa dibuka';
      if (data.autoCheck === 'dark') return 'Gambar gelap atau kosong';
      return 'Gambar buram atau rusak';
    }
    case 'speaker':
      if (status === 'pass') return 'Penjual mengenali suara uji';
      return data.reason === 'no_sound' ? 'Tidak ada suara terdengar' : 'Penjual tidak bisa mengenali suara uji';
    case 'mic':
      if (status === 'pass') return 'Suara terdeteksi dan jelas';
      return data.detected === false ? 'Tidak ada suara terdeteksi' : 'Suara rekaman tidak jelas';
    default:
      return '';
  }
}

// Teks pendek untuk satu baris di iklan.
function buildAdLine(key, result) {
  const status = result ? result.status : 'skipped';
  const data = (result && result.data) || {};
  if (status === 'skipped') return 'dilewati';

  switch (key) {
    case 'touch':
      return status === 'pass' ? 'normal' : 'ada area tidak merespons';
    case 'color':
      return status === 'pass'
        ? 'tidak ada dead pixel'
        : `ada ${(data.issues || []).map((i) => ISSUE_LABEL[i]).join(', ')}`;
    case 'cameraBack':
    case 'cameraFront': {
      if (status !== 'pass') return 'bermasalah';
      const mp = megapixelText(data);
      return mp ? `berfungsi (${mp})` : 'berfungsi';
    }
    default:
      return status === 'pass' ? 'berfungsi' : 'bermasalah';
  }
}

// results: { touch: {status, data}, ... }. Tes yang belum ada dianggap dilewati.
export function countStatuses(results) {
  const counts = { pass: 0, fail: 0, skipped: 0 };
  TEST_KEYS.forEach((key) => {
    const status = results[key] ? results[key].status : 'skipped';
    counts[status] += 1;
  });
  return counts;
}

// Teks iklan. `id` boleh '{ID}' (dikirim ke server, yang menggantinya dengan ID asli).
export function buildAdText(phone, results, { id = '{ID}', date = new Date() } = {}) {
  const head = [phoneTitle(phone), phone.storage, phone.color].filter(Boolean).join(' · ');
  const lines = TEST_KEYS.map((key) => {
    const status = results[key] ? results[key].status : 'skipped';
    return `${AD_MARK[status]} ${TEST_NAMES[key]}: ${buildAdLine(key, results[key])}`;
  });

  return [
    `Hasil Inspeksi Mandiri – ${formatDate(date)}`,
    head,
    '',
    ...lines,
    '',
    `Laporan lengkap: ${PUBLIC_BASE_URL.replace(/^https?:\/\//, '')}/r/${id}`,
  ].join('\n');
}
