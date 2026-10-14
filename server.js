// Server Self Inspection: menyajikan public/, API laporan (SQLite), dan halaman /r/:id.
const express = require('express');
const Database = require('better-sqlite3');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3100;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'reports.db');
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || 'https://jual.mietek.tech').replace(/\/$/, '');

// ---------- Database ----------

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id          TEXT PRIMARY KEY,
    created_at  TEXT NOT NULL,
    phone       TEXT NOT NULL,
    device      TEXT NOT NULL,
    tests       TEXT NOT NULL,
    ad_text     TEXT NOT NULL,
    user_agent  TEXT
  )
`);
const insertReport = db.prepare(
  'INSERT INTO reports (id, created_at, phone, device, tests, ad_text, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)'
);
const findReport = db.prepare('SELECT * FROM reports WHERE id = ?');

// ---------- Konstanta validasi (sama dengan form di index.html) ----------

const BRANDS = ['Samsung', 'Xiaomi', 'OPPO', 'vivo', 'realme', 'Lainnya'];
const STORAGES = ['64 GB', '128 GB', '256 GB', '512 GB'];
const ACCESSORIES = ['Dus', 'Kabel data', 'Kepala charger', 'Nota pembelian'];
const CONDITIONS = ['like_new', 'minor_scratches', 'cracked'];
const TEST_KEYS = ['touch', 'color', 'cameraBack', 'cameraFront', 'speaker', 'mic'];
const STATUSES = ['pass', 'fail', 'skipped'];

const ID_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // tanpa 0, 1, I, L, O
const ID_PATTERN = /^[2-9A-HJKMNP-Z]{6}$/;

// ---------- Pembantu ----------

class ValidationError extends Error {}

function fail(message) {
  throw new ValidationError(message);
}

// String opsional/wajib dengan batas panjang. Spasi di awal/akhir dipotong.
function str(value, { max, required = false, label }) {
  if (value === undefined || value === null || value === '') {
    if (required) fail(`${label} wajib diisi`);
    return '';
  }
  if (typeof value !== 'string') fail(`${label} tidak valid`);
  const text = value.trim();
  if (required && !text) fail(`${label} wajib diisi`);
  if (text.length > max) fail(`${label} terlalu panjang (maksimal ${max} karakter)`);
  return text;
}

function numberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function generateId() {
  for (let attempt = 0; attempt < 5; attempt++) {
    let id = '';
    for (let i = 0; i < 6; i++) id += ID_ALPHABET[crypto.randomInt(ID_ALPHABET.length)];
    if (!findReport.get(id)) return id;
  }
  throw new Error('Gagal membuat ID unik');
}

// Hanya field yang dikenal yang disimpan. Semua dicek ulang di server.
function validateReport(body) {
  if (!body || typeof body !== 'object') fail('Data laporan tidak valid');
  const p = body.phone;
  if (!p || typeof p !== 'object') fail('Data HP tidak ada');

  const phone = {
    brand: str(p.brand, { max: 30, required: true, label: 'Merek' }),
    model: str(p.model, { max: 60, required: true, label: 'Model' }),
    storage: str(p.storage, { max: 10, required: true, label: 'Penyimpanan' }),
    color: str(p.color, { max: 30, label: 'Warna' }),
    accessories: [],
    condition: str(p.condition, { max: 20, required: true, label: 'Kondisi fisik' }),
    notes: str(p.notes, { max: 300, label: 'Catatan' }),
  };
  if (!BRANDS.includes(phone.brand)) fail('Merek tidak dikenal');
  if (!STORAGES.includes(phone.storage)) fail('Penyimpanan tidak dikenal');
  if (!CONDITIONS.includes(phone.condition)) fail('Kondisi fisik tidak dikenal');
  if (p.accessories !== undefined) {
    if (!Array.isArray(p.accessories)) fail('Kelengkapan tidak valid');
    phone.accessories = p.accessories.filter((a, i, arr) => arr.indexOf(a) === i);
    if (!phone.accessories.every((a) => ACCESSORIES.includes(a))) fail('Kelengkapan tidak dikenal');
  }

  const d = body.device && typeof body.device === 'object' ? body.device : {};
  const screen = d.screen && typeof d.screen === 'object' ? d.screen : null;
  const device = {
    os: typeof d.os === 'string' ? d.os.trim().slice(0, 40) : null,
    browser: typeof d.browser === 'string' ? d.browser.trim().slice(0, 40) : null,
    modelCode: typeof d.modelCode === 'string' ? d.modelCode.trim().slice(0, 40) : null,
    screen: screen && numberOrNull(screen.width) && numberOrNull(screen.height)
      ? { width: screen.width, height: screen.height } : null,
    ramGb: numberOrNull(d.ramGb),
    cpuCores: numberOrNull(d.cpuCores),
    batteryPct: numberOrNull(d.batteryPct),
  };

  const t = body.tests;
  if (!t || typeof t !== 'object') fail('Hasil tes tidak ada');
  const keys = Object.keys(t);
  if (keys.length !== TEST_KEYS.length || !TEST_KEYS.every((k) => keys.includes(k))) {
    fail('Hasil tes harus berisi tepat 6 tes');
  }
  const tests = {};
  TEST_KEYS.forEach((key) => {
    const r = t[key];
    if (!r || typeof r !== 'object' || !STATUSES.includes(r.status)) fail('Status tes tidak valid');
    const detail = str(r.detail, { max: 120, label: 'Detail tes' });
    let data = r.data && typeof r.data === 'object' && !Array.isArray(r.data) ? r.data : {};
    if (JSON.stringify(data).length > 1000) data = {}; // data tes selalu kecil
    tests[key] = { status: r.status, detail, data };
  });

  const adText = str(body.adText, { max: 1000, required: true, label: 'Teks iklan' });
  if (!adText.includes('{ID}')) fail('Teks iklan tidak valid');

  return { phone, device, tests, adText };
}

// ---------- Format untuk meta Open Graph ----------

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatDateId(iso) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta',
  }).format(new Date(iso)).replace(/\./g, '');
}

function phoneTitle(phone) {
  return phone.brand === 'Lainnya' ? phone.model : `${phone.brand} ${phone.model}`;
}

// ---------- App ----------

const app = express();
app.set('trust proxy', 1); // di belakang Nginx
app.use(express.json({ limit: '20kb' }));

app.get('/healthz', (req, res) => res.type('text').send('ok'));

// Rate limit sederhana di memori: maksimal 30 laporan per IP per jam.
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const hits = new Map(); // ip -> [timestamp]

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

app.post('/api/reports', (req, res) => {
  if (rateLimited(req.ip)) {
    return res.status(429).json({ error: 'Terlalu banyak laporan. Coba lagi nanti.' });
  }
  let report;
  try {
    report = validateReport(req.body);
  } catch (error) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    throw error;
  }

  const id = generateId();
  const createdAt = new Date().toISOString();
  const adText = report.adText.replaceAll('{ID}', id);
  insertReport.run(
    id, createdAt,
    JSON.stringify(report.phone), JSON.stringify(report.device), JSON.stringify(report.tests),
    adText, String(req.get('user-agent') || '').slice(0, 300)
  );
  res.status(201).json({ id, url: `${PUBLIC_BASE_URL}/r/${id}`, adText, createdAt });
});

// Mengambil laporan dari DB, atau null. ID dinormalkan ke huruf besar.
function loadReport(rawId) {
  const id = String(rawId).toUpperCase();
  if (!ID_PATTERN.test(id)) return null;
  const row = findReport.get(id);
  if (!row) return null;
  return {
    id: row.id,
    createdAt: row.created_at,
    phone: JSON.parse(row.phone),
    device: JSON.parse(row.device),
    tests: JSON.parse(row.tests),
  };
}

app.get('/api/reports/:id', (req, res) => {
  const report = loadReport(req.params.id);
  if (!report) return res.status(404).json({ error: 'Laporan tidak ditemukan' });
  res.json(report);
});

// Halaman laporan publik. Meta OG disisipkan di server karena crawler WhatsApp tidak
// menjalankan JavaScript.
app.get('/r/:id', (req, res) => {
  const html = fs.readFileSync(path.join(__dirname, 'public', 'report.html'), 'utf8');
  const report = loadReport(req.params.id);

  if (!report) {
    const meta = '<title>Laporan tidak ditemukan – Self Inspection</title>';
    return res.status(404).type('html').send(html.replace('<!--OG-->', meta));
  }

  const counts = { pass: 0, fail: 0, skipped: 0 };
  TEST_KEYS.forEach((key) => { counts[report.tests[key].status] += 1; });
  const summary = [`${counts.pass} lulus`];
  if (counts.fail) summary.push(`${counts.fail} bermasalah`);
  if (counts.skipped) summary.push(`${counts.skipped} dilewati`);
  summary.push(`Diinspeksi ${formatDateId(report.createdAt)}`);

  const title = phoneTitle(report.phone);
  const meta = [
    `<meta property="og:title" content="${escapeHtml(`Laporan Inspeksi: ${title}`)}">`,
    `<meta property="og:description" content="${escapeHtml(summary.join(' · '))}">`,
    `<meta property="og:url" content="${escapeHtml(`${PUBLIC_BASE_URL}/r/${report.id}`)}">`,
    '<meta property="og:type" content="website">',
    `<title>${escapeHtml(`Laporan ${title} – Self Inspection`)}</title>`,
  ].join('\n  ');
  res.type('html').send(html.replace('<!--OG-->', meta));
});

// File statis. no-cache selama prototipe supaya perubahan JS/CSS langsung terlihat di HP.
app.use(
  express.static(path.join(__dirname, 'public'), {
    setHeaders(res, filePath) {
      if (/\.(js|css)$/.test(filePath)) res.setHeader('Cache-Control', 'no-cache');
    },
  })
);

// Penanganan error: JSON rusak atau terlalu besar -> pesan Indonesia, bukan stack trace.
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Data terlalu besar' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Data laporan tidak valid' });
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan di server' });
});

app.listen(PORT, () => console.log(`Self Inspection berjalan di http://localhost:${PORT}`));
