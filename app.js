// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
// PROYECTOR DE LETRAS � CAFECITO O MIEDO
// Detección automática + Letras sincronizadas
// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�

const $ = id => document.getElementById(id);

const bgCanvas = $('bg-canvas');
const ctx = bgCanvas.getContext('2d');
const lyricsContent = $('lyrics-content');
const lyricsContainer = $('lyrics-container');
const npTitle = $('np-title');
const npArtist = $('np-artist');
const npAlbum = $('np-album');
const npStatus = $('np-status');
const bgSelector = $('bg-selector');
const textSizeSlider = $('text-size');
const brightnessSlider = $('brightness');
const logoOpacitySlider = $('logo-opacity');
const watermark = $('watermark');
// loader removed � lyrics load silently
const controlsBar = $('controls-bar');
const toggleLyrics = $('toggle-lyrics');
const manualLyricsBtn = $('manual-lyrics-btn');
const manualLyricsModal = $('manual-lyrics-modal');
const manualLyricsInput = $('manual-lyrics-input');
const manualLyricsClose = $('manual-lyrics-close');
const manualLyricsSave = $('manual-lyrics-save');
const manualLyricsClear = $('manual-lyrics-clear');

const appMode = new URLSearchParams(window.location.search).get('mode') || 'main';
document.body.dataset.mode = appMode;
document.body.classList.add(`mode-${appMode}`);

let W, H, animFrame, currentBg = 'universo';
let lastSongKey = '';
let syncedLines = null; // Array of {timeMs, text} for synced lyrics
let activeLineIdx = -1;
let lyricLineEls = [];
let lastLyricScrollTime = 0;
let lastMediaSnapshot = null;
let currentSongMeta = { artist: '', title: '', cleanArtist: '', cleanTitle: '' };

const SYNC_CORRECTION_THRESHOLD_MS = 400;
const MEDIA_EVENT_LATENCY_CAP_MS = 600;
const MANUAL_LYRIC_OFFSET_STEP_MS = 100;
const MANUAL_LYRIC_OFFSET_LIMIT_MS = 5000;
const BG_FRAME_INTERVAL_MS = 1000 / 30;
let bgLastFrameTime = 0;

function shouldDrawBgFrame(now = performance.now()) {
  if (now - bgLastFrameTime < BG_FRAME_INTERVAL_MS) return false;
  bgLastFrameTime = now;
  return true;
}

function resetBgFrameClock() {
  bgLastFrameTime = 0;
}

// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
// CANVAS RESIZE
// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
function resizeCanvas() {
  W = bgCanvas.width = window.innerWidth;
  H = bgCanvas.height = window.innerHeight;
}
resizeCanvas();

function fullResize() {
  resizeCanvas();
  pts=[]; emb=[]; bbs=[]; gS=[];
  window._aStars = null;
  if (window.threeRenderer) {
    window.threeRenderer.setSize(window.innerWidth, window.innerHeight);
    if (window.threeCamera) {
      window.threeCamera.aspect = window.innerWidth / window.innerHeight;
      window.threeCamera.updateProjectionMatrix();
    }
  }
  switchBg(currentBg);
}
window.addEventListener('resize', fullResize);
document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) document.body.classList.add('is-fullscreen');
  else document.body.classList.remove('is-fullscreen');
  setTimeout(fullResize, 200);
});
if (window.electronAPI) {
  electronAPI.onFullscreenChanged((isFS) => {
    if (isFS) document.body.classList.add('is-fullscreen');
    else document.body.classList.remove('is-fullscreen');
    setTimeout(fullResize, 300);
  });
}

// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
// LYRICS CACHE (IndexedDB � persistent, offline)
// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
let lyricsDB = null;
const DB_NAME = 'LyricsCache';
const DB_VERSION = 4; // Clears older cached lyrics after sync/source fixes.
const MAX_CACHE_AGE_MS = 180 * 24 * 60 * 60 * 1000;
const DB_STORE = 'lyrics';

function openLyricsDB() {
  return new Promise((resolve, reject) => {
    if (lyricsDB) return resolve(lyricsDB);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (db.objectStoreNames.contains(DB_STORE)) {
        db.deleteObjectStore(DB_STORE); // Wipe old cache
      }
      db.createObjectStore(DB_STORE, { keyPath: 'id' });
    };
    req.onsuccess = (e) => { lyricsDB = e.target.result; resolve(lyricsDB); };
    req.onerror = () => reject(req.error);
  });
}

function cacheKey(a, t) { return `${a.toLowerCase().trim()}|||${t.toLowerCase().trim()}`; }

async function getCached(a, t) {
  try {
    const db = await openLyricsDB();
    return new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const store = tx.objectStore(DB_STORE);
      const req = store.get(cacheKey(a, t));
      req.onsuccess = () => {
        const res = req.result;
        if (res && !res.plain && !res.synced && !res.manualPlain && !res.manualSynced) {
          // If cached as "not found", but it's more than 1 hour old, ignore cache to retry searching
          const ageHours = (Date.now() - (res.ts || 0)) / (1000 * 60 * 60);
          if (ageHours > 1) return resolve(null);
        }
        resolve(res || null);
      };
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

async function setCache(a, t, plain, synced, extra = {}) {
  try {
    const db = await openLyricsDB();
    const tx = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    store.put({
      id: cacheKey(a, t),
      plain,
      synced,
      manualPlain: extra.manualPlain || null,
      manualSynced: extra.manualSynced || null,
      ts: Date.now()
    });
  } catch {}
}

async function pruneLyricsCache() {
  try {
    const db = await openLyricsDB();
    const cutoff = Date.now() - MAX_CACHE_AGE_MS;
    return new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      const store = tx.objectStore(DB_STORE);
      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor) return;
        const value = cursor.value || {};
        if ((value.ts || 0) < cutoff) cursor.delete();
        cursor.continue();
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

// Migrate old localStorage cache to IndexedDB (one-time)
async function migrateLocalStorageCache() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('lyr_')) keys.push(key);
    }
    if (keys.length === 0) return;
    const db = await openLyricsDB();
    const tx = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    for (const key of keys) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        // Convert old key format lyr_artist_title to new format
        const newKey = key.replace('lyr_', '').replace('_', '|||');
        store.put({ id: newKey, plain: data.plain, synced: data.synced, ts: data.ts || Date.now() });
        localStorage.removeItem(key);
      } catch {}
    }
  } catch {}
}

// Init DB and migrate
openLyricsDB().then(() => {
  migrateLocalStorageCache();
  pruneLyricsCache();
});

// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
// WINDOW CONTROLS
// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
if (window.electronAPI) {
  $('tb-min').onclick = () => electronAPI.minimize();
  $('tb-max').onclick = () => electronAPI.maximize();
  $('tb-close').onclick = () => electronAPI.close();
  $('fullscreen-btn').onclick = () => electronAPI.fullscreen();
} else {
  $('fullscreen-btn').onclick = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  };
}
$('hide-btn').onclick = () => controlsBar.classList.add('hidden');
document.addEventListener('dblclick', () => controlsBar.classList.remove('hidden'));

const SIZES = [1.2, 1.6, 2, 2.4, 2.8, 3.2, 3.6, 4, 4.5, 5];
textSizeSlider.addEventListener('input', () => {
  lyricsContent.style.fontSize = SIZES[textSizeSlider.value - 1] + 'rem';
});

if (brightnessSlider) {
  brightnessSlider.addEventListener('input', () => {
    document.body.style.filter = `brightness(${brightnessSlider.value}%)`;
  });
}

if (logoOpacitySlider && watermark) {
  logoOpacitySlider.addEventListener('input', () => {
    watermark.style.opacity = logoOpacitySlider.value / 100;
  });
}

if (toggleLyrics) {
  toggleLyrics.addEventListener('change', (e) => {
    lyricsContainer.style.opacity = e.target.checked ? '0' : '1';
    lyricsContainer.style.pointerEvents = e.target.checked ? 'none' : 'auto';
  });
}

async function openManualLyricsModal() {
  if (!manualLyricsModal || !manualLyricsInput) return;
  let initialValue = '';
  if (currentSongMeta.cleanArtist && currentSongMeta.cleanTitle) {
    const cached = await getCached(currentSongMeta.cleanArtist, currentSongMeta.cleanTitle);
    if (cached) {
      initialValue = cached.manualSynced || cached.manualPlain || cached.synced || cached.plain || '';
    }
  }
  manualLyricsInput.value = initialValue;
  if (manualLyricsModal) manualLyricsModal.classList.add('open');
  if (manualLyricsInput) manualLyricsInput.focus();
}

function closeManualLyricsModal() {
  if (!manualLyricsModal) return;
  manualLyricsModal.classList.remove('open');
}

async function saveManualLyrics() {
  if (!currentSongMeta.cleanArtist || !currentSongMeta.cleanTitle) {
    closeManualLyricsModal();
    return;
  }
  const raw = manualLyricsInput ? manualLyricsInput.value : '';
  const text = String(raw || '').replace(/\r/g, '').trim();
  const manualSynced = text && hasSyncedTimestamps(text) ? text : null;
  const manualPlain = manualSynced ? null : (text || null);
  await setCache(currentSongMeta.cleanArtist, currentSongMeta.cleanTitle, null, null, {
    manualPlain,
    manualSynced
  });
  closeManualLyricsModal();
  if (manualSynced) {
    syncedLines = parseLRC(manualSynced);
    displaySyncedLyrics(currentSongMeta.title, syncedLines);
  } else if (manualPlain) {
    displayPlainLyrics(currentSongMeta.title, manualPlain);
  } else if (lastMediaSnapshot) {
    lastSongKey = '';
    handleMediaUpdate(lastMediaSnapshot);
  }
}

