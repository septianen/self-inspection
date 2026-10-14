// screen-result.js: isi layar Ringkasan dan Laporan siap.
// Hanya menggambar dari data. Logika alur (tombol, navigasi) ada di app.js.

import { el } from './dom.js';
import {
  TEST_KEYS, TEST_NAMES, STATUS_LABEL, CONDITION_SHORT,
  buildDetail, countStatuses, phoneTitle,
} from './report-text.js';

const REDO_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 0113.7-5.6L20 8.5M20 4v4.5h-4.5"></path><path d="M20 12a8 8 0 01-13.7 5.6L4 15.5M4 20v-4.5h4.5"></path></svg>';

// results: state.results. onRetest(index 1..6) dipanggil saat ikon ulangi ditekan.
export function renderSummary(phone, results, onRetest) {
  const title = document.getElementById('summary-title');
  const sub = document.getElementById('summary-sub');
  if (phone) {
    title.textContent = phoneTitle(phone);
    sub.textContent = [phone.storage, phone.color, CONDITION_SHORT[phone.condition]].filter(Boolean).join(' · ');
  } else {
    title.textContent = 'HP belum diisi';
    sub.textContent = '';
  }

  // Pill hitungan: nilai 0 tetap ditampilkan di Ringkasan.
  const counts = countStatuses(results);
  document.getElementById('summary-counts').replaceChildren(
    el('span', { class: 'pill pill-count is-pass', text: `${counts.pass} lulus` }),
    el('span', { class: 'pill pill-count is-fail', text: `${counts.fail} bermasalah` }),
    el('span', { class: 'pill pill-count is-skipped', text: `${counts.skipped} dilewati` }));

  const rows = TEST_KEYS.map((key, i) => {
    const result = results[key];
    const status = result ? result.status : 'skipped';
    const redo = el('button', {
      type: 'button', class: 'retest-btn', 'aria-label': `Ulangi tes ${TEST_NAMES[key]}`,
      onClick: () => onRetest(i + 1),
    });
    redo.innerHTML = REDO_ICON; // ikon statis
    return el('div', { class: 'result-row' },
      el('div', { class: 'result-text' },
        el('span', { class: 'result-name', text: TEST_NAMES[key] }),
        el('span', { class: 'result-detail', text: buildDetail(key, result) })),
      el('span', { class: `pill is-${status}`, text: STATUS_LABEL[status] }),
      redo);
  });
  document.getElementById('summary-list').replaceChildren(...rows);
}

// report: { id, url, adText }
export function renderReady(report) {
  document.getElementById('ready-link').textContent = report.url.replace(/^https?:\/\//, '');
  document.getElementById('ready-adtext').textContent = report.adText;
  document.getElementById('ready-open').setAttribute('href', `/r/${report.id}`);
}
