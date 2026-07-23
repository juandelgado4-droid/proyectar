process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const branding = require('./branding');
let autoUpdater = null;
const fsp = fs.promises;

try {
  ({ autoUpdater } = require('electron-updater'));
} catch {}

// Animations and WebGL backgrounds need the GPU. If a specific PC has GPU-driver
// trouble, launch with PROYECTOR_DISABLE_GPU=1 to fall back to software rendering.
if (process.env.PROYECTOR_DISABLE_GPU === '1') {
  app.disableHardwareAcceleration();
} else {
  app.commandLine.appendSwitch('ignore-gpu-blocklist');
  app.commandLine.appendSwitch('enable-gpu-rasterization');
}

// Handle the case where the app is launched by the installer — prevent duplicate instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let userDocs = '';
let logFilePath = '';

// Helper: resolve paths correctly whether running in dev or packaged (ASAR)
function getAppPath(relativePath) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, relativePath);
  }
  return path.join(__dirname, relativePath);
}

const LOGO_EXTENSIONS = new Set(['.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico']);
const PHOTO_VIDEO_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov|avi)$/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|avi|mkv)$/i;
const FS_CONCURRENCY = 24;

function getDefaultLogoPath() {
  return path.join(__dirname, branding.logoPath || 'logo.svg');
}

function getLogoConfigPath() {
  return path.join(app.getPath('userData'), 'logo-config.json');
}

function readLogoConfig() {
  try {
    const config = JSON.parse(fs.readFileSync(getLogoConfigPath(), 'utf8'));
    if (config && config.path && fs.existsSync(config.path)) return config;
  } catch {}
  return null;
}

function resolveLogoPath() {
  const config = readLogoConfig();
  return config?.path || getDefaultLogoPath();
}

function getLogoPayload() {
  const logoPath = resolveLogoPath();
  let version = Date.now();
  try {
    version = Math.round(fs.statSync(logoPath).mtimeMs);
  } catch {}
  return {
    src: `${pathToFileURL(logoPath).toString()}?v=${version}`,
    path: logoPath,
    isCustom: Boolean(readLogoConfig())
  };
}

function getWindowIconPath() {
  const config = readLogoConfig();
  if (config?.path) return config.path;
  return path.join(__dirname, branding.windowIconPath || branding.logoPath || 'logo.svg');
}