if (manualLyricsBtn) {
  manualLyricsBtn.onclick = () => openManualLyricsModal();
}
if (manualLyricsClose) {
  manualLyricsClose.onclick = () => closeManualLyricsModal();
}
if (manualLyricsSave) {
  manualLyricsSave.onclick = () => saveManualLyrics();
}
if (manualLyricsClear) {
  manualLyricsClear.onclick = async () => {
    if (!currentSongMeta.cleanArtist || !currentSongMeta.cleanTitle) return;
    await setCache(currentSongMeta.cleanArtist, currentSongMeta.cleanTitle, null, null, {
      manualPlain: null,
      manualSynced: null
    });
    closeManualLyricsModal();
    if (lastMediaSnapshot) {
      lastSongKey = '';
      handleMediaUpdate(lastMediaSnapshot);
    }
  };
}
if (manualLyricsModal) {
  manualLyricsModal.addEventListener('click', (e) => {
    if (e.target === manualLyricsModal) closeManualLyricsModal();
  });
}
document.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && manualLyricsModal && manualLyricsModal.classList.contains('open')) {
    closeManualLyricsModal();
  }
});

// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
// MEDIA CONTROLS (Buttons + Keyboard)
// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
if (window.electronAPI) {
  $('media-prev').onclick = () => electronAPI.mediaPrev();
  $('media-play').onclick = () => electronAPI.mediaPlayPause();
  $('media-next').onclick = () => electronAPI.mediaNext();
}

document.addEventListener('keydown', (e) => {
  // Don't capture keys when typing in inputs
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  // Don't capture keys when video overlay is open (it has its own handler)
  if (vid_isOpen) return;

  if (window.electronAPI) {
    if (e.code === 'ArrowRight') {
      e.preventDefault();
      electronAPI.mediaNext();
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      electronAPI.mediaPrev();
    } else if (e.code === 'ArrowDown' && currentBg === 'fotos') {
      e.preventDefault();
      ft_advanceSlide();
    } else if (e.code === 'ArrowUp' && currentBg === 'fotos') {
      e.preventDefault();
      ft_previousSlide();
    } else if (e.code === 'Space') {
      e.preventDefault();
      electronAPI.mediaPlayPause();
    } else if (e.code === 'BracketLeft') {
      e.preventDefault();
      setManualLyricOffsetMs(manualLyricOffsetMs - MANUAL_LYRIC_OFFSET_STEP_MS);
    } else if (e.code === 'BracketRight') {
      e.preventDefault();
      setManualLyricOffsetMs(manualLyricOffsetMs + MANUAL_LYRIC_OFFSET_STEP_MS);
    }
  }
});

// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
// CLEAN ARTIST/TITLE NAMES
// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
function cleanArtist(raw) {
  if (!raw) return '';
  let c = raw.split(' - ')[0].trim();
  c = c.replace(/\s*(feat\.?|ft\.?|featuring|&|,)\s+.*/i, '').trim();
  return c;
}

function cleanTitle(raw) {
  if (!raw) return '';
  let c = raw.replace(/\s*[\(\[].*?[\)\]]\s*/g, '').trim();
  return c;
}

// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
// PARSE SYNCED LYRICS (LRC format)
// [00:12.34] Line text -> {timeMs: 12340, text: "Line text"}
// ==========================================================
function parseLRC(lrc) {
  if (!lrc) return null;
  const lines = lrc.split('\n');
  const parsed = [];
  const offsetMatch = String(lrc).match(/^\s*\[offset:\s*([+-]?\d+)\s*\]/im);
  const lrcOffsetMs = offsetMatch ? parseInt(offsetMatch[1], 10) : 0;
  
  // Regex that matches one or more timestamps.
  const timeTagRegex = /\[\d{1,3}:\d{2}(?:[\.,]\d{1,3})?\]/g;
  const wordTimeTagRegex = /<\d{1,3}:\d{2}(?:[\.,]\d{1,3})?>/g;

  for (const line of lines) {
    let match;
    let tags = [];
    
    // Extract all time tags in the line
    let text = line;
    while ((match = timeTagRegex.exec(line)) !== null) {
      tags.push(match[0]);
    }
    
    if (tags.length > 0) {
      // Remove all time tags to get just the text
      text = line.replace(timeTagRegex, '').replace(wordTimeTagRegex, '').trim();
      timeTagRegex.lastIndex = 0;
      const afterLeadingTags = line.trim().replace(/^(?:\[\d{1,3}:\d{2}(?:[\.,]\d{1,3})?\]\s*)+/, '');
      const tagsToUse = timeTagRegex.test(afterLeadingTags) ? tags.slice(0, 1) : tags;
      timeTagRegex.lastIndex = 0;
      
      for (const tag of tagsToUse) {
        const timeMatch = tag.match(/\[(\d{1,3}):(\d{2})(?:[\.,](\d{1,3}))?\]/);
        if (timeMatch) {
          const mins = parseInt(timeMatch[1], 10);
          const secs = parseInt(timeMatch[2], 10);
          let ms = 0;
          if (timeMatch[3]) {
            ms = parseInt(timeMatch[3], 10);
            if (timeMatch[3].length === 1) ms *= 100;
            else if (timeMatch[3].length === 2) ms *= 10;
          }
          const timeMs = Math.max(0, mins * 60000 + secs * 1000 + ms + lrcOffsetMs);
          if (text) {
             parsed.push({ timeMs, text });
          }
        }
      }
    }
  }

  if (parsed.length === 0) return null;

  // Crucial: Sort by timeMs to prevent jumping if tags are out of order
  parsed.sort((a, b) => a.timeMs - b.timeMs);

  // Insert "..." interlude markers for instrumental gaps >= 5 seconds
  const GAP_THRESHOLD = 5000;
  const withInterludes = [];

  // Intro interlude: if first line starts late
  if (parsed[0].timeMs >= GAP_THRESHOLD) {
    withInterludes.push({ timeMs: 0, text: '...', isInterlude: true });
  }

  const DOTS_LEAD_MS = 2500; // los "..." aparecen este tiempo ANTES de que vuelva la letra
  const MIN_LINE_DWELL_MS = 2500; // la linea cantada dura al menos esto antes de los "..."

  for (let i = 0; i < parsed.length; i++) {
    if (i > 0) {
      const gap = parsed[i].timeMs - parsed[i - 1].timeMs;
      if (gap >= GAP_THRESHOLD) {
        // Los puntos aparecen cerca del FINAL del silencio, no al principio.
        // Asi la ultima linea cantada se queda visible casi todo el hueco.
        const dotsAt = Math.max(
          parsed[i - 1].timeMs + MIN_LINE_DWELL_MS,
          parsed[i].timeMs - DOTS_LEAD_MS
        );
        withInterludes.push({
          timeMs: dotsAt,
          text: '...',
          isInterlude: true
        });
      }
    }
    withInterludes.push(parsed[i]);
  }

  return withInterludes;
}

function hasSyncedTimestamps(lrc) {
  return typeof lrc === 'string' && /\[\d{1,3}:\d{2}(?:[\.,]\d{1,3})?\]\s*\S/.test(lrc);
}

let isPlaying = false;
let currentPosMs = 0;
let lastUpdateLocalTime = 0;
let manualLyricOffsetMs = loadManualLyricOffsetMs();

function loadManualLyricOffsetMs() {
  const stored = Number(localStorage.getItem('manualLyricOffsetMs') || 0);
  if (!Number.isFinite(stored)) return 0;
  return Math.max(-MANUAL_LYRIC_OFFSET_LIMIT_MS, Math.min(MANUAL_LYRIC_OFFSET_LIMIT_MS, stored));
}

function formatOffset(ms) {
  if (ms === 0) return '0 ms';
  return `${ms > 0 ? '+' : ''}${ms} ms`;
}

function updateManualOffsetLabel() {
  const label = $('sync-offset');
  if (label) label.textContent = formatOffset(manualLyricOffsetMs);
}

function setManualLyricOffsetMs(nextOffsetMs) {
  const rounded = Math.round(Number(nextOffsetMs || 0) / 50) * 50;
  manualLyricOffsetMs = Math.max(-MANUAL_LYRIC_OFFSET_LIMIT_MS, Math.min(MANUAL_LYRIC_OFFSET_LIMIT_MS, rounded));
  localStorage.setItem('manualLyricOffsetMs', String(manualLyricOffsetMs));
  updateManualOffsetLabel();
  if (syncedLines) updateSyncPosition(getInterpolatedPositionMs(), true);
}

const syncMinusBtn = $('sync-minus');
const syncPlusBtn = $('sync-plus');
const syncResetBtn = $('sync-reset');
if (syncMinusBtn) {
  syncMinusBtn.onclick = () => setManualLyricOffsetMs(manualLyricOffsetMs - MANUAL_LYRIC_OFFSET_STEP_MS);
}
if (syncPlusBtn) {
  syncPlusBtn.onclick = () => setManualLyricOffsetMs(manualLyricOffsetMs + MANUAL_LYRIC_OFFSET_STEP_MS);
}
if (syncResetBtn) {
  syncResetBtn.onclick = () => setManualLyricOffsetMs(0);
}
updateManualOffsetLabel();

if (window.electronAPI) {
  electronAPI.onMediaUpdate(handleMediaUpdate);
}

function getInterpolatedPositionMs() {
  if (!isPlaying) return Math.max(0, currentPosMs);
  return Math.max(0, currentPosMs + (performance.now() - lastUpdateLocalTime));
}

function getLyricPositionMs(posMs) {
  return Math.max(0, posMs + manualLyricOffsetMs);
}

