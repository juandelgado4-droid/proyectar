const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onMediaUpdate: (callback) => ipcRenderer.on('media-update', (_e, data) => callback(data)),
  onProyectorCmd: (callback) => ipcRenderer.on('proyector-cmd', (_e, data) => callback(data)),
  onFullscreenChanged: (callback) => ipcRenderer.on('fullscreen-changed', (_e, isFS) => callback(isFS)),
  getMediaNow: () => ipcRenderer.invoke('get-media-now'),
  minimize: () => ipcRenderer.send('win-minimize'),
  maximize: () => ipcRenderer.send('win-maximize'),
  close: () => ipcRenderer.send('win-close'),
  fullscreen: () => ipcRenderer.send('win-fullscreen'),
  getFotosFolders: () => ipcRenderer.invoke('get-fotos-folders'),
  getFotos: (folder) => ipcRenderer.invoke('get-fotos', folder),
  getVideosFolders: () => ipcRenderer.invoke('get-videos-folders'),
  getVideos: (folder) => ipcRenderer.invoke('get-videos', folder),
  mediaPlayPause: () => ipcRenderer.send('media-play-pause'),
  mediaNext: () => ipcRenderer.send('media-next'),
  mediaPrev: () => ipcRenderer.send('media-prev'),
  openMediaFolder: () => ipcRenderer.send('open-media-folder'),
  scrapeLyrics: (artist, title) => ipcRenderer.invoke('scrape-lyrics', artist, title),
  searchYoutube: (artist, title) => ipcRenderer.invoke('search-youtube', artist, title),
  openProyector: () => ipcRenderer.send('open-proyector'),
  sendFakeMediaUpdate: (data) => ipcRenderer.send('fake-media-update', data),
  sendProyectorCmd: (data) => ipcRenderer.send('proyector-cmd', data)
});
