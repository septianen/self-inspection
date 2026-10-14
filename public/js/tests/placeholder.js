// Placeholder untuk tes 3-6. Dihapus di M4 saat tes aslinya dibuat.
import { mountTestHeader } from '../test-header.js';

const TITLES = ['Layar sentuh', 'Warna layar', 'Kamera belakang', 'Kamera depan', 'Speaker', 'Mikrofon'];

export function run(container, ctx) {
  return new Promise((resolve, reject) => {
    mountTestHeader(container, ctx, {
      onBack: () => reject(new Error('back')),
      onSkip: () => resolve({ status: 'skipped', data: {} }),
    });

    const main = document.createElement('main');
    main.className = 'placeholder-body';
    const h1 = document.createElement('h1');
    h1.className = 'screen-title';
    h1.tabIndex = -1;
    h1.textContent = TITLES[ctx.index - 1];
    const p = document.createElement('p');
    p.className = 'lead';
    p.textContent = 'Placeholder. Tes asli dibuat di M4.';
    main.append(h1, p);

    const footer = document.createElement('footer');
    footer.className = 'screen-footer';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-primary';
    btn.textContent = 'Selesai (placeholder)';
    btn.addEventListener('click', () => resolve({ status: 'pass', data: {} }));
    footer.appendChild(btn);

    container.append(main, footer);
    h1.focus({ preventScroll: true });

    ctx.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  });
}
