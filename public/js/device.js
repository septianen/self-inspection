// device.js: deteksi info perangkat otomatis dari browser.
// Semua nilai yang gagal dibaca menjadi null, UI menampilkannya sebagai "Tidak terdeteksi".

// Android + Chrome? Versi sinkron (tanpa await) untuk banner di Beranda.
export function isAndroidChrome() {
  const uad = navigator.userAgentData; // "User-Agent Client Hints", hanya ada di Chromium
  if (uad) {
    return uad.platform === 'Android' && uad.brands.some((b) => b.brand === 'Google Chrome');
  }
  // Fallback untuk browser tanpa Client Hints. Edge/Opera/Samsung Browser juga membawa "Chrome/".
  const ua = navigator.userAgent;
  return /Android/.test(ua) && /Chrome\//.test(ua) && !/(EdgA|OPR|SamsungBrowser)\//.test(ua);
}

function majorVersion(v) {
  return String(v).split('.')[0];
}

export async function detectDevice() {
  const info = {
    os: null,
    browser: null,
    modelCode: null,
    screen: null,
    ramGb: null,
    cpuCores: null,
    batteryPct: null,
    isAndroidChrome: isAndroidChrome(),
    userAgent: navigator.userAgent,
  };

  // OS, model, dan browser: pakai Client Hints jika ada.
  try {
    const uad = navigator.userAgentData;
    if (uad) {
      const high = await uad.getHighEntropyValues(['platformVersion', 'model', 'fullVersionList']);
      if (uad.platform === 'Android' && high.platformVersion) {
        info.os = `Android ${majorVersion(high.platformVersion)}`;
      }
      info.modelCode = high.model || null;

      const list = high.fullVersionList && high.fullVersionList.length ? high.fullVersionList : uad.brands;
      const chrome = list.find((b) => b.brand === 'Google Chrome') || list.find((b) => b.brand === 'Chromium');
      if (chrome) info.browser = `Chrome ${majorVersion(chrome.version)}`;
    }
  } catch (e) { /* biarkan null, dicoba lewat user agent di bawah */ }

  // Fallback dari user agent string.
  try {
    const ua = navigator.userAgent;
    if (!info.os) {
      const m = ua.match(/Android (\d+)/);
      if (m) info.os = `Android ${m[1]}`;
    }
    if (!info.browser) {
      const m = ua.match(/Chrome\/(\d+)/);
      if (m) info.browser = `Chrome ${m[1]}`;
    }
  } catch (e) { /* abaikan */ }

  // Resolusi fisik = ukuran CSS x devicePixelRatio. Angka kecil di depan (potret). Hanya perkiraan.
  try {
    const w = Math.round(screen.width * devicePixelRatio);
    const h = Math.round(screen.height * devicePixelRatio);
    info.screen = { width: Math.min(w, h), height: Math.max(w, h) };
  } catch (e) { /* abaikan */ }

  // navigator.deviceMemory dibatasi Chrome maksimal 8 (demi privasi).
  if (typeof navigator.deviceMemory === 'number') info.ramGb = navigator.deviceMemory;
  if (typeof navigator.hardwareConcurrency === 'number') info.cpuCores = navigator.hardwareConcurrency;

  try {
    const battery = await navigator.getBattery();
    info.batteryPct = Math.round(battery.level * 100);
  } catch (e) { /* tidak didukung */ }

  return info;
}

// Teks tampilan untuk panel "Terdeteksi otomatis".
const UNKNOWN = 'Tidak terdeteksi';

export function formatDevice(info) {
  return {
    os: info.os || UNKNOWN,
    browser: info.browser || UNKNOWN,
    screen: info.screen ? `${info.screen.width} × ${info.screen.height}` : UNKNOWN,
    ram: info.ramGb === null ? UNKNOWN : info.ramGb >= 8 ? '8 GB atau lebih' : `Sekitar ${info.ramGb} GB`,
    cpu: info.cpuCores === null ? UNKNOWN : `${info.cpuCores} inti`,
    battery: info.batteryPct === null ? UNKNOWN : `${info.batteryPct}%`,
  };
}