// Continuous interpolator for smooth synced lyrics.
function syncLoop() {
  if (isPlaying && syncedLines) {
    updateSyncPosition(getInterpolatedPositionMs());
  }
  requestAnimationFrame(syncLoop);
}
requestAnimationFrame(syncLoop);

async function handleMediaUpdate(data) {
  lastMediaSnapshot = data;
  if (data.error) {
    npStatus.textContent = 'Sin reproduccion';
    npStatus.className = 'np-status';
    isPlaying = false;
    return;
  }

  const rawArtist = data.artist || '';
  const rawTitle = data.title || '';
  const songKey = `${rawArtist}|${rawTitle}`;
  currentSongMeta = {
    artist: rawArtist,
    title: rawTitle,
    cleanArtist: cleanArtist(rawArtist),
    cleanTitle: cleanTitle(rawTitle)
  };
  const wasPlaying = isPlaying;
  isPlaying = data.status === 'Playing';
  const statusChanged = (wasPlaying !== isPlaying);

  if (data.positionMs != null) {
    let exactPosMs = Number(data.positionMs);
    if (Number.isFinite(exactPosMs)) {
      const eventTimestampMs = Number(data.timestamp);
      if (isPlaying && Number.isFinite(eventTimestampMs)) {
        const transitMs = Date.now() - eventTimestampMs;
        if (transitMs > 0) {
          exactPosMs += Math.min(transitMs, MEDIA_EVENT_LATENCY_CAP_MS);
        }
      }
      exactPosMs = Math.max(0, exactPosMs);

      // Si la cancion acaba de empezar, si estaba en pausa y se dio Play,
      // o si el tiempo es cero, sincronizamos forzosamente.
      if (!isPlaying || currentPosMs === 0 || statusChanged) {
        currentPosMs = exactPosMs;
        lastUpdateLocalTime = performance.now();
        if (syncedLines) updateSyncPosition(currentPosMs, true);
      } else {
        const elapsed = performance.now() - lastUpdateLocalTime;
        const predictedPosMs = currentPosMs + elapsed;
        const diff = exactPosMs - predictedPosMs;

        // Diferencia grande = seek real, pausa/play o cambio de cancion -> resync duro.
        if (Math.abs(diff) > SYNC_CORRECTION_THRESHOLD_MS) {
          currentPosMs = exactPosMs;
          lastUpdateLocalTime = performance.now();
          if (syncedLines) updateSyncPosition(currentPosMs, true);
        } else if (Math.abs(diff) > 40) {
          // Drift pequeno (jitter del SMTC) -> acercarse gradualmente, sin saltos.
          currentPosMs = predictedPosMs + diff * 0.2;
          lastUpdateLocalTime = performance.now();
        }
      }
    }
  }

  npStatus.textContent = isPlaying ? 'Reproduciendo' : 'En pausa';
  npStatus.className = 'np-status' + (isPlaying ? ' playing' : '');
  npTitle.textContent = rawTitle;
  npArtist.textContent = rawArtist;
  npAlbum.textContent = data.album || '';

  // New song? Fetch lyrics
  if (songKey !== lastSongKey && rawTitle) {
    lastSongKey = songKey;
    syncedLines = null;
    activeLineIdx = -1;

    // Normal behavior: Change to a random background ONLY if we are not currently playing photos
    if (currentBg !== 'fotos') {
      const bgOptions = ['universo', 'flores', 'fuego', 'aurora', 'oceano', 'galaxia', 'vapor', 'magia', 'lluvia', 'nebulosa'];
      let nextBg = currentBg;
      while(nextBg === currentBg && bgOptions.length > 1) {
        nextBg = bgOptions[Math.floor(Math.random() * bgOptions.length)];
      }
      if (bgSelector) bgSelector.value = nextBg;
      switchBg(nextBg);
    }

    const ca = cleanArtist(rawArtist);
    const ct = cleanTitle(rawTitle);

    // Check cache (IndexedDB � instant, works offline)
    const cached = await getCached(ca, ct);
    if (cached && cached.manualSynced) {
      syncedLines = parseLRC(cached.manualSynced);
      displaySyncedLyrics(rawTitle, syncedLines);
      return;
    }
    if (cached && cached.manualPlain) {
      displayPlainLyrics(rawTitle, cached.manualPlain);
      return;
    }
    if (cached && hasSyncedTimestamps(cached.synced)) {
      syncedLines = parseLRC(cached.synced);
      displaySyncedLyrics(rawTitle, syncedLines);
      return;
    }
    if (cached && cached.plain) {
      displayPlainLyrics(rawTitle, cached.plain);
      return;
    }
    if (cached && !cached.plain && !cached.synced) {
      displayNoLyrics(rawTitle);
      return;
    }

    // Show dots while fetching silently
    displayNoLyrics(rawTitle, true);

    // Fetch from internet & save to persistent cache
    console.log(`Buscando letra para: ${ca} - ${ct}`);
    const result = await fetchAllLyrics(ca, ct, data.durationMs);
    console.log(`Resultado busqueda: ${result.synced ? 'Sincronizada' : 'No encontrada con tiempo'}`);
    await setCache(ca, ct, result.plain || null, result.synced || null);

    // Only update display if this is still the current song
    if (lastSongKey === songKey) {
      if (result.synced) {
        syncedLines = parseLRC(result.synced);
        displaySyncedLyrics(rawTitle, syncedLines);
      } else if (result.plain) {
        displayPlainLyrics(rawTitle, result.plain);
      } else {
        displayNoLyrics(rawTitle);
      }
    }

    // Pre-fetch other songs by same artist in background
    prefetchArtistTracks(ca, ct);
  }
}

// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
// SYNCED LYRICS � scroll & highlight
// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
const LYRIC_LEAD_MS = 200; // activa cada linea un pelo antes de su timestamp

function updateSyncPosition(posMs, force = false) {
  if (!syncedLines || syncedLines.length === 0) return;

  let newIdx = findActiveLineIndex(getLyricPositionMs(posMs) + LYRIC_LEAD_MS);

  if (!force && newIdx === activeLineIdx) return;

  // Avance de a UNA linea: si el reloj se adelanto varias, alcanzamos
  // fluido frame a frame en vez de brincar varias lineas de golpe.
  if (!force && newIdx > activeLineIdx + 1) newIdx = activeLineIdx + 1;

  activeLineIdx = newIdx;

  if (lyricLineEls.length === 0) {
    lyricLineEls = Array.from(lyricsContent.querySelectorAll('.lyric-line'));
  }

  lyricLineEls.forEach((el, i) => {
    el.classList.remove('active', 'past', 'upcoming');
    if (i === activeLineIdx) el.classList.add('active');
    else if (i < activeLineIdx) el.classList.add('past');
    else el.classList.add('upcoming');
  });

  scrollActiveLineIntoView();
}

const LYRIC_BACK_HYSTERESIS_MS = 300; // margen para bajar de linea, evita temblor en el borde

