// ═══════════════════════════════════════════════════════════════════════
// GEMMA 3 LYRIC CACHE — Caché persistente para visiones de canción (SongVision)
// Evita ejecuciones repetidas de Gemma 3 1B (Clave: cache/artist/title.hash.json)
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class Gemma3LyricCache {
    constructor() {
      this.prefix = 'aurora_gemma3_cache_v2_';
    }

    /**
     * Generate a deterministic key from metadata and actual lyric content.
     */
    generateKey(artist = '', title = '', lines = [], modelName = '') {
      const lyricFingerprint = (lines || []).map(line => `${line.timeMs || 0}:${line.text || ''}`).join('|');
      const raw = `${(artist || '').trim().toLowerCase()}_${(title || '').trim().toLowerCase()}_${(modelName || '').trim().toLowerCase()}_${lyricFingerprint}`;
      let hash = 0;
      for (let i = 0; i < raw.length; i++) {
        hash = (hash << 5) - hash + raw.charCodeAt(i);
        hash |= 0;
      }
      return `${this.prefix}${Math.abs(hash)}`;
    }

    /**
     * Get cached SongVision / Analysis result.
     * @returns {Object|null}
     */
    get(artist, title, lines, modelName = '') {
      const key = this.generateKey(artist, title, lines, modelName);
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const parsed = JSON.parse(cached);
          console.log(`[Gemma3LyricCache] HIT en caché para "${artist} - ${title}"`);
          return parsed;
        }
      } catch (err) {
        console.warn('[Gemma3LyricCache] Error al leer caché:', err);
      }
      return null;
    }

    /**
     * Store analysis result in persistent cache.
     */
    set(artist, title, lines, data, modelName = '') {
      const key = this.generateKey(artist, title, lines, modelName);
      try {
        const payload = {
          timestamp: Date.now(),
          artist,
          title,
          modelName,
          data
        };
        localStorage.setItem(key, JSON.stringify(payload));
        console.log(`[Gemma3LyricCache] Guardado en caché para "${artist} - ${title}"`);
      } catch (err) {
        console.warn('[Gemma3LyricCache] Error al guardar en caché:', err);
      }
    }

    /**
     * Clear all cached Gemma 3 visions.
     */
    clearAll() {
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.prefix)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        console.log(`[Gemma3LyricCache] Caché purgada (${keysToRemove.length} elementos).`);
      } catch (err) {
        console.warn('[Gemma3LyricCache] Error al purgar caché:', err);
      }
    }
  }

  global.SceneGemma3LyricCache = Gemma3LyricCache;
})(typeof window !== 'undefined' ? window : globalThis);
