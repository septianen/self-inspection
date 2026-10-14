// Tes 2: Warna layar.
// Fase A: 5 layar penuh berwarna, ketuk untuk berganti. Fase B: pertanyaan masalah.

import { enterFullscreen, exitFullscreen, isFullscreen } from '../util.js';
import { mountTestHeader } from '../test-header.js';

// `fg` = warna teks indikator "1/5" agar kontras dengan latar.
const COLORS = [
  { hex: '#FF0000', fg: '#FFFFFF' },
  { hex: '#00FF00', fg: '#000000' },
  { hex: '#0000FF', fg: '#FFFFFF' },
  { hex: '#FFFFFF', fg: '#000000' },
  { hex: '#000000', fg: '#FFFFFF' },
];

const ISSUES = [
  { key: 'dead_pixel', title: 'Titik mati (dead pixel)', desc: 'Titik kecil yang warnanya tidak berubah' },
  { key: 'lines', title: 'Garis', desc: 'Garis tegak atau mendatar di layar' },
  { key: 'blotch', title: 'Bercak atau bayangan', desc: 'Noda, burn-in, atau bekas gambar tertinggal' },
  { key: 'uneven', title: 'Warna tidak rata', desc: 'Sebagian layar lebih gelap atau kekuningan' },
];

const REDO_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 0113.7-5.6L20 8.5M20 4v4.5h-4.5"></path><path d="M20 12a8 8 0 01-13.7 5.6L4 15.5M4 20v-4.5h4.5"></path></svg>';

