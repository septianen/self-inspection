// Tes 5: Speaker. HP membacakan 3 angka, penjual mengetik apa yang didengar.
//
// Mode utama: Web Speech API (speechSynthesis) dengan suara bahasa Indonesia.
// Fallback: bip (jumlah bip per kelompok = angka), jika tidak ada suara Indonesia.
// Chrome Android memblokir audio sebelum ada gestur, jadi suara baru dimulai dari tap tombol.

import { el, icon, banner, button } from '../dom.js';
import { mountTestHeader } from '../test-header.js';

const WORDS = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];
const MAX_ATTEMPTS = 2;

// 3 digit acak dari min..max, dua digit berurutan tidak boleh sama. Angka 0 tidak dipakai.
function randomDigits(max) {
  const digits = [];
  while (digits.length < 3) {
    const d = 1 + Math.floor(Math.random() * max);
    if (digits[digits.length - 1] !== d) digits.push(d);
  }
  return digits;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Tunggu daftar suara siap (Chrome memuatnya asinkron), maksimal 1,5 detik.
function loadVoices() {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return resolve([]);
    const now = speechSynthesis.getVoices();
    if (now.length) return resolve(now);
    const done = () => {
      speechSynthesis.removeEventListener('voiceschanged', done);
      clearTimeout(timer);
      resolve(speechSynthesis.getVoices());
    };
    const timer = setTimeout(done, 1500);
    speechSynthesis.addEventListener('voiceschanged', done);
  });
}

