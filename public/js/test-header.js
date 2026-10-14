// test-header.js: header layar tes (Kembali | "Tes n dari 6" | Lewati + progress 6 segmen).
// Dipakai ulang oleh semua tes yang punya header.

const CHEVRON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"></path></svg>';

// Menambahkan header ke `parent` dan mengembalikan elemennya.
// handlers: { onBack, onSkip }
export function mountTestHeader(parent, { index, total }, { onBack, onSkip }) {
  const header = document.createElement('header');
  header.className = 'test-header';

  // Isi di bawah statis (hanya angka dari kode kita), jadi aman memakai innerHTML.
  const segments = Array.from({ length: total }, (_, i) =>
    `<span class="${i + 1 <= index ? 'is-done' : ''}"></span>`
  ).join('');
  header.innerHTML = `
    <div class="test-header-row">
      <button type="button" class="icon-btn" data-role="back" aria-label="Kembali">${CHEVRON}</button>
      <span class="test-step">Tes ${index} dari ${total}</span>
      <button type="button" class="btn-text" data-role="skip">Lewati</button>
    </div>
    <div class="progress" aria-hidden="true">${segments}</div>`;

  header.querySelector('[data-role="back"]').addEventListener('click', onBack);
  header.querySelector('[data-role="skip"]').addEventListener('click', onSkip);
  parent.appendChild(header);
  return header;
}