function broadcastLogoUpdated(payload) {
  for (const win of [mainWindow, proyectorWindow]) {
    if (!win || win.isDestroyed()) continue;
    win.webContents.send('logo-updated', payload);
    if (typeof win.setIcon === 'function') {
      try { win.setIcon(payload.path); } catch {}
    }
  }
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

function resolveMediaDir(baseDir, subfolder) {
  const base = path.resolve(baseDir);
  const requested = String(subfolder || '').trim();
  const target = requested ? path.resolve(base, requested) : base;
  if (target !== base && !target.startsWith(base + path.sep)) {
    throw new Error('Carpeta invalida');
  }
  return target;
}

async function listSubfolders(baseDir) {
  await ensureDir(baseDir);
  const entries = await fsp.readdir(baseDir, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
}

async function listMediaFiles(baseDir, subfolder, matcher, toItem) {
  await ensureDir(baseDir);
  const dir = resolveMediaDir(baseDir, subfolder);
  await ensureDir(dir);
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const files = entries
    .filter(entry => entry.isFile() && matcher.test(entry.name))
    .map(entry => entry.name);

  const filesWithStats = await mapWithConcurrency(files, FS_CONCURRENCY, async (file) => {
    const fullPath = path.join(dir, file);
    try {
      const stat = await fsp.stat(fullPath);
      return { file, fullPath, mtime: stat.mtimeMs };
    } catch {
      return { file, fullPath, mtime: 0 };
    }
  });

  return filesWithStats
    .sort((a, b) => b.mtime - a.mtime)
    .map(toItem);
}

let mainWindow;
let proyectorWindow = null;
let mediaProcess = null;
let mediaKeyProcess = null;

function appendLog(level, message) {
  const line = `[${new Date().toISOString()}] [${level}] ${message}\n`;
  try {
    if (!logFilePath) {
      logFilePath = path.join(app.getPath('userData'), 'aurora-letras.log');
    }
    fs.appendFileSync(logFilePath, line, 'utf8');
  } catch {}
}

function logError(message, error) {
  const detail = error && error.stack ? error.stack : String(error || '');
  console.error(message, error);
  appendLog('ERROR', `${message}${detail ? ` :: ${detail}` : ''}`);
}

process.on('uncaughtException', (error) => {
  logError('Uncaught exception', error);
});

process.on('unhandledRejection', (reason) => {
  logError('Unhandled rejection', reason);
});

function forceShowWindow() {
  if (!mainWindow) return;
  // Aggressive approach to force window to front on Windows
  mainWindow.show();
  mainWindow.focus();
  // Trick: temporarily set always on top to bypass Windows focus-stealing prevention
  mainWindow.setAlwaysOnTop(true);
  setTimeout(() => {
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(false);
      mainWindow.focus();
    }
  }, 300);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    transparent: false,
    backgroundColor: '#050505',
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    },
    icon: getWindowIconPath()
  });

  mainWindow.loadFile('index.html', { query: { mode: 'main' } });
  mainWindow.setMenuBarVisibility(false);

  // Force window to front once content is loaded
  mainWindow.webContents.on('did-finish-load', () => {
    forceShowWindow();
  });

  // Also force show on ready-to-show
  mainWindow.once('ready-to-show', () => {
    forceShowWindow();
  });

  // Fallback: force show after 2 seconds no matter what
  setTimeout(() => {
    forceShowWindow();
  }, 2000);

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    logError('Failed to load main window', `${errorCode} ${errorDescription}`);
    // Even on fail, show the window
    forceShowWindow();
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[RENDERER] ${message} (at ${sourceId}:${line})`);
  });

  // Start continuous SMTC reader
  startMediaStream();
  startMediaKeySender();

  mainWindow.on('closed', () => {
    if (mediaProcess) {
      mediaProcess.kill();
      mediaProcess = null;
    }
    if (mediaKeyProcess) {
      mediaKeyProcess.kill();
      mediaKeyProcess = null;
    }
    mainWindow = null;
    app.quit();
  });
}

function startMediaStream() {
  if (mediaProcess) return;
  const psScript = getAppPath('get-media.ps1');
  
  mediaProcess = spawn('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', psScript
  ]);

  const rl = readline.createInterface({
    input: mediaProcess.stdout,
    terminal: false
  });

  rl.on('line', (line) => {
    if (!mainWindow) return;
    try {
      const raw = line.trim();
      if (!raw) return;
      const data = JSON.parse(raw);
      mainWindow.webContents.send('media-update', data);
      if (proyectorWindow) proyectorWindow.webContents.send('media-update', data);
    } catch { /* ignore */ }
  });

  mediaProcess.stderr.on('data', (data) => {
    logError('SMTC error', data.toString().trim());
  });

  mediaProcess.on('close', (code) => {
    appendLog('WARN', `Media process exited with code ${code}. Restarting in 2s...`);
    mediaProcess = null;
    if (mainWindow) {
      setTimeout(startMediaStream, 2000);
    }
  });
}

ipcMain.on('win-minimize', () => mainWindow?.minimize());
ipcMain.on('win-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('win-close', () => mainWindow?.close());
ipcMain.on('win-fullscreen', () => {
  const isFS = mainWindow?.isFullScreen();
  mainWindow?.setFullScreen(!isFS);
  setTimeout(() => {
    if (mainWindow) mainWindow.webContents.send('fullscreen-changed', !isFS);
  }, 300);
});

function createProyectorWindow() {
  if (proyectorWindow) {
    proyectorWindow.focus();
    return;
  }
  proyectorWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    transparent: false,
    backgroundColor: '#050505',
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    },
    icon: getWindowIconPath()
  });
  proyectorWindow.loadFile('index.html', { query: { mode: 'proyector' } });
  proyectorWindow.setMenuBarVisibility(false);
  proyectorWindow.on('closed', () => { proyectorWindow = null; });
}

ipcMain.on('open-proyector', () => createProyectorWindow());

ipcMain.on('fake-media-update', (event, data) => {
  if (proyectorWindow) proyectorWindow.webContents.send('media-update', data);
});

ipcMain.on('proyector-cmd', (event, data) => {
  if (proyectorWindow) proyectorWindow.webContents.send('proyector-cmd', data);
});

ipcMain.handle('get-fotos-folders', async () => {
  try {
    return await listSubfolders(path.join(userDocs, 'fotos y videos'));
  } catch (error) {
    logError('get-fotos-folders error', error);
    return [];
  }
});

ipcMain.handle('get-fotos', async (event, subfolder) => {
  try {
    return await listMediaFiles(
      path.join(userDocs, 'fotos y videos'),
      subfolder,
      PHOTO_VIDEO_EXTENSIONS,
      item => ({
        src: pathToFileURL(item.fullPath).toString(),
        type: /\.(mp4|webm|mov|avi)$/i.test(item.file) ? 'video' : 'image'
      })
    );
  } catch (error) {
    logError('get-fotos error', error);
    return [];
  }
});

// ── Media Control (simulate media keys) ──
function startMediaKeySender() {
  if (mediaKeyProcess) return;
  const psCmd = `
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class MK {
  [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);
  public static void Send(byte k) { keybd_event(k, 0, 0, 0); keybd_event(k, 0, 2, 0); }
}
"@
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) { break }
  $line = $line.Trim()
  if ($line.Length -eq 0) { continue }
  [MK]::Send([byte]$line)
}
`;
  mediaKeyProcess = spawn('powershell.exe', [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-Command', psCmd
  ], { stdio: ['pipe', 'pipe', 'pipe'] });

  mediaKeyProcess.stderr.on('data', (data) => {
    logError('Media key sender error', data.toString().trim());
  });

  mediaKeyProcess.on('close', (code) => {
    appendLog('WARN', `Media key sender exited with code ${code}`);
    mediaKeyProcess = null;
    if (mainWindow) {
      setTimeout(startMediaKeySender, 1000);
    }
  });
}

function sendMediaKey(vkCode) {
  if (!mediaKeyProcess || !mediaKeyProcess.stdin || mediaKeyProcess.killed) {
    startMediaKeySender();
  }
  if (mediaKeyProcess && mediaKeyProcess.stdin) {
    mediaKeyProcess.stdin.write(`${Number(vkCode)}\n`);
  }
}

ipcMain.on('media-play-pause', () => sendMediaKey('0xB3'));
ipcMain.on('media-next', () => sendMediaKey('0xB0'));
ipcMain.on('media-prev', () => sendMediaKey('0xB1'));

// ── Videos folder handlers ──
ipcMain.handle('get-videos-folders', async () => {
  try {
    return await listSubfolders(path.join(userDocs, 'solo videos'));
  } catch (error) {
    logError('get-videos-folders error', error);
    return [];
  }
});

ipcMain.handle('get-videos', async (event, subfolder) => {
  try {
    return await listMediaFiles(
      path.join(userDocs, 'solo videos'),
      subfolder,
      VIDEO_EXTENSIONS,
      item => ({
        src: pathToFileURL(item.fullPath).toString(),
        name: item.file
      })
    );
  } catch (error) {
    logError('get-videos error', error);
    return [];
  }
});

ipcMain.on('open-media-folder', () => {
  if (userDocs) shell.openPath(userDocs);
});

ipcMain.handle('get-logo', () => getLogoPayload());

// ── Cambiar Logo ──
// Guarda el logo en userData para que funcione tambien en la app instalada.
ipcMain.handle('change-logo', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Elige tu nuevo logo',
    filters: [
      { name: 'Imágenes', extensions: ['svg', 'png', 'jpg', 'jpeg', 'webp', 'ico'] }
    ],
    properties: ['openFile']
  });
  if (canceled || !filePaths.length) return { success: false };
  try {
    const src = filePaths[0];
    const ext = path.extname(src).toLowerCase();
    if (!LOGO_EXTENSIONS.has(ext)) {
      throw new Error('Formato de logo no soportado');
    }

    const logoDir = path.join(app.getPath('userData'), 'branding');
    await ensureDir(logoDir);
    const dest = path.join(logoDir, `custom-logo${ext}`);
    if (path.resolve(src) !== path.resolve(dest)) {
      await fsp.copyFile(src, dest);
    }

    const oldFiles = await fsp.readdir(logoDir).catch(() => []);
    await Promise.all(oldFiles
      .filter(file => file.startsWith('custom-logo.') && path.join(logoDir, file) !== dest)
      .map(file => fsp.unlink(path.join(logoDir, file)).catch(() => {})));

    await fsp.writeFile(
      getLogoConfigPath(),
      JSON.stringify({ path: dest, updatedAt: new Date().toISOString() }, null, 2),
      'utf8'
    );

    const payload = getLogoPayload();
    broadcastLogoUpdated(payload);
    return { success: true, ...payload };
  } catch (err) {
    logError('change-logo error', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-app-path', () => __dirname);


// ── YouTube Music Video Search ──
ipcMain.handle('search-youtube', async (event, artist, title) => {
  try {
    const query = `${artist} ${title} official music video`;
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    if (!res.ok) return null;
    const html = await res.text();
    // YouTube includes video data as JSON in the HTML — extract first videoId
    const match = html.match(/"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/);
    return match ? match[1] : null;
  } catch (e) {
    logError('YouTube search error', e);
    return null;
  }
});


function lyricSlug(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

ipcMain.handle('scrape-lyrics', async (event, artist, title) => {
  try {
    return await scrapeLyricsWithFallback(artist, title);
  } catch (e) {
    logError('Timed lyrics scraper error', e);
    return null;
  }
});

app.whenReady().then(() => {
  // Initialize userDocs path
  userDocs = path.join(app.getPath('documents'), 'proyeccion');
  if (!fs.existsSync(userDocs)) fs.mkdirSync(userDocs, { recursive: true });

  setupAutoUpdater();
  createWindow();
});

// When a second instance is launched, focus the existing window
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    forceShowWindow();
  }
});

app.on('window-all-closed', () => app.quit());

app.on('before-quit', () => {
  if (mediaProcess) {
    mediaProcess.kill();
    mediaProcess = null;
  }
  if (mediaKeyProcess) {
    mediaKeyProcess.kill();
    mediaKeyProcess = null;
  }
});

function normalizeLrcSource(text) {
  const source = String(text || '').replace(/\r/g, '\n');
  const timedLines = source
    .split('\n')
    .map(line => line.trim())
    .filter(line => /\[\d{1,3}:\d{2}(?:[.,]\d{1,3})?\]/.test(line))
    .filter(line => /\S/.test(line.replace(/\[\d{1,3}:\d{2}(?:[.,]\d{1,3})?\]/g, '').trim()));
  if (timedLines.length >= 4) return timedLines.join('\n');

  const matches = source.match(/\[\d{1,3}:\d{2}(?:[.,]\d{1,3})?\][^\[]*/g) || [];
  return matches
    .map(line => line.trim())
    .filter(line => /\]\s*\S/.test(line))
    .join('\n') || null;
}

function isSyncedLyrics(text) {
  return typeof text === 'string' && /\[\d{1,3}:\d{2}(?:[.,]\d{1,3})?\]\s*\S/.test(text);
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    }
  });
  if (!res.ok) return null;
  return await res.text();
}

function scoreTrack(track, artist, title, durationMs) {
  let score = 0;
  const trackTitle = String(track.trackName || track.name || '').toLowerCase();
  const trackArtist = String(track.artistName || '').toLowerCase();
  const wantedTitle = String(title || '').toLowerCase();
  const wantedArtist = String(artist || '').toLowerCase();
  if (trackTitle && wantedTitle && trackTitle !== wantedTitle) score += 8;
  if (trackArtist && wantedArtist && !trackArtist.includes(wantedArtist) && !wantedArtist.includes(trackArtist)) score += 5;
  const expectedDurationSec = Number(durationMs) > 0 ? Number(durationMs) / 1000 : null;
  const candidateDuration = Number(track.duration);
  if (expectedDurationSec && Number.isFinite(candidateDuration) && candidateDuration > 0) {
    score += Math.min(60, Math.abs(candidateDuration - expectedDurationSec));
  }
  return score;
}

async function fetchLrclibGet(artist, title, durationMs) {
  const url = new URL('https://lrclib.net/api/get');
  url.searchParams.set('artist_name', artist);
  url.searchParams.set('track_name', title);
  if (Number(durationMs) > 0) {
    url.searchParams.set('duration', String(Math.round(Number(durationMs) / 1000)));
  }
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  if (!data) return null;
  if (typeof data.syncedLyrics === 'string' && isSyncedLyrics(data.syncedLyrics)) {
    return { synced: data.syncedLyrics, plain: data.plainLyrics || null };
  }
  return null;
}

async function fetchLrclibSearch(artist, title, durationMs) {
  const url = new URL('https://lrclib.net/api/search');
  url.searchParams.set('artist_name', artist);
  url.searchParams.set('track_name', title);
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const synced = data.filter(track => isSyncedLyrics(track.syncedLyrics));
  if (synced.length === 0) return null;
  const best = synced
    .map(track => ({ track, score: scoreTrack(track, artist, title, durationMs) }))
    .sort((a, b) => a.score - b.score)[0].track;
  return { synced: best.syncedLyrics, plain: best.plainLyrics || null };
}

async function scrapeLegacyLyrics(artist, title) {
  const artistSlug = lyricSlug(artist);
  const titleSlug = lyricSlug(title);
  const seeds = [
    `https://www.lyricsify.com/lyrics/${artistSlug}/${titleSlug}`,
    `https://www.syair.info/lyrics/${artistSlug}/${titleSlug}`
  ];
  const visited = new Set();

  for (const seed of seeds) {
    const result = await scrapeLegacyLyricsFromUrl(seed, visited);
    if (result) return result;
  }

  return null;
}

