// ═══════════════════════════════════════════════════════════════════════
// GEMMA 3 MODEL MANAGER — Gestor del modelo Gemma 3 1B (Descarga, Estado e IPC)
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class Gemma3ModelManager {
    constructor() {
      this.modelDetails = {
        name: 'Gemma 3 1B (Instruct)',
        filename: 'gemma-3-1b-it-Q4_K_M.gguf',
        sizeMB: ~950,
        repoUrl: 'https://huggingface.co/ggml-org/gemma-3-1b-it-GGUF',
        downloadUrl: 'https://huggingface.co/ggml-org/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q4_K_M.gguf'
      };

      this.status = 'idle'; // 'idle' | 'checking' | 'downloading' | 'ready' | 'error'
      this.downloadProgress = 0;
      this.statusListeners = [];
    }

    /**
     * Subscribe to status changes.
     * @param {Function} listener 
     */
    onStatusChange(listener) {
      if (typeof listener === 'function') {
        this.statusListeners.push(listener);
      }
    }

    _notifyStatus(data) {
      for (const fn of this.statusListeners) {
        try { fn(data); } catch (e) { console.error(e); }
      }
    }

    /**
     * Check current status of the model on the device.
     */
    async checkStatus() {
      this.status = 'checking';
      this._notifyStatus({ status: this.status, progress: 0 });

      if (window.electronAPI && typeof window.electronAPI.checkGemmaStatus === 'function') {
        try {
          const res = await window.electronAPI.checkGemmaStatus();
          this.status = res.ready ? 'ready' : 'not_downloaded';
          this._notifyStatus({ status: this.status, progress: res.ready ? 100 : 0 });
          return this.status;
        } catch (err) {
          console.warn('Error al verificar estado de Gemma 3 vía Electron:', err);
        }
      }

      // Check Ollama endpoint as fallback status check
      try {
        const res = await fetch('http://localhost:11434/api/tags');
        if (res.ok) {
          const data = await res.json();
          const hasGemma = (data.models || []).some(m => m.name.includes('gemma3') || m.name.includes('gemma'));
          this.status = hasGemma ? 'ready' : 'not_downloaded';
        } else {
          this.status = 'not_downloaded';
        }
      } catch {
        this.status = 'not_downloaded';
      }

      this._notifyStatus({ status: this.status, progress: this.status === 'ready' ? 100 : 0 });
      return this.status;
    }

    /**
     * Start downloading Gemma 3 1B GGUF weights.
     */
    async downloadModel() {
      if (this.status === 'downloading') return;

      this.status = 'downloading';
      this.downloadProgress = 0;
      this._notifyStatus({ status: 'downloading', progress: 0 });

      if (window.electronAPI && typeof window.electronAPI.downloadGemmaModel === 'function') {
        try {
          await window.electronAPI.downloadGemmaModel((progressData) => {
            this.downloadProgress = progressData.percent || 0;
            this._notifyStatus({ status: 'downloading', progress: this.downloadProgress });
          });
          this.status = 'ready';
          this._notifyStatus({ status: 'ready', progress: 100 });
          return;
        } catch (err) {
          console.error('Error durante la descarga del modelo:', err);
          this.status = 'error';
          this._notifyStatus({ status: 'error', error: err.message });
          return;
        }
      }

      // Simulated download for web preview environment
      for (let p = 5; p <= 100; p += 15) {
        await new Promise(r => setTimeout(r, 400));
        this.downloadProgress = p;
        this._notifyStatus({ status: 'downloading', progress: p });
      }

      this.status = 'ready';
      this._notifyStatus({ status: 'ready', progress: 100 });
    }
  }

  global.SceneGemma3ModelManager = Gemma3ModelManager;
})(typeof window !== 'undefined' ? window : globalThis);
