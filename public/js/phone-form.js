// phone-form.js: form Data HP. Membaca isian ke objek `phone` dan memberi tahu app.js.
//
// Bentuk objek phone sama dengan skema di docs/API.md:
// { brand, model, storage, color, accessories: [], condition, notes }

const form = document.getElementById('phone-form');
const brandEl = document.getElementById('f-brand');
const modelEl = document.getElementById('f-model');
const storageEl = document.getElementById('f-storage');
const colorEl = document.getElementById('f-color');
const accessoriesEl = document.getElementById('f-accessories');
const notesEl = document.getElementById('f-notes');

function pressedValues(group) {
  return [...group.querySelectorAll('[aria-pressed="true"]')].map((b) => b.dataset.value);
}

// Baca isi form saat ini menjadi objek phone.
export function readPhone() {
  const condition = form.querySelector('input[name="condition"]:checked');
  return {
    brand: brandEl.value,
    model: modelEl.value.trim(),
    storage: pressedValues(storageEl)[0] || '',
    color: colorEl.value.trim(),
    accessories: pressedValues(accessoriesEl),
    condition: condition ? condition.value : '',
    notes: notesEl.value.trim(),
  };
}

// Field wajib: merek, model, penyimpanan, kondisi fisik.
export function isPhoneValid(phone) {
  return Boolean(phone.brand && phone.model && phone.storage && phone.condition);
}

// Isi form dari objek phone (saat sesi dipulihkan atau dibuka dari Ringkasan).
export function fillPhone(phone) {
  const p = phone || { brand: '', model: '', storage: '', color: '', accessories: [], condition: '', notes: '' };
  brandEl.value = p.brand;
  modelEl.value = p.model;
  colorEl.value = p.color;
  notesEl.value = p.notes;
  storageEl.querySelectorAll('.chip').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.value === p.storage));
  });
  accessoriesEl.querySelectorAll('.chip').forEach((b) => {
    b.setAttribute('aria-pressed', String(p.accessories.includes(b.dataset.value)));
  });
  form.querySelectorAll('input[name="condition"]').forEach((r) => {
    r.checked = r.value === p.condition;
  });
}

// Pasang listener. `onChange(phone)` dipanggil setiap ada perubahan isian.
export function initPhoneForm(onChange) {
  const notify = () => onChange(readPhone());

  form.addEventListener('input', notify);   // text, textarea, select, radio
  form.addEventListener('change', notify);

  // Chip penyimpanan: pilih satu. Chip kelengkapan: boleh banyak.
  storageEl.addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (!chip) return;
    storageEl.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', String(b === chip)));
    notify();
  });
  accessoriesEl.addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (!chip) return;
    chip.setAttribute('aria-pressed', String(chip.getAttribute('aria-pressed') !== 'true'));
    notify();
  });

  // Enter di kolom teks tidak boleh mengirim form (memuat ulang halaman).
  form.addEventListener('submit', (event) => event.preventDefault());
}