function findActiveLineIndex(posMs) {
  let low = 0;
  let high = syncedLines.length - 1;
  let idx = -1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (posMs >= syncedLines[mid].timeMs) {
      idx = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  // Histeresis: solo retrocedemos de linea si el reloj cayo CLARAMENTE por
  // debajo del timestamp de la linea actual. Mata el rebote i <-> i+1.
  if (idx === activeLineIdx - 1 && activeLineIdx >= 0 && syncedLines[activeLineIdx]) {
    if (posMs > syncedLines[activeLineIdx].timeMs - LYRIC_BACK_HYSTERESIS_MS) {
      return activeLineIdx;
    }
  }

  return idx;
}

function scrollActiveLineIntoView() {
  if (activeLineIdx < 0 || !lyricLineEls[activeLineIdx]) return;

  const el = lyricLineEls[activeLineIdx];
  const targetTop = Math.max(
    0,
    el.offsetTop - (lyricsContainer.clientHeight / 2) + (el.offsetHeight / 2)
  );
  if (Math.abs(lyricsContainer.scrollTop - targetTop) < 4) return;
  const now = performance.now();
  const behavior = now - lastLyricScrollTime < 400 ? 'auto' : 'smooth';
  lastLyricScrollTime = now;

  lyricsContainer.scrollTo({ top: targetTop, behavior });
}

// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
// DISPLAY LYRICS
// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
function displaySyncedLyrics(title, lines) {
  if (!lines) return displayNoLyrics(title);
  activeLineIdx = -1;
  lyricLineEls = [];
  lastLyricScrollTime = 0;
  let html = `<h1 class="lyrics-title">${title}</h1>`;
  lines.forEach((l, i) => {
    if (l.isInterlude) {
      html += `<div class="lyric-line interlude-dots upcoming" data-idx="${i}">...</div>`;
    } else {
      html += `<div class="lyric-line upcoming" data-idx="${i}">${l.text}</div>`;
    }
  });
  lyricsContent.innerHTML = html;
  lyricLineEls = Array.from(lyricsContent.querySelectorAll('.lyric-line'));
  lyricsContainer.scrollTop = 0;
  updateSyncPosition(getInterpolatedPositionMs());
  console.log("Letra sincronizada mostrada");
}

function displayPlainLyrics(title, lyrics) {
  syncedLines = null;
  activeLineIdx = -1;
  lyricLineEls = [];
  lyricsContent.innerHTML = `<h1 class="lyrics-title">${title}</h1><div class="lyrics-plain">${lyrics}</div>`;
  lyricsContainer.scrollTop = 0;
}

function displayNoLyrics(title, isSearching = false) {
  syncedLines = null;
  activeLineIdx = -1;
  lyricLineEls = [];
  const msg = '...';
  lyricsContent.innerHTML = `<h1 class="lyrics-title">${title}</h1><p class="no-lyrics-dots">${msg}</p>`;
  lyricsContainer.scrollTop = 0;
}

// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
// LYRICS FETCH � Multiple APIs
// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
async function fetchAllLyrics(artist, title, durationMs = null) {
  if (window.electronAPI && window.electronAPI.scrapeLyrics) {
    const result = await window.electronAPI.scrapeLyrics(artist, title, durationMs);
    if (result && (result.synced || result.plain)) return result;
  }

  const lrcResult = await fetchLrclib(artist, title, durationMs);
  if (lrcResult && (lrcResult.synced || lrcResult.plain)) return lrcResult;

  return { plain: null, synced: null };
}

async function fetchLrclib(artist, title, durationMs = null) {
  try {
    const getUrl = new URL('https://lrclib.net/api/get');
    getUrl.searchParams.set('artist_name', artist);
    getUrl.searchParams.set('track_name', title);
    if (Number(durationMs) > 0) {
      getUrl.searchParams.set('duration', String(Math.round(Number(durationMs) / 1000)));
    }
    const getRes = await fetch(getUrl.toString());
    if (getRes.ok) {
      const getData = await getRes.json();
      if (getData && hasSyncedTimestamps(getData.syncedLyrics)) {
        return { synced: getData.syncedLyrics, plain: getData.plainLyrics || null };
      }
    }

    const searchUrl = new URL('https://lrclib.net/api/search');
    searchUrl.searchParams.set('artist_name', artist);
    searchUrl.searchParams.set('track_name', title);
    const res = await fetch(searchUrl.toString());
    if (!res.ok) return { plain: null, synced: null };
    const data = await res.json();
    if (data && data.length > 0) {
      const syncedCandidates = data.filter(d => hasSyncedTimestamps(d.syncedLyrics));
      if (syncedCandidates.length === 0) return { plain: null, synced: null };
      const expectedDurationSec = Number(durationMs) > 0 ? Number(durationMs) / 1000 : null;
      const best = syncedCandidates
        .map(track => ({
          track,
          score: scoreLrclibMatch(track, artist, title, expectedDurationSec)
        }))
        .sort((a, b) => a.score - b.score)[0].track;
      return {
        synced: best.syncedLyrics,
        plain: best.plainLyrics || null
      };
    }
  } catch {}
  return { plain: null, synced: null };
}

function scoreLrclibMatch(track, artist, title, expectedDurationSec) {
  let score = 0;
  const trackTitle = String(track.trackName || track.name || '').toLowerCase();
  const trackArtist = String(track.artistName || '').toLowerCase();
  const wantedTitle = String(title || '').toLowerCase();
  const wantedArtist = String(artist || '').toLowerCase();

  if (trackTitle && wantedTitle && trackTitle !== wantedTitle) score += 8;
  if (trackArtist && wantedArtist && !trackArtist.includes(wantedArtist) && !wantedArtist.includes(trackArtist)) score += 5;

  const candidateDuration = Number(track.duration);
  if (expectedDurationSec && Number.isFinite(candidateDuration) && candidateDuration > 0) {
    score += Math.min(60, Math.abs(candidateDuration - expectedDurationSec));
  }

  return score;
}

// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
// PRE-FETCH CACHING
// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
async function prefetchArtistTracks(artist, currentTitle) {
  if (!artist) return;
  try {
    const res = await fetch(`https://lrclib.net/api/search?artist_name=${encodeURIComponent(artist)}`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data || !Array.isArray(data)) return;
    
    // Toma hasta 10 canciones del artista para cachear (tengan o no letra en lrclib, porque el scraper puede encontrarlas)
    const limited = data.slice(0, 10);
    
    for (const track of limited) {
      if (!track.trackName || track.trackName.toLowerCase() === currentTitle.toLowerCase()) continue;
      
      const ct = cleanTitle(track.trackName);
      const ca = cleanArtist(track.artistName || artist);
      
      const existing = await getCached(ca, ct);
      if (!existing) {
        // Usar fetchAllLyrics garantiza que si lrclib falla, se active el scraper oculto en segundo plano
        const result = await fetchAllLyrics(ca, ct);
        await setCache(ca, ct, result.plain || null, result.synced || null);
      }
    }
  } catch {}
}

// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
// BACKGROUND MANAGER
// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
bgSelector.addEventListener('change', () => switchBg(bgSelector.value));

const folderSelector = $('folder-selector');
const folderGroup = $('folder-group');
const btnOpenFolder = $('btn-open-folder');

if (btnOpenFolder && window.electronAPI) {
  btnOpenFolder.addEventListener('click', () => {
    window.electronAPI.openMediaFolder();
  });
}

let lastFolderListJSON = '';
async function updateFoldersList() {
  if (!window.electronAPI || !window.electronAPI.getFotosFolders) return;
  const folders = await window.electronAPI.getFotosFolders();
  const currentVal = folderSelector ? folderSelector.value : '';
  
  // Solo actualizamos el DOM si la lista de carpetas ha cambiado realmente
  const folderListJSON = JSON.stringify(folders);
  if (folderListJSON === lastFolderListJSON) return;
  lastFolderListJSON = folderListJSON;

  let html = '<option value="">Carpeta Principal (fotos)</option>';
  folders.forEach(f => {
    html += `<option value="${f}">${f}</option>`;
  });
  
  if (folderSelector) {
    folderSelector.innerHTML = html;
    if (folders.includes(currentVal) || currentVal === '') {
      folderSelector.value = currentVal;
    } else {
      folderSelector.value = '';
      ft_loadMedia('');
    }
  }
}

if (folderSelector) {
  folderSelector.addEventListener('change', () => {
    ft_loadMedia(folderSelector.value);
  });
}

function switchBg(name) {
  currentBg = name;
  cancelAnimationFrame(animFrame);
  if (window._cancelThreeJS) window._cancelThreeJS();
  resetBgFrameClock();
  ctx.clearRect(0, 0, W, H);
  // Clean up video overlays when switching away from fotos
  if (typeof ft_cleanupVideos === 'function') ft_cleanupVideos();
  
  if (name === 'fotos') {
    if (folderGroup) folderGroup.style.display = 'inline-block';
    updateFoldersList();
    if (typeof ft_startAutoRefresh === 'function') ft_startAutoRefresh();
  } else {
    if (folderGroup) folderGroup.style.display = 'none';
    if (typeof ft_stopAutoRefresh === 'function') ft_stopAutoRefresh();
  }
  
  const webgl = $('webgl-canvas');
  if (name === 'universo') {
    bgCanvas.style.display = 'none';
    webgl.style.display = 'block';
    loopUniverso3D();
  } else {
    bgCanvas.style.display = 'block';
    webgl.style.display = 'none';
    const bgs = {
      flores: loopFlores, fuego: loopFuego, aurora: loopAurora, oceano: loopOceano, galaxia: loopGalaxia,
      vapor: loopVapor, magia: loopMagia, lluvia: loopLluvia, nebulosa: loopNebulosa, fotos: loopFotos
    };
    if (bgs[name]) bgs[name]();
  }
}

// ���� UNIVERSO 3D (THREE.JS) ����
let threeScene, threeCore, threeGlow, threeRing1, threeRing2, threeTextGroup;
let threeTime = 0, threeTargetDist = 280, threeCurrentDist = 280, threeRotX = 0.2, threeRotY = 0;
let isThreeInitialized = false;

function initThreeJS() {
  const canvas = $('webgl-canvas');
  window.threeRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  window.threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  window.threeRenderer.setSize(window.innerWidth, window.innerHeight);

  threeScene = new THREE.Scene();
  window.threeCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);

  // Stars
  const geo = new THREE.BufferGeometry();
  const starCount = 900;
  const pos = new Float32Array(3 * starCount);
  for (let i = 0; i < starCount; i++) {
    const d = 3000 * (0.3 + 0.7 * Math.random());
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    pos[3 * i] = d * Math.sin(phi) * Math.cos(theta);
    pos[3 * i + 1] = d * Math.cos(phi);
    pos[3 * i + 2] = d * Math.sin(phi) * Math.sin(theta);
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  threeScene.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.5, color: 0xffffff })));

  // Core
  threeCore = new THREE.Mesh(
    new THREE.SphereGeometry(40, 32, 32),
    new THREE.MeshPhongMaterial({ color: 0x110f11, transparent: true, opacity: 0.6 })
  );
  threeScene.add(threeCore);
  
  // Center Logo
  const ctCanvas = document.createElement("canvas");
  ctCanvas.width = 512; ctCanvas.height = 512;
  const tCtx = ctCanvas.getContext("2d");
  tCtx.font = "bold 80px Inter"; tCtx.textAlign = "center"; tCtx.textBaseline = "middle";
  tCtx.fillStyle = "#a855f7"; tCtx.shadowColor = "#c084fc"; tCtx.shadowBlur = 30;
  tCtx.fillText("CM", 256, 256);
  const centerSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(ctCanvas), transparent: true }));
  centerSprite.scale.set(70, 70, 1);
  threeScene.add(centerSprite);

  // Glow
  const gCanvas = document.createElement("canvas");
  gCanvas.width = gCanvas.height = 768;
  const gCtx = gCanvas.getContext("2d");
  const grad = gCtx.createRadialGradient(384, 384, 38.4, 384, 384, 384);
  grad.addColorStop(0, "rgba(168,85,247,0.4)");
  grad.addColorStop(0.5, "rgba(88,28,135,0.15)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  gCtx.fillStyle = grad; gCtx.fillRect(0, 0, 768, 768);
  threeGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gCanvas), transparent: true, depthWrite: false }));
  threeGlow.scale.set(600, 600, 1);
  threeScene.add(threeGlow);

  // Rings
  const rCanvas = document.createElement("canvas");
  rCanvas.width = rCanvas.height = 768;
  const rCtx = rCanvas.getContext("2d");
  rCtx.translate(384, 384);
  const rGrad = rCtx.createRadialGradient(0, 0, 78, 0, 0, 376);
  rGrad.addColorStop(0, "rgba(233,213,255,0.5)");
  rGrad.addColorStop(0.3, "rgba(168,85,247,0.3)");
  rGrad.addColorStop(0.65, "rgba(88,28,135,0.15)");
  rGrad.addColorStop(1, "rgba(0,0,0,0)");
  rCtx.fillStyle = rGrad;
  rCtx.beginPath(); rCtx.arc(0, 0, 376, 0, 2 * Math.PI); rCtx.arc(0, 0, 261, 0, 2 * Math.PI, true);
  rCtx.fill();
  const rTex = new THREE.CanvasTexture(rCanvas);
  threeRing1 = new THREE.Mesh(new THREE.RingGeometry(60, 80, 72), new THREE.MeshBasicMaterial({ map: rTex, transparent: true, side: THREE.DoubleSide }));
  threeRing2 = new THREE.Mesh(new THREE.RingGeometry(85, 100, 72), new THREE.MeshBasicMaterial({ map: rTex, transparent: true, side: THREE.DoubleSide, opacity: 0.5 }));
  threeRing1.rotation.x = threeRing2.rotation.x = Math.PI / 2;
  threeScene.add(threeRing1); threeScene.add(threeRing2);

  // Floating Words
  threeTextGroup = new THREE.Group();
  threeScene.add(threeTextGroup);
  
  const words = ["Cafe", "Musica", "Arte", "Letras", "Miedo", "Magia", "Noche", "Pasion"];
  const colors = ["#e9d5ff", "#c084fc", "#a855f7", "#7e22ce", "#f3e8ff", "#d8b4fe"];
  
  for(let i=0; i<24; i++) {
    const w = words[Math.floor(Math.random()*words.length)];
    const c = colors[Math.floor(Math.random()*colors.length)];
    const tw = document.createElement("canvas");
    tw.width = 256; tw.height = 64;
    const tctx = tw.getContext("2d");
    tctx.font = "bold 34px Inter"; tctx.textAlign = "center"; tctx.textBaseline = "middle";
    tctx.fillStyle = "#fff"; tctx.shadowColor = c; tctx.shadowBlur = 15;
    tctx.fillText(w, 128, 32);
    const tsprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(tw), transparent: true }));
    tsprite.scale.set(35, 8.75, 1);
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    const r = 150 + 120 * Math.random();
    tsprite.userData = { phi, theta, r, speed: 0.001 + 0.001 * Math.random() };
    threeTextGroup.add(tsprite);
  }
  
  isThreeInitialized = true;
}

