// Tes 1: Layar sentuh. Penjual mengusap seluruh grid 8 x 14 sampai semua kotak biru.
//
// Hal yang khas web:
// - Event sentuhan dipasang di satu elemen induk (bukan per kotak), lalu posisi jari
//   dihitung ke kolom/baris. Jauh lebih ringan daripada 112 listener.
// - touchstart/touchmove memakai { passive: false } + preventDefault() supaya Chrome
//   tidak men-scroll halaman atau memicu gestur lain saat jari menggeser.
// - Karena preventDefault() mematikan event `click`, tombol "Ada area..." dideteksi manual.

import { enterFullscreen, exitFullscreen, isFullscreen } from '../util.js';

const COLS = 8;
const ROWS = 14;
const TOTAL = COLS * ROWS;
const TAP_SLOP = 10; // px: geseran maksimum agar sentuhan di tombol dianggap "tekan"

export function run(container, ctx) {
  // Harus dipanggil sekarang juga (masih dalam gestur tap "Lanjut ke Tes"), sebelum await.
  enterFullscreen();

  return new Promise((resolve, reject) => {
    const touched = new Uint8Array(TOTAL);
    let count = 0;
    let finished = false;
    let wasFullscreen = isFullscreen();
    const timers = new Set();
    const lastPos = new Map();   // touch.identifier -> {x, y}: untuk interpolasi sapuan
    const buttonTouches = new Map(); // touch.identifier -> {x, y, moved}: sentuhan yang berawal di tombol

    // ---------- DOM ----------
    const root = document.createElement('div');
    root.className = 'fullscreen-layer';

    const grid = document.createElement('div');
    grid.className = 'touch-grid';
    const cells = [];
    for (let i = 0; i < TOTAL; i++) {
      const cell = document.createElement('div');
      cell.className = 'touch-cell';
      grid.appendChild(cell);
      cells.push(cell);
    }

    const pill = document.createElement('div');
    pill.className = 'touch-pill';
    pill.innerHTML = `
      <span class="touch-pill-step">Tes ${ctx.index} dari ${ctx.total}</span>
      <span class="touch-pill-sep"></span>
      <span class="touch-pill-title">Usap semua kotak</span>
      <span class="touch-pill-count"></span>`;
    const countEl = pill.querySelector('.touch-pill-count');

    const failBtn = document.createElement('button');
    failBtn.type = 'button';
    failBtn.className = 'btn-secondary touch-fail-btn';
    failBtn.textContent = 'Ada area yang tidak bisa disentuh';

    root.append(grid, pill, failBtn);
    container.appendChild(root);
    updateCount();

    // Panel debug sementara: buka halaman dengan ?debug di URL untuk melihat ukuran layar.
    if (new URLSearchParams(location.search).has('debug')) {
      const box = document.createElement('pre');
      box.style.cssText = 'position:absolute;left:8px;top:70px;margin:0;padding:6px 8px;' +
        'background:rgba(0,0,0,.75);color:#0f0;font:11px/1.35 monospace;pointer-events:none;z-index:5';
      root.appendChild(box);
      const dump = () => {
        const vv = window.visualViewport;
        const r = root.getBoundingClientRect();
        const g = grid.getBoundingClientRect();
        const b = failBtn.getBoundingClientRect();
        box.textContent = [
          `innerH ${window.innerHeight}  innerW ${window.innerWidth}`,
          `vv ${vv ? Math.round(vv.height) + 'x' + Math.round(vv.width) + ' s' + vv.scale.toFixed(2) : '-'}`,
          `screen ${screen.height}x${screen.width} dpr ${devicePixelRatio}`,
          `layer ${Math.round(r.top)}..${Math.round(r.bottom)} h${Math.round(r.height)}`,
          `grid ${Math.round(g.top)}..${Math.round(g.bottom)}`,
          `btn ${Math.round(b.top)}..${Math.round(b.bottom)}`,
          `appH ${getComputedStyle(document.documentElement).getPropertyValue('--app-height')}`,
          `fs ${isFullscreen()} docH ${document.documentElement.clientHeight}`,
        ].join('\n');
      };
      dump();
      const t = setInterval(dump, 500);
      timers.add(t);
    }

    // ---------- Logika grid ----------
    function updateCount() {
      countEl.textContent = `${count}/${TOTAL}`;
    }

    function markCell(x, y) {
      const rect = grid.getBoundingClientRect(); // dihitung ulang tiap event: aman saat resize/fullscreen
      const col = Math.min(COLS - 1, Math.max(0, Math.floor((x - rect.left) / (rect.width / COLS))));
      const row = Math.min(ROWS - 1, Math.max(0, Math.floor((y - rect.top) / (rect.height / ROWS))));
      const i = row * COLS + col;
      if (touched[i]) return;

      touched[i] = 1;
      count += 1;
      cells[i].classList.add('is-touched', 'is-fresh');
      const t = setTimeout(() => { cells[i].classList.remove('is-fresh'); timers.delete(t); }, 150);
      timers.add(t);
      updateCount();
      if (count === TOTAL) complete();
    }

    // Tandai titik sentuh. Jika jari bergerak cepat, isi titik-titik di antara posisi
    // sebelumnya dan sekarang (langkah <= setengah lebar kotak) supaya tidak ada kotak terlewat.
    function processTouch(touch) {
      const prev = lastPos.get(touch.identifier);
      const cur = { x: touch.clientX, y: touch.clientY };
      if (prev) {
        const rect = grid.getBoundingClientRect();
        const step = Math.min(rect.width / COLS, rect.height / ROWS) / 2;
        const dist = Math.hypot(cur.x - prev.x, cur.y - prev.y);
        const n = Math.max(1, Math.ceil(dist / step));
        for (let k = 1; k <= n; k++) {
          markCell(prev.x + ((cur.x - prev.x) * k) / n, prev.y + ((cur.y - prev.y) * k) / n);
        }
      } else {
        markCell(cur.x, cur.y);
      }
      lastPos.set(touch.identifier, cur);
    }

    // ---------- Event sentuhan ----------
    function onTouchStart(event) {
      event.preventDefault();
      if (finished) return;
      for (const touch of event.changedTouches) {
        if (failBtn.contains(touch.target)) {
          buttonTouches.set(touch.identifier, { x: touch.clientX, y: touch.clientY, moved: 0 });
        }
        processTouch(touch);
      }
    }

    function onTouchMove(event) {
      event.preventDefault();
      if (finished) return;
      for (const touch of event.changedTouches) {
        const bt = buttonTouches.get(touch.identifier);
        if (bt) {
          bt.moved += Math.hypot(touch.clientX - bt.x, touch.clientY - bt.y);
          bt.x = touch.clientX;
          bt.y = touch.clientY;
        }
        processTouch(touch);
      }
    }

    function onTouchEnd(event) {
      event.preventDefault();
      for (const touch of event.changedTouches) {
        lastPos.delete(touch.identifier);
        const bt = buttonTouches.get(touch.identifier);
        buttonTouches.delete(touch.identifier);
        // touchcancel bukan "tekan". Tekan = jari diangkat di atas tombol, hampir tanpa geser.
        if (bt && event.type === 'touchend' && !finished) {
          const r = failBtn.getBoundingClientRect();
          const inside = touch.clientX >= r.left && touch.clientX <= r.right &&
            touch.clientY >= r.top && touch.clientY <= r.bottom;
          if (inside && bt.moved < TAP_SLOP) markFailed();
        }
      }
    }

    root.addEventListener('touchstart', onTouchStart, { passive: false });
    root.addEventListener('touchmove', onTouchMove, { passive: false });
    root.addEventListener('touchend', onTouchEnd, { passive: false });
    root.addEventListener('touchcancel', onTouchEnd, { passive: false });
    // Untuk mouse/keyboard (mis. dites di desktop). Sentuhan tidak memicu click karena preventDefault.
    failBtn.addEventListener('click', markFailed);

    // Keluar fullscreen lewat tombol back Android = Kembali.
    function onFullscreenChange() {
      if (document.fullscreenElement) {
        wasFullscreen = true;
      } else if (wasFullscreen && !finished) {
        finished = true;
        cleanup(false);
        reject(new Error('back'));
      }
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);

    // app.js membatalkan tes ini (mis. pengguna menekan back browser).
    function onAbort() {
      if (finished) return;
      finished = true;
      cleanup(true);
      reject(new Error('aborted'));
    }
    ctx.signal.addEventListener('abort', onAbort);

    // ---------- Selesai ----------
    function complete() {
      if (finished) return;
      finished = true;
      root.classList.add('is-flash'); // semua kotak berkedip hijau
      const t = setTimeout(() => {
        // Tetap fullscreen: tes warna berikutnya juga memakainya.
        cleanup(false);
        resolve({ status: 'pass', data: { cols: COLS, rows: ROWS, total: TOTAL, untouched: 0 } });
      }, 300);
      timers.add(t);
    }

    function markFailed() {
      if (finished) return;
      finished = true;
      const untouched = TOTAL - count;
      cleanup(false);
      resolve({ status: 'fail', data: { cols: COLS, rows: ROWS, total: TOTAL, untouched } });
    }

    function cleanup(leaveFullscreen) {
      timers.forEach(clearTimeout);
      timers.clear();
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      ctx.signal.removeEventListener('abort', onAbort);
      root.remove(); // ikut melepas semua listener di root
      if (leaveFullscreen) exitFullscreen();
    }
  });
}
