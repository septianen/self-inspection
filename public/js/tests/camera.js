// Tes 3 & 4: Kamera belakang / depan. ctx.facing = 'environment' | 'user'.
//
// Alur: buka kamera -> pratinjau -> ambil foto (frame dibekukan ke canvas) -> cek otomatis
// (terang & detail) -> penjual menilai "jelas" atau "buram".
// PRIVASI: foto tidak pernah dikirim atau disimpan. Canvas dikosongkan saat keluar.

import { el, icon, banner, button } from '../dom.js';
import { mountTestHeader } from '../test-header.js';

const MIN_MEAN = 12;   // rata-rata luminans di bawah ini = gelap/lensa tertutup
const MIN_STDDEV = 6;  // simpangan baku di bawah ini = gambar rata, tanpa detail

export function run(container, ctx) {
  // Izin ditolak di awal (layar "Izin dibutuhkan"): lewati otomatis.
  if (ctx.permissions && ctx.permissions.camera === false) {
    return Promise.resolve({ status: 'skipped', data: { reason: 'no_permission' } });
  }

  return new Promise((resolve, reject) => {
    const isFront = ctx.facing === 'user';
    let stream = null;
    let finished = false;
    let openToken = 0;          // membatalkan pembukaan kamera yang tertinggal
    let phase = 'opening';      // 'opening' | 'preview' | 'captured' | 'error'
    let resolution = null;      // { width, height } sisi panjang x pendek
    let autoCheck = null;       // 'ok' | 'dark'
    let errorName = null;

    // ---------- DOM ----------
    mountTestHeader(container, ctx, {
      onBack: () => finish(null, new Error('back')),
      onSkip: () => finish({ status: 'skipped', data: {} }),
    });

    const title = el('h1', { class: 'screen-title', tabindex: '-1', text: isFront ? 'Kamera depan' : 'Kamera belakang' });

    // playsinline wajib agar video tidak membuka pemutar layar penuh di mobile.
    const video = el('video', { class: 'viewfinder-media', playsinline: true, autoplay: true });
    video.muted = true;
    const canvas = el('canvas', { class: 'viewfinder-media' });
    const badge = el('div', { class: 'viewfinder-badge' }, icon('cameraSmall'), 'Foto diambil');
    // Kamera depan di-mirror seperti cermin, sama seperti aplikasi kamera.
    const viewfinder = el('div', { class: 'viewfinder' + (isFront ? ' is-mirrored' : '') }, video, canvas, badge);

    const status = el('div', { class: 'camera-status' });
    container.append(
      el('main', { class: 'test-body' }, title, viewfinder, status),
      // footer diganti-ganti sesuai fase
    );
    const footer = el('footer', { class: 'screen-footer is-stacked' });
    container.appendChild(footer);
    title.focus({ preventScroll: true });

    // ---------- Tampilan per fase ----------
    function render() {
      video.hidden = phase !== 'preview' && phase !== 'opening';
      canvas.hidden = phase !== 'captured';
      badge.hidden = phase !== 'captured';
      status.replaceChildren();
      footer.replaceChildren();

      if (phase === 'opening') {
        status.append(el('div', { class: 'spinner-row' }, el('span', { class: 'spinner' }), 'Membuka kamera…'));
        footer.append(button('primary', 'Ambil Foto', null, { iconName: 'camera', disabled: true }));
      } else if (phase === 'preview') {
        status.append(el('p', { class: 'lead', text: 'Arahkan kamera ke benda di sekitarmu, lalu ambil foto.' }));
        footer.append(button('primary', 'Ambil Foto', capture, { iconName: 'camera' }));
      } else if (phase === 'error') {
        status.append(banner('fail', 'Kamera tidak bisa dibuka', 'Pastikan izin kamera aktif dan tidak dipakai aplikasi lain.'));
        footer.append(
          button('primary', 'Coba lagi', openCamera),
          button('text', 'Tandai bermasalah', () => finish({
            status: 'fail', data: { autoCheck: 'error', verdict: null, error: errorName || 'unknown' },
          })));
      } else if (phase === 'captured' && autoCheck === 'ok') {
        status.append(
          banner('pass', 'Gambar terdeteksi normal', resolutionLabel()),
          el('div', { class: 'question' },
            el('span', { class: 'question-title', text: 'Apakah gambarnya jelas?' }),
            el('span', { class: 'caption', text: 'Foto hanya dicek di HP ini, lalu langsung dihapus.' })));
        footer.append(
          el('div', { class: 'btn-pair' },
            button('secondary', 'Buram / rusak', () => finish(result('fail', 'blurry'))),
            button('primary', 'Ya, jelas', () => finish(result('pass', 'clear')))),
          button('text', 'Ambil ulang foto', openCamera));
      } else if (phase === 'captured') {
        // Cek otomatis gagal: "Ya, jelas" disembunyikan.
        status.append(banner('fail', 'Gambar terlalu gelap atau kosong', 'Pastikan lensa tidak tertutup, lalu ambil ulang'));
        footer.append(
          button('primary', 'Ambil ulang foto', openCamera),
          button('secondary', 'Tandai bermasalah', () => finish(result('fail', null))));
      }
    }

    function resolutionLabel() {
      if (!resolution) return null;
      const span = el('span', { class: 'mono', text: `${resolution.width} × ${resolution.height}` });
      const mp = megapixels();
      return [ 'Resolusi ', span, mp !== null ? ` (${mp} MP)` : '' ];
    }

    function megapixels() {
      if (!resolution) return null;
      const mp = (resolution.width * resolution.height) / 1e6;
      return mp >= 10 ? Math.round(mp) : Number(mp.toFixed(1)); // 12, 8, 4.9, ...
    }

    function result(status, verdict) {
      return {
        status,
        data: {
          width: resolution ? resolution.width : null,
          height: resolution ? resolution.height : null,
          megapixels: megapixels(),
          autoCheck,
          verdict,
        },
      };
    }

    // ---------- Kamera ----------
    function stopStream() {
      if (stream) stream.getTracks().forEach((t) => t.stop()); // wajib: mematikan lampu kamera
      stream = null;
      video.srcObject = null;
    }

    // Resolusi foto penuh sensor (untuk label MP), dari yang paling akurat.
    async function readResolution(track) {
      let w = 0;
      let h = 0;
      try {
        if ('ImageCapture' in window) {
          const caps = await new ImageCapture(track).getPhotoCapabilities();
          w = caps.imageWidth ? caps.imageWidth.max : 0;
          h = caps.imageHeight ? caps.imageHeight.max : 0;
        }
      } catch (e) { /* lanjut ke fallback */ }
      if (!w || !h) {
        try {
          const caps = track.getCapabilities ? track.getCapabilities() : {};
          w = caps.width ? caps.width.max : 0;
          h = caps.height ? caps.height.max : 0;
        } catch (e) { /* lanjut */ }
      }
      if (!w || !h) {
        const s = track.getSettings();
        w = s.width || 0;
        h = s.height || 0;
      }
      return w && h ? { width: Math.max(w, h), height: Math.min(w, h) } : null;
    }

    async function openCamera() {
      const token = ++openToken;
      stopStream();
      phase = 'opening';
      render();
      try {
        let s;
        try {
          s = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: ctx.facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: false,
          });
        } catch (e) {
          if (e.name !== 'OverconstrainedError') throw e;
          // Perangkat tidak mengenali facingMode exact: coba tanpa "exact".
          s = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: ctx.facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: false,
          });
        }
        if (finished || token !== openToken) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        video.srcObject = s;
        try { await video.play(); } catch (e) { /* autoplay sudah menangani */ }
        resolution = await readResolution(s.getVideoTracks()[0]);
        if (finished || token !== openToken) return;
        phase = 'preview';
      } catch (e) {
        if (finished || token !== openToken) return;
        errorName = e.name;
        phase = 'error';
      }
      render();
    }

    function capture() {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return; // video belum punya frame

      // Bekukan frame ke canvas yang tampil di viewfinder.
      canvas.width = vw;
      canvas.height = vh;
      canvas.getContext('2d').drawImage(video, 0, 0, vw, vh);

      // Cek otomatis pada versi kecil 160x120: hitung rata-rata dan simpangan baku luminans.
      const small = document.createElement('canvas');
      small.width = 160;
      small.height = 120;
      const sctx = small.getContext('2d', { willReadFrequently: true });
      sctx.drawImage(video, 0, 0, 160, 120);
      const px = sctx.getImageData(0, 0, 160, 120).data;
      let sum = 0;
      let sumSq = 0;
      const n = px.length / 4;
      for (let i = 0; i < px.length; i += 4) {
        const lum = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
        sum += lum;
        sumSq += lum * lum;
      }
      const mean = sum / n;
      const std = Math.sqrt(Math.max(0, sumSq / n - mean * mean));
      small.width = 0;
      autoCheck = mean < MIN_MEAN || std < MIN_STDDEV ? 'dark' : 'ok';

      stopStream(); // kamera mati begitu foto diambil
      phase = 'captured';
      render();
    }

    // ---------- Selesai & bersih-bersih ----------
    function cleanup() {
      openToken += 1;
      stopStream();
      canvas.width = 0; // buang gambar dari memori
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

    openCamera();
  });
}