function loopUniverso3D(now) {
  if (!isThreeInitialized) initThreeJS();
  if (!shouldDrawBgFrame(now)) {
    window._threeAnimFrame = requestAnimationFrame(loopUniverso3D);
    return;
  }
  
  threeTime += 0.01;
  threeRing1.rotation.z += 0.002;
  threeRing2.rotation.z -= 0.0015;
  const gs = 1 + 0.03 * Math.sin(0.4 * threeTime);
  threeGlow.scale.set(gs*600, gs*600, 1);
  const cs = 1 + 0.05 * Math.sin(3 * threeTime);
  threeCore.scale.set(cs, cs, cs);
  
  threeTextGroup.children.forEach(s => {
    s.material.opacity = 0.5 + 0.25 * Math.sin(2 * threeTime);
    s.userData.theta += s.userData.speed;
    s.position.set(
      s.userData.r * Math.sin(s.userData.phi) * Math.cos(s.userData.theta),
      s.userData.r * Math.cos(s.userData.phi),
      s.userData.r * Math.sin(s.userData.phi) * Math.sin(s.userData.theta)
    );
  });
  
  // Auto rotate camera slowly
  threeRotY -= 0.001;
  
  threeCurrentDist += 0.06 * (threeTargetDist - threeCurrentDist);
  window.threeCamera.position.set(
    threeCurrentDist * Math.sin(threeRotY) * Math.cos(threeRotX),
    threeCurrentDist * Math.sin(threeRotX),
    threeCurrentDist * Math.cos(threeRotY) * Math.cos(threeRotX)
  );
  window.threeCamera.lookAt(0,0,0);
  
  window.threeRenderer.render(threeScene, window.threeCamera);
  window._threeAnimFrame = requestAnimationFrame(loopUniverso3D);
}
window._cancelThreeJS = () => cancelAnimationFrame(window._threeAnimFrame);

// ���� FLORES PREMIUM (SAKURA / CHERRY BLOSSOMS) ����
let f_petals = [], f_time = 0;
function f_createPetal() {
  return {
    x: Math.random() * W, y: -20 - Math.random() * H,
    size: 5 + Math.random() * 8,
    speedY: 0.8 + Math.random() * 1.5,
    speedX: (Math.random() - 0.5) * 1.5,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.01 + Math.random() * 0.03,
    rotX: Math.random() * Math.PI * 2,
    rotY: Math.random() * Math.PI * 2,
    rotZ: Math.random() * Math.PI * 2,
    rotSpeedX: (Math.random() - 0.5) * 0.05,
    rotSpeedY: (Math.random() - 0.5) * 0.05,
    rotSpeedZ: (Math.random() - 0.5) * 0.05,
    hue: 330 + Math.random() * 20,
    alpha: 0.5 + Math.random() * 0.5
  };
}

function loopFlores(now) {
  if (!shouldDrawBgFrame(now)) {
    animFrame=requestAnimationFrame(loopFlores);
    return;
  }
  if (f_petals.length === 0) {
    for(let i=0; i<90; i++) f_petals.push(f_createPetal());
  }
  
  // Fondo oscuro y romántico
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#150614'); bg.addColorStop(1, '#05010a');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  
  // Resplandor suave en el centro
  const g = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W,H)*0.6);
  g.addColorStop(0, 'rgba(120, 30, 80, 0.15)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  
  f_petals.forEach(p => {
    p.y += p.speedY; p.x += p.speedX + Math.sin(p.wobble) * 1.2;
    p.wobble += p.wobbleSpeed;
    p.rotX += p.rotSpeedX; p.rotY += p.rotSpeedY; p.rotZ += p.rotSpeedZ;
    
    if (p.y > H + 30 || p.x < -30 || p.x > W + 30) {
      Object.assign(p, f_createPetal(), {y: -20, x: Math.random() * W});
    }
    
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotZ);
    // Simular rotación 3D en el pétalo usando escala
    const scaleX = Math.abs(Math.cos(p.rotY)) + 0.1;
    const scaleY = Math.abs(Math.cos(p.rotX)) + 0.1;
    ctx.scale(scaleX, scaleY);
    
    ctx.beginPath();
    ctx.moveTo(0, p.size);
    ctx.bezierCurveTo(p.size, p.size, p.size*1.5, p.size/2, p.size, -p.size/2);
    ctx.bezierCurveTo(p.size/2, -p.size, -p.size/2, -p.size, -p.size, -p.size/2);
    ctx.bezierCurveTo(-p.size*1.5, p.size/2, -p.size, p.size, 0, p.size);
    ctx.fillStyle = `hsla(${p.hue}, 80%, 75%, ${p.alpha})`;
    ctx.fill();
    ctx.restore();
  });
  
  animFrame=requestAnimationFrame(loopFlores);
}

// ���� FUEGO PREMIUM ����
let fg_particles = [], fg_time = 0;
function fg_create() {
  return {
    x: W * 0.1 + Math.random() * W * 0.8,
    y: H + Math.random() * 100,
    r: 5 + Math.random() * 25,
    vy: -2 - Math.random() * 5,
    vx: (Math.random() - 0.5) * 2,
    life: 1, decay: 0.005 + Math.random() * 0.015,
    hue: 10 + Math.random() * 35,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.05 + Math.random() * 0.1
  };
}
function loopFuego(now) {
  if (!shouldDrawBgFrame(now)) {
    animFrame=requestAnimationFrame(loopFuego);
    return;
  }
  fg_time += 0.01;
  if(fg_particles.length < 110) for(let i=0;i<3;i++) fg_particles.push(fg_create());
  
  ctx.fillStyle = 'rgba(10, 2, 2, 0.3)'; ctx.fillRect(0,0,W,H);
  
  const grad = ctx.createRadialGradient(W/2, H, 0, W/2, H, H);
  grad.addColorStop(0, 'rgba(180, 40, 0, 0.15)'); grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);
  
  ctx.globalCompositeOperation = 'lighter';
  for(let i=0; i<fg_particles.length; i++) {
    const p = fg_particles[i];
    p.y += p.vy; p.x += p.vx + Math.sin(p.wobble) * 1.5; p.wobble += p.wobbleSpeed;
    p.life -= p.decay; p.r *= 0.98;
    if(p.life <= 0) Object.assign(p, fg_create());
    
    const alpha = Math.max(0, p.life); const rad = Math.max(0.1, p.r);
    ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI*2);
    ctx.fillStyle = `hsla(${p.hue}, 100%, 50%, ${alpha * 0.6})`;
    ctx.shadowColor = `hsl(${p.hue}, 100%, 50%)`; ctx.shadowBlur = Math.min(18, rad); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.shadowBlur = 0;
  animFrame=requestAnimationFrame(loopFuego);
}