async function scrapeLegacyLyricsFromUrl(seedUrl, visited) {
  const queue = [seedUrl];
  while (queue.length > 0 && visited.size < 10) {
    const url = queue.shift();
    if (!url || visited.has(url)) continue;
    visited.add(url);

    const html = await fetchText(url);
    if (!html) continue;

    const textCandidates = [
      html.replace(/<[^>]+>/g, '\n'),
      ...(html.match(/<pre[^>]*>[\s\S]*?<\/pre>/gi) || []),
      ...(html.match(/<textarea[^>]*>[\s\S]*?<\/textarea>/gi) || []),
      ...(html.match(/<code[^>]*>[\s\S]*?<\/code>/gi) || [])
    ];

    for (const candidate of textCandidates) {
      const normalized = normalizeLrcSource(candidate.replace(/<[^>]+>/g, '\n'));
      if (normalized) return normalized;
    }

    const links = [];
    const htmlLinks = html.match(/(?:href|src)=["']([^"']*\/lrc\/[^"']*)["']/gi) || [];
    for (const match of htmlLinks) {
      const link = match.replace(/^(?:href|src)=["']|["']$/gi, '');
      try {
        const absolute = new URL(link, url).href;
        if (!visited.has(absolute)) links.push(absolute);
      } catch {}
    }
    const textLinks = html.match(/https?:\/\/(?:www\.)?lyricsify\.com\/lrc\/[^\s"'<>]+|\/lrc\/[^\s"'<>]+/gi) || [];
    for (const link of textLinks) {
      try {
        const absolute = new URL(link, url).href;
        if (!visited.has(absolute)) links.push(absolute);
      } catch {}
    }

    for (const link of links) {
      if (!queue.includes(link)) queue.push(link);
    }
  }

  return null;
}

async function scrapeLyricsWithFallback(artist, title, durationMs = null) {
  const primary = await fetchLrclibGet(artist, title, durationMs);
  if (primary && (primary.synced || primary.plain)) return primary;

  const fallback = await fetchLrclibSearch(artist, title, durationMs);
  if (fallback && (fallback.synced || fallback.plain)) return fallback;

  const legacy = await scrapeLegacyLyrics(artist, title);
  if (legacy) return { synced: legacy, plain: null };

  return null;
}

function setupAutoUpdater() {
  if (!app.isPackaged || !autoUpdater) return;
  const feedUrl = process.env.PROYECTOR_UPDATE_FEED;
  if (!feedUrl) return;
  if (typeof autoUpdater.setFeedURL === 'function') {
    autoUpdater.setFeedURL({ provider: 'generic', url: feedUrl });
  }
  autoUpdater.logger = {
    info: (msg) => appendLog('INFO', String(msg)),
    warn: (msg) => appendLog('WARN', String(msg)),
    error: (msg) => appendLog('ERROR', String(msg))
  };
  autoUpdater.checkForUpdatesAndNotify().catch((error) => {
    logError('Auto updater failed', error);
  });
}
