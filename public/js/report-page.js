// report-page.js: halaman laporan publik /r/{ID}. Mengambil data dari API lalu menggambarnya.
// Semua teks dari penjual dipasang lewat textContent (lewat el()), tidak pernah innerHTML.

import { el } from './dom.js';
import { formatDevice } from './device.js';
import {
  TEST_KEYS, TEST_NAMES, STATUS_LABEL, CONDITION_LONG,
  buildDetail, countStatuses, phoneTitle, formatDate, formatTime,
} from './report-text.js';

const main = document.getElementById('report-main');

// SVG statis (bukan dari pengguna), jadi aman lewat innerHTML.
function svg(markup) {
  const tpl = document.createElement('template');
  tpl.innerHTML = markup;
  return tpl.content.firstElementChild;
}

const ICON_CALENDAR = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"></rect><path d="M3.5 10h17M8 3v4M16 3v4"></path></svg>';
const ICON_INFO = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v5M12 7.5v.01"></path></svg>';
const STATUS_ICON = {
  pass: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"></path></svg>',
  fail: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" aria-hidden="true"><path d="M12 6v8M12 18.5v.01"></path></svg>',
  skipped: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12"></path></svg>',
};
const ICON_NOT_FOUND = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-4-4M9 9l4 4M13 9l-4 4"></path></svg>';

function card(...children) {
  return el('section', { class: 'report-card' }, ...children);
}

function infoCell(label, value, mono = false) {
  return el('div', { class: 'info-cell' },
    el('span', { class: 'info-label', text: label }),
    el('span', { class: 'info-value' + (mono ? ' mono' : ''), text: value }));
}

function render(report) {
  const { phone, device, tests } = report;
  const title = phoneTitle(phone);
  const counts = countStatuses(tests);

  document.getElementById('report-id').textContent = `#${report.id}`;

  // Kartu 1: identitas HP + ringkasan
  const pills = [];
  if (counts.pass) pills.push(el('span', { class: 'pill pill-count is-pass', text: `${counts.pass} lulus` }));
  if (counts.fail) pills.push(el('span', { class: 'pill pill-count is-fail', text: `${counts.fail} bermasalah` }));
  if (counts.skipped) pills.push(el('span', { class: 'pill pill-count is-skipped', text: `${counts.skipped} dilewati` }));

  const summaryCard = card(
    el('span', { class: 'eyebrow', text: 'Laporan inspeksi HP' }),
    el('div', { class: 'report-title-block' },
      el('h1', { class: 'screen-title', text: title }),
      el('span', { class: 'report-sub', text: [phone.storage, phone.color].filter(Boolean).join(' · ') })),
    el('div', { class: 'report-date' }, svg(ICON_CALENDAR),
      el('span', { text: `Diinspeksi ${formatDate(report.createdAt)}, ${formatTime(report.createdAt)} WIB` })),
    el('div', { class: 'count-row' }, pills));

  // Kartu 2: hasil 6 tes
  const rows = TEST_KEYS.map((key) => {
    const r = tests[key];
    const detail = r.detail || buildDetail(key, r);
    const circle = el('div', { class: `status-circle is-${r.status}` });
    circle.appendChild(svg(STATUS_ICON[r.status]));
    return el('div', { class: 'report-row' },
      circle,
      el('div', { class: 'result-text' },
        el('span', { class: 'result-name', text: TEST_NAMES[key] }),
        el('span', { class: 'result-detail', text: detail })),
      el('span', { class: `pill is-${r.status}`, text: STATUS_LABEL[r.status] }));
  });
  const testsCard = el('section', { class: 'report-card report-card-flush' },
    el('div', { class: 'report-card-head' }, el('span', { class: 'section-title', text: 'Hasil tes' })),
    ...rows);

  // Kartu 3: keterangan penjual. Catatan disembunyikan jika kosong.
  const sellerRows = [
    el('span', { class: 'kv-label', text: 'Kondisi fisik' }),
    el('span', { class: 'kv-value', text: CONDITION_LONG[phone.condition] || '–' }),
    el('span', { class: 'kv-label', text: 'Kelengkapan' }),
    el('span', { class: 'kv-value', text: phone.accessories && phone.accessories.length ? phone.accessories.join(', ') : '–' }),
  ];
  if (phone.notes) {
    sellerRows.push(
      el('span', { class: 'kv-label', text: 'Catatan' }),
      el('span', { class: 'kv-value is-notes', text: phone.notes }));
  }
  const sellerCard = card(
    el('span', { class: 'section-title', text: 'Keterangan dari penjual' }),
    el('div', { class: 'kv-grid' }, sellerRows));

  // Kartu 4: info perangkat
  const text = formatDevice(device);
  const deviceCard = card(
    el('span', { class: 'section-title', text: 'Info perangkat' }),
    el('div', { class: 'info-grid' },
      infoCell('Sistem operasi', text.os),
      infoCell('Resolusi layar', text.screen, true),
      infoCell('RAM', text.ram),
      infoCell('Prosesor', text.cpu)));

  const disclaimer = el('div', { class: 'disclaimer' }, svg(ICON_INFO),
    el('span', { text: 'Inspeksi dilakukan mandiri oleh penjual langsung di HP ini lewat browser. Tetap cek ulang saat bertemu penjual.' }));

  main.replaceChildren(summaryCard, testsCard, sellerCard, deviceCard, disclaimer);
}

function renderNotFound() {
  const icon = el('div', { class: 'notfound-icon' });
  icon.appendChild(svg(ICON_NOT_FOUND));
  main.replaceChildren(el('div', { class: 'notfound' }, icon,
    el('h1', { class: 'screen-title', text: 'Laporan tidak ditemukan' }),
    el('p', { class: 'lead', text: 'Periksa kembali link dari penjual.' })));
}

function renderError() {
  main.replaceChildren(el('div', { class: 'notfound' },
    el('h1', { class: 'screen-title', text: 'Laporan belum bisa dibuka' }),
    el('p', { class: 'lead', text: 'Periksa koneksi internet, lalu muat ulang halaman ini.' })));
}

async function load() {
  // /r/7K2Q9M -> "7K2Q9M"
  const id = decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() || '');
  try {
    const res = await fetch(`/api/reports/${encodeURIComponent(id)}`);
    if (res.status === 404) return renderNotFound();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    render(await res.json());
  } catch (error) {
    renderError();
  }
}

load();