// ���� AURORA PREMIUM ����
let au_time = 0, au_stars = [];
function loopAurora(now) {
  if (!shouldDrawBgFrame(now)) {
    animFrame=requestAnimationFrame(loopAurora);
    return;
  }
  au_time += 0.003;
  if(au_stars.length === 0) for(let i=0; i<140; i++) au_stars.push({x:Math.random()*W, y:Math.random()*H, s:0.5+Math.random()*1.5, tw:Math.random()*Math.PI*2});
  
  const bg = ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0, '#010a15'); bg.addColorStop(1, '#051220');
  ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
  
  ctx.fillStyle = '#fff';
  au_stars.forEach(s => {
    ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(au_time*5 + s.tw));
    ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha = 1;
  
  ctx.globalCompositeOperation = 'screen';
  const bands = [
    { color: [0, 255, 128], yBase: 0.3, amp: 80, freq: 0.002, speed: 1.2 },
    { color: [0, 200, 255], yBase: 0.4, amp: 100, freq: 0.0015, speed: 0.8 },
    { color: [128, 0, 255], yBase: 0.5, amp: 120, freq: 0.001, speed: 0.5 },
    { color: [0, 255, 64], yBase: 0.25, amp: 60, freq: 0.003, speed: 1.5 }
  ];
  
  bands.forEach((b, i) => {
    const bandTime = au_time * b.speed;
    ctx.beginPath(); ctx.moveTo(0, H);
    for(let x=0; x<=W; x+=10) {
      let y = H * b.yBase + Math.sin(x * b.freq + bandTime) * b.amp + Math.sin(x * b.freq * 2.5 - bandTime * 1.3) * (b.amp * 0.4);
      y += Math.sin(x * 0.0005 + bandTime * 0.2) * 150;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H); ctx.closePath();
    
    const grad = ctx.createLinearGradient(0, H*0.1, 0, H);
    grad.addColorStop(0, `rgba(${b.color[0]}, ${b.color[1]}, ${b.color[2]}, 0)`);
    grad.addColorStop(0.3, `rgba(${b.color[0]}, ${b.color[1]}, ${b.color[2]}, 0.15)`);
    grad.addColorStop(1, `rgba(${b.color[0]}, ${b.color[1]}, ${b.color[2]}, 0)`);
    ctx.fillStyle = grad; ctx.fill();
  });
  ctx.globalCompositeOperation = 'source-over';
  animFrame=requestAnimationFrame(loopAurora);
}