export function run(container, ctx) {
  return new Promise((resolve, reject) => {
    let finished = false;
    let mode = 'speech';        // 'speech' | 'beep'
    let voice = null;
    let digits = randomDigits(9);
    let attempt = 1;
    let plays = 0;
    let playing = false;
    let audioCtx = null;
    let playToken = 0;

    // ---------- DOM ----------
    mountTestHeader(container, ctx, {
      onBack: () => finish(null, new Error('back')),
      onSkip: () => finish({ status: 'skipped', data: {} }),
    });

    const title = el('h1', { class: 'screen-title', tabindex: '-1', text: 'Speaker' });
    const instruction = el('p', { class: 'lead', text: 'Naikkan volume, putar suara, lalu ketik 3 angka yang kamu dengar.' });

    const playBtn = el('button', { type: 'button', class: 'play-btn', 'aria-label': 'Putar suara', disabled: true, onClick: () => play() },
      icon('speaker'));
    const playLabel = el('span', { class: 'play-label', text: 'Putar suara' });
    const playCount = el('span', { class: 'caption', hidden: true });
    const panel = el('div', { class: 'speaker-panel' }, playBtn, playLabel, playCount);

    const inputs = [0, 1, 2].map((i) => el('input', {
      type: 'text', class: 'digit-input', inputmode: 'numeric', pattern: '[0-9]*', maxlength: '1',
      autocomplete: 'off', 'aria-label': ['Angka pertama', 'Angka kedua', 'Angka ketiga'][i],
    }));
    const attemptLabel = el('span', { class: 'caption' });
    const bannerSlot = el('div');
    const answer = el('div', { class: 'answer' },
      el('span', { class: 'answer-title', text: 'Angka yang kamu dengar' }),
      el('div', { class: 'digit-row' }, inputs),
      attemptLabel);

    const checkBtn = button('primary', 'Cek Jawaban', () => checkAnswer(), { disabled: true });
    const noSoundBtn = button('text', 'Tidak terdengar suara apa pun', () => finish({
      status: 'fail', data: { mode, attempts: attempt, reason: 'no_sound' },
    }));

    container.append(
      el('main', { class: 'test-body speaker-body' },
        el('div', { class: 'test-intro' }, title, instruction),
        panel, bannerSlot, answer),
      el('footer', { class: 'screen-footer is-stacked' }, checkBtn, noSoundBtn));
    title.focus({ preventScroll: true });

    // ---------- Input digit ----------
    function answerDigits() {
      return inputs.map((i) => i.value);
    }

    function updateCheck() {
      checkBtn.disabled = !answerDigits().every((v) => v !== '');
    }

    inputs.forEach((input, i) => {
      input.addEventListener('input', () => {
        input.value = input.value.replace(/\D/g, '').slice(-1); // satu digit saja
        if (input.value && inputs[i + 1]) inputs[i + 1].focus();
        updateCheck();
      });
      input.addEventListener('keydown', (event) => {
        // Backspace di kotak kosong: mundur ke kotak sebelumnya dan hapus isinya.
        if (event.key === 'Backspace' && !input.value && inputs[i - 1]) {
          inputs[i - 1].value = '';
          inputs[i - 1].focus();
          updateCheck();
          event.preventDefault();
        }
      });
      input.addEventListener('focus', () => input.select());
    });

    function renderAttempt() {
      attemptLabel.textContent = `Kesempatan ${attempt} dari ${MAX_ATTEMPTS}`;
    }

    function renderPlayState() {
      playBtn.disabled = playing || !modeReady;
      playBtn.classList.toggle('is-playing', playing);
      playLabel.textContent = playing ? 'Memutar…' : plays === 0 ? 'Putar suara' : 'Putar lagi';
      playBtn.setAttribute('aria-label', playLabel.textContent);
      playCount.hidden = plays === 0;
      playCount.textContent = `Sudah diputar ${plays} kali`;
    }

    // ---------- Memilih mode ----------
    let modeReady = false;

    function useBeepMode() {
      mode = 'beep';
      digits = randomDigits(5); // bip: digit 1-5 saja
      instruction.textContent = 'Hitung bunyi bip di setiap kelompok, lalu ketik jumlahnya.';
    }

    loadVoices().then((voices) => {
      if (finished) return;
      voice = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('id')) || null;
      if (!voice) useBeepMode();
      modeReady = true;
      renderPlayState();
    });

    renderAttempt();

    // ---------- Memutar suara ----------
    // Satu digit = satu utterance, dengan jeda 600ms antar digit.
    async function speakDigits(token) {
      speechSynthesis.cancel();
      for (let i = 0; i < digits.length; i++) {
        if (token !== playToken) return;
        await new Promise((res, rej) => {
          const u = new SpeechSynthesisUtterance(WORDS[digits[i]]);
          u.lang = voice.lang;
          u.voice = voice;
          u.rate = 0.85;
          u.volume = 1;
          // Jaga-jaga: di beberapa HP onend tidak pernah terpanggil.
          const guard = setTimeout(res, 4000);
          u.onend = () => { clearTimeout(guard); res(); };
          u.onerror = (e) => { clearTimeout(guard); e.error === 'canceled' || e.error === 'interrupted' ? res() : rej(e); };
          speechSynthesis.speak(u);
        });
        if (i < digits.length - 1) await sleep(600);
      }
    }

    // Bip 880Hz 150ms, jeda 200ms, jeda antar kelompok 900ms. Dijadwalkan di jam AudioContext.
    async function beepDigits(token) {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      await audioCtx.resume();
      let t = audioCtx.currentTime + 0.1;
      for (const count of digits) {
        for (let b = 0; b < count; b++) {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.frequency.value = 880;
          // Fade singkat agar tidak ada bunyi "klik" di awal/akhir.
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.5, t + 0.01);
          gain.gain.setValueAtTime(0.5, t + 0.14);
          gain.gain.linearRampToValueAtTime(0, t + 0.15);
          osc.connect(gain).connect(audioCtx.destination);
          osc.start(t);
          osc.stop(t + 0.16);
          t += 0.15 + 0.2;
        }
        t += 0.9 - 0.2;
      }
      await sleep((t - audioCtx.currentTime) * 1000);
      if (token !== playToken) return;
    }

    async function play() {
      if (playing || finished) return;
      playing = true;
      const token = ++playToken;
      renderPlayState();
      try {
        if (mode === 'speech') {
          try {
            await speakDigits(token);
          } catch (e) {
            // speechSynthesis error: pindah ke mode bip dan putar dengan angka baru.
            useBeepMode();
            await beepDigits(token);
          }
        } else {
          await beepDigits(token);
        }
      } catch (e) {
        console.error('Gagal memutar suara', e);
      }
      if (token !== playToken || finished) return;
      playing = false;
      plays += 1;
      renderPlayState();
    }

    // ---------- Jawaban ----------
    function checkAnswer() {
      const given = answerDigits().join('');
      if (given === digits.join('')) {
        finish({ status: 'pass', data: { mode, attempts: attempt } });
        return;
      }
      if (attempt >= MAX_ATTEMPTS) {
        finish({ status: 'fail', data: { mode, attempts: attempt, reason: 'wrong' } });
        return;
      }
      // Salah di kesempatan 1: kosongkan, angka baru, putar ulang otomatis
      // (masih dalam gestur tap "Cek Jawaban", jadi audio diizinkan).
      attempt += 1;
      digits = randomDigits(mode === 'beep' ? 5 : 9);
      inputs.forEach((i) => { i.value = ''; });
      inputs[0].focus();
      updateCheck();
      renderAttempt();
      bannerSlot.replaceChildren(banner('fail', 'Angka belum cocok. Dengarkan sekali lagi.'));
      play();
    }

    // ---------- Selesai & bersih-bersih ----------
    function cleanup() {
      playToken += 1; // menghentikan loop pemutaran yang masih menunggu
      try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { /* abaikan */ }
      if (audioCtx) audioCtx.close().catch(() => {});
      audioCtx = null;
      ctx.signal.removeEventListener('abort', onAbort);
      container.replaceChildren();
    }

    function finish(res, error) {
      if (finished) return;
      finished = true;
      cleanup();
      if (error) reject(error); else resolve(res);
    }

    function onAbort() {
      if (finished) return;
      finished = true;
      cleanup();
      reject(new Error('aborted'));
    }
    ctx.signal.addEventListener('abort', onAbort);
  });
}