export function run(container, ctx) {
  return new Promise((resolve, reject) => {
    const checked = new Set(); // key isu yang dicentang
    let phase = null;          // 'A' | 'B'
    let finished = false;
    let wasFullscreen = isFullscreen();
    const timers = new Set();

    // ---------- Fase A: layar penuh ----------
    // Dipanggil dari tap (fullscreen hanya boleh dari gestur pengguna).
    function showPhaseA() {
      phase = 'A';
      wasFullscreen = isFullscreen();
      enterFullscreen();
      container.replaceChildren();

      const layer = document.createElement('div');
      layer.className = 'fullscreen-layer color-layer';
      const indexEl = document.createElement('span');
      indexEl.className = 'color-index';
      layer.appendChild(indexEl);

      let current = 0;
      let lastTap = performance.now(); // debounce: abaikan tap ganda yang terlalu cepat

      function paint() {
        layer.style.background = COLORS[current].hex;
        indexEl.style.color = COLORS[current].fg;
        indexEl.textContent = `${current + 1}/${COLORS.length}`;
      }
      paint();

      // Petunjuk muncul di warna pertama saja, hilang setelah 2,5 detik.
      const hint = document.createElement('div');
      hint.className = 'color-hint';
      hint.textContent = 'Perhatikan titik, garis, atau bercak. Ketuk untuk warna berikutnya';
      layer.appendChild(hint);
      const hintTimer = setTimeout(() => { hint.remove(); timers.delete(hintTimer); }, 2500);
      timers.add(hintTimer);

      layer.addEventListener('click', () => {
        const now = performance.now();
        if (now - lastTap < 250) return;
        lastTap = now;
        hint.remove();

        if (current < COLORS.length - 1) {
          current += 1;
          paint();
        } else {
          // Warna kelima selesai: keluar fullscreen, lanjut ke pertanyaan.
          phase = 'B';
          exitFullscreen();
          showPhaseB(false);
        }
      });

      container.appendChild(layer);
    }

    // ---------- Fase B: pertanyaan ----------
    function showPhaseB(showHint) {
      phase = 'B';
      container.replaceChildren();

      mountTestHeader(container, ctx, {
        onBack: () => finish(null, new Error('back')),
        onSkip: () => finish({ status: 'skipped', data: {} }),
      });

      const main = document.createElement('main');
      main.className = 'test-body';

      const intro = document.createElement('div');
      intro.className = 'test-intro';
      const h1 = document.createElement('h1');
      h1.className = 'screen-title';
      h1.tabIndex = -1;
      h1.textContent = 'Warna layar';
      const lead = document.createElement('p');
      lead.className = 'lead';
      lead.textContent = showHint
        ? 'Ketuk tombol putar ulang untuk melihat 5 warna layar penuh, lalu jawab apakah ada masalah berikut.'
        : 'Kamu sudah melihat 5 warna layar penuh. Apakah ada masalah berikut di salah satunya?';
      intro.append(h1, lead);

      // Baris swatch + tombol "Lihat warna lagi"
      const row = document.createElement('div');
      row.className = 'swatch-row';
      COLORS.forEach((c) => {
        const sw = document.createElement('div');
        sw.className = 'swatch' + (c.hex === '#FFFFFF' ? ' has-border' : '');
        sw.style.background = c.hex;
        row.appendChild(sw);
      });
      const redo = document.createElement('button');
      redo.type = 'button';
      redo.className = 'swatch-redo';
      redo.setAttribute('aria-label', 'Lihat warna lagi');
      redo.innerHTML = REDO_ICON;
      redo.addEventListener('click', showPhaseA); // klik = gestur, jadi fullscreen diizinkan
      row.appendChild(redo);

      // Checkbox masalah
      const list = document.createElement('div');
      list.className = 'check-list';
      ISSUES.forEach((issue) => {
        const label = document.createElement('label');
        label.className = 'check-option';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = checked.has(issue.key);
        input.addEventListener('change', () => {
          if (input.checked) checked.add(issue.key); else checked.delete(issue.key);
          updateButtons();
        });
        const text = document.createElement('span');
        const title = document.createElement('span');
        title.className = 'check-title';
        title.textContent = issue.title;
        const desc = document.createElement('span');
        desc.className = 'check-desc';
        desc.textContent = issue.desc;
        text.append(title, desc);
        label.append(input, text);
        list.appendChild(label);
      });

      main.append(intro, row, list);

      const footer = document.createElement('footer');
      footer.className = 'screen-footer is-stacked';
      const okBtn = document.createElement('button');
      okBtn.type = 'button';
      okBtn.className = 'btn-primary';
      okBtn.textContent = 'Tidak ada masalah';
      okBtn.addEventListener('click', () => finish({ status: 'pass', data: { issues: [] } }));
      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'btn-secondary';
      saveBtn.textContent = 'Simpan masalah';
      saveBtn.addEventListener('click', () => {
        const issues = ISSUES.map((i) => i.key).filter((k) => checked.has(k));
        finish({ status: 'fail', data: { issues } });
      });
      footer.append(okBtn, saveBtn);

      function updateButtons() {
        const any = checked.size > 0;
        okBtn.disabled = any;
        saveBtn.disabled = !any;
      }
      updateButtons();

      container.append(main, footer);
      h1.focus({ preventScroll: true });
    }

    // ---------- Selesai & bersih-bersih ----------
    // Satu pintu keluar: result = hasil, atau error = tolak (mis. 'back').
    function finish(result, error) {
      if (finished) return;
      finished = true;
      cleanup(false);
      if (error) reject(error); else resolve(result);
    }

    function cleanup(leaveFullscreen) {
      timers.forEach(clearTimeout);
      timers.clear();
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      ctx.signal.removeEventListener('abort', onAbort);
      container.replaceChildren();
      if (leaveFullscreen) exitFullscreen();
    }

    // Keluar fullscreen lewat tombol back Android di tengah fase A = Kembali.
    function onFullscreenChange() {
      if (document.fullscreenElement) {
        wasFullscreen = true;
      } else if (wasFullscreen && phase === 'A') {
        finish(null, new Error('back'));
      }
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);

    function onAbort() {
      if (finished) return;
      finished = true;
      cleanup(true);
      reject(new Error('aborted'));
    }
    ctx.signal.addEventListener('abort', onAbort);

    // ---------- Mulai ----------
    // Lanjutan dari tes sentuh: sudah fullscreen, langsung fase A. Jika tidak (diulang dari
    // Ringkasan / halaman di-refresh), tampilkan fase B dulu karena fullscreen butuh gestur.
    // Jika browser tidak mendukung fullscreen sama sekali, layar penuh palsu (overlay) cukup.
    if (isFullscreen() || !document.fullscreenEnabled) showPhaseA();
    else showPhaseB(true);
  });
}
