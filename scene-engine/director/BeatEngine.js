// ═══════════════════════════════════════════════════════════════════════
// BEAT ENGINE — Motor de ritmo independiente
// Detecta BPM por timestamps y emite impulsos de ritmo
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class BeatEngine {
    constructor(eventBus) {
      this._eventBus = eventBus;
      this._bpm = 120;
      this._beatIntervalMs = 500;
      this._lastBeatMs = 0;
      this._beatIntensity = 0;
      this._isPlaying = false;
    }

    /**
     * Estimate BPM from lyric timestamps.
     * @param {Array<{timeMs: number}>} lines
     */
    analyzeBeatPattern(lines) {
      if (!lines || lines.length < 4) {
        this.setBPM(120);
        return;
      }

      const deltas = [];
      for (let i = 1; i < lines.length; i++) {
        const diff = lines[i].timeMs - lines[i - 1].timeMs;
        if (diff > 800 && diff < 4000) {
          deltas.push(diff);
        }
      }

      if (deltas.length === 0) {
        this.setBPM(120);
        return;
      }

      const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
      let estimatedBpm = 60000 / (avgDelta / 2);

      while (estimatedBpm < 80) estimatedBpm *= 2;
      while (estimatedBpm > 160) estimatedBpm /= 2;

      this.setBPM(Math.round(estimatedBpm));
    }

    setBPM(bpm) {
      this._bpm = Math.max(60, Math.min(200, bpm));
      this._beatIntervalMs = 60000 / this._bpm;
    }

    getBPM() {
      return this._bpm;
    }

    /**
     * Called on each frame to update pulse & trigger beat events.
     * @param {number} positionMs
     */
    update(positionMs) {
      if (positionMs - this._lastBeatMs >= this._beatIntervalMs) {
        this._lastBeatMs = positionMs;
        this._beatIntensity = 1.0;

        if (this._eventBus) {
          this._eventBus.emit(global.SceneEventBus.Events.BEAT_DETECTED, {
            positionMs,
            bpm: this._bpm,
            intensity: this._beatIntensity
          });
        }
      } else {
        // Decay intensity smoothly
        this._beatIntensity *= 0.88;
      }
    }

    getBeatIntensity() {
      return this._beatIntensity;
    }
  }

  global.SceneBeatEngine = BeatEngine;
})(typeof window !== 'undefined' ? window : globalThis);
