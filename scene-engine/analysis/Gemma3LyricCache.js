// ═══════════════════════════════════════════════════════════════════════
// GEMMA 3 LYRIC CACHE — Caché persistente para visiones de canción (SongVision)
// Evita ejecuciones repetidas de Gemma 3 1B (Clave: cache/artist/title.hash.json)
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class Gemma3LyricCache {
    constructor() {
      this.prefix = 'aurora_gemma3_cache_v1_';
    }

    /**
     * Generate deterministic hash key for artist + title + lyrics length.
     */
    generateKey(artist = '', title = '', lines = []) {
      const raw = `${(artist || '').trim().toLowerCase()}_${(title || '').trim().toLowerCase()}_${lines.length}`;
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
    get(artist, title, lines) {
      const key = this.generateKey(artist, title, lines);
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
    set(artist, title, lines, data) {
      const key = this.generateKey(artist, title, lines);
      try {
        const payload = {
          timestamp: Date.now(),
          artist,
          title,
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
