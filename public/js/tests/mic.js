// Tes 6: Mikrofon. Rekam 3 detik, deteksi suara dari level RMS, penjual menilai rekamannya.
//
// PRIVASI: rekaman hanya ada di memori (Blob), tidak diunggah. Dibuang saat keluar tes.

import { el, banner, button } from '../dom.js';
import { mountTestHeader } from '../test-header.js';

const RECORD_MS = 3000;
const BAR_COUNT = 40;
const BAR_INTERVAL_MS = 75;
const CALIBRATE_MS = 250;     // 250ms pertama = noise floor
const MIN_THRESHOLD = 0.02;
const MIN_VOICE_MS = 300;     // durasi di atas threshold agar dianggap ada suara

function formatTime(ms) {
  const s = Math.min(3, Math.floor(ms / 1000));
  return `00:0${s} / 00:03`;
}

export function run(container, ctx) {
  // Izin ditolak di awal: lewati otomatis.
  if (ctx.permissions && ctx.permissions.mic === false) {
    return Promise.resolve({ status: 'skipped', data: { reason: 'no_permission' } });
  }

  return new Promise((resolve, reject) => {
    let finished = false;
    let phase = 'idle';   // 'idle' | 'recording' | 'done' | 'error'
    let detected = false;
    let peakRms = 0;
    let errorName = null;

    // Sumber daya yang harus dibersihkan
    let stream = null;
    let audioCtx = null;
    let recorder = null;
    let rafId = 0;
    let blob = null;
    let blobUrl = null;
    let audioEl = null;
    let runToken = 0;

    // ---------- DOM ----------
    mountTestHeader(container, ctx, {
      onBack: () => finish(null, new Error('back')),
      onSkip: () => finish({ status: 'skipped', data: {} }),
    });

    const title = el('h1', { class: 'screen-title', tabindex: '-1', text: 'Mikrofon' });
    const intro = el('div', { class: 'test-intro' }, title,
      el('p', { class: 'lead' }, 'Tekan Rekam, lalu ucapkan dengan suara biasa: ',
        el('strong', { class: 'say-phrase', text: '"Halo, tes satu dua tiga."' })));

    const timerEl = el('span', { class: 'level-timer', text: formatTime(0) });
    const bars = Array.from({ length: BAR_COUNT }, () => el('div', { class: 'level-bar' }));
    const levels = new Array(BAR_COUNT).fill(0);
    const panel = el('div', { class: 'level-panel' },
      el('div', { class: 'level-head' }, el('span', { class: 'level-title', text: 'Level suara' }), timerEl),
      el('div', { class: 'level-bars' }, bars));

    const statusSlot = el('div', { class: 'mic-status' });
    const footer = el('footer', { class: 'screen-footer is-stacked' });
    container.append(el('main', { class: 'test-body' }, intro, panel, statusSlot), footer);
    title.focus({ preventScroll: true });

    function drawBars() {
      levels.forEach((lvl, i) => {
        bars[i].style.height = `${Math.max(0, lvl * 100)}%`;
        bars[i].classList.toggle('is-high', lvl > 0.3);
      });
    }

    function render() {
      statusSlot.replaceChildren();
      footer.replaceChildren();

      if (phase === 'idle') {
        footer.append(button('primary', 'Rekam', startRecording, { iconName: 'mic' }));
      } else if (phase === 'recording') {
        footer.append(button('primary', 'Merekam…', null, { disabled: true, iconName: 'mic' }));
      } else if (phase === 'error') {
        statusSlot.append(banner('fail', 'Mikrofon tidak bisa dibuka', 'Pastikan izin mikrofon aktif dan tidak dipakai aplikasi lain.'));
        footer.append(
          button('primary', 'Rekam ulang', startRecording),
          button('secondary', 'Tandai bermasalah', () => finish({
            status: 'fail', data: { detected: false, peakRms: 0, verdict: null, error: errorName || 'unknown' },
          })));
      } else if (phase === 'done' && detected) {
        statusSlot.append(
          banner('pass', 'Suara terdeteksi', 'Dengarkan rekamannya untuk memastikan suara jernih'),
          button('secondary', 'Putar rekaman', playRecording, { iconName: 'play' }));
        footer.append(
          el('div', { class: 'btn-pair' },
            button('secondary', 'Suara tidak jelas', () => finish({
              status: 'fail', data: { detected: true, peakRms: round(peakRms), verdict: 'unclear' },
            })),
            button('primary', 'Jelas, lanjut', () => finish({
              status: 'pass', data: { detected: true, peakRms: round(peakRms), verdict: 'clear' },
            }))),
          button('text', 'Rekam ulang', startRecording));
      } else {
        statusSlot.append(banner('fail', 'Tidak ada suara terdeteksi', 'Dekatkan HP ke mulut dan bicara lebih keras'));
        footer.append(
          button('primary', 'Rekam ulang', startRecording),
          button('secondary', 'Tandai bermasalah', () => finish({
            status: 'fail', data: { detected: false, peakRms: round(peakRms), verdict: null },
          })));
      }
    }

    const round = (n) => Math.round(n * 1000) / 1000;

    // ---------- Merekam ----------
    function releaseAudio() {
      cancelAnimationFrame(rafId);
      rafId = 0;
      if (recorder && recorder.state !== 'inactive') {
        try { recorder.stop(); } catch (e) { /* abaikan */ }
      }
      recorder = null;
      if (stream) stream.getTracks().forEach((t) => t.stop()); // matikan ikon mikrofon Android
      stream = null;
      if (audioCtx) audioCtx.close().catch(() => {});
      audioCtx = null;
    }

    function discardRecording() {
      if (audioEl) { audioEl.pause(); audioEl = null; }
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      blobUrl = null;
      blob = null;
    }

    // Dipanggil dari tap tombol (gestur), jadi AudioContext boleh berjalan.
    async function startRecording() {
      const token = ++runToken;
      discardRecording();
      levels.fill(0);
      drawBars();
      timerEl.textContent = formatTime(0);
      detected = false;
      peakRms = 0;

      try {
        // Matikan pemrosesan bawaan agar level suara asli yang terukur.
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
        if (finished || token !== runToken) { releaseAudio(); return; }

        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        await audioCtx.resume();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024;
        source.connect(analyser);
        const samples = new Float32Array(analyser.fftSize);

        const chunks = [];
        const mime = 'audio/webm;codecs=opus';
        recorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported(mime) ? { mimeType: mime } : undefined);
        recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
        const stopped = new Promise((res) => { recorder.onstop = res; });
        const rec = recorder;
        rec.start();

        phase = 'recording';
        render();

        // Loop analisis per frame
        const t0 = performance.now();
        let last = t0;
        let lastBar = t0;
        let noiseSum = 0;
        let noiseN = 0;
        let threshold = MIN_THRESHOLD;
        let aboveMs = 0;

        await new Promise((done) => {
          function tick(now) {
            if (finished || token !== runToken) return done();
            const elapsed = now - t0;
            const dt = now - last;
            last = now;

            analyser.getFloatTimeDomainData(samples);
            let sq = 0;
            for (let i = 0; i < samples.length; i++) sq += samples[i] * samples[i];
            const rms = Math.sqrt(sq / samples.length);

            if (elapsed < CALIBRATE_MS) {
              noiseSum += rms;
              noiseN += 1;
            } else {
              if (noiseN) {
                threshold = Math.max(MIN_THRESHOLD, (noiseSum / noiseN) * 3);
                noiseN = 0;
              }
              if (rms > threshold) aboveMs += dt;
              if (rms > peakRms) peakRms = rms;
            }

            if (now - lastBar >= BAR_INTERVAL_MS) {
              lastBar = now;
              levels.push(Math.min(1, rms / 0.25));
              levels.shift(); // bar bergeser dari kanan ke kiri
              drawBars();
            }
            timerEl.textContent = formatTime(elapsed);

            if (elapsed >= RECORD_MS) {
              detected = aboveMs >= MIN_VOICE_MS;
              return done();
            }
            rafId = requestAnimationFrame(tick);
          }
          rafId = requestAnimationFrame(tick);
        });

        if (finished || token !== runToken) { releaseAudio(); return; }
        if (rec.state !== 'inactive') rec.stop();
        await stopped;
        blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        releaseAudio();
        timerEl.textContent = formatTime(RECORD_MS);
        phase = 'done';
      } catch (e) {
        releaseAudio();
        if (finished || token !== runToken) return;
        errorName = e.name;
        phase = 'error';
      }
      render();
    }

    function playRecording() {
      if (!blob) return;
      if (audioEl) { audioEl.pause(); audioEl = null; }
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      blobUrl = URL.createObjectURL(blob);
      audioEl = new Audio(blobUrl);
      audioEl.addEventListener('ended', () => {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        blobUrl = null;
        audioEl = null;
      });
      audioEl.play().catch(() => {});
    }

    // ---------- Selesai & bersih-bersih ----------
    function cleanup() {
      runToken += 1;
      releaseAudio();
      discardRecording();
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

    render();
  });
}
