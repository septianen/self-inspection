// dom.js: pembantu kecil untuk membuat elemen lewat JavaScript.
//
//   el('button', { class: 'btn-primary', text: 'Simpan', onClick: fn })
//
// Teks selalu dipasang lewat textContent / node teks, jadi aman dari injeksi HTML.

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child !== null && child !== undefined && child !== false) node.append(child);
  }
  return node;
}

// Ikon SVG inline (stroke = currentColor). String di bawah statis, jadi aman untuk innerHTML.
const ICONS = {
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"></path></svg>',
  alert: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6v8M12 18h.01"></path></svg>',
  camera: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"></path><circle cx="12" cy="13" r="3.5"></circle></svg>',
  cameraSmall: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"></path><circle cx="12" cy="13" r="3.5"></circle></svg>',
  speaker: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"></path><path d="M16.5 8.5a5 5 0 010 7"></path><path d="M19 6a8.5 8.5 0 010 12"></path></svg>',
  mic: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"></path></svg>',
  play: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z"></path></svg>',
};

export function icon(name) {
  const tpl = document.createElement('template');
  tpl.innerHTML = ICONS[name];
  return tpl.content.firstElementChild;
}

// Banner hasil otomatis. kind: 'pass' | 'fail'. `sub` boleh berupa node atau teks.
export function banner(kind, title, sub) {
  return el('div', { class: `banner is-${kind}`, role: 'status' },
    el('div', { class: 'banner-icon' }, icon(kind === 'pass' ? 'check' : 'alert')),
    el('div', { class: 'banner-text' },
      el('span', { class: 'banner-title', text: title }),
      sub ? el('span', { class: 'banner-sub' }, sub) : null));
}

// Tombol dengan class komponen.
export function button(kind, label, onClick, { iconName = null, disabled = false } = {}) {
  return el('button', { type: 'button', class: `btn-${kind}`, onClick, disabled },
    iconName ? icon(iconName) : null, label);
}