// ���� OCEANO PREMIUM ����
let oc_bubbles = [], oc_time = 0;
function oc_create() {
  return {
    x: Math.random() * W, y: H + Math.random() * 200,
    r: 2 + Math.random() * 8, vy: -0.5 - Math.random() * 1.5,
    wobble: Math.random() * Math.PI * 2, speed: 0.02 + Math.random() * 0.04
  };
}
function loopOceano(now) {
  if (!shouldDrawBgFrame(now)) {
    animFrame=requestAnimationFrame(loopOceano);
    return;
  }
  oc_time += 0.01;
  if(oc_bubbles.length < 80) for(let i=0;i<2;i++) oc_bubbles.push(oc_create());
  
  const bg = ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0, '#001a33'); bg.addColorStop(0.4, '#002b5e'); bg.addColorStop(1, '#000a14');
  ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
  
  ctx.globalCompositeOperation = 'screen';
  for(let i=0; i<8; i++) {
    ctx.save();
    ctx.translate(W * (0.1 + i * 0.12) + Math.sin(oc_time * 0.5 + i) * 60, 0);
    const grad = ctx.createLinearGradient(0, 0, 0, H * 0.8);
    grad.addColorStop(0, 'rgba(128, 200, 255, 0.15)'); grad.addColorStop(1, 'rgba(128, 200, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(-150 - Math.sin(oc_time+i)*50, H); ctx.lineTo(150 + Math.cos(oc_time+i)*50, H); ctx.lineTo(40, 0); ctx.fill();
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over';
  
  oc_bubbles.forEach(b => {
    b.y += b.vy; b.x += Math.sin(b.wobble) * 1.2; b.wobble += b.speed;
    if(b.y < -20) Object.assign(b, oc_create(), {y: H + 20});
    
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(180, 230, 255, 0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(b.x - b.r*0.3, b.y - b.r*0.3, b.r*0.25, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'; ctx.fill();
  });
  animFrame=requestAnimationFrame(loopOceano);
}

// ���� GALAXIA PREMIUM ����
let gx_stars = [], gx_time = 0;
function loopGalaxia(now) {
  if (!shouldDrawBgFrame(now)) {
    animFrame=requestAnimationFrame(loopGalaxia);
    return;
  }
  gx_time += 0.002;
  if(gx_stars.length === 0) {
    for(let i=0; i<700; i++) {
      const dist = Math.pow(Math.random(), 1.5) * Math.max(W, H) * 0.6;
      gx_stars.push({
        dist: dist, angle: ((i % 3) * Math.PI * 2 / 3) + dist * 0.005 + Math.random() * 0.5 - 0.25,
        size: 0.5 + Math.random() * 2, hue: 220 + Math.random() * 100
      });
    }
  }
  
  ctx.fillStyle = 'rgba(5, 0, 10, 0.2)'; ctx.fillRect(0,0,W,H);
  
  const cx = W / 2, cy = H / 2;
  ctx.globalCompositeOperation = 'screen';
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 300);
  grad.addColorStop(0, 'rgba(255, 200, 255, 0.8)'); grad.addColorStop(0.2, 'rgba(150, 50, 255, 0.3)'); grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);
  
  gx_stars.forEach(s => {
    const currentAngle = s.angle + gx_time * (1000 / (s.dist + 100));
    const px = cx + Math.cos(currentAngle) * s.dist;
    const py = cy + Math.sin(currentAngle) * s.dist;
    const pyTilt = cy + (py - cy) * 0.6;
    
    ctx.beginPath(); ctx.arc(px, pyTilt, s.size, 0, Math.PI*2);
    ctx.fillStyle = `hsla(${s.hue}, 80%, 70%, ${Math.min(1, 200 / (s.dist + 1))})`; ctx.fill();
  });
  ctx.globalCompositeOperation = 'source-over';
  animFrame=requestAnimationFrame(loopGalaxia);
}

// ���� VAPOR ÁMBAR (CAF�0) ����
let vp_particles = [], vp_time = 0;
function vp_create() {
  return {
    x: W * 0.2 + Math.random() * W * 0.6,
    y: H + 50,
    r: 20 + Math.random() * 60,
    vx: (Math.random() - 0.5) * 0.8,
    vy: -0.5 - Math.random() * 1.5,
    life: 1, decay: 0.002 + Math.random() * 0.005,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.01 + Math.random() * 0.02,
    isDust: Math.random() > 0.8
  };
}
function loopVapor(now) {
  if (!shouldDrawBgFrame(now)) {
    animFrame = requestAnimationFrame(loopVapor);
    return;
  }
  vp_time += 0.01;
  if(vp_particles.length < 60) for(let i=0;i<2;i++) vp_particles.push(vp_create());
  
  const bg = ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0, '#1c0c04'); bg.addColorStop(0.5, '#2a1104'); bg.addColorStop(1, '#0c0501');
  ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
  
  ctx.globalCompositeOperation = 'screen';
  const spot = ctx.createRadialGradient(W/2, H, 0, W/2, H, H);
  spot.addColorStop(0, 'rgba(255, 120, 40, 0.2)'); spot.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = spot; ctx.fillRect(0,0,W,H);
  
  vp_particles.forEach(p => {
    p.x += p.vx + Math.sin(p.wobble) * 1.5;
    p.y += p.vy;
    p.wobble += p.wobbleSpeed;
    p.life -= p.decay;
    if(p.life <= 0) Object.assign(p, vp_create());
    
    ctx.beginPath();
    const alpha = Math.max(0, p.life);
    if(p.isDust) {
      ctx.arc(p.x, p.y, p.r * 0.05, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255, 200, 100, ${alpha * 0.8})`;
    } else {
      ctx.arc(p.x, p.y, p.r * (2 - p.life), 0, Math.PI*2);
      ctx.fillStyle = `rgba(220, 140, 80, ${alpha * 0.05})`;
    }
    ctx.fill();
  });
  ctx.globalCompositeOperation = 'source-over';
  animFrame = requestAnimationFrame(loopVapor);
}

// ���� BOSQUE MÁGICO (LUCI�0RNAGAS) ����
let mg_flies = [], mg_time = 0;
function mg_create() {
  return {
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5,
    size: 1 + Math.random() * 2.5,
    blinkOffset: Math.random() * Math.PI * 2,
    blinkSpeed: 0.02 + Math.random() * 0.05,
    hue: 50 + Math.random() * 30
  };
}
function loopMagia(now) {
  if (!shouldDrawBgFrame(now)) {
    animFrame = requestAnimationFrame(loopMagia);
    return;
  }
  mg_time += 0.01;
  if(mg_flies.length === 0) for(let i=0;i<70;i++) mg_flies.push(mg_create());
  
  const bg = ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0, '#020d08'); bg.addColorStop(1, '#05140b');
  ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
  
  ctx.globalCompositeOperation = 'screen';
  mg_flies.forEach(f => {
    f.x += f.vx; f.y += f.vy;
    if(f.x < 0 || f.x > W) f.vx *= -1;
    if(f.y < 0 || f.y > H) f.vy *= -1;
    
    f.vx += (Math.random() - 0.5) * 0.1;
    f.vy += (Math.random() - 0.5) * 0.1;
    
    const speed = Math.sqrt(f.vx*f.vx + f.vy*f.vy);
    if(speed > 1.5) { f.vx /= speed; f.vy /= speed; }
    
    const alpha = 0.2 + 0.8 * Math.abs(Math.sin(mg_time + f.blinkOffset));
    
    ctx.beginPath(); ctx.arc(f.x, f.y, f.size, 0, Math.PI*2);
    ctx.fillStyle = `hsla(${f.hue}, 100%, 70%, ${alpha})`;
    ctx.shadowColor = `hsl(${f.hue}, 100%, 50%)`; ctx.shadowBlur = f.size * 2;
    ctx.fill(); ctx.shadowBlur = 0;
  });
  ctx.globalCompositeOperation = 'source-over';
  animFrame = requestAnimationFrame(loopMagia);
}

// ���� LLUVIA RELAJANTE ����
let ll_drops = [], ll_splashes = [];
function ll_createDrop() {
  return {
    x: Math.random() * W * 1.5 - W * 0.2,
    y: -50 - Math.random() * H,
    vy: 15 + Math.random() * 10,
    vx: 3 + Math.random() * 2,
    length: 20 + Math.random() * 30,
    alpha: 0.1 + Math.random() * 0.3
  };
}
function loopLluvia(now) {
  if (!shouldDrawBgFrame(now)) {
    animFrame = requestAnimationFrame(loopLluvia);
    return;
  }
  if(ll_drops.length === 0) for(let i=0;i<110;i++) ll_drops.push(ll_createDrop());
  
  const bg = ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0, '#08121c'); bg.addColorStop(1, '#02060a');
  ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
  
  const g = ctx.createLinearGradient(0, H - 200, 0, H);
  g.addColorStop(0, 'rgba(50, 100, 150, 0)'); g.addColorStop(1, 'rgba(50, 100, 150, 0.15)');
  ctx.fillStyle = g; ctx.fillRect(0, H - 200, W, 200);
  
  ctx.strokeStyle = '#aaccff'; ctx.lineCap = 'round';
  
  ll_drops.forEach(d => {
    d.x += d.vx; d.y += d.vy;
    if(d.y > H) {
      if(Math.random() > 0.5) ll_splashes.push({x: d.x, y: H - Math.random()*20, life: 1, r: 1});
      Object.assign(d, ll_createDrop(), {y: -50});
    }
    ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.vx * (d.length/d.vy), d.y - d.length);
    ctx.globalAlpha = d.alpha; ctx.lineWidth = 1.5; ctx.stroke();
  });
  
  ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(150, 200, 255, 0.5)';
  for(let i = ll_splashes.length - 1; i >= 0; i--) {
    let s = ll_splashes[i];
    s.life -= 0.1; s.r += 0.5;
    if(s.life <= 0) { ll_splashes.splice(i, 1); continue; }
    ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r*2, s.r, 0, 0, Math.PI*2);
    ctx.globalAlpha = s.life * 0.5; ctx.stroke();
  }
  ctx.globalAlpha = 1;
  animFrame = requestAnimationFrame(loopLluvia);
}

// ���� NEBULOSA ET�0REA ����
let nb_time = 0;
function loopNebulosa(now) {
  if (!shouldDrawBgFrame(now)) {
    animFrame = requestAnimationFrame(loopNebulosa);
    return;
  }
  nb_time += 0.002;
  
  ctx.fillStyle = '#010008'; ctx.fillRect(0,0,W,H);
  ctx.globalCompositeOperation = 'screen';
  const cx = W/2, cy = H/2;
  
  for(let i=0; i<3; i++) {
    const angle = nb_time * (i+1) * (i%2===0?1:-1);
    const radius = Math.max(W,H) * 0.8;
    const px = cx + Math.cos(angle) * 150;
    const py = cy + Math.sin(angle) * 100;
    
    const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
    if(i===0) { grad.addColorStop(0, 'rgba(120, 20, 180, 0.2)'); grad.addColorStop(1, 'rgba(0,0,0,0)'); }
    if(i===1) { grad.addColorStop(0, 'rgba(200, 40, 80, 0.15)'); grad.addColorStop(1, 'rgba(0,0,0,0)'); }
    if(i===2) { grad.addColorStop(0, 'rgba(40, 100, 220, 0.15)'); grad.addColorStop(1, 'rgba(0,0,0,0)'); }
    
    ctx.fillStyle = grad;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle * 0.5); ctx.translate(-cx, -cy);
    ctx.fillRect(0,0,W,H); ctx.restore();
  }
  
  if(!window._nbStars) {
    window._nbStars = [];
    for(let i=0; i<120; i++) window._nbStars.push({x:Math.random()*W, y:Math.random()*H, s:0.5+Math.random()*1.5});
  }
  ctx.fillStyle = '#fff';
  window._nbStars.forEach(s => {
    s.x += 0.1; if(s.x > W) s.x = 0;
    ctx.globalAlpha = 0.2 + 0.8 * Math.abs(Math.sin(s.x * 0.01));
    ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  animFrame = requestAnimationFrame(loopNebulosa);
}

// ���� FOTOS + VIDEOS (SLIDESHOW) ����
let ft_media = [], ft_currentIdx = -1, ft_nextIdx = -1;
let ft_lastSwitch = 0, ft_loading = false;
let ft_mediaObjs = []; // Image objects or video metadata
let ft_videoEl = null; // Current playing video element
let ft_videoNextEl = null; // Next video element (for preload)
let ft_currentFolder = '';
let ft_refreshInterval = null;

function ft_stopAutoRefresh() {
  if (ft_refreshInterval) {
    clearInterval(ft_refreshInterval);
    ft_refreshInterval = null;
  }
}

function ft_startAutoRefresh() {
  ft_stopAutoRefresh();
  ft_refreshInterval = setInterval(async () => {
    if (currentBg !== 'fotos' || !window.electronAPI || !window.electronAPI.getFotos) return;
    const newList = await window.electronAPI.getFotos(ft_currentFolder);
    
    const currentSrcs = ft_media.map(m => m.src);
    const newSrcs = newList.map(m => m.src);
    
    let changed = false;
    if (currentSrcs.length !== newSrcs.length) changed = true;
    else {
      for(let i=0; i<newSrcs.length; i++) {
        if(newSrcs[i] !== currentSrcs[i]) { changed = true; break; }
      }
    }
    
    if (changed) {
      if (ft_media.length === 0) {
        ft_loadMedia(ft_currentFolder);
        return;
      }
      ft_media = newList;
      ft_mediaObjs = newList.map(item => {
        const existing = ft_mediaObjs.find(o => o.src === item.src);
        if (existing) return existing;
        if (item.type === 'video') return { type: 'video', src: item.src, ready: false };
        const img = new Image();
        img.src = item.src;
        return { type: 'image', el: img, src: item.src };
      });
      if (ft_currentIdx >= ft_media.length) {
        ft_currentIdx = 0;
        ft_nextIdx = ft_media.length > 1 ? 1 : 0;
        ft_showMedia(ft_currentIdx);
      } else {
        ft_nextIdx = (ft_currentIdx + 1) % ft_media.length;
      }
      updateFoldersList(); // check for newly added folders as well
    }
  }, 5000);
}

function ft_loadMedia(folder = '') {
  if (ft_loading || !window.electronAPI || !window.electronAPI.getFotos) return;
  ft_loading = true;
  ft_currentFolder = folder;
  window.electronAPI.getFotos(folder).then(mediaList => {
    ft_media = mediaList;
    ft_mediaObjs = mediaList.map(item => {
      if (item.type === 'video') {
        return { type: 'video', src: item.src, ready: false };
      } else {
        // Legacy support: if item is a string (old format), treat as image
        const src = typeof item === 'string' ? item : item.src;
        const img = new Image();
        img.src = src;
        return { type: 'image', el: img, src };
      }
    });
    ft_loading = false;
    if(ft_media.length > 0) {
      ft_currentIdx = 0;
      ft_nextIdx = ft_media.length > 1 ? 1 : 0;
      ft_lastSwitch = performance.now();
      ft_showMedia(ft_currentIdx);
    } else {
      ft_cleanupVideos();
    }
  }).catch(() => { ft_loading = false; });
}

function ft_createVideoEl(src) {
  const vid = document.createElement('video');
  vid.src = src;
  vid.muted = true;
  vid.loop = false;
  vid.playsInline = true;
  vid.preload = 'auto';
  vid.className = 'ft-video-overlay';
  document.body.appendChild(vid);
  return vid;
}

function ft_cleanupVideos() {
  if (ft_videoEl) { ft_videoEl.pause(); ft_videoEl.remove(); ft_videoEl = null; }
  if (ft_videoNextEl) { ft_videoNextEl.pause(); ft_videoNextEl.remove(); ft_videoNextEl = null; }
}

function ft_showMedia(idx) {
  const item = ft_mediaObjs[idx];
  if (!item) return;

  if (item.type === 'video') {
    // Hide canvas, show video overlay
    ft_cleanupVideos();
    ft_videoEl = ft_createVideoEl(item.src);
    ft_videoEl.oncanplay = () => {
      ft_videoEl.style.opacity = '1';
      ft_videoEl.play().catch(() => {});
    };
    ft_videoEl.onended = () => {
      ft_advanceSlide();
    };
  }
}


function ft_advanceSlide() {
  if (ft_media.length === 0) return;

  const wasLastSlide = (ft_currentIdx === ft_media.length - 1);

  ft_currentIdx = ft_nextIdx;
  ft_nextIdx = (ft_currentIdx + 1) % ft_media.length;
  ft_lastSwitch = performance.now();
  ft_cleanupVideos();
  ft_showMedia(ft_currentIdx);
}

function ft_previousSlide() {
  if (ft_media.length === 0) return;
  ft_currentIdx = (ft_currentIdx - 1 + ft_media.length) % ft_media.length;
  ft_nextIdx = (ft_currentIdx + 1) % ft_media.length;
  ft_lastSwitch = performance.now();
  ft_cleanupVideos();
  ft_showMedia(ft_currentIdx);
}

function drawCover(img, alpha) {
  if (!img || !img.complete || img.naturalWidth === 0) return;
  const imgRatio = img.width / img.height;
  const canvasRatio = W / H;
  
  // 1. Draw blurred background (Cover)
  let bgW, bgH, bgX, bgY;
  if (imgRatio > canvasRatio) {
    bgH = H; bgW = H * imgRatio;
    bgX = (W - bgW) / 2; bgY = 0;
  } else {
    bgW = W; bgH = W / imgRatio;
    bgX = 0; bgY = (H - bgH) / 2;
  }
  
  ctx.globalAlpha = alpha * 0.4; // Dim the background
    ctx.filter = 'blur(12px)';
  ctx.drawImage(img, bgX, bgY, bgW, bgH);
  ctx.filter = 'none';

  // 2. Draw clear foreground (Contain)
  let fgW, fgH, fgX, fgY;
  if (imgRatio > canvasRatio) {
    fgW = W; fgH = W / imgRatio;
    fgX = 0; fgY = (H - fgH) / 2;
  } else {
    fgH = H; fgW = H * imgRatio;
    fgY = 0; fgX = (W - fgW) / 2;
  }
  
  ctx.globalAlpha = alpha;
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
  ctx.drawImage(img, fgX, fgY, fgW, fgH);
  ctx.shadowBlur = 0;
}

function loopFotos(now) {
  if (!shouldDrawBgFrame(now)) {
    animFrame = requestAnimationFrame(loopFotos);
    return;
  }
  if (ft_media.length === 0 && !ft_loading) ft_loadMedia(ft_currentFolder);
  
  ctx.fillStyle = '#050505'; ctx.fillRect(0,0,W,H);
  
  const currentItem = ft_mediaObjs[ft_currentIdx];
  
  if (ft_media.length > 0 && currentItem) {
    if (currentItem.type === 'video') {
      // Video is handled by the overlay element
    } else if (currentItem.type === 'image' && currentItem.el) {
      const now = performance.now();
      const elapsed = now - ft_lastSwitch;
      const duration = 10000; // 10 seconds per photo
      const fadeDuration = 2000; // 2 seconds crossfade
      
      let progress = elapsed / duration;

      // Draw blurred background always
      ctx.globalAlpha = 0.4;
      ctx.filter = 'blur(12px)';
      ctx.drawImage(currentItem.el, 0, 0, W, H);
      ctx.filter = 'none';
      ctx.globalAlpha = 1;

      // Zoom in softly by 5%
      const scale = 1.0 + (progress * 0.05);
      ctx.save();
      ctx.translate(W/2, H/2);
      ctx.scale(scale, scale);
      ctx.translate(-W/2, -H/2);
      drawCover(currentItem.el, 1);
      ctx.restore();
      
      if (elapsed > duration - fadeDuration && ft_media.length > 1) {
        const nextItem = ft_mediaObjs[ft_nextIdx];
        if (nextItem && nextItem.type === 'image' && nextItem.el) {
          const fadeProgress = (elapsed - (duration - fadeDuration)) / fadeDuration;
          const nextScale = 1.0 + (fadeProgress * 0.05 * (fadeDuration/duration));
          ctx.save();
          ctx.translate(W/2, H/2);
          ctx.scale(nextScale, nextScale);
          ctx.translate(-W/2, -H/2);
          drawCover(nextItem.el, fadeProgress);
          ctx.restore();
        }
        
        if (elapsed >= duration) {
          ft_advanceSlide();
        }
      }
    }
  } else if (!ft_loading) {
    ctx.fillStyle = '#ffffff'; ctx.font = '24px Inter'; ctx.textAlign = 'center';
    ctx.fillText('Añade imágenes o videos en la carpeta "fotos"', W/2, H/2);
  }
  
  ctx.globalAlpha = 1;
  animFrame = requestAnimationFrame(loopFotos);
}

// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
// VIDEO PLAYER � Reproducción con audio + pausa automática de música
// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
let vid_list = [];          // Array of {src, name}
let vid_currentIdx = -1;
let vid_isOpen = false;
let vid_wasPlaying = false; // Was music playing before opening video?
let vid_controlsTimer = null;

const vidOverlay = $('video-overlay');
const vidPlayer = $('video-player');
const vidTitle = $('video-title');
const vidPlayBtn = $('vid-play-btn');

// Load videos from the videos/ folder
async function vid_loadVideos(folder = '') {
  if (!window.electronAPI || !window.electronAPI.getVideos) return;
  try {
    vid_list = await window.electronAPI.getVideos(folder);
  } catch (e) {
    console.error('Error loading videos:', e);
    vid_list = [];
  }
}

// Play a specific video by index
function vid_playVideo(idx) {
  if (vid_list.length === 0 || idx < 0 || idx >= vid_list.length) return;

  vid_currentIdx = idx;
  const video = vid_list[idx];

  // Track if music was playing, then pause it
  vid_wasPlaying = isPlaying;
  if (vid_wasPlaying && window.electronAPI) {
    window.electronAPI.mediaPlayPause(); // Pause music
  }

  // Set up the video element
  vidPlayer.src = video.src;
  vidPlayer.muted = false;    // WITH AUDIO
  vidPlayer.currentTime = 0;

  // Show overlay
  vidOverlay.style.display = 'flex';
  requestAnimationFrame(() => {
    vidOverlay.classList.add('active');
    vidOverlay.classList.add('show-controls');
  });

  // Show title
  const displayName = video.name.replace(/\.[^/.]+$/, ''); // Remove extension
  vidTitle.textContent = `�x}� ${displayName}`;

  // Hide lyrics and now-playing during video
  if (lyricsContainer) lyricsContainer.style.visibility = 'hidden';
  const nowPlaying = $('now-playing');
  if (nowPlaying) nowPlaying.style.visibility = 'hidden';

  vid_isOpen = true;

  // Play
  vidPlayer.play().catch(err => {
    console.error('Video play error:', err);
  });

  // Auto-hide controls after 3 seconds
  vid_resetControlsTimer();
}

// When video ends naturally
function vid_onVideoEnded() {
  // Check if there are more videos
  if (vid_list.length > 1 && vid_currentIdx < vid_list.length - 1) {
    // Play next video
    vid_playVideo(vid_currentIdx + 1);
  } else {
    // No more videos, close overlay and resume music
    vid_close();
  }
}

// Close the video overlay
function vid_close() {
  if (!vid_isOpen) return;

  vidPlayer.pause();
  vidPlayer.src = '';
  vidOverlay.classList.remove('active', 'show-controls');

  setTimeout(() => {
    vidOverlay.style.display = 'none';
  }, 500); // Wait for fade-out

  // Restore lyrics and now-playing
  if (lyricsContainer) lyricsContainer.style.visibility = 'visible';
  const nowPlaying = $('now-playing');
  if (nowPlaying) nowPlaying.style.visibility = 'visible';

  // Resume music if it was playing before
  if (vid_wasPlaying && window.electronAPI) {
    window.electronAPI.mediaPlayPause(); // Unpause music
  }

  vid_isOpen = false;
  vid_wasPlaying = false;
  vid_currentIdx = -1;

  if (vid_controlsTimer) {
    clearTimeout(vid_controlsTimer);
    vid_controlsTimer = null;
  }
}

// Next video
function vid_nextVideo() {
  if (vid_list.length === 0) return;
  const nextIdx = (vid_currentIdx + 1) % vid_list.length;
  vid_playVideo(nextIdx);
}

// Previous video
function vid_prevVideo() {
  if (vid_list.length === 0) return;
  // If more than 3 seconds into video, restart it
  if (vidPlayer.currentTime > 3) {
    vidPlayer.currentTime = 0;
    return;
  }
  const prevIdx = (vid_currentIdx - 1 + vid_list.length) % vid_list.length;
  vid_playVideo(prevIdx);
}

// Auto-hide controls after 3 seconds of no movement
function vid_resetControlsTimer() {
  if (vid_controlsTimer) clearTimeout(vid_controlsTimer);
  vidOverlay.classList.add('show-controls');
  vid_controlsTimer = setTimeout(() => {
    vidOverlay.classList.remove('show-controls');
  }, 3000);
}

// Event listeners
vidPlayer.addEventListener('ended', vid_onVideoEnded);

vidOverlay.addEventListener('mousemove', vid_resetControlsTimer);
vidOverlay.addEventListener('click', (e) => {
  // Only toggle play/pause if clicking on the video itself (not controls)
  if (e.target === vidPlayer) {
    if (vidPlayer.paused) vidPlayer.play();
    else vidPlayer.pause();
    vid_resetControlsTimer();
  }
});

$('vid-close').addEventListener('click', vid_close);
$('vid-next').addEventListener('click', vid_nextVideo);
$('vid-prev').addEventListener('click', vid_prevVideo);

// Button in controls bar � loads and starts playing
if (vidPlayBtn) {
  vidPlayBtn.addEventListener('click', async () => {
    await vid_loadVideos();
    if (vid_list.length === 0) {
      alert('No hay videos en la carpeta "videos/". Añade archivos .mp4, .webm, .mov o .avi.');
      return;
    }
    vid_playVideo(0);
  });
}

// Keyboard controls for video overlay
document.addEventListener('keydown', (e) => {
  if (!vid_isOpen) return;

  if (e.code === 'Escape') {
    e.preventDefault();
    vid_close();
  } else if (e.code === 'ArrowRight') {
    e.preventDefault();
    vid_nextVideo();
  } else if (e.code === 'ArrowLeft') {
    e.preventDefault();
    vid_prevVideo();
  } else if (e.code === 'Space') {
    e.preventDefault();
    if (vidPlayer.paused) vidPlayer.play();
    else vidPlayer.pause();
    vid_resetControlsTimer();
  }
});

// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
// INIT
// �"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"��"�
switchBg('universo');
